export interface DashboardKpis {
  totalGyms?: number;
  activeGyms?: number;
  totalBranches?: number;
  totalUsers?: number;
  totalMembers?: number;
  activeMembers?: number;
  revenue?: number;
  monthlyPlatformRevenue?: number;
  pendingRevenue?: number;
  latePayments?: number;
  todayAttendance?: number;
  classesToday?: number;
  expiringMemberships?: number;
}

export interface DashboardResponse {
  role?: string;
  kpis?: DashboardKpis;
  generatedAt?: string;
}

export interface WorkspaceDashboard {
  platform?: Record<string, unknown>;
  owner?: Record<string, unknown>;
  manager?: Record<string, unknown>;
  staff?: Record<string, unknown>;
  trainer?: Record<string, unknown>;
}
