import { del, get, patch, post, postForm, put } from "./apiClient";
import type { Gym } from "../types/gym";

export const gymsApi = {
  getGyms: () => get<Gym[]>("/gyms"),
  getGymById: (id: number) => get<Gym>(`/gyms/${id}`),
  createGym: (data: Partial<Gym>) => post<Gym>("/gyms", data),
  updateGym: (id: number, data: Partial<Gym>) => put<Gym>(`/gyms/${id}`, data),
  activateGym: (gym: Gym) => patch<Gym>(`/gyms/${gym.id}/status`, { isActive: true }),
  deactivateGym: (gym: Gym) => patch<Gym>(`/gyms/${gym.id}/status`, { isActive: false }),
  linkOwner: (gymId: number, userId: number) => post<Gym>(`/gyms/${gymId}/owners`, { userId }),
  uploadLogo: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return postForm<{ logoUrl: string }>("/gyms/upload-logo", data);
  },
  deleteGym: (id: number) => del(`/gyms/${id}`)
};
