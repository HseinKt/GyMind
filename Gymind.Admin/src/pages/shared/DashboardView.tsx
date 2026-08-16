import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Search } from "lucide-react";
import { dashboardApi } from "../../api/dashboardApi";
import type { AdminWorkspace } from "../../api/dashboardApi";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../hooks/useAuth";
import { cleanLabel, dateLabel, money, percent as formatPercent } from "../../utils/formatters";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import type { Branch } from "../../types/branch";
import type { Member } from "../../types/member";
import type { Payment } from "../../types/payment";

function countBy<T>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).length;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isToday(value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isThisMonth(value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function amountTotal(payments: Payment[]) {
  return payments.reduce((sum, payment) => {
    if (!statusIncludes(payment.status ?? "Completed", "completed")) return sum;
    return sum + Number(payment.amountValue ?? payment.amount ?? 0);
  }, 0);
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthlyPayments(payments: Payment[]) {
  return payments.filter((payment) => isThisMonth(payment.paidAt ?? null));
}

function statusIncludes(value: unknown, token: string) {
  return String(value ?? "").toLowerCase().includes(token.toLowerCase());
}

function branchCapacity(branch: Branch) {
  if (!branch.capacity || branch.capacity <= 0) return null;
  return Math.round(((branch.activeToday ?? 0) / branch.capacity) * 100);
}

function isActiveMembership(member: Member) {
  const status = String(member.status ?? "").toLowerCase();
  const endDate = parseDate(member.membershipEndDate);
  const notExpired = !endDate || endDate >= new Date(new Date().toDateString());
  if (status) return status.includes("active") && !status.includes("inactive") && notExpired;
  return member.isActive === true && notExpired;
}

function isExpiredMembership(member: Member) {
  const status = String(member.status ?? "").toLowerCase();
  const endDate = parseDate(member.membershipEndDate);
  return status.includes("expired") || status.includes("inactive") || Boolean(endDate && endDate < new Date(new Date().toDateString()));
}

function isExpiringWithin(member: Member, days: number) {
  if (!isActiveMembership(member)) return false;
  const endDate = parseDate(member.membershipEndDate);
  if (!endDate) return false;
  const today = new Date(new Date().toDateString());
  const max = new Date(today);
  max.setDate(max.getDate() + days);
  return endDate >= today && endDate <= max;
}

function todayClasses(data: AdminWorkspace) {
  return data.classes.filter((item) => isToday(item.startTime ?? null));
}

function capacityStatus(percent: number | null) {
  if (percent === null) return { label: "Not configured", tone: "neutral" as const };
  if (percent <= 60) return { label: "Normal", tone: "success" as const };
  if (percent <= 85) return { label: "Busy", tone: "warning" as const };
  if (percent <= 100) return { label: "Nearly Full", tone: "warning" as const };
  return { label: "Data Error / Over Capacity", tone: "danger" as const };
}

function ContextBadge({ children }: { children: React.ReactNode }) {
  return <div className="mb-4"><Badge tone="info">{children}</Badge></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-slate-950">{title}</h2>
      {children}
    </Card>
  );
}

function ActionLink({ to, children, primary = false }: { to: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`focus-ring inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${primary ? "bg-forge-primary text-white hover:bg-orange-700" : "border border-forge-border bg-white text-slate-800 hover:bg-slate-50"}`}
    >
      {children}
    </Link>
  );
}

function BranchPerformanceChart({ branches }: { branches: Branch[] }) {
  const chartData = branches.map((branch) => ({
    name: cleanLabel(branch.name, "Unknown Branch"),
    active: branch.activeToday ?? 0,
    capacity: branch.capacity ?? 0
  }));

  if (!chartData.length) return <EmptyState title="No branches available yet." message="Branch capacity will appear after branches are created." />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="active" name="Active today" fill="#2563EB" radius={[6, 6, 0, 0]} />
          <Bar dataKey="capacity" name="Capacity" fill="#16A34A" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RecentMembers({ title, members }: { title: string; members: Member[] }) {
  return (
    <DataTable
      title={title}
      rows={members.slice(0, 8)}
      columns={[
        { key: "name", label: "Member" },
        { key: "status", label: "Membership", badge: true },
        { key: "membershipEndDate", label: "Valid Until", render: (row) => row.membershipEndDate ? dateLabel(row.membershipEndDate) : "Not assigned" },
        { key: "paymentStatus", label: "Payment", badge: true },
        { key: "attendanceToday", label: "Check-in", badge: true }
      ]}
    />
  );
}

function SuperAdminDashboard({ data }: { data: AdminWorkspace }) {
  const activeGyms = countBy(data.gyms, (gym) => statusIncludes(gym.status, "active"));
  const inactiveGyms = data.gyms.length - activeGyms;
  const members = data.members.length;
  const owners = data.users.filter((user) => user.role === "GymOwner");
  const newGymsThisMonth = countBy(data.gyms, (gym) => isThisMonth(gym.createdAt ?? null));
  const missingBranchData = data.branches.filter((branch) => !branch.capacity || !branch.lat || !branch.lng || !branch.rangeKm);
  const monthlyPlatformRevenue = numberValue(data.dashboard?.platform?.monthlyPlatformRevenue);
  const pendingRevenue = numberValue(data.dashboard?.platform?.pendingRevenue);
  const latePayments = numberValue(data.dashboard?.platform?.latePayments);

  return (
    <>
      <PageHeader title="Super Admin Dashboard" description="SaaS platform-level monitoring across all scoped gyms, branches, users, and activity." />
      <ContextBadge>Platform Overview</ContextBadge>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Gyms" value={data.gyms.length} />
        <KpiCard label="Active Gyms" value={activeGyms} />
        <KpiCard label="Inactive Gyms" value={inactiveGyms} />
        <KpiCard label="Total Branches" value={data.branches.length} />
        <KpiCard label="Total Users" value={data.users.length} />
        <KpiCard label="Total Members Across Platform" value={members} />
        <KpiCard label="New Gyms This Month" value={newGymsThisMonth} />
        <KpiCard label="System Alerts" value={missingBranchData.length} />
        <KpiCard label="Late Payments" value={latePayments} />
        <KpiCard label="Monthly Platform Revenue" value={money(monthlyPlatformRevenue)} />
        <KpiCard label="Pending Revenue" value={money(pendingRevenue)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DataTable title="Recent Gyms" rows={[...data.gyms].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))).slice(0, 8)} columns={[{ key: "name", label: "Gym" }, { key: "ownerName", label: "Owner" }, { key: "branches", label: "Branches" }, { key: "createdAt", label: "Created", render: (row) => row.createdAt ? dateLabel(row.createdAt) : "Unknown" }, { key: "status", label: "Status", badge: true }]} />
        <DataTable title="Recent Gym Owners" rows={owners.slice(0, 8)} columns={[{ key: "name", label: "Owner" }, { key: "email", label: "Email" }, { key: "workspace", label: "Workspace" }, { key: "isActive", label: "Active", badge: true }]} />
        <DataTable title="Gyms Needing Attention" rows={data.gyms.filter((gym) => !statusIncludes(gym.status, "active") || gym.branches === 0)} columns={[{ key: "name", label: "Gym" }, { key: "branches", label: "Branches" }, { key: "members", label: "Members" }, { key: "status", label: "Status", badge: true }]} />
        <DataTable title="Branches Missing Location/Capacity Data" rows={missingBranchData} columns={[{ key: "name", label: "Branch" }, { key: "address", label: "Location" }, { key: "capacity", label: "Capacity" }, { key: "rangeKm", label: "Geofence" }, { key: "status", label: "Status", badge: true }]} />
      </div>
    </>
  );
}

