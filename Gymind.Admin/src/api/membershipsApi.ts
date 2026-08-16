import { get, post, put } from "./apiClient";
import type { MemberMembership } from "../types/membership";

export const membershipsApi = {
  getMemberMemberships: (memberId: number) => get<MemberMembership[]>("/membermemberships", { memberId }),
  assignMembership: (memberId: number, data: Partial<MemberMembership>) => post<MemberMembership>("/membermemberships", { ...data, memberId }),
  renewMembership: (memberId: number, data: Partial<MemberMembership>) => post<MemberMembership>("/membermemberships", { ...data, memberId, status: "ACTIVE" }),
  freezeMembership: (id: number, data: Partial<MemberMembership>) => put<MemberMembership>(`/membermemberships/${id}`, { ...data, status: "FROZEN" }),
  getExpiringMemberships: () => get<MemberMembership[]>("/membermemberships", { status: "Expiring" })
};
