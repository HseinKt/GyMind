import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";
import { clearSession, readSession, saveSession } from "./tokenStorage";
import type { AuthSession, Role } from "../types/auth";

const adminRoles: Role[] = ["SuperAdmin", "GymOwner", "BranchManager", "Staff", "Trainer"];

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login(email: string, password: string): Promise<{ ok: boolean; message?: string }>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [loading, setLoading] = useState(() => Boolean(readSession()));

  useEffect(() => {
    const onUnauthorized = () => {
      clearSession();
      setSession(null);
    };
    const onSessionRefreshed = () => setSession(readSession());
    window.addEventListener("gymind:unauthorized", onUnauthorized);
    window.addEventListener("gymind:session-refreshed", onSessionRefreshed);
    return () => {
      window.removeEventListener("gymind:unauthorized", onUnauthorized);
      window.removeEventListener("gymind:session-refreshed", onSessionRefreshed);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const existing = readSession();
    if (!existing) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    authApi.me()
      .then((user) => {
        const stored = readSession();
        if (!adminRoles.includes(user.role) || !stored) {
          clearSession();
          if (!cancelled) setSession(null);
          return;
        }

        const next = { ...stored, user: { ...stored.user, ...user } };
        saveSession(next);
        if (!cancelled) setSession(next);
      })
      .catch(() => {
        clearSession();
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const next = await authApi.adminLogin({ email, password });
      saveSession(next);
      setSession(next);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Login failed." };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session?.refreshToken;
    clearSession();
    setSession(null);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Local cleanup is the reliable part; backend logout can fail if the token is already expired.
      }
    }
  }, [session]);

  const value = useMemo(() => ({ session, loading, login, logout }), [session, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
