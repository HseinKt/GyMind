import { router } from "expo-router";
import { create } from "zustand";
import { AuthUser, LoginResponse } from "@/types/auth";
import { clearTokens, saveTokens } from "./tokenStorage";

interface AuthState {
  user: AuthUser | null;
  bootstrapped: boolean;
  authError: string | null;
  setBootstrapped: (value: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  setAuthError: (message: string | null) => void;
  applyLogin: (response: LoginResponse) => Promise<void>;
  clearSession: (message?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  bootstrapped: false,
  authError: null,
  setBootstrapped: (value) => set({ bootstrapped: value }),
  setUser: (user) => set({ user }),
  setAuthError: (message) => set({ authError: message }),
  applyLogin: async (response) => {
    if (response.role !== "Member") {
      await clearTokens();
      set({ user: null, authError: "This app is only for gym members." });
      return;
    }
    await saveTokens(response.accessToken, response.refreshToken);
    const { accessToken: _a, refreshToken: _r, ...user } = response;
    set({ user, authError: null, bootstrapped: true });
  },
  clearSession: async (message) => {
    await clearTokens();
    set({ user: null, authError: message ?? null, bootstrapped: true });
    router.replace("/login");
  }
}));
