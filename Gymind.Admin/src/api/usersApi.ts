import { del, get, patch, post, put } from "./apiClient";
import type { User } from "../types/user";

export interface PagedUsers {
  items: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) => get<User[]>("/users", params),
  getUsersPage: (params?: Record<string, unknown>) => get<PagedUsers>("/users", params),
  getUsersByRole: (roleId: number) => get<User[]>("/users", { roleId }),
  createUser: (data: Partial<User> & { password?: string; fullName?: string }) => post<User>("/users", data),
  updateUser: (id: number, data: Partial<User>) => put<User>(`/users/${id}`, data),
  activateUser: (user: User) => patch<User>(`/users/${user.id}/status`, { isActive: true }),
  deactivateUser: (user: User) => patch<User>(`/users/${user.id}/status`, { isActive: false }),
  deleteUser: (id: number) => del(`/users/${id}`)
};
