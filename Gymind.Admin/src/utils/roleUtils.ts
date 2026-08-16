import type { Role } from "../types/auth";

export function isRole(value: unknown): value is Role {
  return value === "SuperAdmin" || value === "GymOwner" || value === "BranchManager" || value === "Staff" || value === "Trainer";
}

export function canAccess(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}
