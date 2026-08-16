export interface MembershipPlan {
  id: number;
  gymId?: number | null;
  name: string;
  price?: number | null;
  durationMonth?: number | null;
  durationMonths?: number | null;
  accessType?: string | null;
  includesClasses?: boolean;
  includesPt?: boolean;
  isActive?: boolean;
  branchIds?: number[];
  branches?: Array<{ id: number; name: string }>;
}

export interface MemberMembership {
  id: number;
  memberId?: number | null;
  planId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  freezeDays?: number | null;
}
