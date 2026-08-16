import { Link } from "react-router-dom";
import { FileText, Users } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { timeLabel } from "../../utils/formatters";
import type { TrainerTimelineItem } from "./trainerExperience";
import { memberName, statusTone } from "./trainerExperience";

export function TrainerShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl space-y-4 pb-24 lg:space-y-6 lg:pb-0">{children}</div>;
}

export function TrainerHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forge-primary">Trainer workspace</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-forge-muted">{subtitle}</p>
      </div>
    </div>
  );
}

export function ActionLink({ to, children, primary = false }: { to: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${primary ? "bg-forge-primary text-white hover:bg-orange-700" : "border border-forge-border bg-white text-slate-800 hover:bg-slate-50"}`}
    >
      {children}
    </Link>
  );
}

export function ContactActions({ phone }: { phone?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <a className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-forge-border bg-white px-3 text-sm font-semibold text-slate-800 ${phone ? "hover:bg-slate-50" : "pointer-events-none opacity-50"}`} href={phone ? `tel:${phone}` : undefined}>
        <FileText size={16} /> Call
      </a>
      <a className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-forge-border bg-white px-3 text-sm font-semibold text-slate-800 ${phone ? "hover:bg-slate-50" : "pointer-events-none opacity-50"}`} href={phone ? `sms:${phone}` : undefined}>
        <FileText size={16} /> Message
      </a>
    </div>
  );
}

export function TimelineCard({
  item,
  onStart,
  onComplete,
  onNoShow,
  onAttendance,
  compact = false
}: {
  item: TrainerTimelineItem;
  onStart?: (item: TrainerTimelineItem) => void;
  onComplete?: (item: TrainerTimelineItem) => void;
  onNoShow?: (item: TrainerTimelineItem) => void;
  onAttendance?: (item: TrainerTimelineItem) => void;
  compact?: boolean;
}) {
  const member = item.member;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-forge-muted">{timeLabel(item.startsAt)}</div>
          <h3 className="mt-1 truncate text-lg font-black text-slate-950">{item.title}</h3>
          <p className="text-sm text-forge-muted">{item.subtitle} · {item.location}</p>
        </div>
        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
      </div>
      {item.notes ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item.notes}</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {member ? <ActionLink to={`/trainer/member/${member.id}`}>View member</ActionLink> : null}
        <ActionLink to={`/trainer/notes/new?${member ? `memberId=${member.id}&` : ""}${item.kind === "session" ? `sessionId=${item.sourceId}` : ""}`}>Add note</ActionLink>
        {item.kind === "session" && item.status !== "ongoing" && item.status !== "completed" ? <Button type="button" onClick={() => onStart?.(item)}>Start</Button> : null}
        {item.kind === "session" && item.status !== "completed" ? <Button type="button" variant="secondary" onClick={() => onComplete?.(item)}>Complete</Button> : null}
        {item.kind === "session" && item.status !== "no-show" ? <Button type="button" variant="danger" onClick={() => onNoShow?.(item)}>No-show</Button> : null}
        {item.kind === "class" ? <Button type="button" variant="secondary" onClick={() => onAttendance?.(item)}>Attendance</Button> : null}
      </div>
    </>
  );

  if (compact) {
    return <div className="rounded-xl border border-forge-border bg-white p-4">{content}</div>;
  }

  return (
    <Card>{content}</Card>
  );
}

export function MemberMiniCard({ member, note, warning, remaining }: { member: { id: number; phone?: string; status?: string; membershipEndDate?: string; name?: string; fullName?: string }; note?: string; warning?: string; remaining?: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Users size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/trainer/member/${member.id}`} className="truncate text-base font-black text-slate-950 hover:text-forge-primary">{memberName(member)}</Link>
            {warning ? <Badge tone="warning">{warning}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-forge-muted">{remaining ?? 0} remaining sessions</p>
          {note ? <p className="mt-2 line-clamp-2 text-sm text-slate-700">{note}</p> : <p className="mt-2 text-sm text-forge-muted">No recent note.</p>}
        </div>
      </div>
    </Card>
  );
}
