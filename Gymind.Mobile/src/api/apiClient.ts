import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/auth/authStore";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "@/auth/tokenStorage";
import { LoginResponse } from "@/types/auth";
import { parseApiError } from "@/utils/errors";
import { API_BASE_URL, API_ORIGIN } from "@/config/apiConfig";
import { endpoints } from "./endpoints";

export const apiBaseUrl = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: "application/json", "Content-Type": "application/json" }
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: "application/json", "Content-Type": "application/json" }
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (__DEV__) {
      const failingUrl = `${error.config?.baseURL ?? ""}${error.config?.url ?? ""}`;
      console.warn("[Gymind] API request failed:", failingUrl, error.message);
    }

    if (!error.response) {
      throw new Error(
        __DEV__
          ? `Cannot reach Gymind.API at ${API_ORIGIN}. Test this URL from your phone browser: ${API_ORIGIN}/swagger`
          : "Cannot connect to Gymind. Check your internet connection and try again."
      );
    }

    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const path = original?.url?.toLowerCase() ?? "";
    const authBypass = path.includes("/auth/member/login") || path.includes("/auth/refresh") || path.includes("/auth/logout");

    if (status === 401 && original && !original._retried && !authBypass) {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearTokens();
        throw parseApiError(error);
      }

      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
      await useAuthStore.getState().clearSession("Your session expired. Please sign in again.");
    }
    throw parseApiError(error);
  }
);

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      try {
        const response = await refreshClient.post<LoginResponse>(endpoints.auth.refresh, { refreshToken });
        if (response.data.role !== "Member") {
          await clearTokens();
          return null;
        }
        await saveTokens(response.data.accessToken, response.data.refreshToken);
        const { accessToken: _a, refreshToken: _r, ...user } = response.data;
        useAuthStore.getState().setUser(user);
        return response.data.accessToken;
      } catch {
        await clearTokens();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function getJson<T>(url: string) {
  const response = await apiClient.get<T>(url);
  return response.data;
}

export async function postJson<T>(url: string, data?: unknown) {
  const response = await apiClient.post<T>(url, data);
  return response.data;
}

export async function putJson<T>(url: string, data?: unknown) {
  const response = await apiClient.put<T>(url, data);
  return response.data;
}

export async function deleteJson<T>(url: string) {
  const response = await apiClient.delete<T>(url);
  return response.data;
}

export async function postMultipart<T>(url: string, data: FormData) {
  const response = await apiClient.post<T>(url, data, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
}
