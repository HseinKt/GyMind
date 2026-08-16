import { get, post } from "./apiClient";
import type { CheckIn } from "../types/checkIn";

export interface PagedCheckIns {
  items: CheckIn[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OneDayPassResponse {
  checkInId: number;
  displayName: string;
  branchId: number;
  branchName: string;
  checkInTime: string;
  autoCheckOutTime: string;
  isAutoCheckOut: boolean;
  status: string;
}

export const checkInsApi = {
  getTodayAttendance: () => get<CheckIn[]>("/checkins"),
  getActiveCheckIns: (params?: Record<string, unknown>) => get<CheckIn[]>("/checkins", params),
  getCheckInHistory: () => get<CheckIn[]>("/checkins"),
  getCheckInHistoryPage: (params?: Record<string, unknown>) => get<PagedCheckIns>("/checkins", params),
  manualCheckIn: (memberId: number, branchId?: number | null) => post("/checkins", { memberId, branchId, method: "STAFF_MANUAL" }),
  createOneDayPass: () => post<OneDayPassResponse>("/staff/one-day-pass", {}),
  manualCheckOut: (id: number) => post(`/checkins/${id}/manual-checkout`)
  // TODO backend: POST /api/checkins/{id}/manual-checkout is not available yet.
};
