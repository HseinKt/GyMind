import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { dashboardApi } from "../../api/dashboardApi";
import { trainerSessionsApi } from "../../api/trainerSessionsApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Textarea } from "../../components/ui/Textarea";
import { useApi } from "../../hooks/useApi";
import { dateLabel, timeLabel } from "../../utils/formatters";
import { ActionLink, ContactActions, TrainerHeader, TrainerShell } from "./TrainerComponents";
import { memberName, sessionStatus, statusTone } from "./trainerExperience";

export function TrainerSessionPage() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const id = Number(pathParts[pathParts.length - 1]);
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const sessions = useApi(() => trainerSessionsApi.getTrainerSessions(), []);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const session = sessions.data?.find((item) => item.id === id);
  const member = session?.memberId ? workspace.data?.members.find((item) => item.id === session.memberId) : undefined;

  async function save(sessionType: string, appendedNote: string) {
    if (!session) return;
    setSaving(true);
    try {
      await trainerSessionsApi.updateTrainerSession(session.id, {
        ...session,
        sessionType,
        notes: [session.notes, appendedNote, note].filter(Boolean).join("\n")
      });
      setNote("");
      await sessions.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (workspace.loading || sessions.loading) return <LoadingState label="Loading session..." />;
  if (workspace.error) return <ErrorState message={workspace.error} />;
  if (sessions.error) return <ErrorState message={sessions.error} />;
  if (!session) return <EmptyState title="Session not found." message="This session is outside your trainer scope or no longer exists." />;

  return (
    <TrainerShell>
      <TrainerHeader title={member ? memberName(member) : "Personal session"} subtitle="Start, complete, report, and document this session from one screen." />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <main className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-forge-muted">{dateLabel(session.sessionDate)} · {timeLabel(session.sessionDate)}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{session.sessionType ?? "Personal training"}</h2>
              </div>
              <Badge tone={statusTone(sessionStatus(session))}>{sessionStatus(session)}</Badge>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Button disabled={saving} onClick={() => save("Started", "Session started.")}>Start</Button>
              <Button disabled={saving} variant="secondary" onClick={() => save("Completed", "Session completed.")}>Complete</Button>
              <Button disabled={saving} variant="danger" onClick={() => save("No-show", "Member reported as no-show.")}>No-show</Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-slate-950">Session note</h2>
            <Textarea className="mt-4 min-h-40" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed, what was trained, what should happen next?" />
            <div className="mt-3 flex justify-end">
              <Button disabled={saving || !note.trim()} onClick={() => save(session.sessionType ?? "Note", "Session note added.")}>Save note</Button>
            </div>
            {session.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{session.notes}</p> : null}
          </Card>
        </main>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-black text-slate-950">Member</h2>
            {member ? (
              <>
                <Link to={`/trainer/member/${member.id}`} className="mt-3 block text-xl font-black text-slate-950 hover:text-forge-primary">{memberName(member)}</Link>
                <p className="text-sm text-forge-muted">{member.phone ?? "No phone"}</p>
                <div className="mt-4"><ContactActions phone={member.phone} /></div>
              </>
            ) : <EmptyState title="No member linked." />}
          </Card>
          <Card>
            <h2 className="text-lg font-black text-slate-950">Quick links</h2>
            <div className="mt-4 grid gap-2">
              {member ? <ActionLink to={`/trainer/notes/new?memberId=${member.id}&sessionId=${session.id}`} primary>Add quick note</ActionLink> : null}
              <ActionLink to="/trainer/today">Back to today</ActionLink>
              <ActionLink to="/trainer/schedule">Open schedule</ActionLink>
            </div>
          </Card>
        </aside>
      </div>
    </TrainerShell>
  );
}
