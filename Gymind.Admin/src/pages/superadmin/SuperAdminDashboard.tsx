import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Download, Eye, X } from "lucide-react";
import { auditLogsApi, type AuditLog } from "../../api/auditLogsApi";
import { dashboardApi } from "../../api/dashboardApi";
import type { AdminWorkspace } from "../../api/dashboardApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import { useAppDispatch, useAppSelector } from "../../hooks/storeHooks";
import { fetchSuperAdminDashboard, fetchAuditLogs } from "../../store/dashboardSlice";
import type { Gym } from "../../types/gym";
import { cleanLabel, dateLabel, money, percent } from "../../utils/formatters";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";
type PanelKey = "gym-status" | "revenue" | "subscriptions" | "audit" | "health";

interface SubscriptionLike {
  id?: string | number;
  gymName?: string;
  plan?: string;
  amount?: string | number;
  status?: string;
  renewalDate?: string;
}

interface GymRiskRow {
  id: number;
  gymName: string;
  owner: string;
  status: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  lastPaymentDate: string;
  nextDueDate: string;
  daysLate: number;
  noticeEnds: string;
  systemStatus: string;
  monthlyRevenue: number;
}

interface RevenueRow {
  id: string;
  month: string;
  paidGyms: number;
  revenue: number;
  unpaidAmount: number;
  lockedGyms: number;
}

interface SubscriptionRow {
  id: number;
  gymName: string;
  subscriptionPlan: string;
  dueDate: string;
  daysLate: number;
  noticePeriodEndDate: string;
  status: string;
}

interface HealthRow {
  id: string;
  month: string;
  totalGyms: number;
  newGyms: number;
  paidGyms: number;
  lateGyms: number;
  lockedGyms: number;
  revenueCollected: number;
  expectedRevenue: number;
  collectionRate: number;
}

interface AuditRow {
  id: number;
  date: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  details: string;
  gym: string;
}

const chartColors = ["#16A34A", "#94A3B8", "#DC2626", "#7F1D1D", "#F59E0B"];

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((start.getTime() - end.getTime()) / 86400000);
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function count(value: unknown) {
  return Math.round(numberValue(value)).toLocaleString("en-US");
}

function chartTooltip(formatters: Record<string, (value: unknown) => string> = {}) {
  return (value: unknown, name: unknown) => {
    const label = String(name);
    return [formatters[label]?.(value) ?? count(value), label];
  };
}

function lower(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function isActiveGym(gym: Gym) {
  const status = lower(gym.status);
  if (typeof gym.isActive === "boolean") return gym.isActive && !status.includes("locked");
  return status.includes("active") && !status.includes("inactive") && !status.includes("locked");
}

function isLockedStatus(value: unknown) {
  const status = lower(value);
  return status.includes("locked") || status.includes("suspended") || status.includes("blocked");
}

function subscriptionStatus(gym: Gym, subscription?: SubscriptionLike) {
  const raw = cleanLabel(gym.subscriptionStatus ?? subscription?.status ?? "Paid");
  const status = lower(raw);
  if (isLockedStatus(raw) || isLockedStatus(gym.status)) return "Locked";
  if (status.includes("notice")) return "Notice Period";
  if (status.includes("late") || status.includes("overdue") || status.includes("unpaid")) return "Late";
  if (status.includes("due")) return "Due Soon";
  if (status.includes("inactive")) return "Inactive";
  return "Paid";
}

function statusTone(status: string): StatusTone {
  const value = lower(status);
  if (value.includes("paid") || value.includes("active")) return "success";
  if (value.includes("due") || value.includes("notice")) return "warning";
  if (value.includes("locked")) return "danger";
  if (value.includes("late") || value.includes("inactive")) return "danger";
  return "neutral";
}

function DarkStatusBadge({ status }: { status: string }) {
  const isLocked = lower(status).includes("locked");
  if (isLocked) return <span className="inline-flex rounded-full bg-red-950 px-2.5 py-1 text-xs font-semibold text-white">Locked</span>;
  return <Badge tone={statusTone(status)}>{status}</Badge>;
}

function ActionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link className="focus-ring inline-flex min-h-9 items-center justify-center rounded-lg border border-forge-border bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50" to={to}>
      {children}
    </Link>
  );
}

