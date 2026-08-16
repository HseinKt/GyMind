export interface BodyInsights {
  bmi?: number | null;
  bmiCategory?: string | null;
  idealWeightRange?: string | null;
  bodyFatPercentage?: number | null;
  leanBodyMassKg?: number | null;
  bodyMassIndex?: number | null;
  weightToHeightRatio?: number | null;
  shoulderToWaistRatio?: number | null;
  chestToWaistRatio?: number | null;
  bmr?: number | null;
  maintenanceCalories?: number | null;
  proteinTargetGrams?: number | null;
  carbsTargetGrams?: number | null;
  fatTargetGrams?: number | null;
  waterTargetMl?: number | null;
  missingFields: string[];
}
