export type Role = "SuperAdmin" | "GymOwner" | "BranchManager" | "Staff" | "Trainer" | "Member";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  gymId: number | null;
  branchId: number | null;
  permissions: string[];
  expiresAt?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}
