export interface QrScanResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  branchId?: number;
  branchName?: string;
  checkInId?: number;
  checkInTimeUtc?: string;
  currentOccupancy?: number;
  capacity?: number;
}

export interface ActiveCheckIn {
  hasActiveCheckIn: boolean;
  checkInId?: number;
  branchId?: number;
  branchName?: string;
  branchLatitude?: number | null;
  branchLongitude?: number | null;
  radiusMeters?: number | null;
  checkInTimeUtc?: string;
  durationMinutes?: number;
  status?: string;
}

export interface CurrentGymSession {
  hasActiveCheckIn: boolean;
  checkInId?: number | null;
  memberId?: number | null;
  branchId?: number | null;
  branchName?: string | null;
  checkInTime?: string | null;
  checkInTimeUtc?: string | null;
  checkOutTime?: string | null;
  lastSeenAt?: string | null;
  serverTime: string;
  status: string;
  branchCloseTime?: string | null;
  capacity?: number | null;
}

export interface AutoCheckOutResult {
  checkedOut: boolean;
  distanceMeters?: number | null;
  radiusMeters?: number | null;
  branchId?: number | null;
  branchName?: string | null;
  checkOutTimeUtc?: string | null;
  message?: string;
}

export interface CheckInHistoryItem {
  id: number;
  branchName?: string;
  checkInTime?: string;
  checkOutTime?: string | null;
  method?: string;
}
