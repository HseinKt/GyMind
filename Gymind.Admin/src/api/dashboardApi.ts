import { get } from "./apiClient";
import type { DashboardResponse } from "../types/dashboard";
import type { Role } from "../types/auth";
import type { Gym } from "../types/gym";
import type { Branch } from "../types/branch";
import type { User } from "../types/user";
import type { Member } from "../types/member";
import type { MembershipPlan } from "../types/membership";
import type { Payment } from "../types/payment";
import type { CheckIn } from "../types/checkIn";
import type { GymClass } from "../types/class";
import type { Notification } from "../types/notification";

export interface AdminWorkspace {
  gyms: Gym[];
  branches: Branch[];
  users: User[];
  trainers: User[];
  members: Member[];
  plans: MembershipPlan[];
  payments: Payment[];
  attendance: CheckIn[];
  classes: GymClass[];
  notifications: Notification[];
  subscriptions?: unknown[];
  systemLogs?: unknown[];
  dashboard?: {
    platform?: {
      monthlyPlatformRevenue?: number;
      pendingRevenue?: number;
      latePayments?: number;
      monthlyPlatformRevenueRows?: {
        id: string;
        month: string;
        paidGyms: number;
        revenue: number;
        unpaidAmount: number;
        lockedGyms: number;
      }[];
    };
  };
}

export const dashboardApi = {
  getDashboardByRole: () => get<DashboardResponse>("/dashboard"),
  getSuperAdminDashboard: () => get<DashboardResponse>("/dashboard"),
  getGymOwnerDashboard: () => get<DashboardResponse>("/dashboard"),
  getBranchManagerDashboard: () => get<DashboardResponse>("/dashboard"),
  getStaffDashboard: () => get<DashboardResponse>("/dashboard"),
  getTrainerDashboard: () => get<DashboardResponse>("/dashboard"),
  getWorkspace: () => get<AdminWorkspace>("/admin/workspace")
};

export function dashboardTitle(role: Role) {
  return role === "SuperAdmin"
    ? "Platform Command Center"
    : role === "GymOwner"
      ? "Gym Owner Dashboard"
      : role === "BranchManager"
        ? "Branch Operations"
        : role === "Staff"
          ? "Front Desk Dashboard"
          : "Trainer Today";
}
