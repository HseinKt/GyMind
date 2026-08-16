import { get, patch, post, put } from "./apiClient";
import type { MembershipPlan } from "../types/membership";

export type MembershipPlanPayload = Pick<
  MembershipPlan,
  "gymId" | "name" | "price" | "durationMonth" | "accessType" | "includesClasses" | "includesPt" | "isActive" | "branchIds"
>;

export const membershipPlansApi = {
  getPlans: () => get<MembershipPlan[]>("/membershipplans"),
  createPlan: (data: MembershipPlanPayload) => post<MembershipPlan>("/membershipplans", data),
  updatePlan: (id: number, data: MembershipPlanPayload) => put<MembershipPlan>(`/membershipplans/${id}`, data),
  activatePlan: (plan: MembershipPlan) => patch<MembershipPlan>(`/membershipplans/${plan.id}/status`, { isActive: true }),
  deactivatePlan: (plan: MembershipPlan) => patch<MembershipPlan>(`/membershipplans/${plan.id}/status`, { isActive: false })
};
