export interface WeeklyActivityDay {
  day: string;
  date: string;
  minutes: number;
  isToday: boolean;
}

export interface ProfileDashboardStats {
  totalWorkouts: number;
  totalHours: number;
  classesAttended: number;
  membershipRemainingDays: number;
  workoutsChangePercent?: number | null;
  hoursChangePercent?: number | null;
  classesChangePercent?: number | null;
  membershipStatus?: string | null;
  averageTrainingMinutes: number;
  weeklyActivity: WeeklyActivityDay[];
}
