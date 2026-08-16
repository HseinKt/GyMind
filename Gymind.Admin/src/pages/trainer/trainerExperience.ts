import type { AdminWorkspace } from "../../api/dashboardApi";
import type { TrainerSession } from "../../api/trainerSessionsApi";
import type { GymClass } from "../../types/class";
import type { Member } from "../../types/member";

export type TrainerTimelineStatus = "upcoming" | "ongoing" | "completed" | "no-show";
export type TrainerTimelineKind = "session" | "class";

export interface TrainerTimelineItem {
  id: string;
  sourceId: number;
  kind: TrainerTimelineKind;
  title: string;
  subtitle: string;
  startsAt: string | null;
  endsAt?: string | null;
  location: string;
  status: TrainerTimelineStatus;
  member?: Member;
  session?: TrainerSession;
  gymClass?: GymClass;
  notes?: string | null;
}

export function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSameDay(value?: string | null, compare = new Date()) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getFullYear() === compare.getFullYear() && date.getMonth() === compare.getMonth() && date.getDate() === compare.getDate();
}

export function isTomorrow(value?: string | null) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(value, tomorrow);
}

export function memberName(member?: Member | null) {
  return member?.name ?? member?.fullName ?? "Member";
}

export function memberById(workspace?: AdminWorkspace | null) {
  return new Map((workspace?.members ?? []).map((member) => [member.id, member]));
}

export function branchName(workspace: AdminWorkspace | null | undefined, branchId?: number | null) {
  if (!branchId) return "Assigned branch";
  return workspace?.branches.find((branch) => branch.id === branchId)?.name ?? "Assigned branch";
}

export function sessionStatus(session: TrainerSession): TrainerTimelineStatus {
  const type = String(session.sessionType ?? "").toLowerCase();
  if (type.includes("no-show") || type.includes("noshow")) return "no-show";
  if (type.includes("complete")) return "completed";
  if (type.includes("start") || type.includes("ongoing")) return "ongoing";
  const date = parseDate(session.sessionDate);
  if (date && date < new Date()) return "completed";
  return "upcoming";
}

export function classStatus(gymClass: GymClass): TrainerTimelineStatus {
  const status = String(gymClass.status ?? "").toLowerCase();
  if (status.includes("cancel")) return "no-show";
  const start = parseDate(gymClass.startTime);
  const end = parseDate(gymClass.endTime);
  const now = new Date();
  if (start && end && start <= now && end >= now) return "ongoing";
  if (end && end < now) return "completed";
  return "upcoming";
}

export function buildTrainerTimeline(workspace: AdminWorkspace | null | undefined, sessions: TrainerSession[] = []) {
  const members = memberById(workspace);
  const sessionItems: TrainerTimelineItem[] = sessions.map((session) => {
    const member = session.memberId ? members.get(session.memberId) : undefined;
    return {
      id: `session-${session.id}`,
      sourceId: session.id,
      kind: "session",
      title: member ? memberName(member) : "Personal session",
      subtitle: session.sessionType || "Personal training",
      startsAt: session.sessionDate ?? null,
      location: branchName(workspace, session.branchId),
      status: sessionStatus(session),
      member,
      session,
      notes: session.notes
    };
  });

  const classItems: TrainerTimelineItem[] = (workspace?.classes ?? []).map((gymClass) => ({
    id: `class-${gymClass.id}`,
    sourceId: gymClass.id,
    kind: "class",
    title: gymClass.name,
    subtitle: `${gymClass.booked ?? 0}/${gymClass.capacity ?? "?"} booked`,
    startsAt: gymClass.startTime ?? null,
    endsAt: gymClass.endTime ?? null,
    location: branchName(workspace, gymClass.branchId),
    status: classStatus(gymClass),
    gymClass
  }));

  return [...sessionItems, ...classItems].sort((a, b) => {
    const left = parseDate(a.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const right = parseDate(b.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

export function statusTone(status: TrainerTimelineStatus) {
  if (status === "completed") return "success" as const;
  if (status === "no-show") return "danger" as const;
  if (status === "ongoing") return "info" as const;
  return "warning" as const;
}

export function membershipWarning(member: Member) {
  const end = parseDate(member.membershipEndDate);
  if (!end) return "";
  const today = new Date(new Date().toDateString());
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Membership expired";
  if (days <= 7) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  return "";
}

export function latestNoteForMember(memberId: number, sessions: TrainerSession[]) {
  return sessions
    .filter((session) => session.memberId === memberId && session.notes)
    .sort((a, b) => String(b.sessionDate ?? "").localeCompare(String(a.sessionDate ?? "")))[0]?.notes ?? "";
}

export function remainingSessions(memberId: number, sessions: TrainerSession[]) {
  const scheduled = sessions.filter((session) => session.memberId === memberId);
  const completed = scheduled.filter((session) => sessionStatus(session) === "completed").length;
  return Math.max(scheduled.length - completed, 0);
}
