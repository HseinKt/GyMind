import { del, get, patch, post, put } from "./apiClient";
import type { Member, MemberPersonalInfo, StaffMemberDetails } from "../types/member";

export interface PagedMembers {
  items: Member[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateMemberPayload extends Partial<Member> {
  password?: string;
  joinDate?: string;
}

export const membersApi = {
  getMembers: (params?: Record<string, unknown>) => get<Member[]>("/members", params),
  getMembersPage: (params?: Record<string, unknown>) => get<PagedMembers>("/members", params),
  searchStaffMembers: (params?: Record<string, unknown>) => get<PagedMembers>("/staff/member-search", params),
  getStaffMemberDetails: (id: number) => get<StaffMemberDetails>(`/staff/members/${id}`),
  searchMembers: (query: string) => get<Member[]>("/members", { query }),
  getMemberById: (id: number) => get<Member>(`/members/${id}`),
  createMember: (data: CreateMemberPayload) => post<Member>("/members", data),
  updateMember: (id: number, data: Partial<Member>) => put<Member>(`/members/${id}`, data),
  getMemberPersonalInfo: (id: number) => get<MemberPersonalInfo>(`/members/${id}/personal-info`),
  updateMemberPersonalInfo: (id: number, data: Partial<MemberPersonalInfo>) => put<MemberPersonalInfo>(`/members/${id}/personal-info`, data),
  getMemberProfile: (id: number) => get<any>(`/members/${id}/profile`),
  updateMemberAssessment: (id: number, data: any) => put<any>(`/members/${id}/assessment`, data),
  activateMember: (member: Member) => patch<Member>(`/members/${member.id}/status`, { isActive: true }),
  deactivateMember: (member: Member) => patch<Member>(`/members/${member.id}/status`, { isActive: false }),
  deleteMember: (id: number) => del(`/members/${id}`)
};
