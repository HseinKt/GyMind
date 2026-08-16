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
import { ownerDashboardApi, type OwnerDashboard, type OwnerPaymentRecord } from "../../api/ownerDashboardApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import { useAppDispatch, useAppSelector } from "../../hooks/storeHooks";
import { fetchOwnerDashboard } from "../../store/dashboardSlice";
import { dateLabel, money, percent } from "../../utils/formatters";

type PanelKey = "revenue" | "branches" | "members" | "expired" | "capacity" | "payments" | "plans" | "team" | "attention";
type BranchMetric = "revenue" | "activeMembers" | "checkInsToday" | "capacityPercent";
type RevenueRange = "today" | "7d" | "month";

const palette = ["#EA580C", "#2563EB", "#16A34A", "#F59E0B", "#7F1D1D", "#0F766E"];

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function count(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Math.round(Number.isFinite(number) ? number : 0).toLocaleString("en-US");
}

function tooltipValue(value: unknown, name: unknown) {
  const label = String(name);
  if (label.toLowerCase().includes("revenue") || label.toLowerCase().includes("price")) return [money(value), label];
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

function KpiCard({ label, value, meta }: { label: string; value: React.ReactNode; meta: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-forge-muted">{label}</p>
      <strong className="mt-2 block break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</strong>
      <span className="mt-2 block text-xs text-forge-muted">{meta}</span>
    </Card>
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
  const [branch, setBranch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => String(row.status ?? row.severity ?? "")).filter(Boolean))).sort(), [rows]);
  const branches = useMemo(() => Array.from(new Set(rows.map((row) => String(row.branch ?? "")).filter(Boolean))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (status && String(row.status ?? row.severity ?? "") !== status) return false;
    if (branch && String(row.branch ?? "") !== branch) return false;
    return true;
  }), [branch, query, rows, status]);
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
          <select className="focus-ring min-h-10 rounded-lg border border-forge-border px-3 text-sm" value={branch} onChange={(event) => { setBranch(event.target.value); setPage(1); }}>
            <option value="">All branches</option>
            {branches.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="md:col-span-4 flex items-center justify-between">
            <span className="text-sm text-forge-muted">{filtered.length} rows</span>
            <Button type="button" variant="secondary" onClick={() => exportRows(title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), filtered)}><Download size={16} /> Export CSV</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {pageRows.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
                <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-forge-border">
                {pageRows.map((row, index) => (
                  <tr key={String(row.id ?? row.paymentId ?? row.branchId ?? row.planId ?? row.employeeId ?? index)}>
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

function statusTone(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes("normal") || lower.includes("active")) return "success" as const;
  if (lower.includes("busy") || lower.includes("warning")) return "warning" as const;
  if (lower.includes("high") || lower.includes("inactive") || lower.includes("danger")) return "danger" as const;
  return "info" as const;
}

function paymentColumns() {
  return [
    { key: "paymentId", label: "Payment ID" },
    { key: "memberName", label: "Member Name" },
    { key: "branch", label: "Branch" },
    { key: "membershipPlan", label: "Membership Plan" },
    { key: "amount", label: "Amount", render: (row: Record<string, unknown>) => money(row.amount) },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "paidAt", label: "Paid At", render: (row: Record<string, unknown>) => row.paidAt ? dateLabel(String(row.paidAt)) : "Not set" },
    { key: "recordedByStaff", label: "Recorded By Staff" }
  ];
}

function paymentDateMatches(payment: OwnerPaymentRecord, date: string) {
  const paidAt = parseDate(payment.paidAt);
  return paidAt ? sameDay(paidAt, new Date(`${date}T00:00:00`)) : false;
}

function DashboardContent({ data }: { data: OwnerDashboard }) {
  const [range, setRange] = useState<RevenueRange>("7d");
  const [selectedRevenueDay, setSelectedRevenueDay] = useState(data.revenueTrend[data.revenueTrend.length - 1]?.date ?? "");
  const [branchMetric, setBranchMetric] = useState<BranchMetric>("revenue");
  const [panel, setPanel] = useState<PanelKey | null>(null);

  const revenueRows = useMemo(() => {
    if (range === "today") return data.revenueTrend.slice(-1);
    if (range === "month") return data.revenueTrend;
    return data.revenueTrend;
  }, [data.revenueTrend, range]);
  const selectedPayments = useMemo(() => data.paymentRecords.filter((payment) => selectedRevenueDay ? paymentDateMatches(payment, selectedRevenueDay) : true), [data.paymentRecords, selectedRevenueDay]);
  const branchMetricLabel = {
    revenue: "Revenue by branch",
    activeMembers: "Active members by branch",
    checkInsToday: "Check-ins today by branch",
    capacityPercent: "Capacity percentage by branch"
  }[branchMetric];
  const membersChartAsPie = data.membersByBranch.length >= 2 && data.membersByBranch.length <= 5;
  const activeVsExpiredRows = [
    { name: "Active Members", value: data.activeVsExpired.activeMembers },
    { name: "Expired Members", value: data.activeVsExpired.expiredMembers }
  ];

  const attentionRows = data.attentionItems as unknown as Record<string, unknown>[];
  const drawer = panel === "revenue" ? { title: "Revenue Payment Records", rows: data.paymentRecords as unknown as Record<string, unknown>[], columns: paymentColumns() }
    : panel === "branches" ? { title: "Branch Performance Data", rows: data.branchPerformance as unknown as Record<string, unknown>[], columns: [
      { key: "branch", label: "Branch" },
      { key: "revenue", label: "Revenue", render: (row: Record<string, unknown>) => money(row.revenue) },
      { key: "activeMembers", label: "Active Members" },
      { key: "expiredMembers", label: "Expired Members" },
      { key: "checkInsToday", label: "Check-ins Today" },
      { key: "capacityPercent", label: "Capacity %", render: (row: Record<string, unknown>) => percent(row.capacityPercent) },
      { key: "status", label: "Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> }
    ] }
    : panel === "members" ? { title: "Members by Branch Data", rows: data.membersByBranch as unknown as Record<string, unknown>[], columns: [
      { key: "branch", label: "Branch" },
      { key: "totalMembers", label: "Total Members" },
      { key: "activeMembers", label: "Active Members" },
      { key: "expiredMembers", label: "Expired Members" },
      { key: "newMembersThisMonth", label: "New Members This Month" }
    ] }
    : panel === "expired" ? { title: "Expired Members Data", rows: data.expiredMemberRecords as unknown as Record<string, unknown>[], columns: [
      { key: "memberName", label: "Member Name" },
      { key: "phone", label: "Phone" },
      { key: "branch", label: "Branch" },
      { key: "membershipPlan", label: "Membership Plan" },
      { key: "expiryDate", label: "Expiry Date", render: (row: Record<string, unknown>) => row.expiryDate ? dateLabel(String(row.expiryDate)) : "Not set" },
      { key: "daysExpired", label: "Days Expired" },
      { key: "lastCheckIn", label: "Last Check-in", render: (row: Record<string, unknown>) => row.lastCheckIn ? dateLabel(String(row.lastCheckIn)) : "Not recorded" }
    ] }
    : panel === "capacity" ? { title: "Branch Capacity Data", rows: data.branchCapacity as unknown as Record<string, unknown>[], columns: [
      { key: "branch", label: "Branch" },
      { key: "currentCheckIns", label: "Current Check-ins" },
      { key: "capacity", label: "Capacity" },
      { key: "capacityPercent", label: "Capacity %", render: (row: Record<string, unknown>) => percent(row.capacityPercent) },
      { key: "lastUpdated", label: "Last Updated", render: (row: Record<string, unknown>) => dateLabel(String(row.lastUpdated)) }
    ] }
    : panel === "payments" ? { title: "Payments Overview Data", rows: data.paymentRecords as unknown as Record<string, unknown>[], columns: [
      { key: "paymentId", label: "Payment ID" },
      { key: "memberName", label: "Member" },
      { key: "branch", label: "Branch" },
      { key: "amount", label: "Amount", render: (row: Record<string, unknown>) => money(row.amount) },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "membershipPlan", label: "Membership Plan" },
      { key: "paidAt", label: "Created At", render: (row: Record<string, unknown>) => row.paidAt ? dateLabel(String(row.paidAt)) : "Not set" }
    ] }
    : panel === "plans" ? { title: "Membership Plan Performance Data", rows: data.planPerformance as unknown as Record<string, unknown>[], columns: [
      { key: "planName", label: "Plan Name" },
      { key: "price", label: "Price", render: (row: Record<string, unknown>) => money(row.price) },
      { key: "salesCount", label: "Sales Count" },
      { key: "totalRevenue", label: "Total Revenue", render: (row: Record<string, unknown>) => money(row.totalRevenue) },
      { key: "activeMembersUsingPlan", label: "Active Members Using Plan" }
    ] }
    : panel === "team" ? { title: "Team Summary Data", rows: data.teamSummary.employees as unknown as Record<string, unknown>[], columns: [
      { key: "employeeName", label: "Employee Name" },
      { key: "role", label: "Role" },
      { key: "branch", label: "Branch" },
      { key: "status", label: "Status", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
      { key: "paymentsRecorded", label: "Payments Recorded" },
      { key: "checkInsHandled", label: "Check-ins Handled" }
    ] }
    : panel === "attention" ? { title: "Needs Attention Data", rows: attentionRows, columns: [
      { key: "title", label: "Alert" },
      { key: "message", label: "Details" },
      { key: "severity", label: "Severity", render: (row: Record<string, unknown>) => <Badge tone={statusTone(String(row.severity))}>{String(row.severity)}</Badge> },
      { key: "count", label: "Count" }
    ] }
    : null;

  return (
    <>
      <PageHeader title="Gym Owner Dashboard" description="Business control room for revenue, branch performance, members, capacity, payments, plans, and team attention." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Revenue Today" value={money(data.revenueToday)} meta="Payments recorded today" />
        <KpiCard label="Revenue Last 7 Days" value={money(data.revenueLast7Days)} meta="Rolling seven-day payment total" />
        <KpiCard label="Revenue This Month" value={money(data.revenueThisMonth)} meta="Current calendar month" />
        <KpiCard label="Active Members" value={data.activeMembers} meta="Valid active memberships" />
        <KpiCard label="Expired Members" value={data.expiredMembers} meta="Need renewal follow-up" />
        <KpiCard label="New Members This Month" value={data.newMembersThisMonth} meta="Joined this month" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <SectionHeader title="Revenue Trend" onViewData={() => setPanel("revenue")} />
          <div className="mb-3 flex flex-wrap gap-2">
            {(["today", "7d", "month"] as RevenueRange[]).map((item) => (
              <Button key={item} type="button" variant={range === item ? "primary" : "secondary"} onClick={() => setRange(item)}>
                {item === "today" ? "Today" : item === "7d" ? "Last 7 Days" : "This Month"}
              </Button>
            ))}
          </div>
          <div className="h-72">
            {revenueRows.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDay} />
                <YAxis tickFormatter={(value: number) => `$${value}`} />
                <Tooltip labelFormatter={(label: unknown) => formatDay(String(label))} formatter={tooltipValue} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#EA580C" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="paymentCount" name="Payment Count" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer> : <EmptyState title="No revenue trend data yet." />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {revenueRows.map((row) => (
              <Button key={row.date} type="button" variant={selectedRevenueDay === row.date ? "primary" : "secondary"} onClick={() => setSelectedRevenueDay(row.date)}>
                {formatDay(row.date)}
              </Button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-forge-border">
            <div className="flex items-center justify-between border-b border-forge-border p-3">
              <h3 className="text-sm font-bold text-slate-950">Payments for {selectedRevenueDay ? formatDay(selectedRevenueDay) : "selected day"}</h3>
              <Button type="button" variant="ghost" onClick={() => setPanel("revenue")}>Open all</Button>
            </div>
            {selectedPayments.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <tbody className="divide-y divide-forge-border">
                    {selectedPayments.slice(0, 5).map((payment) => (
                      <tr key={payment.paymentId}>
                        <td className="px-3 py-2 font-semibold">{payment.memberName}</td>
                        <td className="px-3 py-2">{payment.branch}</td>
                        <td className="px-3 py-2">{payment.paymentMethod}</td>
                        <td className="px-3 py-2 text-right font-bold">{money(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="p-3"><EmptyState title="No payments for this day." /></div>}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Needs Attention" onViewData={() => setPanel("attention")} />
          <div className="space-y-3">
            {data.attentionItems.length ? data.attentionItems.map((item) => (
              <button key={item.id} type="button" onClick={() => setPanel(item.type === "expired-members" ? "expired" : item.type === "capacity" ? "capacity" : item.type === "team" ? "team" : "attention")} className="focus-ring w-full rounded-xl border border-forge-border p-3 text-left hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-950">{item.title}</strong>
                  <Badge tone={statusTone(item.severity)}>{item.count}</Badge>
                </div>
                <p className="mt-1 text-sm text-forge-muted">{item.message}</p>
              </button>
            )) : <EmptyState title="Nothing needs attention." />}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Branch Performance" onViewData={() => setPanel("branches")} />
          <select className="focus-ring mb-3 min-h-10 rounded-lg border border-forge-border px-3 text-sm" value={branchMetric} onChange={(event) => setBranchMetric(event.target.value as BranchMetric)}>
            <option value="revenue">Revenue by branch</option>
            <option value="activeMembers">Active members by branch</option>
            <option value="checkInsToday">Check-ins today by branch</option>
            <option value="capacityPercent">Capacity percentage by branch</option>
          </select>
          <div className="h-72">
            {data.branchPerformance.length ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="branch" />
                <YAxis />
                <Tooltip formatter={tooltipValue} />
                <Bar dataKey={branchMetric} name={branchMetricLabel} fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer> : <EmptyState title="No branch performance data yet." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Members by Branch" onViewData={() => setPanel("members")} />
          <div className="h-72">
            {data.membersByBranch.length ? <ResponsiveContainer width="100%" height="100%">
              {membersChartAsPie ? (
                <PieChart>
                  <Pie data={data.membersByBranch} dataKey="totalMembers" nameKey="branch" innerRadius={64} outerRadius={105}>
                    {data.membersByBranch.map((row, index) => <Cell key={row.branchId} fill={palette[index % palette.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [count(value), "Total Members"]} />
                </PieChart>
              ) : (
                <BarChart data={data.membersByBranch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={tooltipValue} />
                  <Bar dataKey="totalMembers" name="Total Members" fill="#16A34A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="activeMembers" name="Active Members" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expiredMembers" name="Expired Members" fill="#DC2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer> : <EmptyState title="No member branch data yet." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Active vs Expired Members" onViewData={() => setPanel("expired")} />
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={activeVsExpiredRows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                    <Cell fill="#16A34A" />
                    <Cell fill="#DC2626" />
                  </Pie>
                  <Tooltip formatter={(value: unknown, name: unknown) => [count(value), String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <Badge tone="success">{data.activeMembers} active members</Badge>
              <Badge tone={data.expiredMembers > 0 ? "danger" : "success"}>{data.expiredMembers} expired members</Badge>
              {data.expiredMembers > 0 ? <p className="text-sm font-semibold text-red-700">{data.expiredMembers} expired members need follow-up.</p> : null}
              <Button type="button" variant="secondary" onClick={() => setPanel("expired")}>View expired members</Button>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Branch Capacity" onViewData={() => setPanel("capacity")} />
          <div className="grid gap-3">
            {data.branchCapacity.length ? data.branchCapacity.map((branch) => (
              <div key={branch.branchId} className="rounded-xl border border-forge-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-950">{branch.branch}</strong>
                  <span className="text-sm font-bold">{percent(branch.capacityPercent)}</span>
                </div>
                <p className="mt-1 text-sm text-forge-muted">{branch.currentCheckIns} current check-ins / {branch.capacity || "No capacity set"} capacity</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${branch.capacityPercent <= 60 ? "bg-emerald-500" : branch.capacityPercent <= 85 ? "bg-amber-500" : "bg-red-600"}`} style={{ width: `${Math.min(100, branch.capacityPercent)}%` }} />
                </div>
              </div>
            )) : <EmptyState title="No branches available." />}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Payments Overview" onViewData={() => setPanel("payments")} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.paymentsOverview.revenueByPaymentMethod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={tooltipValue} />
                  <Bar dataKey="revenue" name="Revenue by payment method" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="count" name="Payment Count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.paymentsOverview.paymentCountOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDay} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(label: unknown) => formatDay(String(label))} formatter={tooltipValue} />
                  <Line dataKey="count" name="Payment count" stroke="#EA580C" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.paymentsOverview.revenueByMembershipPlan}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={tooltipValue} />
                <Bar dataKey="revenue" name="Revenue by membership plan" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                <Bar dataKey="count" name="Payment Count" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Membership Plan Performance" onViewData={() => setPanel("plans")} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.planPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="planName" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipValue} />
                <Bar dataKey="salesCount" name="Sales Count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalRevenue" name="Total Revenue" fill="#EA580C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionHeader title="Team Management Summary" onViewData={() => setPanel("team")} />
        <div className="grid gap-4 md:grid-cols-5">
          <KpiCard label="Total Managers" value={data.teamSummary.totalManagers} meta="Branch manager accounts" />
          <KpiCard label="Total Staff" value={data.teamSummary.totalStaff} meta="Front desk and staff accounts" />
          <KpiCard label="Total Trainers" value={data.teamSummary.totalTrainers} meta="Trainer accounts" />
          <KpiCard label="Active Employees" value={data.teamSummary.activeEmployees} meta="Can access the portal" />
          <KpiCard label="Inactive Employees" value={data.teamSummary.inactiveEmployees} meta="Review account access" />
        </div>
        <div className="mt-4">
          <Link className="text-sm font-semibold text-forge-primary hover:text-orange-700" to="/gym-owner/staff">Open team management</Link>
        </div>
      </Card>

      {drawer ? <DataDrawer title={drawer.title} rows={drawer.rows} columns={drawer.columns} onClose={() => setPanel(null)} /> : null}
    </>
  );
}

export function GymOwnerDashboard() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.dashboard.owner);

  useEffect(() => {
    dispatch(fetchOwnerDashboard());
  }, [dispatch]);

  if (loading && !data) return <LoadingState label="Loading owner dashboard..." />;
  if (error && !data) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No dashboard data available yet." />;

  return <DashboardContent data={data} />;
}
