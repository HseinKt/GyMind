import { AuthUser, LoginRequest, LoginResponse } from "@/types/auth";
import { getStableDeviceId, getRefreshToken } from "@/auth/tokenStorage";
import { getJson, postJson } from "./apiClient";
import { endpoints } from "./endpoints";

export async function login(identifier: string, password: string) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");
  const normalizedIdentifier = isEmail ? trimmed.toLowerCase() : trimmed;
  const request: LoginRequest = {
    identifier: normalizedIdentifier,
    ...(isEmail ? { email: normalizedIdentifier } : { phone: normalizedIdentifier }),
    password,
    deviceId: await getStableDeviceId()
  };
  return postJson<LoginResponse>(endpoints.auth.login, request);
}

export async function getMe() {
  return getJson<AuthUser>(endpoints.auth.me);
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return;
  await postJson<void>(endpoints.auth.logout, { refreshToken });
}

export async function requestPasswordOtp(identifier: string) {
  return postJson<{ resetToken: string; message: string; expiresAt?: string }>(endpoints.auth.forgotPasswordRequest, { identifier: identifier.trim() });
}

export async function verifyPasswordOtp(identifier: string, otp: string, resetToken: string) {
  return postJson<{ resetToken: string; message: string }>(endpoints.auth.forgotPasswordVerify, { identifier: identifier.trim(), otp: otp.trim(), resetToken });
}

export async function resetForgottenPassword(identifier: string, otp: string, resetToken: string, newPassword: string) {
  return postJson<{ message: string }>(endpoints.auth.forgotPasswordReset, { identifier: identifier.trim(), otp: otp.trim(), resetToken, newPassword });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return postJson<{ message: string }>(endpoints.auth.changePassword, { currentPassword, newPassword });
}
