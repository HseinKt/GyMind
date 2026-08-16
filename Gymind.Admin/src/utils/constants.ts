import type { Role } from "../types/auth";

export const roleHome: Record<Role, string> = {
  SuperAdmin: "/superadmin/dashboard",
  GymOwner: "/gym-owner/dashboard",
  BranchManager: "/branch-manager/dashboard",
  Staff: "/staff/member-search",
  Trainer: "/trainer/dashboard",
  Member: "/access-denied"
};

export const roleLabels: Record<Role, string> = {
  SuperAdmin: "SuperAdmin",
  GymOwner: "Gym Owner",
  BranchManager: "Branch Manager",
  Staff: "Staff",
  Trainer: "Trainer",
  Member: "Member"
};

export const roleIds: Record<Role, number> = {
  SuperAdmin: 1,
  GymOwner: 2,
  BranchManager: 3,
  Staff: 4,
  Trainer: 5,
  Member: 6
};
