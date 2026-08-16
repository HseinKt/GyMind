import type { Role } from "../types/auth";

export interface AppRouteConfig {
  path: string;
  roles: Role[];
}

export const routeConfig: AppRouteConfig[] = [
  { path: "/superadmin", roles: ["SuperAdmin"] },
  { path: "/gym-owner", roles: ["GymOwner"] },
  { path: "/branch-manager", roles: ["BranchManager"] },
  { path: "/staff", roles: ["Staff"] },
  { path: "/trainer", roles: ["Trainer"] }
];
