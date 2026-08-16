import { get } from "./apiClient";

export interface ManagerBranchInfo {
  branchId: number;
  branchName: string;
  capacity: number;
}

export interface ManagerDashboardKpis {
  currentlyInside: number;
  todaysAttendance: number;
  paymentsToday: number;
  classesToday: number;
  expiringMemberships: number;
  suspiciousCheckIns: number;
}

export interface ManagerLiveStatus {
  branchName: string;
  currentCheckIns: number;
  branchCapacity: number;
  capacityPercentage: number;
  lastCheckInTime?: string | null;
  peakHourToday: string;
}

export interface ManagerAttendanceHour {
  hour: string;
  checkIns: number;
}

export interface ManagerCheckInRecord {
  checkInId: number;
  memberId?: number | null;
  memberName: string;
  phone: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  duration: string;
  membershipPlan: string;
  membershipStatus: string;
  checkedInBy: string;
  checkInMethod: string;
  status: string;
}

export interface ManagerPaymentsToday {
  totalPaymentsToday: number;
  paymentCountToday: number;
  cashPaymentsTotal: number;
  cardPaymentsTotal: number;
  dayPassRevenue: number;
  membershipRenewalRevenue: number;
}

export interface ManagerPaymentBucket {
  name: string;
  revenue: number;
  count: number;
}

export interface ManagerPaymentRecord {
  paymentId: number;
  memberName: string;
  membershipPlan: string;
  amount: number;
  paymentMethod: string;
  paymentTime?: string | null;
  recordedByStaff: string;
}

export interface ManagerExpiringMembership {
  memberId: number;
  memberName: string;
  phone: string;
  membershipPlan: string;
  expiryDate?: string | null;
  daysLeft: number;
  lastCheckIn?: string | null;
  status: string;
}

export interface ManagerSuspiciousCheckIn {
  checkInId: number;
  memberId?: number | null;
  memberName: string;
  issue: string;
  time?: string | null;
  staff: string;
  status: string;
}

export interface ManagerClassToday {
  classId: number;
  className: string;
  trainerName: string;
  startTime?: string | null;
  endTime?: string | null;
  capacity: number;
  bookedMembersCount: number;
  attendedMembersCount: number;
  status: string;
}

export interface ManagerTeamActivity {
  employeeId: number;
  employeeName: string;
  role: string;
  phone: string;
  status: string;
  paymentsRecordedToday: number;
  checkInsHandledToday: number;
  manualCheckOutsToday: number;
}

export interface ManagerDailyMetric {
  date: string;
  count: number;
}

export interface ManagerDailyRevenue {
  date: string;
  revenue: number;
}

export interface ManagerDashboard {
  branchInfo: ManagerBranchInfo;
  kpis: ManagerDashboardKpis;
  liveStatus: ManagerLiveStatus;
  attendanceByHour: ManagerAttendanceHour[];
  checkInRecords: ManagerCheckInRecord[];
  currentlyInside: ManagerCheckInRecord[];
  paymentsToday: ManagerPaymentsToday;
  paymentsByMethod: ManagerPaymentBucket[];
  paymentsByPlan: ManagerPaymentBucket[];
  paymentRecords: ManagerPaymentRecord[];
  expiringMemberships: ManagerExpiringMembership[];
  suspiciousCheckIns: ManagerSuspiciousCheckIn[];
  classesToday: ManagerClassToday[];
  teamSummary: {
    totalStaff: number;
    totalTrainers: number;
    activeEmployees: number;
    inactiveEmployees: number;
  };
  teamActivity: ManagerTeamActivity[];
  branchReports: {
    attendanceByDay: ManagerDailyMetric[];
    revenueByDay: ManagerDailyRevenue[];
    paymentsByMethod: ManagerPaymentBucket[];
    membershipRenewals: ManagerDailyMetric[];
    classAttendance: ManagerDailyMetric[];
    peakHours: ManagerAttendanceHour[];
  };
}

export const managerDashboardApi = {
  getDashboard: () => get<ManagerDashboard>("/manager/dashboard")
};
