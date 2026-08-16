import { get, post, put } from "./apiClient";
import type { TrainerClassBooking } from "./trainerClassBookingsApi";

export interface TrainerTodayClass {
  classId: number;
  className: string;
  startTime?: string | null;
  endTime?: string | null;
  branch: string;
  room: string;
  capacity: number;
  bookedMembersCount: number;
  attendedMembersCount: number;
  attendanceStatus: string;
}

export interface TrainerPersonalSession {
  sessionId: number;
  memberId?: number | null;
  memberName: string;
  sessionType: string;
  sessionDate?: string | null;
  status: string;
  notes: string;
}

export interface TrainerAssignedMember {
  memberId: number;
  memberName: string;
  phone: string;
  goal: string;
  lastSessionDate?: string | null;
  lastProgressNote: string;
  sessionsThisMonth: number;
  status: string;
}

export interface TrainerDashboard {
  trainer: { trainerName: string; role: string; today: string; branchName: string };
  kpis: { todaysClasses: number; bookedMembersToday: number; attendanceTakenClasses: number; personalSessionsToday: number; assignedMembers: number };
  todayClasses: TrainerTodayClass[];
  personalSessionsToday: TrainerPersonalSession[];
  assignedMembers: TrainerAssignedMember[];
  coachingInsights: {
    weeklyClassAttendance: { className: string; booked: number; attended: number; attendancePercentage: number }[];
    attendanceTrend: { date: string; classes: number; bookedMembers: number; attendedMembers: number }[];
    assignedMemberActivity: { memberId: number; memberName: string; lastSessionDate?: string | null; sessionsThisMonth: number; status: string }[];
  };
}

export interface TrainerMemberProgress {
  member: TrainerAssignedMember;
  recentClasses: { className: string; startTime?: string | null; attended: boolean }[];
  recentSessions: TrainerPersonalSession[];
  notes: { noteId: number; noteType: string; noteText: string; reminder: string; createdAt?: string | null }[];
}

export const trainerDashboardApi = {
  getDashboard: () => get<TrainerDashboard>("/trainer/dashboard"),
  saveClassAttendance: (classId: number, bookings: { bookingId: number; memberId?: number | null; attended: boolean; note?: string }[]) =>
    put<TrainerClassBooking[]>(`/trainer/classes/${classId}/attendance`, { bookings }),
  completePersonalSession: (sessionId: number, data: { workoutSummary: string; performanceNote: string; injuryPainNote: string; nextSessionFocus: string }) =>
    put(`/trainer/personal-sessions/${sessionId}/complete`, data),
  getMemberProgress: (memberId: number) => get<TrainerMemberProgress>(`/trainer/members/${memberId}/progress`),
  addProgressNote: (memberId: number, data: { noteType: string; noteText: string; reminder?: string }) =>
    post(`/trainer/members/${memberId}/progress-notes`, data)
};
