import type { AuthSession } from "../types/auth";

const SESSION_KEY = "gymind.admin.session";

export function readSession(): AuthSession | null {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function getAccessToken() {
  return readSession()?.accessToken ?? null;
}
