export type Role = "Member" | string;

export interface AuthUser {
  id?: number;
  userId: number;
  memberId?: number | null;
  fullName: string;
  email: string;
  profilePhotoUrl?: string | null;
  role: Role;
  gymId?: number | null;
  branchId?: number | null;
  homeBranchId?: number | null;
  branchName?: string | null;
  membershipStatus?: string;
  permissions: string[];
  expiresAt?: string;
  requiresOtp?: boolean;
  deviceApproved?: boolean;
  otpHint?: string;
  membershipActive?: boolean;
  membershipPlan?: string;
  remainingDays?: number;
  qrCode?: string | null;
}

export interface LoginResponse extends AuthUser {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  identifier: string;
  email?: string;
  phone?: string;
  password: string;
  deviceId: string;
}
