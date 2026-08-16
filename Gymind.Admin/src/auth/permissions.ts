import type { Role } from "../types/auth";

export const rolePermissions: Record<Role, string[]> = {
  SuperAdmin: ["platform:*", "gyms:*", "users:*", "reports:*", "audit:read"],
  GymOwner: ["gym:*", "branches:*", "members:*", "payments:read", "reports:read"],
  BranchManager: ["branch:*", "members:*", "classes:*", "attendance:*"],
  Staff: ["members:create", "members:read", "payments:create", "attendance:*"],
  Trainer: ["trainer:schedule", "trainer:members", "trainer:notes"],
  Member: []
};
