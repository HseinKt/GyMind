import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { dashboardApi } from "../../api/dashboardApi";
import { trainerSessionsApi } from "../../api/trainerSessionsApi";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useApi } from "../../hooks/useApi";
import { dateLabel } from "../../utils/formatters";
import type { GymClass } from "../../types/class";
import { TrainerClassAttendanceModal } from "./TrainerClassAttendanceModal";
import { TimelineCard, TrainerHeader, TrainerShell } from "./TrainerComponents";
import { buildTrainerTimeline, isSameDay, parseDate } from "./trainerExperience";

function groupKey(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Unscheduled";
  if (isSameDay(value)) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(value, tomorrow)) return "Tomorrow";
  return dateLabel(value);
}

export function TrainerSchedulePage() {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const sessions = useApi(() => trainerSessionsApi.getTrainerSessions(), []);
  const [attendanceClass, setAttendanceClass] = useState<GymClass | null>(null);

  if (workspace.loading || sessions.loading) return <LoadingState label="Loading trainer schedule..." />;
  if (workspace.error) return <ErrorState message={workspace.error} />;
  if (sessions.error) return <ErrorState message={sessions.error} />;

  const timeline = buildTrainerTimeline(workspace.data, sessions.data ?? []);
  const upcoming = timeline.filter((item) => {
    const date = parseDate(item.startsAt);
    return !date || date >= new Date(new Date().toDateString());
  });
  const groups = upcoming.reduce<Record<string, typeof upcoming>>((acc, item) => {
    const key = groupKey(item.startsAt);
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  return (
    <TrainerShell>
      <TrainerHeader title="Schedule" subtitle="A readable timeline of your classes and personal sessions." />
      {upcoming.length ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="hidden xl:block">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-forge-primary" />
              <h2 className="text-lg font-black text-slate-950">Upcoming load</h2>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(groups).map(([key, items]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="font-semibold text-slate-800">{key}</span>
                  <Badge tone="neutral">{items.length}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            {Object.entries(groups).map(([key, items]) => (
              <section key={key} className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-forge-muted">{key}</h2>
                {items.map((item) => <TimelineCard key={item.id} item={item} onAttendance={(target) => setAttendanceClass(target.gymClass ?? null)} />)}
              </section>
            ))}
          </div>
        </div>
      ) : <EmptyState title="No upcoming trainer schedule." />}
      {attendanceClass ? <TrainerClassAttendanceModal gymClass={attendanceClass} onClose={() => setAttendanceClass(null)} /> : null}
    </TrainerShell>
  );
}
