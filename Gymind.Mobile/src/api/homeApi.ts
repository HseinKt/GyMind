import { getMe } from "./authApi";
import { getCurrentGymSession } from "./checkInApi";
import { getMembership } from "./membershipApi";
import { getNotifications } from "./notificationsApi";
import { getProfile } from "./profileApi";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { AuthUser } from "@/types/auth";
import { CurrentGymSession } from "@/types/checkIn";
import { Membership } from "@/types/membership";
import { NotificationItem } from "@/types/notification";
import { MemberProfile } from "@/types/profile";

export interface DashboardStats {
  weeklyAttendance: number[];
  monthlyAttendance: number[];
  currentMonthAttendance?: number[];
  previousMonthAttendance?: number[];
  workoutFrequency: number;
  totalCheckIns: number;
  caloriesBurnedEstimate: number;
  visitsThisWeek?: number;
  visitsThisMonth?: number;
  currentStreak?: number;
  averageGymTimeMinutes?: number;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
}

export interface HomeDashboard {
  user: AuthUser | null;
  profile: MemberProfile | null;
  membership: Membership | null;
  stats: DashboardStats;
  activityHeatmap: ActivityHeatmapDay[];
  currentGymSession: CurrentGymSession | null;
  notifications: NotificationItem[];
  warnings: string[];
}

export async function getHomeDashboard(): Promise<HomeDashboard> {
  const settled = await Promise.allSettled([
    getMe(),
    getProfile(),
    getMembership(),
    getJson<DashboardStats>(endpoints.home.stats),
    getJson<ActivityHeatmapDay[]>(endpoints.home.activityHeatmap),
    getCurrentGymSession(),
    getNotifications()
  ]);

  const warnings = settled
    .map((item, index) => ({ item, label: ["user", "profile", "membership", "stats", "activity", "gym session", "notifications"][index] }))
    .filter((entry) => entry.item.status === "rejected")
    .map((entry) => entry.label ?? "endpoint");

  const value = <T>(index: number, fallback: T): T => {
    const item = settled[index];
    return item?.status === "fulfilled" ? (item.value as T) : fallback;
  };

  return {
    user: value<AuthUser | null>(0, null),
    profile: value<MemberProfile | null>(1, null),
    membership: value<Membership | null>(2, null),
    stats: value(3, { weeklyAttendance: [], monthlyAttendance: [], workoutFrequency: 0, totalCheckIns: 0, caloriesBurnedEstimate: 0 }),
    activityHeatmap: value<ActivityHeatmapDay[]>(4, []),
    currentGymSession: value<CurrentGymSession | null>(5, null),
    notifications: value<NotificationItem[]>(6, []),
    warnings
  };
}
