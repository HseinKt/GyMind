export const ACCESS_TYPE_OPTIONS = [
  { value: "full-access", label: "Full access - all branches" },
  { value: "DAY_PASS", label: "Day pass" },
  { value: "one_branch", label: "One branch" },
  { value: "multi-branch", label: "Multi-branch" }
] as const;

export type MembershipPlanAccessType = typeof ACCESS_TYPE_OPTIONS[number]["value"];

export function isMembershipPlanAccessType(value?: string | null): value is MembershipPlanAccessType {
  return ACCESS_TYPE_OPTIONS.some((item) => item.value === value);
}

export function membershipPlanAccessTypeLabel(value?: string | null) {
  return ACCESS_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? "No data";
}
