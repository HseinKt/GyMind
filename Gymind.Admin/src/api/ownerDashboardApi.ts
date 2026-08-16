import { get } from "./apiClient";

export interface OwnerRevenueTrend {
  date: string;
  revenue: number;
  paymentCount: number;
}

export interface OwnerPaymentRecord {
  paymentId: number;
  memberName: string;
  branch: string;
  membershipPlan: string;
  amount: number;
  paymentMethod: string;
  paidAt?: string | null;
  recordedByStaff: string;
}

export interface OwnerBranchPerformance {
  branchId: number;
  branch: string;
  revenue: number;
  activeMembers: number;
  expiredMembers: number;
  checkInsToday: number;
  capacity: number;
  currentCheckIns: number;
  capacityPercent: number;
  status: string;
}

export interface OwnerMembersByBranch {
  branchId: number;
  branch: string;
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  newMembersThisMonth: number;
}

export interface OwnerBranchCapacity {
  branchId: number;
  branch: string;
  currentCheckIns: number;
  capacity: number;
  capacityPercent: number;
  lastUpdated: string;
}

export interface OwnerExpiredMember {
  memberId: number;
  memberName: string;
  phone: string;
  branch: string;
  membershipPlan: string;
  expiryDate?: string | null;
  daysExpired: number;
  lastCheckIn?: string | null;
}

export interface OwnerRevenueBucket {
  name: string;
  revenue: number;
  count: number;
}

export interface OwnerPaymentCountTrend {
  date: string;
  count: number;
}

export interface OwnerPlanPerformance {
  planId: number;
  planName: string;
  price: number;
  salesCount: number;
  totalRevenue: number;
  activeMembersUsingPlan: number;
}

export interface OwnerEmployeeSummary {
  employeeId: number;
  employeeName: string;
  role: string;
  branch: string;
  status: string;
  paymentsRecorded: number;
  checkInsHandled: number;
}

export interface OwnerAttentionItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger" | string;
  count: number;
}

export interface OwnerDashboard {
  revenueToday: number;
  revenueLast7Days: number;
  revenueThisMonth: number;
  activeMembers: number;
  expiredMembers: number;
  newMembersThisMonth: number;
  revenueTrend: OwnerRevenueTrend[];
  paymentRecords: OwnerPaymentRecord[];
  branchPerformance: OwnerBranchPerformance[];
  membersByBranch: OwnerMembersByBranch[];
  activeVsExpired: { activeMembers: number; expiredMembers: number };
  branchCapacity: OwnerBranchCapacity[];
  expiredMemberRecords: OwnerExpiredMember[];
  paymentsOverview: {
    revenueByPaymentMethod: OwnerRevenueBucket[];
    revenueByMembershipPlan: OwnerRevenueBucket[];
    paymentCountOverTime: OwnerPaymentCountTrend[];
  };
  planPerformance: OwnerPlanPerformance[];
  teamSummary: {
    totalManagers: number;
    totalStaff: number;
    totalTrainers: number;
    activeEmployees: number;
    inactiveEmployees: number;
    employees: OwnerEmployeeSummary[];
  };
  attentionItems: OwnerAttentionItem[];
}

export const ownerDashboardApi = {
  getDashboard: () => get<OwnerDashboard>("/owner/dashboard")
};
