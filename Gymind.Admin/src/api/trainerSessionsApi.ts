import { get, post, put } from "./apiClient";

export interface TrainerSession {
  id: number;
  trainerUserId?: number | null;
  memberId?: number | null;
  branchId?: number | null;
  sessionType?: string | null;
  sessionDate?: string | null;
  notes?: string | null;
}

export const trainerSessionsApi = {
  getTrainerSessions: (params?: Record<string, unknown>) => get<TrainerSession[]>("/trainersessions", params),
  createTrainerSession: (data: Partial<TrainerSession>) => post<TrainerSession>("/trainersessions", data),
  updateTrainerSession: (id: number, data: Partial<TrainerSession>) => put<TrainerSession>(`/trainersessions/${id}`, data),
  getTrainerMembers: () => get("/trainersessions")
};
