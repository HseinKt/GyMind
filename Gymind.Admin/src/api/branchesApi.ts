import { get, post, put } from "./apiClient";
import type { Branch } from "../types/branch";

export const branchesApi = {
  getBranches: (params?: Record<string, unknown>) => get<Branch[]>("/branches", params),
  getBranchById: (id: number) => get<Branch>(`/branches/${id}`),
  createBranch: (data: Partial<Branch>) => post<Branch>("/branches", data),
  updateBranch: (id: number, data: Partial<Branch>) => put<Branch>(`/branches/${id}`, data),
  activateBranch: (branch: Branch) => put<Branch>(`/branches/${branch.id}`, { ...branch, isActive: true }),
  deactivateBranch: (branch: Branch) => put<Branch>(`/branches/${branch.id}`, { ...branch, isActive: false })
};
