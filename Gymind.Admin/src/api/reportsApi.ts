import { get } from "./apiClient";

export interface HourlyBranchCapacity {
  hour: number;
  label: string;
  activePeopleCount: number;
  branchCapacity?: number | null;
  utilizationPercent?: number | null;
}

export interface CheckInOutSummary {
  checkIns: number;
  manualCheckOuts: number;
  autoCheckOuts: number;
}

export interface CheckInUnderlyingRow {
  id: number;
  memberId?: number | null;
  memberName: string;
  branchName: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isAutoCheckOut: boolean;
  status: string;
}

export interface ManagerReport {
  branchId: number;
  branchName: string;
  branchCapacity?: number | null;
  totalMembersLoggedToday: number;
  branchCapacityByHour: HourlyBranchCapacity[];
  checkInOutSummary: CheckInOutSummary;
  todayCheckIns: CheckInUnderlyingRow[];
}

export type OwnerReportPeriod = "1d" | "7d" | "1m";

export interface OwnerClassGivenReportPoint {
  className: string;
  completedCount: number;
}

export interface OwnerReport {
  period: OwnerReportPeriod;
  from: string;
  to: string;
  gymId?: number | null;
  branchId?: number | null;
  givenClassesByName: OwnerClassGivenReportPoint[];
}

export const reportsApi = {
  getManagerReport: () => get<ManagerReport>("/reports/manager"),
  getOwnerReport: (params?: { gymId?: number; branchId?: number; period?: OwnerReportPeriod }) => get<OwnerReport>("/reports/owner", params),
  getRevenueReport: () => get("/dashboard"),
  getAttendanceReport: () => get("/checkins"),
  getMembershipReport: () => get("/membermemberships"),
  getClassOccupancyReport: () => get("/classbookings"),
  getTrainerActivityReport: () => get("/trainersessions")
};
