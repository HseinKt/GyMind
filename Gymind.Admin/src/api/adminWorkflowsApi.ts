import { get, post } from "./apiClient";

export interface MemberOnboardingBranchOption {
  id: number;
  name: string;
  gymId?: number | null;
}

export interface MemberOnboardingPlanOption {
  id: number;
  name: string;
  price?: number | null;
  durationMonths?: number | null;
  gymId?: number | null;
}

export interface MemberOnboardingOptions {
  branches: MemberOnboardingBranchOption[];
  membershipPlans: MemberOnboardingPlanOption[];
  trainers: Array<{ id: number; fullName: string; branchId?: number | null; gymId?: number | null }>;
}

export interface MemberOnboardingPayload {
  fullName: string;
  gender?: string;
  dob?: string;
  phone?: string;
  email?: string;
  homeBranchId: number;
  membershipPlanId: number;
  startDate: string;
  paymentAmount?: number;
  paymentMethod?: string;
  notes?: string;
  trainerUserId?: number;
}

export interface MemberOnboardingResult {
  memberId: number;
  fullName: string;
  email?: string;
  phone?: string;
  homeBranchId: number;
  membershipId: number;
  membershipStatus: string;
  membershipEndDate?: string | null;
  paymentId?: number | null;
}

export const adminWorkflowsApi = {
  getMemberOnboardingOptions: () => get<MemberOnboardingOptions>("/admin/workflows/member-onboarding/options"),
  createMemberOnboarding: (payload: MemberOnboardingPayload) =>
    post<MemberOnboardingResult>("/admin/workflows/member-onboarding", payload)
};