function DashboardKpi({
  label,
  value,
  meta,
  onClick
}: {
  label: string;
  value: React.ReactNode;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-2xl border border-forge-border bg-white p-4 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
    >
      <p className="text-sm font-medium text-forge-muted">{label}</p>
      <strong className="mt-2 block break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</strong>
      {meta ? <span className="mt-2 block text-xs text-forge-muted">{meta}</span> : null}
    </button>
  );
}

function SectionHeader({ title, onViewData }: { title: string; onViewData: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <Button type="button" variant="secondary" onClick={onViewData}>
        <Eye size={16} /> View Data
      </Button>
    </div>
  );
}

function exportRows(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
  const [gym, setGym] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((row) => String(row.status ?? row.subscriptionStatus ?? row.paymentStatus ?? "")).filter(Boolean))).sort(), [rows]);
  const gymOptions = useMemo(() => Array.from(new Set(rows.map((row) => String(row.gymName ?? row.gym ?? "")).filter(Boolean))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    return rows.filter((row) => {
      const text = JSON.stringify(row).toLowerCase();
      const rowStatus = String(row.status ?? row.subscriptionStatus ?? row.paymentStatus ?? "");
      const rowGym = String(row.gymName ?? row.gym ?? "");
      const rowDate = parseDate(String(row.date ?? row.dueDate ?? row.nextDueDate ?? row.month ?? ""));
      if (query && !text.includes(query.toLowerCase())) return false;
      if (status && rowStatus !== status) return false;
      if (gym && rowGym !== gym) return false;
      if (fromDate && rowDate && rowDate < fromDate) return false;
      if (toDate && rowDate && rowDate > toDate) return false;
      return true;
    });
  }, [from, gym, query, rows, status, to]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30">
      <aside className="ml-auto flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-forge-border p-4">
          <div>
            <p className="text-xs font-bold uppercase text-forge-muted">View Data</p>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close data drawer">
            <X size={18} />
          </Button>
        </div>
        <div className="border-b border-forge-border p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase text-forge-muted">Search</span>
              <input className="focus-ring min-h-10 w-full rounded-lg border border-forge-border px-3 text-sm" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase text-forge-muted">Status</span>
              <select className="focus-ring min-h-10 w-full rounded-lg border border-forge-border px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="">All</option>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase text-forge-muted">Gym</span>
              <select className="focus-ring min-h-10 w-full rounded-lg border border-forge-border px-3 text-sm" value={gym} onChange={(event) => { setGym(event.target.value); setPage(1); }}>
                <option value="">All</option>
                {gymOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase text-forge-muted">From</span>
              <input type="date" className="focus-ring min-h-10 w-full rounded-lg border border-forge-border px-3 text-sm" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase text-forge-muted">To</span>
              <input type="date" className="focus-ring min-h-10 w-full rounded-lg border border-forge-border px-3 text-sm" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-forge-muted">{filteredRows.length} rows</span>
            <Button type="button" variant="secondary" onClick={() => exportRows(title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), filteredRows)}>
              <Download size={16} /> Export CSV
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {pageRows.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
                <tr>{columns.map((column) => <th className="px-4 py-3" key={column.key}>{column.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-forge-border">
                {pageRows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    {columns.map((column) => <td className="px-4 py-3 align-top" key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? "Not set")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No matching data." />
          )}
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

function findSubscription(gym: Gym, subscriptions: SubscriptionLike[]) {
  return subscriptions.find((subscription) => cleanLabel(subscription.gymName).toLowerCase() === cleanLabel(gym.name).toLowerCase());
}

function buildGymRows(data: AdminWorkspace): GymRiskRow[] {
  const subscriptions = (data.subscriptions ?? []) as SubscriptionLike[];
  const paymentsByGym = new Map<number, { date: string; amount: number }>();
  data.payments.forEach((payment) => {
    if (!payment.gymId) return;
    const current = paymentsByGym.get(payment.gymId);
    const date = payment.paidAt ?? "";
    if (!current || date > current.date) paymentsByGym.set(payment.gymId, { date, amount: numberValue(payment.amountValue ?? payment.amount) });
  });

  return data.gyms.map((gym) => {
    const subscription = findSubscription(gym, subscriptions);
    const status = subscriptionStatus(gym, subscription);
    const dueDate = gym.subscriptionDueDate ?? subscription?.renewalDate ?? "";
    const due = parseDate(dueDate);
    const daysLate = status === "Late" || status === "Notice Period" || status === "Locked" ? Math.max(0, due ? daysBetween(new Date(), due) : 0) : 0;
    const lastPayment = paymentsByGym.get(gym.id);
    const monthlyRevenue = numberValue(subscription?.amount) || numberValue(gym.monthlyRevenue) || lastPayment?.amount || 0;
    return {
      id: gym.id,
      gymName: cleanLabel(gym.name, "Gym"),
      owner: cleanLabel(gym.ownerName, "Unassigned"),
      status: isActiveGym(gym) ? "Active" : isLockedStatus(gym.status) ? "Locked" : "Inactive",
      subscriptionStatus: status,
      subscriptionPlan: cleanLabel(gym.subscriptionPlan ?? subscription?.plan ?? "Standard"),
      lastPaymentDate: lastPayment?.date ?? "",
      nextDueDate: dueDate,
      daysLate,
      noticeEnds: status === "Notice Period" || status === "Late" ? addDays(dueDate, 14) : "",
      systemStatus: isLockedStatus(gym.status) || status === "Locked" ? "Locked" : "Open",
      monthlyRevenue
    };
  });
}

function buildRevenueRows(data: AdminWorkspace): RevenueRow[] {
  return (data.dashboard?.platform?.monthlyPlatformRevenueRows ?? []).map((row) => ({
    id: row.id,
    month: row.month,
    paidGyms: numberValue(row.paidGyms),
    revenue: numberValue(row.revenue),
    unpaidAmount: numberValue(row.unpaidAmount),
    lockedGyms: numberValue(row.lockedGyms)
  }));
}

function buildHealthRows(gymRows: GymRiskRow[], data: AdminWorkspace, revenueRows: RevenueRow[]): HealthRow[] {
  const createdByMonth = new Map<string, number>();
  data.gyms.forEach((gym) => {
    const created = parseDate(gym.createdAt);
    if (!created) return;
    const key = monthKey(created);
    createdByMonth.set(key, (createdByMonth.get(key) ?? 0) + 1);
  });

  return revenueRows.map((row) => {
    const keyDate = new Date(`${row.id}-01T00:00:00`);
    const totalGyms = data.gyms.filter((gym) => {
      const created = parseDate(gym.createdAt);
      return !created || created <= keyDate;
    }).length || data.gyms.length;
    const expectedRevenue = row.revenue + row.unpaidAmount;
    return {
      id: row.id,
      month: row.month,
      totalGyms,
      newGyms: createdByMonth.get(row.id) ?? 0,
      paidGyms: row.paidGyms,
      lateGyms: gymRows.filter((gym) => gym.subscriptionStatus === "Late" || gym.subscriptionStatus === "Notice Period").length,
      lockedGyms: row.lockedGyms,
      revenueCollected: row.revenue,
      expectedRevenue,
      collectionRate: expectedRevenue ? row.revenue / expectedRevenue * 100 : 0
    };
  });
}

function buildAuditRows(logs: AuditLog[], data: AdminWorkspace): AuditRow[] {
  const gymNames = data.gyms.map((gym) => cleanLabel(gym.name));
  return logs.map((log) => {
    const target = `${cleanLabel(log.tableName, "System")}#${log.recordId ?? "N/A"}`;
    const action = cleanLabel(log.action, "Audit event");
    const gym = gymNames.find((name) => lower(target).includes(lower(name)) || lower(action).includes(lower(name))) ?? "Platform";
    return {
      id: log.id,
      date: log.createdAt ?? "",
      actor: cleanLabel(log.userName, log.userId ? `User ${log.userId}` : "System"),
      role: "Platform",
      action,
      target,
      details: `${action} on ${target}`,
      gym
    };
  });
}

export function SuperAdminDashboard() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector((state) => state.dashboard.superadmin);
  const audit = useAppSelector((state) => state.dashboard.auditLogs);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  useEffect(() => {
    dispatch(fetchSuperAdminDashboard());
    dispatch(fetchAuditLogs());
  }, [dispatch]);

  const data = workspace.data;
  const auditLogs = audit.data ?? [];

  const gymRows = useMemo(() => data ? buildGymRows(data) : [], [data]);
  const revenueRows = useMemo(() => data ? buildRevenueRows(data) : [], [data]);
  const subscriptionRows = useMemo<SubscriptionRow[]>(() => gymRows.map((row) => ({
    id: row.id,
    gymName: row.gymName,
    subscriptionPlan: row.subscriptionPlan,
    dueDate: row.nextDueDate,
    daysLate: row.daysLate,
    noticePeriodEndDate: row.noticeEnds,
    status: row.subscriptionStatus
  })), [gymRows]);
  const healthRows = useMemo(() => data ? buildHealthRows(gymRows, data, revenueRows) : [], [data, gymRows, revenueRows]);
  const auditRows = useMemo(() => data ? buildAuditRows(auditLogs, data) : [], [auditLogs, data]);

  if (workspace.loading && !data) return <LoadingState label="Loading platform dashboard..." />;
  if (workspace.error && !data) return <ErrorState message={workspace.error} />;
  if (!data) return <EmptyState title="No platform data available yet." />;

  const totalGyms = gymRows.length;
  const activeGyms = gymRows.filter((row) => row.status === "Active").length;
  const inactiveGyms = gymRows.filter((row) => row.status === "Inactive").length;
  const fallbackLatePayments = gymRows.filter((row) => row.subscriptionStatus === "Late" || row.subscriptionStatus === "Notice Period").length;
  const lockedGyms = gymRows.filter((row) => row.systemStatus === "Locked").length;
  const fallbackMonthlyRevenue = gymRows.filter((row) => row.subscriptionStatus === "Paid").reduce((sum, row) => sum + row.monthlyRevenue, 0);
  const fallbackPendingRevenue = gymRows.filter((row) => row.subscriptionStatus !== "Paid").reduce((sum, row) => sum + row.monthlyRevenue, 0);
  const monthlyRevenue = numberValue(data.dashboard?.platform?.monthlyPlatformRevenue ?? fallbackMonthlyRevenue);
  const pendingRevenue = numberValue(data.dashboard?.platform?.pendingRevenue ?? fallbackPendingRevenue);
  const latePayments = numberValue(data.dashboard?.platform?.latePayments ?? fallbackLatePayments);
  const riskRows = gymRows.filter((row) => row.subscriptionStatus !== "Paid" || row.systemStatus === "Locked" || row.status !== "Active");

  const gymStatusChart = [
    { name: "Active gyms", value: activeGyms },
    { name: "Inactive gyms", value: inactiveGyms },
    { name: "Late payment gyms", value: latePayments },
    { name: "Locked gyms", value: lockedGyms }
  ];
  const subscriptionChart = ["Paid", "Due Soon", "Late", "Notice Period", "Locked"].map((status) => ({
    status,
    gyms: gymRows.filter((row) => row.subscriptionStatus === status).length
  }));
  const auditChart = Object.values(auditRows.reduce<Record<string, { action: string; count: number }>>((acc, row) => {
    const key = row.action;
    acc[key] = { action: key, count: (acc[key]?.count ?? 0) + 1 };
    return acc;
  }, {})).slice(0, 8);

  const gymColumns = [
    { key: "gymName", label: "Gym Name" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", render: (row: Record<string, unknown>) => <DarkStatusBadge status={String(row.status)} /> },
    { key: "subscriptionStatus", label: "Subscription Status", render: (row: Record<string, unknown>) => <DarkStatusBadge status={String(row.subscriptionStatus)} /> },
    { key: "lastPaymentDate", label: "Last Payment Date", render: (row: Record<string, unknown>) => row.lastPaymentDate ? dateLabel(String(row.lastPaymentDate)) : "Not recorded" },
    { key: "nextDueDate", label: "Next Due Date", render: (row: Record<string, unknown>) => row.nextDueDate ? dateLabel(String(row.nextDueDate)) : "Not set" },
    { key: "action", label: "Action", render: (row: Record<string, unknown>) => <div className="flex flex-wrap gap-2"><ActionLink to="/superadmin/gyms">View gym</ActionLink><ActionLink to="/superadmin/gyms">Deactivate</ActionLink><ActionLink to="/superadmin/gyms">Reactivate</ActionLink><ActionLink to="/superadmin/gyms">Lock system</ActionLink><ActionLink to="/superadmin/gyms">Assign owner</ActionLink></div> }
  ];
  const subscriptionColumns = [
    { key: "gymName", label: "Gym Name" },
    { key: "subscriptionPlan", label: "Subscription Plan" },
    { key: "dueDate", label: "Due Date", render: (row: Record<string, unknown>) => row.dueDate ? dateLabel(String(row.dueDate)) : "Not set" },
    { key: "daysLate", label: "Days Late" },
    { key: "noticePeriodEndDate", label: "Notice Period End Date", render: (row: Record<string, unknown>) => row.noticePeriodEndDate ? dateLabel(String(row.noticePeriodEndDate)) : "Not active" },
    { key: "status", label: "Status", render: (row: Record<string, unknown>) => <DarkStatusBadge status={String(row.status)} /> },
    { key: "action", label: "Action", render: () => <div className="flex flex-wrap gap-2"><ActionLink to="/superadmin/gyms">Send notice</ActionLink><ActionLink to="/superadmin/gyms">Lock system</ActionLink><ActionLink to="/superadmin/gyms">Reactivate after payment</ActionLink><ActionLink to="/superadmin/audit-logs">View audit history</ActionLink></div> }
  ];

  return (
    <>
      <PageHeader title="Platform Command Center" description="SaaS ownership view for gym activation, subscription risk, system lock status, audit activity, platform health, and recurring revenue." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi label="Total Gyms" value={totalGyms} onClick={() => setActivePanel("gym-status")} />
        <DashboardKpi label="Active Gyms" value={activeGyms} onClick={() => setActivePanel("gym-status")} />
        <DashboardKpi label="Inactive / Deactivated Gyms" value={inactiveGyms} onClick={() => setActivePanel("gym-status")} />
        <DashboardKpi label="Late Payments" value={latePayments} onClick={() => setActivePanel("subscriptions")} />
        <DashboardKpi label="Locked Gyms" value={lockedGyms} onClick={() => setActivePanel("subscriptions")} />
        <DashboardKpi label="Monthly Platform Revenue" value={money(monthlyRevenue)} meta="Collected SaaS subscriptions" onClick={() => setActivePanel("revenue")} />
        <DashboardKpi label="Pending Revenue" value={money(pendingRevenue)} meta="Due, late, notice, or locked" onClick={() => setActivePanel("revenue")} />
        <DashboardKpi label="Gym Owners" value={data.users.filter((user) => user.role === "GymOwner").length} onClick={() => setActivePanel("gym-status")} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Gym Status" onViewData={() => setActivePanel("gym-status")} />
          <div className="h-72">
            {gymStatusChart.some((row) => row.value > 0) ? <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gymStatusChart} innerRadius={70} outerRadius={105} paddingAngle={3} dataKey="value" nameKey="name">
                  {gymStatusChart.map((entry, index) => <Cell key={entry.name} fill={chartColors[index]} />)}
                </Pie>
                <Tooltip formatter={(value: unknown, name: unknown) => [count(value), String(name)]} />
              </PieChart>
            </ResponsiveContainer> : <EmptyState title="No gym status data yet." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Monthly Platform Revenue" onViewData={() => setActivePanel("revenue")} />
          <div className="h-72">
            {revenueRows.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value: number) => `$${value}`} />
                <Tooltip formatter={chartTooltip({ Revenue: money, "Unpaid Amount": money, "Paid Gyms": count, "Locked Gyms": count })} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#EA580C" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="unpaidAmount" name="Unpaid Amount" stroke="#7F1D1D" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer> : <EmptyState title="No subscription revenue data yet." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Subscription Payment Status" onViewData={() => setActivePanel("subscriptions")} />
          <div className="h-72">
            {subscriptionChart.some((row) => row.gyms > 0) ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscriptionChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value: unknown) => [count(value), "Gyms"]} />
                <Bar dataKey="gyms" name="Gyms" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer> : <EmptyState title="No subscription status data yet." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Audit Activity" onViewData={() => setActivePanel("audit")} />
          <div className="h-72">
            {auditChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="action" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: unknown) => [count(value), "Audit events"]} />
                  <Bar dataKey="count" name="Events" fill="#0F766E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No audit activity yet." />}
          </div>
        </Card>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-forge-border bg-white shadow-panel">
        <div className="flex flex-col gap-3 border-b border-forge-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-950">Top Risk Gyms</h2>
          <Button type="button" variant="secondary" onClick={() => setActivePanel("subscriptions")}><Eye size={16} /> View Data</Button>
        </div>
        {riskRows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
                <tr>
                  <th className="px-4 py-3">Gym Name</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Days Late</th>
                  <th className="px-4 py-3">Notice Ends</th>
                  <th className="px-4 py-3">System Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-border">
                {riskRows.slice(0, 10).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">{row.gymName}</td>
                    <td className="px-4 py-3">{row.owner}</td>
                    <td className="px-4 py-3"><DarkStatusBadge status={row.subscriptionStatus} /></td>
                    <td className="px-4 py-3">{row.daysLate}</td>
                    <td className="px-4 py-3">{row.noticeEnds ? dateLabel(row.noticeEnds) : "Not active"}</td>
                    <td className="px-4 py-3"><DarkStatusBadge status={row.systemStatus} /></td>
                    <td className="px-4 py-3 text-right"><ActionLink to="/superadmin/gyms">Review</ActionLink></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-4"><EmptyState title="No platform risks right now." /></div>}
      </div>

      <Card className="mt-6">
        <SectionHeader title="Platform Health" onViewData={() => setActivePanel("health")} />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-64">
            {healthRows.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={chartTooltip({ "Active Gyms Over Time": count, "New Gyms Created Per Month": count })} />
                <Line dataKey="totalGyms" name="Active Gyms Over Time" stroke="#2563EB" strokeWidth={3} />
                <Line dataKey="newGyms" name="New Gyms Created Per Month" stroke="#16A34A" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer> : <EmptyState title="No platform health data yet." />}
          </div>
          <div className="h-64">
            {healthRows.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value: number) => `${value}%`} />
                <Tooltip formatter={chartTooltip({ "Revenue Collection Rate": percent, "Locked Gyms Over Time": count })} />
                <Line dataKey="lockedGyms" name="Locked Gyms Over Time" stroke="#7F1D1D" strokeWidth={3} />
                <Line dataKey="collectionRate" name="Revenue Collection Rate" stroke="#EA580C" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer> : <EmptyState title="No platform health data yet." />}
          </div>
        </div>
      </Card>

      {activePanel === "gym-status" ? (
        <DataDrawer title="Gym Status Data" rows={gymRows as unknown as Record<string, unknown>[]} columns={gymColumns} onClose={() => setActivePanel(null)} />
      ) : null}
      {activePanel === "revenue" ? (
        <DataDrawer
          title="Monthly Platform Revenue Data"
          rows={revenueRows as unknown as Record<string, unknown>[]}
          columns={[
            { key: "month", label: "Month" },
            { key: "paidGyms", label: "Paid Gyms" },
            { key: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
            { key: "unpaidAmount", label: "Unpaid Amount", render: (row) => money(row.unpaidAmount) },
            { key: "lockedGyms", label: "Locked Gyms" }
          ]}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
      {activePanel === "subscriptions" ? (
        <DataDrawer title="Subscription Payment Status Data" rows={subscriptionRows as unknown as Record<string, unknown>[]} columns={subscriptionColumns} onClose={() => setActivePanel(null)} />
      ) : null}
      {activePanel === "audit" ? (
        <DataDrawer
          title="Audit Logs Data"
          rows={auditRows as unknown as Record<string, unknown>[]}
          columns={[
            { key: "date", label: "Date", render: (row) => row.date ? dateLabel(String(row.date)) : "Not set" },
            { key: "actor", label: "Actor" },
            { key: "role", label: "Role" },
            { key: "action", label: "Action" },
            { key: "target", label: "Target" },
            { key: "details", label: "Details" }
          ]}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
      {activePanel === "health" ? (
        <DataDrawer
          title="Platform Health Data"
          rows={healthRows as unknown as Record<string, unknown>[]}
          columns={[
            { key: "month", label: "Month" },
            { key: "totalGyms", label: "Total Gyms" },
            { key: "newGyms", label: "New Gyms" },
            { key: "paidGyms", label: "Paid Gyms" },
            { key: "lateGyms", label: "Late Gyms" },
            { key: "lockedGyms", label: "Locked Gyms" },
            { key: "revenueCollected", label: "Revenue Collected", render: (row) => money(row.revenueCollected) },
            { key: "expectedRevenue", label: "Expected Revenue", render: (row) => money(row.expectedRevenue) },
            { key: "collectionRate", label: "Revenue Collection Rate", render: (row) => percent(row.collectionRate) }
          ]}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
    </>
  );
}