function GymOwnerDashboard({ data }: { data: AdminWorkspace }) {
  const gymName = data.gyms[0]?.name ?? "Assigned gym";
  const pendingPayments = countBy(data.members, (member) => statusIncludes(member.paymentStatus, "pending"));
  const expired = countBy(data.members, isExpiredMembership);
  const active = countBy(data.members, isActiveMembership);
  const expiring = data.members.filter((member) => isExpiringWithin(member, 14));
  const monthPayments = monthlyPayments(data.payments);
  const todaysAttendance = data.attendance.filter((item) => isToday(item.checkInTime ?? item.at ?? null));
  const branchesNearCapacity = data.branches.filter((branch) => {
    const percent = branchCapacity(branch);
    return percent !== null && percent >= 86;
  }).length;

  const branchRows = data.branches.map((branch) => {
    const percent = branchCapacity(branch);
    const status = capacityStatus(percent);
    const monthlyRevenue = amountTotal(monthPayments.filter((payment) => payment.branchId === branch.id));
    return { ...branch, monthlyRevenue, capacityPercent: percent === null ? "Capacity not configured" : formatPercent(percent), capacityStatus: status.label };
  });

  return (
    <>
      <PageHeader title="Gym Owner Dashboard" description="Business overview for your gym only, using backend-scoped members, payments, branches, and attendance." />
      <ContextBadge>Gym: {gymName}</ContextBadge>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Members" value={data.members.length} />
        <KpiCard label="Active Memberships" value={active} />
        <KpiCard label="Expired Memberships" value={expired} />
        <KpiCard label="Monthly Revenue" value={money(amountTotal(monthPayments))} />
        <KpiCard label="Today Check-ins" value={todaysAttendance.length} />
        <KpiCard label="Total Branches" value={data.branches.length} />
        <KpiCard label="Branches Near Capacity" value={branchesNearCapacity} />
        <KpiCard label="Pending Payments" value={pendingPayments} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Branch Capacity Overview"><BranchPerformanceChart branches={data.branches} /></Section>
        <RecentMembers title="Expiring Memberships" members={expiring} />
      </div>
      <div className="mt-6">
        <DataTable title="Branch Performance" rows={branchRows} columns={[{ key: "name", label: "Branch Name" }, { key: "members", label: "Members" }, { key: "activeToday", label: "Today Check-ins" }, { key: "capacityPercent", label: "Capacity %" }, { key: "monthlyRevenue", label: "Monthly Revenue", render: (row) => money(row.monthlyRevenue) }, { key: "capacityStatus", label: "Status", badge: true }]} />
      </div>
    </>
  );
}

