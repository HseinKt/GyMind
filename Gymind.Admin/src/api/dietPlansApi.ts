import { get, post } from "./apiClient";

export interface DietPlan {
  id: number;
  memberId: number;
  title: string;
  description?: string;
  dailyCaloriesTarget?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  createdAt: string;
}

export interface CreateDietPlanPayload {
  memberId: number;
  title: string;
  description?: string;
  dailyCaloriesTarget?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}

export const dietPlansApi = {
  getDietPlans: (memberId: number) => get<DietPlan[]>("/diet-plans", { memberId }),
  createDietPlan: (payload: CreateDietPlanPayload) => post<DietPlan>("/diet-plans", payload)
};
