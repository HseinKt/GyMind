import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboardApi";
import { trainerSessionsApi } from "../../api/trainerSessionsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useApi } from "../../hooks/useApi";
import { TrainerHeader, TrainerShell } from "./TrainerComponents";

export function TrainerQuickNotePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.pathname.includes("?") ? location.pathname.split("?")[1] : window.location.search);
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const [memberId, setMemberId] = useState(params.get("memberId") ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const sessionId = Number(params.get("sessionId") ?? 0);

  const selectedMember = useMemo(() => workspace.data?.members.find((member) => member.id === Number(memberId)), [memberId, workspace.data?.members]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await trainerSessionsApi.createTrainerSession({
        memberId: Number(memberId),
        sessionType: sessionId ? "Session note" : "Quick note",
        sessionDate: new Date().toISOString(),
        notes: sessionId ? `Session #${sessionId}\n${notes}` : notes
      });
      navigate(selectedMember ? `/trainer/member/${selectedMember.id}` : "/trainer/today");
    } finally {
      setSaving(false);
    }
  }

  if (workspace.loading) return <LoadingState label="Loading note form..." />;
  if (workspace.error) return <ErrorState message={workspace.error} />;

  return (
    <TrainerShell>
      <TrainerHeader title="Quick note" subtitle="Capture the useful context while it is still fresh." />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-black text-slate-950">Context</h2>
          <p className="mt-3 text-sm text-forge-muted">{selectedMember ? `Saving note for ${selectedMember.name ?? selectedMember.fullName}.` : "Choose an assigned member to attach this note."}</p>
        </Card>
        <Card>
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-1 text-sm font-bold text-slate-800">
              Member
              <Select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
                <option value="">Select assigned member</option>
                {workspace.data?.members.map((member) => <option key={member.id} value={member.id}>{member.name ?? member.fullName}</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">
              Note
              <Textarea className="min-h-44" value={notes} onChange={(event) => setNotes(event.target.value)} required placeholder="Training focus, blockers, next action, or follow-up." />
            </label>
            <Button className="min-h-12 w-full" disabled={saving}>Save note</Button>
          </form>
        </Card>
      </div>
    </TrainerShell>
  );
}
