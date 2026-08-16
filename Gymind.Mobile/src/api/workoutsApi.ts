import { getJson, postJson } from "./apiClient";
import { endpoints } from "./endpoints";

export interface WorkoutSession {
  id: number;
  userId: number;
  durationSeconds: number;
  completedAt: string;
  createdAt: string;
}

export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  const data = await getJson<WorkoutSession[]>(endpoints.workouts);
  return Array.isArray(data) ? data : [];
}

export async function logWorkoutSession(durationSeconds: number, completedAt: string): Promise<any> {
  return postJson(endpoints.workouts, { durationSeconds, completedAt });
}
