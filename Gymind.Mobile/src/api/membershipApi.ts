import { Membership, MembershipPlan } from "@/types/membership";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapMembership, mapMembershipPlan } from "./mappers";

export async function getMembership(): Promise<Membership> {
  return mapMembership(await getJson(endpoints.membership));
}

export async function getAvailableMembershipPlans(): Promise<MembershipPlan[]> {
  const plans = await getJson<unknown[]>(endpoints.membershipPlans);
  return Array.isArray(plans) ? plans.map(mapMembershipPlan).filter((plan) => plan.isActive !== false) : [];
}
