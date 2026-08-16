import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Download, Eye, X } from "lucide-react";
import { checkInsApi } from "../../api/checkInsApi";
import { managerDashboardApi, type ManagerDashboard } from "../../api/managerDashboardApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import { useAppDispatch, useAppSelector } from "../../hooks/storeHooks";
import { fetchManagerDashboard } from "../../store/dashboardSlice";
import { dateLabel, money, percent, timeLabel } from "../../utils/formatters";

type PanelKey = "inside" | "attendance" | "payments" | "expiring" | "suspicious" | "classes" | "team" | "reports";
type ReportRange = "today" | "7d" | "month";

function statusTone(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("normal") || lower.includes("active") || lower.includes("inside") || lower.includes("scheduled")) return "success" as const;
  if (lower.includes("busy") || lower.includes("expiring") || lower.includes("progress")) return "warning" as const;
  if (lower.includes("high") || lower.includes("expired") || lower.includes("suspicious") || lower.includes("inactive") || lower.includes("open")) return "danger" as const;
  return "info" as const;
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function count(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Math.round(Number.isFinite(number) ? number : 0).toLocaleString("en-US");
}

function tooltipValue(value: unknown, name: unknown) {
  const label = String(name || "Value");
  if (label.toLowerCase().includes("count")) return [count(value), label];
  if (label.toLowerCase().includes("revenue") || label.toLowerCase().includes("payment")) return [money(value), label];
  if (label.toLowerCase().includes("capacity") || label.toLowerCase().includes("percent")) return [percent(value), label];
  return [count(value), label];
}

