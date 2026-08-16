import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";

export interface DietPlan {
  id: number;
  memberId: number;
  title: string;
  description?: string | null;
  dailyCaloriesTarget?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  createdAt: string;
}

export async function getDietPlans(): Promise<DietPlan[]> {
  const data = await getJson<DietPlan[]>(endpoints.dietPlans);
  return Array.isArray(data) ? data : [];
}