function BranchManagerDashboard({ data }: { data: AdminWorkspace }) {
  const branch = data.branches[0];
  const percent = branch ? branchCapacity(branch) : null;
  const status = capacityStatus(percent);
  const pendingPayments = countBy(data.members, (member) => statusIncludes(member.paymentStatus, "pending"));
  const expired = countBy(data.members, isExpiredMembership);
  const active = countBy(data.members, isActiveMembership);
  const renewalMembers = data.members.filter((member) => isExpiringWithin(member, 7) || isExpiredMembership(member));
  const todayClassRows = todayClasses(data);
  const todaysAttendance = data.attendance.filter((item) => isToday(item.checkInTime ?? item.at ?? null));
  const monthPayments = monthlyPayments(data.payments);
  const branchRows = branch ? [{
    ...branch,
    monthlyRevenue: amountTotal(monthPayments),
    capacityPercent: percent === null ? "Capacity not configured" : formatPercent(percent),
    capacityStatus: status.label
  }] : [];

  return (
    <>
      <PageHeader title="Branch Manager Dashboard" description="Branch-level business overview using backend-scoped members, payments, capacity, classes, and attendance." />
      <ContextBadge>Branch: {branch?.name ?? "Assigned branch"}</ContextBadge>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Members" value={data.members.length} />
        <KpiCard label="Active Memberships" value={active} />
        <KpiCard label="Expired Memberships" value={expired} />
        <KpiCard label="Monthly Revenue" value={money(amountTotal(monthPayments))} />
        <KpiCard label="Today Check-ins" value={todaysAttendance.length} />
        <KpiCard label="Current Capacity" value={percent === null ? "Capacity not configured" : formatPercent(percent)} meta={status.label} />
        <KpiCard label="Classes Today" value={todayClassRows.length} />
        <KpiCard label="Pending Payments" value={pendingPayments} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Branch Capacity Overview"><BranchPerformanceChart branches={data.branches} /></Section>
        <RecentMembers title="Branch Members Needing Renewal" members={renewalMembers} />
        <DataTable title="Recent Check-ins" rows={data.attendance.slice(0, 10)} columns={[{ key: "memberName", label: "Member" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }, { key: "source", label: "Source" }]} />
        <DataTable title="Today's Classes" rows={todayClassRows.slice(0, 10)} columns={[{ key: "name", label: "Class" }, { key: "trainerName", label: "Trainer" }, { key: "time", label: "Time" }, { key: "status", label: "Status", badge: true }]} />
        <Section title="Branch Alerts">{pendingPayments || renewalMembers.length ? <div className="space-y-3 text-sm text-forge-muted"><p><AlertTriangle className="mr-2 inline" size={16} />Review pending payments and renewals before closing.</p><Badge tone={status.tone}>{status.label}</Badge></div> : <EmptyState title="No branch alerts." />}</Section>
      </div>
      <div className="mt-6">
        <DataTable title="Branch Performance" rows={branchRows} columns={[{ key: "name", label: "Branch Name" }, { key: "members", label: "Members" }, { key: "activeToday", label: "Today Check-ins" }, { key: "capacityPercent", label: "Capacity %" }, { key: "monthlyRevenue", label: "Monthly Revenue", render: (row) => money(row.monthlyRevenue) }, { key: "capacityStatus", label: "Status", badge: true }]} />
      </div>
    </>
  );
}

