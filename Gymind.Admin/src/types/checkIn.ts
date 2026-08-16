export interface CheckIn {
  id: number;
  memberId?: number | null;
  branchId?: number | null;
  branchName?: string;
  memberName?: string;
  type?: string;
  status?: string | null;
  method?: string | null;
  source?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  at?: string;
  isSuspicious?: boolean;
  suspicionReason?: string;
  suspicionLevel?: "none" | "low" | "medium" | "high" | string;
  alertType?: string;
  alertMessage?: string;
}
