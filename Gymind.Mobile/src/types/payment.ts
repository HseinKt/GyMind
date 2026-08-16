export interface PaymentItem {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  memberId?: number | null;
  membershipId?: number | null;
  amount?: string | number;
  amountValue?: number | null;
  method?: string | null;
  status?: string | null;
  paidAt?: string | null;
  at?: string | null;
  notes?: string | null;
}