function StaffDashboard({ data }: { data: AdminWorkspace }) {
  const pendingPayments = countBy(data.members, (member) => statusIncludes(member.paymentStatus, "pending"));
  const expiring = data.members.filter((member) => isExpiringWithin(member, 14) || isExpiredMembership(member));
  const inside = countBy(data.members, (member) => statusIncludes(member.attendanceToday, "currently checked in"));
  const todaysAttendance = data.attendance.filter((item) => isToday(item.checkInTime ?? item.at ?? null));

  return (
    <>
      <PageHeader title="Staff Dashboard" description="Daily operations for member lookup, membership status, payments, and check-in support." />
      <ContextBadge>Daily Operations</ContextBadge>
      <Card>
        <Link to="/staff/member-search" className="flex items-center gap-3 rounded-lg border border-forge-border px-4 py-4 text-forge-muted hover:border-blue-300 hover:bg-blue-50">
          <Search size={20} />
          <span>Search member by name, phone, email, or ID</span>
        </Link>
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Active Members Today" value={todaysAttendance.length} />
        <KpiCard label="Pending Payments" value={pendingPayments} />
        <KpiCard label="Expiring Memberships" value={expiring.length} />
        <KpiCard label="Recent Check-ins" value={data.attendance.length} />
        <KpiCard label="Members Currently Inside" value={inside} />
        <Card>
          <p className="text-sm font-medium text-forge-muted">Quick Actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionLink to="/staff/register-member" primary>Add Member</ActionLink>
            <ActionLink to="/staff/renew-membership">Renew Membership</ActionLink>
            <ActionLink to="/staff/payments">Record Payment</ActionLink>
            <ActionLink to="/staff/manual-check-in">Manual Check-in</ActionLink>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecentMembers title="Member Status" members={data.members.slice(0, 10)} />
        <DataTable title="Today Attendance" rows={todaysAttendance.slice(0, 15)} columns={[{ key: "memberName", label: "Member" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }, { key: "source", label: "Source" }]} />
      </div>
    </>
  );
}

function TrainerDashboard({ data }: { data: AdminWorkspace }) {
  const todayClassRows = todayClasses(data);
  const upcomingClasses = data.classes.filter((item) => {
    const date = parseDate(item.startTime ?? null);
    return date ? date >= new Date() : false;
  });
  return (
    <>
      <PageHeader title="Trainer Dashboard" description="Training schedule, classes, assigned members, and attendance for your own workload." />
      <ContextBadge>Training Schedule</ContextBadge>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Classes Today" value={todayClassRows.length} />
        <KpiCard label="Personal Sessions Today" value="Not available" meta="TODO: return trainer sessions in workspace/dashboard API." />
        <KpiCard label="Assigned Members" value={data.members.length} />
        <KpiCard label="Completed Sessions" value="Not available" meta="TODO: return completed trainer sessions." />
        <KpiCard label="Remaining Sessions" value="Not available" meta="TODO: return session package counts." />
        <KpiCard label="Upcoming Classes" value={upcomingClasses.length} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DataTable title="Today's Schedule" rows={todayClassRows.slice(0, 8)} columns={[{ key: "name", label: "Class" }, { key: "time", label: "Time" }, { key: "booked", label: "Booked" }, { key: "status", label: "Status", badge: true }]} />
        <RecentMembers title="Assigned Members" members={data.members.slice(0, 8)} />
        <DataTable title="Class Attendance" rows={data.attendance.slice(0, 8)} columns={[{ key: "memberName", label: "Member" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }, { key: "source", label: "Source" }]} />
        <Section title="Personal Training Sessions"><EmptyState title="No upcoming sessions." message="TODO: connect GET /api/dashboard/trainer or /api/trainer-sessions with session package counts." /></Section>
      </div>
    </>
  );
}

export function DashboardView() {
  const { session } = useAuth();
  const { data, loading, error } = useApi(() => dashboardApi.getWorkspace(), []);

  if (loading) return <LoadingState label="Loading dashboard data..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No data available yet." />;

  switch (session?.user.role) {
    case "SuperAdmin":
      return <SuperAdminDashboard data={data} />;
    case "GymOwner":
      return <GymOwnerDashboard data={data} />;
    case "BranchManager":
      return <BranchManagerDashboard data={data} />;
    case "Staff":
      return <StaffDashboard data={data} />;
    case "Trainer":
      return <TrainerDashboard data={data} />;
    default:
      return <ErrorState title="Access denied" message="Members should use the Gymind mobile app." />;
  }
}
