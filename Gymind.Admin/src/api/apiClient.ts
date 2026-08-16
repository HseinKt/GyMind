import { clearSession, getAccessToken, readSession, saveSession } from "../auth/tokenStorage";
import type { AuthSession, AuthUser } from "../types/auth";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5156/api";

interface CacheEntry {
  data: any;
  timestamp: number;
}
const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export function clearClientCache() {
  getCache.clear();
}

export class BackendMissingError extends Error {
  constructor(endpoint: string) {
    super(`Backend endpoint is missing or unavailable: ${endpoint}`);
    this.name = "BackendMissingError";
  }
}

interface BackendRefreshResponse {
  accessToken: string;
  refreshToken: string;
  userId?: number;
  id?: number;
  fullName?: string;
  email?: string;
  role?: AuthUser["role"];
  gymId?: number | null;
  branchId?: number | null;
  permissions?: string[];
  expiresAt?: string;
  user?: Partial<AuthUser>;
}

interface BackendErrorResponse {
  message?: string;
  title?: string;
  errors?: Record<string, string[] | string>;
}

function redactPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactPayload);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    const lower = key.toLowerCase();
    if (lower.includes("password") || lower.includes("token")) return [key, "[redacted]"];
    return [key, redactPayload(item)];
  }));
}

function formatBackendError(payload: BackendErrorResponse, fallback: string) {
  const validationMessages = Object.entries(payload.errors ?? {})
    .flatMap(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : messages;
      return text ? [`${field}: ${text}`] : [];
    });

  if (validationMessages.length > 0) {
    return validationMessages.join(" ");
  }

  return payload.message ?? payload.title ?? fallback;
}

function mapRefresh(response: BackendRefreshResponse, previous: AuthSession): AuthSession {
  const source = response.user ?? {};
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: {
      id: Number(source.id ?? response.userId ?? response.id ?? previous.user.id),
      fullName: source.fullName ?? response.fullName ?? previous.user.fullName,
      email: source.email ?? response.email ?? previous.user.email,
      role: source.role ?? response.role ?? previous.user.role,
      gymId: source.gymId ?? response.gymId ?? previous.user.gymId,
      branchId: source.branchId ?? response.branchId ?? previous.user.branchId,
      permissions: source.permissions ?? response.permissions ?? previous.user.permissions,
      expiresAt: source.expiresAt ?? response.expiresAt ?? previous.user.expiresAt
    }
  };
}

async function refreshAccessToken() {
  const previous = readSession();
  if (!previous?.refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: previous.refreshToken })
  });

  if (!response.ok) return null;
  const refreshed = mapRefresh(await response.json() as BackendRefreshResponse, previous);
  saveSession(refreshed);
  window.dispatchEvent(new Event("gymind:session-refreshed"));
  return refreshed.accessToken;
}

async function request<T>(method: string, path: string, data?: unknown, params?: Record<string, unknown>, retried = false, signal?: AbortSignal): Promise<T> {
  // Evict cache on any mutations
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    getCache.clear();
  }

  // Serve from cache if available and fresh
  const isCacheable = method.toUpperCase() === "GET" && (path.includes("/dashboard") || path.includes("/workspace") || path.includes("/audit-logs"));
  if (isCacheable) {
    const cached = getCache.get(path);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  }

  const token = getAccessToken();
  const base = API_BASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
      signal
    });
  } catch (error) {
    console.error("Network/Fetch error details:", error);
    throw new Error(
      error instanceof Error 
        ? `Unable to load data. Please verify that the backend API is running and VITE_API_BASE_URL is correct. (Detail: ${error.message})`
        : "Unable to load data. Please verify that the backend API is running and VITE_API_BASE_URL is correct."
    );
  }
  if (response.status === 401 && !retried) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return request<T>(method, path, data, params, true, signal);
    }
  }
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("gymind:unauthorized"));
  }
  if (!response.ok) {
    let message = response.status === 403
      ? "You do not have permission to view this data."
      : response.status === 404
        ? "The requested backend endpoint was not found."
        : response.status >= 500
          ? "The backend API returned a server error."
          : `Request failed with status ${response.status}`;
    let responseBody = "";
    try {
      responseBody = await response.text();
      const payload = responseBody ? JSON.parse(responseBody) as BackendErrorResponse : {};
      message = formatBackendError(payload, message);
    } catch {
      // Keep status message.
    }
    console.error("Gymind API request failed", {
      endpoint: path,
      method,
      payload: redactPayload(data),
      status: response.status,
      responseBody
    });
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json() as T;
  if (isCacheable) {
    getCache.set(path, { data: result, timestamp: Date.now() });
  }
  return result;
}

export async function get<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) {
  return request<T>("GET", path, undefined, params, false, signal);
}

export async function post<T>(path: string, data?: unknown) {
  return request<T>("POST", path, data);
}

export async function put<T>(path: string, data?: unknown) {
  return request<T>("PUT", path, data);
}

export async function patch<T>(path: string, data?: unknown) {
  return request<T>("PATCH", path, data);
}

export async function postForm<T>(path: string, data: FormData) {
  return request<T>("POST", path, data);
}

export async function del<T = void>(path: string) {
  return request<T>("DELETE", path);
}
