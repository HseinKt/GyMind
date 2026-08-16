import { Link, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { dashboardApi } from "../../api/dashboardApi";
import { trainerSessionsApi } from "../../api/trainerSessionsApi";
import { membersApi } from "../../api/membersApi";
import { dietPlansApi } from "../../api/dietPlansApi";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { useApi } from "../../hooks/useApi";
import { dateLabel, timeLabel } from "../../utils/formatters";
import { ActionLink, TrainerHeader, TrainerShell } from "./TrainerComponents";
import { memberName, membershipWarning, parseDate, sessionStatus } from "./trainerExperience";

export function TrainerMemberDetailPage() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const id = Number(pathParts[pathParts.length - 1]);
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const sessions = useApi(() => trainerSessionsApi.getTrainerSessions({ memberId: id }), [id]);
  const dietPlans = useApi(() => dietPlansApi.getDietPlans(id), [id]);

  // Diet plan form state
  const [dietOpen, setDietOpen] = useState(false);
  const [dietForm, setDietForm] = useState({
    title: "",
    description: "",
    dailyCaloriesTarget: "",
    proteinGrams: "",
    carbsGrams: "",
    fatGrams: ""
  });
  const [dietSaving, setDietSaving] = useState(false);
  const [dietError, setDietError] = useState("");

  if (workspace.loading || sessions.loading) return <LoadingState label="Loading member context..." />;
  if (workspace.error) return <ErrorState message={workspace.error} />;
  if (sessions.error) return <ErrorState message={sessions.error} />;

  const member = workspace.data?.members.find((item) => item.id === id);
  if (!member) return <EmptyState title="Member not found." message="This member is not assigned to your trainer scope." />;

  const sortedSessions = [...(sessions.data ?? [])].sort((a, b) => String(b.sessionDate ?? "").localeCompare(String(a.sessionDate ?? "")));
  const nextSession = [...sortedSessions].reverse().find((session) => {
    const date = parseDate(session.sessionDate);
    return date && date >= new Date();
  });

  const handleSaveDietPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dietForm.title.trim()) {
      setDietError("Title is required.");
      return;
    }
    setDietSaving(true);
    setDietError("");
    try {
      const payload = {
        memberId: id,
        title: dietForm.title,
        description: dietForm.description || undefined,
        dailyCaloriesTarget: dietForm.dailyCaloriesTarget ? Number(dietForm.dailyCaloriesTarget) : undefined,
        proteinGrams: dietForm.proteinGrams ? Number(dietForm.proteinGrams) : undefined,
        carbsGrams: dietForm.carbsGrams ? Number(dietForm.carbsGrams) : undefined,
        fatGrams: dietForm.fatGrams ? Number(dietForm.fatGrams) : undefined
      };
      await dietPlansApi.createDietPlan(payload);
      await dietPlans.reload();
      setDietForm({ title: "", description: "", dailyCaloriesTarget: "", proteinGrams: "", carbsGrams: "", fatGrams: "" });
      setDietOpen(false);
    } catch (err) {
      setDietError(err instanceof Error ? err.message : "Failed to assign diet plan.");
    } finally {
      setDietSaving(false);
    }
  };

  return (
    <TrainerShell>
      <TrainerHeader title={memberName(member)} subtitle="Member readiness, latest notes, and next session actions." />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">{memberName(member)}</h2>
                <p className="text-sm text-forge-muted">{member.email ?? "No email"}</p>
              </div>
              {membershipWarning(member) ? <Badge tone="warning">{membershipWarning(member)}</Badge> : <Badge tone="success">{member.status ?? "Active"}</Badge>}
            </div>
            <div className="mt-5 grid gap-2">
              {member.phone ? <a className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-forge-border bg-white px-3 text-sm font-semibold text-slate-800" href={`tel:${member.phone}`}><FileText size={16} /> Call</a> : null}
              {member.phone ? <a className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-forge-border bg-white px-3 text-sm font-semibold text-slate-800" href={`sms:${member.phone}`}><FileText size={16} /> Message</a> : null}
              {member.email ? <a className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-forge-border bg-white px-3 text-sm font-semibold text-slate-800" href={`mailto:${member.email}`}><FileText size={16} /> Email</a> : null}
              <ActionLink to={`/trainer/notes/new?memberId=${member.id}`} primary>Add note</ActionLink>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-slate-950">Membership</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-forge-muted">Status</dt><dd className="font-bold">{member.status ?? "Unknown"}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-forge-muted">Valid until</dt><dd className="font-bold">{dateLabel(member.membershipEndDate)}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-forge-muted">Attendance</dt><dd className="font-bold">{member.attendanceToday ?? "No data"}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-forge-muted">Payment</dt><dd className="font-bold">{member.paymentStatus ?? "No data"}</dd></div>
            </dl>
          </Card>
        </aside>

        <main className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Next session</h2>
              {nextSession ? <Badge tone="info">{timeLabel(nextSession.sessionDate)}</Badge> : null}
            </div>
            {nextSession ? (
              <div className="mt-4">
                <p className="font-bold text-slate-950">{nextSession.sessionType ?? "Personal training"}</p>
                <p className="text-sm text-forge-muted">{dateLabel(nextSession.sessionDate)} · {timeLabel(nextSession.sessionDate)}</p>
                <div className="mt-4"><ActionLink to={`/trainer/session/${nextSession.id}`} primary>Open session</ActionLink></div>
              </div>
            ) : <EmptyState title="No upcoming personal session." />}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Diet Plan</h2>
              <button
                onClick={() => setDietOpen(true)}
                className="text-xs font-bold text-forge-primary hover:underline"
              >
                Assign Plan
              </button>
            </div>
            {dietPlans.loading ? (
              <p className="mt-2 text-xs text-forge-muted">Loading plans...</p>
            ) : dietPlans.data && dietPlans.data.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-forge-border bg-slate-50/50 p-3">
                  <p className="font-bold text-slate-950">{dietPlans.data[0].title}</p>
                  {dietPlans.data[0].description ? (
                    <p className="mt-1 text-xs text-slate-600">{dietPlans.data[0].description}</p>
                  ) : null}
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
                    <div><dt className="text-forge-muted">Calories</dt><dd className="font-bold text-slate-900">{dietPlans.data[0].dailyCaloriesTarget ?? "N/A"} kcal</dd></div>
                    <div><dt className="text-forge-muted">Protein</dt><dd className="font-bold text-slate-900">{dietPlans.data[0].proteinGrams ?? "N/A"}g</dd></div>
                    <div><dt className="text-forge-muted">Carbs</dt><dd className="font-bold text-slate-900">{dietPlans.data[0].carbsGrams ?? "N/A"}g</dd></div>
                    <div><dt className="text-forge-muted">Fat</dt><dd className="font-bold text-slate-900">{dietPlans.data[0].fatGrams ?? "N/A"}g</dd></div>
                  </dl>
                </div>
                {dietPlans.data.length > 1 ? (
                  <div className="mt-2">
                    <p className="text-xs font-bold text-forge-muted uppercase tracking-wider">History</p>
                    <ul className="mt-1 divide-y divide-forge-border max-h-24 overflow-y-auto">
                      {dietPlans.data.slice(1).map((plan) => (
                        <li key={plan.id} className="py-2 text-xs flex justify-between">
                          <span className="font-medium text-slate-700">{plan.title}</span>
                          <span className="text-forge-muted">{dateLabel(plan.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No diet plan assigned." message="Assign a nutrition targets plan to this member." />
            )}
          </Card>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-forge-muted">Session notes</h2>
            {sortedSessions.length ? sortedSessions.map((session) => (
              <Link key={session.id} to={`/trainer/session/${session.id}`} className="block rounded-2xl border border-forge-border bg-white p-4 shadow-panel transition hover:border-forge-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{session.sessionType ?? "Session"}</p>
                    <p className="text-sm text-forge-muted">{dateLabel(session.sessionDate)} · {timeLabel(session.sessionDate)}</p>
                  </div>
                  <Badge tone={sessionStatus(session) === "completed" ? "success" : "neutral"}>{sessionStatus(session)}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-700">{session.notes || "No note yet."}</p>
              </Link>
            )) : <EmptyState title="No session history yet." />}
          </section>
        </main>
      </div>

      {/* Diet Plan Modal */}
      <Modal open={dietOpen} title="Assign Nutrition Diet Plan" onClose={() => setDietOpen(false)}>
        <form onSubmit={handleSaveDietPlan} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-slate-800 md:col-span-2">
            Diet Title
            <Input required placeholder="e.g. Bulk Active Phase" value={dietForm.title} onChange={(e) => setDietForm({ ...dietForm, title: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800 md:col-span-2">
            Plan Description & Split Details
            <Textarea placeholder="Meal breakdown or notes..." value={dietForm.description} onChange={(e) => setDietForm({ ...dietForm, description: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Daily Calories Target (kcal)
            <Input type="number" value={dietForm.dailyCaloriesTarget} onChange={(e) => setDietForm({ ...dietForm, dailyCaloriesTarget: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Protein Target (g)
            <Input type="number" value={dietForm.proteinGrams} onChange={(e) => setDietForm({ ...dietForm, proteinGrams: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Carbohydrates Target (g)
            <Input type="number" value={dietForm.carbsGrams} onChange={(e) => setDietForm({ ...dietForm, carbsGrams: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Fat Target (g)
            <Input type="number" value={dietForm.fatGrams} onChange={(e) => setDietForm({ ...dietForm, fatGrams: e.target.value })} />
          </label>
          {dietError ? <div className="md:col-span-2"><ErrorState message={dietError} /></div> : null}
          <div className="md:col-span-2 flex justify-end gap-2 mt-3">
            <Button type="button" onClick={() => setDietOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={dietSaving}>{dietSaving ? "Assign Plan" : "Assign Plan"}</Button>
          </div>
        </form>
      </Modal>
    </TrainerShell>
  );
}
