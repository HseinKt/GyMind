export interface Payment {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  memberId?: number | null;
  membershipId?: number | null;
  member?: string;
  branch?: string;
  plan?: string;
  amount?: string | number;
  amountValue?: number | null;
  method?: string | null;
  paymentType?: string | null;
  cashier?: string | null;
  status?: string;
  paidAt?: string | null;
  at?: string;
  notes?: string | null;
}
