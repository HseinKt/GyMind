import { get, post } from "./apiClient";
import type { AuthSession, AuthUser, LoginRequest, Role } from "../types/auth";

interface BackendLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId?: number;
  id?: number;
  fullName?: string;
  email?: string;
  role?: Role;
  gymId?: number | null;
  branchId?: number | null;
  permissions?: string[];
  expiresAt?: string;
  user?: Partial<AuthUser> & { id?: number; fullName?: string };
}

function mapLogin(response: BackendLoginResponse): AuthSession {
  const userSource = response.user ?? {};
  const role = (userSource.role ?? response.role) as Role;
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: {
      id: Number(userSource.id ?? response.userId ?? response.id),
      fullName: userSource.fullName ?? response.fullName ?? "Gymind User",
      email: userSource.email ?? response.email ?? "",
      role,
      gymId: userSource.gymId ?? response.gymId ?? null,
      branchId: userSource.branchId ?? response.branchId ?? null,
      permissions: userSource.permissions ?? response.permissions ?? [],
      expiresAt: userSource.expiresAt ?? response.expiresAt
    }
  };
}

export const authApi = {
  async adminLogin(payload: LoginRequest) {
    return mapLogin(await post<BackendLoginResponse>("/auth/admin/login", payload));
  },
  async refreshToken(refreshToken: string) {
    return mapLogin(await post<BackendLoginResponse>("/auth/refresh", { refreshToken }));
  },
  async logout(refreshToken: string) {
    await post<void>("/auth/logout", { refreshToken });
  },
  async me() {
    return get<AuthUser>("/auth/me");
  }
};