function exportRows(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function KpiCard({ label, value, meta, onClick }: { label: string; value: React.ReactNode; meta: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring rounded-2xl border border-forge-border bg-white p-4 text-left shadow-panel transition hover:border-orange-200 hover:shadow-lg">
      <p className="text-sm font-medium text-forge-muted">{label}</p>
      <strong className="mt-2 block break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</strong>
      <span className="mt-2 block text-xs text-forge-muted">{meta}</span>
    </button>
  );
}

function SectionHeader({ title, onViewData }: { title: string; onViewData: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <Button type="button" variant="secondary" onClick={onViewData}><Eye size={16} /> View Data</Button>
    </div>
  );
}

function DataDrawer({
  title,
  rows,
  columns,
  onClose
}: {
  title: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => String(row.status ?? row.membershipStatus ?? "")).filter(Boolean))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query.toLowerCase())) return false;
    if (status && String(row.status ?? row.membershipStatus ?? "") !== status) return false;
    return true;
  }), [query, rows, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30">
      <aside className="ml-auto flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-forge-border p-4">
          <div>
            <p className="text-xs font-bold uppercase text-forge-muted">Underlying Data</p>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close data drawer"><X size={18} /></Button>
        </div>
        <div className="grid gap-3 border-b border-forge-border p-4 md:grid-cols-4">
          <input className="focus-ring min-h-10 rounded-lg border border-forge-border px-3 text-sm md:col-span-2" placeholder="Search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          <select className="focus-ring min-h-10 rounded-lg border border-forge-border px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button type="button" variant="secondary" onClick={() => exportRows(title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), filtered)}><Download size={16} /> Export CSV</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {pageRows.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
                <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-forge-border">
                {pageRows.map((row, index) => (
                  <tr key={String(row.id ?? row.checkInId ?? row.paymentId ?? row.memberId ?? row.classId ?? row.employeeId ?? index)}>
                    {columns.map((column) => <td key={column.key} className="px-4 py-3 align-top">{column.render ? column.render(row) : String(row[column.key] ?? "Not set")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="No matching data." />}
        </div>
        <div className="flex items-center justify-between border-t border-forge-border p-4">
          <span className="text-sm text-forge-muted">Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button type="button" variant="secondary" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function checkInColumns(onCheckout?: (id: number) => void) {
  return [
    { key: "memberName", label: "Member Name" },
    { key: "phone", label: "Phone" },
    { key: "checkInTime", label: "Check-in Time", render: (row: Record<string, unknown>) => row.checkInTime ? timeLabel(String(row.checkInTime)) : "Not set" },
    { key: "checkOutTime", label: "Check-out Time", render: (row: Record<string, unknown>) => row.checkOutTime ? timeLabel(String(row.checkOutTime)) : "Still inside" },
    { key: "duration", label: "Duration" },
    { key: "membershipStatus", label: "Membership Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.membershipStatus))}>{String(row.membershipStatus)}</Badge> },
    { key: "checkedInBy", label: "Checked In By" },
    { key: "checkInMethod", label: "Check-in Method" },
    { key: "action", label: "Action", render: (row: Record<string, unknown>) => (
      <div className="flex flex-wrap gap-2">
        {!row.checkOutTime && onCheckout ? <Button type="button" variant="secondary" onClick={() => onCheckout(Number(row.checkInId))}>Manual Check-out</Button> : null}
        {row.memberId ? <Link className="focus-ring inline-flex min-h-10 items-center rounded-lg border border-forge-border px-3 text-sm font-semibold" to="/branch-manager/members">View Member</Link> : null}
      </div>
    ) }
  ];
}

function DashboardContent({ data, reload }: { data: ManagerDashboard; reload: () => void }) {
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [selectedHour, setSelectedHour] = useState("");
  const [reportRange, setReportRange] = useState<ReportRange>("7d");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  async function manualCheckout(checkInId: number) {
    setActionError("");
    setNotice("");
    try {
      await checkInsApi.manualCheckOut(checkInId);
      setNotice("Manual check-out completed.");
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to complete manual check-out.");
    }
  }

  const hourRecords = selectedHour
    ? data.checkInRecords.filter((row) => row.checkInTime?.slice(11, 13) === selectedHour.slice(0, 2))
    : data.checkInRecords;
  const reportRows = reportRange === "today" ? data.branchReports.attendanceByDay.slice(-1) : data.branchReports.attendanceByDay;
  const capacityTone = data.liveStatus.capacityPercentage <= 60 ? "bg-emerald-500" : data.liveStatus.capacityPercentage <= 85 ? "bg-amber-500" : "bg-red-600";
  const drawer = panel === "inside" ? { title: "Currently Inside", rows: data.currentlyInside as unknown as Record<string, unknown>[], columns: checkInColumns(manualCheckout) }
    : panel === "attendance" ? { title: "Today's Attendance Records", rows: data.checkInRecords as unknown as Record<string, unknown>[], columns: checkInColumns() }
    : panel === "payments" ? { title: "Payments Today", rows: data.paymentRecords as unknown as Record<string, unknown>[], columns: [
      { key: "paymentId", label: "Payment ID" },
      { key: "memberName", label: "Member Name" },
      { key: "membershipPlan", label: "Membership Plan" },
      { key: "amount", label: "Amount", render: (row: Record<string, unknown>) => money(row.amount) },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "paymentTime", label: "Payment Time", render: (row: Record<string, unknown>) => row.paymentTime ? timeLabel(String(row.paymentTime)) : "Not set" },
      { key: "recordedByStaff", label: "Recorded By Staff" }
    ] }
    : panel === "expiring" ? { title: "Expiring Memberships", rows: data.expiringMemberships as unknown as Record<string, unknown>[], columns: [
      { key: "memberName", label: "Member Name" },
      { key: "phone", label: "Phone" },
      { key: "membershipPlan", label: "Membership Plan" },
      { key: "expiryDate", label: "Expiry Date", render: (row: Record<string, unknown>) => row.expiryDate ? dateLabel(String(row.expiryDate)) : "Not set" },
      { key: "daysLeft", label: "Days Left" },
      { key: "lastCheckIn", label: "Last Check-in", render: (row: Record<string, unknown>) => row.lastCheckIn ? dateLabel(String(row.lastCheckIn)) : "Not recorded" },
      { key: "status", label: "Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
      { key: "action", label: "Action", render: () => <Link className="font-semibold text-forge-primary" to="/branch-manager/members">View Member</Link> }
    ] }
    : panel === "suspicious" ? { title: "Suspicious Check-ins", rows: data.suspiciousCheckIns as unknown as Record<string, unknown>[], columns: [
      { key: "memberName", label: "Member Name" },
      { key: "issue", label: "Issue" },
      { key: "time", label: "Time", render: (row: Record<string, unknown>) => row.time ? timeLabel(String(row.time)) : "Not set" },
      { key: "staff", label: "Staff" },
      { key: "status", label: "Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
      { key: "action", label: "Action", render: () => <Link className="font-semibold text-forge-primary" to="/branch-manager/check-ins">Review</Link> }
    ] }
    : panel === "classes" ? { title: "Classes Today", rows: data.classesToday as unknown as Record<string, unknown>[], columns: [
      { key: "className", label: "Class Name" },
      { key: "trainerName", label: "Trainer" },
      { key: "startTime", label: "Start Time", render: (row: Record<string, unknown>) => row.startTime ? timeLabel(String(row.startTime)) : "Not set" },
      { key: "endTime", label: "End Time", render: (row: Record<string, unknown>) => row.endTime ? timeLabel(String(row.endTime)) : "Not set" },
      { key: "capacity", label: "Capacity" },
      { key: "bookedMembersCount", label: "Booked" },
      { key: "attendedMembersCount", label: "Attended" },
      { key: "status", label: "Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> }
    ] }
    : panel === "team" ? { title: "Branch Team Activity", rows: data.teamActivity as unknown as Record<string, unknown>[], columns: [
      { key: "employeeName", label: "Employee Name" },
      { key: "role", label: "Role" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
      { key: "paymentsRecordedToday", label: "Payments Recorded Today" },
      { key: "checkInsHandledToday", label: "Check-ins Handled Today" },
      { key: "manualCheckOutsToday", label: "Manual Check-outs Today" }
    ] }
    : panel === "reports" ? { title: "Branch Report Data", rows: data.branchReports.revenueByDay as unknown as Record<string, unknown>[], columns: [
      { key: "date", label: "Date", render: (row: Record<string, unknown>) => formatDay(String(row.date)) },
      { key: "revenue", label: "Revenue", render: (row: Record<string, unknown>) => money(row.revenue) }
    ] }
    : null;

  return (
    <>
      <PageHeader title="Branch Manager Dashboard" description={`Live branch control room for ${data.branchInfo.branchName}.`} />
      {actionError ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Currently Inside" value={data.kpis.currentlyInside} meta="Open check-ins right now" onClick={() => setPanel("inside")} />
        <KpiCard label="Today's Attendance" value={data.kpis.todaysAttendance} meta="Total check-ins today" onClick={() => setPanel("attendance")} />
        <KpiCard label="Payments Today" value={money(data.kpis.paymentsToday)} meta="Received in this branch" onClick={() => setPanel("payments")} />
        <KpiCard label="Classes Today" value={data.kpis.classesToday} meta="Scheduled branch classes" onClick={() => setPanel("classes")} />
        <KpiCard label="Expiring Memberships" value={data.kpis.expiringMemberships} meta="Next 7 days and expired" onClick={() => setPanel("expiring")} />
        <KpiCard label="Suspicious Check-ins" value={data.kpis.suspiciousCheckIns} meta="Real check-in anomalies" onClick={() => setPanel("suspicious")} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <SectionHeader title="Live Branch Status" onViewData={() => setPanel("inside")} />
          <div className="space-y-4">
            <div>
              <p className="text-sm text-forge-muted">Branch Name</p>
              <h3 className="text-2xl font-black text-slate-950">{data.liveStatus.branchName}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><span className="text-forge-muted">Current Check-ins</span><strong className="mt-1 block text-xl">{data.liveStatus.currentCheckIns}</strong></div>
              <div className="rounded-xl bg-slate-50 p-3"><span className="text-forge-muted">Capacity</span><strong className="mt-1 block text-xl">{data.liveStatus.branchCapacity || "Not set"}</strong></div>
              <div className="rounded-xl bg-slate-50 p-3"><span className="text-forge-muted">Last Check-in</span><strong className="mt-1 block">{data.liveStatus.lastCheckInTime ? timeLabel(data.liveStatus.lastCheckInTime) : "No check-ins"}</strong></div>
              <div className="rounded-xl bg-slate-50 p-3"><span className="text-forge-muted">Peak Hour Today</span><strong className="mt-1 block">{data.liveStatus.peakHourToday}</strong></div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Capacity Percentage</span>
                <span>{percent(data.liveStatus.capacityPercentage)}</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${capacityTone}`} style={{ width: `${Math.min(100, data.liveStatus.capacityPercentage)}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Today's Attendance by Hour" onViewData={() => setPanel("attendance")} />
          <div className="h-72">
            {data.attendanceByHour.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendanceByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value: unknown) => [count(value), "Check-ins"]} />
                <Line type="monotone" dataKey="checkIns" name="Check-ins" stroke="#EA580C" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer> : <EmptyState title="No attendance data yet." />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.attendanceByHour.filter((row) => row.checkIns > 0).map((row) => <Button key={row.hour} type="button" variant={selectedHour === row.hour ? "primary" : "secondary"} onClick={() => setSelectedHour(row.hour)}>{row.hour}</Button>)}
          </div>
          <div className="mt-4 rounded-xl border border-forge-border p-3">
            <h3 className="mb-2 text-sm font-bold text-slate-950">{selectedHour ? `Check-ins at ${selectedHour}` : "Today's check-ins"}</h3>
            {hourRecords.length ? <div className="space-y-2">{hourRecords.slice(0, 5).map((row) => <div key={row.checkInId} className="flex justify-between gap-3 text-sm"><span>{row.memberName}</span><span className="font-semibold">{row.checkInTime ? timeLabel(row.checkInTime) : "Not set"}</span></div>)}</div> : <EmptyState title="No records for this hour." />}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Currently Inside" onViewData={() => setPanel("inside")} />
          <div className="space-y-3">
            {data.currentlyInside.length ? data.currentlyInside.slice(0, 6).map((row) => (
              <div key={row.checkInId} className="flex flex-col gap-2 rounded-xl border border-forge-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-slate-950">{row.memberName}</strong>
                  <p className="text-sm text-forge-muted">{row.membershipPlan} - {row.duration}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => manualCheckout(row.checkInId)}>Manual Check-out</Button>
              </div>
            )) : <EmptyState title="No members currently inside." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Payments Today" onViewData={() => setPanel("payments")} />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Total</span><strong className="block text-xl">{money(data.paymentsToday.totalPaymentsToday)}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Count</span><strong className="block text-xl">{data.paymentsToday.paymentCountToday}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Renewals</span><strong className="block text-xl">{money(data.paymentsToday.membershipRenewalRevenue)}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Cash</span><strong className="block text-xl">{money(data.paymentsToday.cashPaymentsTotal)}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Card</span><strong className="block text-xl">{money(data.paymentsToday.cardPaymentsTotal)}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Day Pass</span><strong className="block text-xl">{money(data.paymentsToday.dayPassRevenue)}</strong></div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="h-56">{data.paymentsByMethod.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.paymentsByMethod}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={tooltipValue} /><Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[6, 6, 0, 0]} /><Bar dataKey="count" name="Payment Count" fill="#EA580C" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No payment method data yet." />}</div>
            <div className="h-56">{data.paymentsByPlan.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.paymentsByPlan}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={tooltipValue} /><Bar dataKey="revenue" name="Revenue" fill="#16A34A" radius={[6, 6, 0, 0]} /><Bar dataKey="count" name="Payment Count" fill="#2563EB" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No payment plan data yet." />}</div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Expiring Memberships" onViewData={() => setPanel("expiring")} />
          <div className="space-y-3">
            {data.expiringMemberships.length ? data.expiringMemberships.slice(0, 6).map((row) => (
              <div key={row.memberId} className="flex items-center justify-between gap-3 rounded-xl border border-forge-border p-3">
                <div><strong>{row.memberName}</strong><p className="text-sm text-forge-muted">{row.membershipPlan} - {row.expiryDate ? dateLabel(row.expiryDate) : "No expiry"}</p></div>
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </div>
            )) : <EmptyState title="No memberships expiring soon." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Suspicious Check-ins" onViewData={() => setPanel("suspicious")} />
          <div className="space-y-3">
            {data.suspiciousCheckIns.length ? data.suspiciousCheckIns.slice(0, 6).map((row) => (
              <div key={`${row.checkInId}-${row.issue}`} className="rounded-xl border border-red-100 bg-red-50 p-3">
                <div className="flex justify-between gap-3"><strong className="text-red-950">{row.memberName}</strong><Badge tone="danger">{row.status}</Badge></div>
                <p className="mt-1 text-sm text-red-700">{row.issue}</p>
              </div>
            )) : <EmptyState title="No suspicious check-ins detected." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Classes Today" onViewData={() => setPanel("classes")} />
          <div className="grid gap-3">
            {data.classesToday.length ? data.classesToday.map((row) => (
              <div key={row.classId} className="rounded-xl border border-forge-border p-3">
                <div className="flex items-center justify-between gap-3"><strong>{row.className}</strong><Badge tone={statusTone(row.status)}>{row.status}</Badge></div>
                <p className="mt-1 text-sm text-forge-muted">{row.trainerName} - {row.startTime ? timeLabel(row.startTime) : "No start"} to {row.endTime ? timeLabel(row.endTime) : "No end"}</p>
                <p className="mt-2 text-sm font-semibold">{row.bookedMembersCount}/{row.capacity || "No"} booked - {row.attendedMembersCount} attended</p>
              </div>
            )) : <EmptyState title="No classes scheduled today." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Staff and Trainers" onViewData={() => setPanel("team")} />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Staff</span><strong className="block text-xl">{data.teamSummary.totalStaff}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Trainers</span><strong className="block text-xl">{data.teamSummary.totalTrainers}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Active</span><strong className="block text-xl">{data.teamSummary.activeEmployees}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-sm text-forge-muted">Inactive</span><strong className="block text-xl">{data.teamSummary.inactiveEmployees}</strong></div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionHeader title="Branch-Level Reports" onViewData={() => setPanel("reports")} />
        <div className="mb-3 flex flex-wrap gap-2">
          {(["today", "7d", "month"] as ReportRange[]).map((item) => <Button key={item} type="button" variant={reportRange === item ? "primary" : "secondary"} onClick={() => setReportRange(item)}>{item === "today" ? "Today" : item === "7d" ? "Last 7 Days" : "This Month"}</Button>)}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="h-64">{reportRows.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={reportRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={formatDay} /><YAxis allowDecimals={false} /><Tooltip formatter={(value: unknown) => [count(value), "Attendance"]} labelFormatter={(value: unknown) => formatDay(String(value))} /><Line dataKey="count" name="Attendance" stroke="#EA580C" strokeWidth={3} /></LineChart></ResponsiveContainer> : <EmptyState title="No attendance report data yet." />}</div>
          <div className="h-64">{data.branchReports.revenueByDay.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.branchReports.revenueByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={formatDay} /><YAxis /><Tooltip formatter={tooltipValue} labelFormatter={(value: unknown) => formatDay(String(value))} /><Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No revenue report data yet." />}</div>
          <div className="h-64">{data.branchReports.paymentsByMethod.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.branchReports.paymentsByMethod}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={tooltipValue} /><Bar dataKey="revenue" name="Revenue" fill="#16A34A" radius={[6, 6, 0, 0]} /><Bar dataKey="count" name="Payment Count" fill="#2563EB" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No payment report data yet." />}</div>
        </div>
      </Card>

      {drawer ? <DataDrawer title={drawer.title} rows={drawer.rows} columns={drawer.columns} onClose={() => setPanel(null)} /> : null}
    </>
  );
}

export function BranchManagerDashboard() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.dashboard.manager);

  useEffect(() => {
    dispatch(fetchManagerDashboard());
  }, [dispatch]);

  const reload = () => {
    dispatch(fetchManagerDashboard({ forceRefetch: true }));
  };

  if (loading && !data) return <LoadingState label="Loading branch dashboard..." />;
  if (error && !data) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No branch dashboard data available yet." />;

  return <DashboardContent data={data} reload={reload} />;
}
