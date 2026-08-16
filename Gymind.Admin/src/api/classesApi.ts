import { get, post, put } from "./apiClient";
import type { GymClass } from "../types/class";

export const classesApi = {
  getClasses: (params?: Record<string, unknown>) => get<GymClass[]>("/classes", params),
  getClassById: (id: number) => get<GymClass>(`/classes/${id}`),
  createClass: (data: Partial<GymClass>) => post<GymClass>("/classes", data),
  updateClass: (id: number, data: Partial<GymClass>) => put<GymClass>(`/classes/${id}`, data),
  cancelClass: (item: GymClass) => post<GymClass>(`/classes/${item.id}/cancel`)
};
