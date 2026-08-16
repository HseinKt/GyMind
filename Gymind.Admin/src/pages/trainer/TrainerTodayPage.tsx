import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, X } from "lucide-react";
import { trainerClassBookingsApi, type TrainerClassBooking } from "../../api/trainerClassBookingsApi";
import { trainerDashboardApi, type TrainerAssignedMember, type TrainerDashboard, type TrainerTodayClass } from "../../api/trainerDashboardApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { useApi } from "../../hooks/useApi";
import { dateLabel, percent, timeLabel } from "../../utils/formatters";

function tone(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("taken") || lower.includes("complete") || lower.includes("active")) return "success" as const;
  if (lower.includes("pending") || lower.includes("upcoming") || lower.includes("follow")) return "warning" as const;
  if (lower.includes("missed") || lower.includes("expired")) return "danger" as const;
  return "info" as const;
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function count(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Math.round(Number.isFinite(number) ? number : 0).toLocaleString("en-US");
}

function tooltipValue(value: unknown, name: unknown) {
  const label = String(name || "Value");
  if (label.toLowerCase().includes("percentage") || label.toLowerCase().includes("rate")) return [percent(value), label];
  return [count(value), label];
}

function labelForKey(key: string) {
  const labels: Record<string, string> = {
    className: "Class Name",
    booked: "Booked",
    attended: "Attended",
    attendancePercentage: "Attendance Percentage",
    date: "Date",
    classes: "Classes",
    bookedMembers: "Booked Members",
    attendedMembers: "Attended Members",
    memberId: "Member ID",
    memberName: "Member Name",
    lastSessionDate: "Last Session",
    sessionsThisMonth: "Sessions This Month",
    status: "Status"
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function displayCell(key: string, value: unknown) {
  if (key.toLowerCase().includes("percentage")) return percent(value);
  if (key.toLowerCase().includes("date") && value) return dateLabel(String(value));
  if (typeof value === "number") return count(value);
  return String(value ?? "Not set");
}

function Kpi({ label, value, meta }: { label: string; value: React.ReactNode; meta: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-forge-muted">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-slate-950 sm:text-3xl">{value}</strong>
      <span className="mt-2 block text-xs text-forge-muted">{meta}</span>
    </Card>
  );
}

function ViewDataModal({ title, rows, onClose }: { title: string; rows: Record<string, unknown>[]; onClose: () => void }) {
  const keys = Object.keys(rows[0] ?? {});
  return (
    <Modal open title={title} onClose={onClose}>
      {rows.length ? (
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
              <tr>{keys.map((key) => <th key={key} className="px-3 py-3">{labelForKey(key)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-forge-border">
              {rows.map((row, index) => <tr key={index}>{keys.map((key) => <td key={key} className="px-3 py-3">{displayCell(key, row[key])}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No data available." />}
    </Modal>
  );
}

function AttendancePanel({ trainerClass, onClose, onSaved }: { trainerClass: TrainerTodayClass; onClose: () => void; onSaved: () => void }) {
  const [bookings, setBookings] = useState<TrainerClassBooking[]>([]);
  const [draft, setDraft] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const dirty = bookings.some((booking) => draft[booking.bookingId] !== booking.attended) || Object.values(notes).some(Boolean);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    trainerClassBookingsApi.getClassBookings(trainerClass.classId)
      .then((rows) => {
        if (!active) return;
        setBookings(rows);
        setDraft(Object.fromEntries(rows.map((row) => [row.bookingId, row.attended])));
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : "Could not load booked members."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [trainerClass.classId]);

  function close() {
    if (dirty && !window.confirm("You have unsaved attendance changes. Close anyway?")) return;
    onClose();
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const updated = await trainerDashboardApi.saveClassAttendance(trainerClass.classId, bookings.map((booking) => ({
        bookingId: booking.bookingId,
        memberId: booking.memberId,
        attended: draft[booking.bookingId] ?? false,
        note: notes[booking.bookingId]
      })));
      setBookings(updated);
      setDraft(Object.fromEntries(updated.map((row) => [row.bookingId, row.attended])));
      setNotes({});
      setSaved("Attendance saved successfully.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30">
      <aside className="ml-auto flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-forge-border p-4">
          <div>
            <p className="text-xs font-bold uppercase text-forge-primary">Class Attendance</p>
            <h2 className="text-2xl font-black text-slate-950">{trainerClass.className}</h2>
            <p className="mt-1 text-sm text-forge-muted">{dateLabel(trainerClass.startTime)} · {timeLabel(trainerClass.startTime)} to {timeLabel(trainerClass.endTime)} · {bookings.length} booked</p>
            <Badge tone={trainerClass.attendanceStatus === "Taken" ? "success" : "warning"}>{trainerClass.attendanceStatus}</Badge>
          </div>
          <Button type="button" variant="ghost" onClick={close} aria-label="Close attendance"><X size={18} /></Button>
        </div>
        {error ? <div className="m-4"><ErrorState message={error} /></div> : null}
        {saved ? <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{saved}</div> : null}
        <div className="flex gap-2 border-b border-forge-border p-4">
          <Button type="button" variant="secondary" onClick={() => setDraft(Object.fromEntries(bookings.map((row) => [row.bookingId, true])))}>Mark all present</Button>
          <Button type="button" variant="secondary" onClick={() => setDraft(Object.fromEntries(bookings.map((row) => [row.bookingId, false])))}>Mark all absent</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading ? <LoadingState label="Loading booked members..." /> : null}
          {!loading && !bookings.length ? <EmptyState title="No members booked for this class." /> : null}
          {!loading && bookings.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
                  <tr>
                    <th className="px-3 py-3">Attendance</th>
                    <th className="px-3 py-3">Member name</th>
                    <th className="px-3 py-3">Membership</th>
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Quick note</th>
                    <th className="px-3 py-3">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forge-border">
                  {bookings.map((booking) => (
                    <tr key={booking.bookingId}>
                      <td className="px-3 py-3"><input className="h-6 w-6" type="checkbox" checked={draft[booking.bookingId] ?? false} onChange={(event) => setDraft((current) => ({ ...current, [booking.bookingId]: event.target.checked }))} /></td>
                      <td className="px-3 py-3 font-semibold text-slate-950">{booking.memberName}</td>
                      <td className="px-3 py-3"><Badge tone="info">Available</Badge></td>
                      <td className="px-3 py-3"><Badge tone="success">{booking.status ?? "Booked"}</Badge></td>
                      <td className="px-3 py-3"><input className="focus-ring min-h-10 w-56 rounded-lg border border-forge-border px-3" value={notes[booking.bookingId] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [booking.bookingId]: event.target.value }))} placeholder="Optional note" /></td>
                      <td className="px-3 py-3">{booking.memberId ? <Link className="font-semibold text-forge-primary" to={`/trainer/member/${booking.memberId}`}>View member</Link> : "Guest"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
        <div className="sticky bottom-0 flex items-center justify-between border-t border-forge-border bg-white p-4">
          <span className="text-sm text-forge-muted">{dirty ? "Unsaved changes" : "All changes saved"}</span>
          <Button type="button" disabled={saving || !dirty} onClick={save}>{saving ? "Saving..." : "Save Attendance"}</Button>
        </div>
      </aside>
    </div>
  );
}

function ProgressModal({ member, onClose }: { member: TrainerAssignedMember; onClose: () => void }) {
  const progress = useApi(() => trainerDashboardApi.getMemberProgress(member.memberId), [member.memberId]);
  const [noteType, setNoteType] = useState("Progress");
  const [noteText, setNoteText] = useState("");
  const [reminder, setReminder] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await trainerDashboardApi.addProgressNote(member.memberId, { noteType, noteText, reminder });
      setNoteText("");
      setReminder("");
      await progress.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save progress note.");
    }
  }

  return (
    <Modal open title={`Progress - ${member.memberName}`} onClose={onClose}>
      {progress.loading ? <LoadingState label="Loading member progress..." /> : null}
      {progress.error ? <ErrorState message={progress.error} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {progress.data ? (
        <div className="grid gap-4">
          <div className="rounded-xl bg-slate-50 p-3"><strong>{progress.data.member.memberName}</strong><p className="text-sm text-forge-muted">{progress.data.member.status} · {progress.data.member.sessionsThisMonth} sessions this month</p></div>
          <form onSubmit={submit} className="grid gap-3 rounded-xl border border-forge-border p-3">
            <select className="focus-ring min-h-10 rounded-lg border border-forge-border px-3" value={noteType} onChange={(event) => setNoteType(event.target.value)}>
              {["Workout", "Progress", "Injury", "Reminder", "Other"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea className="focus-ring min-h-24 rounded-lg border border-forge-border px-3 py-2" value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Note text" required />
            <input className="focus-ring min-h-10 rounded-lg border border-forge-border px-3" value={reminder} onChange={(event) => setReminder(event.target.value)} placeholder="Optional next session reminder" />
            <Button>Add progress note</Button>
          </form>
          <div className="space-y-2">
            <h3 className="font-black text-slate-950">Progress notes timeline</h3>
            {progress.data.notes.length ? progress.data.notes.map((note) => <div key={note.noteId} className="rounded-xl border border-forge-border p-3"><Badge tone="info">{note.noteType}</Badge><p className="mt-2 text-sm">{note.noteText}</p><p className="mt-1 text-xs text-forge-muted">{note.createdAt ? dateLabel(note.createdAt) : "No date"} {note.reminder ? `· Reminder: ${note.reminder}` : ""}</p></div>) : <EmptyState title="No progress notes yet." />}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Dashboard({ data, reload }: { data: TrainerDashboard; reload: () => void }) {
  const [attendanceClass, setAttendanceClass] = useState<TrainerTodayClass | null>(null);
  const [progressMember, setProgressMember] = useState<TrainerAssignedMember | null>(null);
  const [viewData, setViewData] = useState<{ title: string; rows: Record<string, unknown>[] } | null>(null);
  const attendanceTaken = `${data.kpis.attendanceTakenClasses} / ${data.kpis.todaysClasses}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forge-primary">Trainer Dashboard / Coaching Workspace</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{data.trainer.trainerName}</h1>
          <p className="mt-1 text-sm text-forge-muted">Trainer · {dateLabel(data.trainer.today)} · {data.trainer.branchName}</p>
        </div>
        <Badge tone="info">Today's coaching schedule</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Today's Classes" value={data.kpis.todaysClasses} meta="Assigned today" />
        <Kpi label="Booked Members Today" value={data.kpis.bookedMembersToday} meta="Across today's classes" />
        <Kpi label="Attendance Taken" value={attendanceTaken} meta="Completed class lists" />
        <Kpi label="Assigned Members" value={data.kpis.assignedMembers} meta="Coaching list" />
      </div>

      <div className="grid gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-black text-slate-950">Today's Classes</h2>
          <div className="space-y-3">
            {data.todayClasses.length ? data.todayClasses.map((item) => (
              <div key={item.classId} className="grid gap-3 rounded-xl border border-forge-border p-4 md:grid-cols-[0.8fr_1.2fr_0.6fr_0.8fr_auto] md:items-center">
                <div className="font-bold text-forge-muted">{timeLabel(item.startTime)}</div>
                <div><strong>{item.className}</strong><p className="text-sm text-forge-muted">{item.branch} · {item.room}</p></div>
                <Badge tone="neutral">{item.bookedMembersCount} booked</Badge>
                <Badge tone={tone(item.attendanceStatus)}>{item.attendanceStatus}</Badge>
                <Button type="button" onClick={() => setAttendanceClass(item)}>Open Attendance</Button>
              </div>
            )) : <EmptyState title="No classes assigned today." />}
          </div>
        </Card>

      </div>

      <Card>
        <h2 className="mb-4 text-lg font-black text-slate-950">Assigned Members</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.assignedMembers.length ? data.assignedMembers.slice(0, 9).map((member) => (
            <div key={member.memberId} className="rounded-xl border border-forge-border p-4">
              <div className="flex justify-between gap-3"><strong>{member.memberName}</strong><Badge tone={tone(member.status)}>{member.status}</Badge></div>
              <p className="mt-1 text-sm text-forge-muted">{member.goal || "Goal not set"}</p>
              <p className="mt-2 text-sm">Last session: {member.lastSessionDate ? dateLabel(member.lastSessionDate) : "No session yet"}</p>
              <p className="mt-1 line-clamp-2 text-sm text-forge-muted">{member.lastProgressNote || "No progress note yet."}</p>
              <Button className="mt-3" type="button" variant="secondary" onClick={() => setProgressMember(member)}>View Progress</Button>
            </div>
          )) : <EmptyState title="No assigned members yet." />}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-slate-950">Coaching Insights</h2>
          <Button type="button" variant="secondary" onClick={() => setViewData({ title: "Weekly Class Attendance", rows: data.coachingInsights.weeklyClassAttendance as unknown as Record<string, unknown>[] })}><Eye size={16} /> View Data</Button>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div>
            <div className="mb-2 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setViewData({ title: "Weekly Class Attendance", rows: data.coachingInsights.weeklyClassAttendance as unknown as Record<string, unknown>[] })}><Eye size={16} /> View Data</Button>
            </div>
            <div className="h-64">
              {data.coachingInsights.weeklyClassAttendance.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.coachingInsights.weeklyClassAttendance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="className" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={tooltipValue} />
                    <Bar dataKey="booked" name="Booked" fill="#2563EB" />
                    <Bar dataKey="attended" name="Attended" fill="#16A34A" />
                    <Bar dataKey="attendancePercentage" name="Attendance Percentage" fill="#EA580C" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No weekly class attendance yet." />}
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setViewData({ title: "Attendance Trend", rows: data.coachingInsights.attendanceTrend as unknown as Record<string, unknown>[] })}><Eye size={16} /> View Data</Button>
            </div>
            <div className="h-64">
              {data.coachingInsights.attendanceTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.coachingInsights.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={dayLabel} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={tooltipValue} labelFormatter={(label: unknown) => dayLabel(String(label))} />
                    <Line dataKey="bookedMembers" name="Booked Members" stroke="#EA580C" strokeWidth={3} />
                    <Line dataKey="attendedMembers" name="Attended Members" stroke="#16A34A" strokeWidth={3} />
                    <Line dataKey="classes" name="Classes" stroke="#2563EB" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No attendance trend yet." />}
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setViewData({ title: "Assigned Member Activity", rows: data.coachingInsights.assignedMemberActivity as unknown as Record<string, unknown>[] })}><Eye size={16} /> View Data</Button>
            </div>
            <div className="h-64">
              {data.coachingInsights.assignedMemberActivity.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.coachingInsights.assignedMemberActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="memberName" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={tooltipValue} />
                    <Bar dataKey="sessionsThisMonth" name="Sessions This Month" fill="#0F766E" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No assigned member activity yet." />}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-forge-muted">Attendance percentages use real booked and attended class booking records. {data.coachingInsights.weeklyClassAttendance[0] ? `Top class attendance: ${percent(data.coachingInsights.weeklyClassAttendance[0].attendancePercentage)}.` : ""}</p>
      </Card>

      {attendanceClass ? <AttendancePanel trainerClass={attendanceClass} onClose={() => setAttendanceClass(null)} onSaved={reload} /> : null}
      {progressMember ? <ProgressModal member={progressMember} onClose={() => setProgressMember(null)} /> : null}
      {viewData ? <ViewDataModal title={viewData.title} rows={viewData.rows} onClose={() => setViewData(null)} /> : null}
    </div>
  );
}

export function TrainerTodayPage() {
  const dashboard = useApi(trainerDashboardApi.getDashboard, []);
  if (dashboard.loading) return <LoadingState label="Loading trainer dashboard..." />;
  if (dashboard.error) return <ErrorState message={dashboard.error || "Could not load trainer dashboard."} />;
  if (!dashboard.data) return <EmptyState title="No trainer dashboard data." />;
  return <Dashboard data={dashboard.data} reload={dashboard.reload} />;
}
