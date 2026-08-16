import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { reportsApi } from "../../api/reportsApi";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useApi } from "../../hooks/useApi";
import type { CheckInUnderlyingRow } from "../../api/reportsApi";

function timeLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function capacityLabel(capacity?: number | null) {
  return capacity && capacity > 0 ? String(capacity) : "Not configured";
}

export function BranchReportsPage() {
  const { data, loading, error } = useApi(reportsApi.getManagerReport, []);

  if (loading) return <LoadingState label="Loading branch reports..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No branch report data available." />;

  const capacityChart = data.branchCapacityByHour.map((row) => ({
    ...row,
    utilizationPercent: row.utilizationPercent ?? 0
  }));
  const hasCapacityData = capacityChart.some((row) => row.activePeopleCount > 0);

  return (
    <>
      <PageHeader title="Branch Reports" description={`Operational reports for ${data.branchName || "your assigned branch"}.`} />
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Members logged today" value={data.totalMembersLoggedToday} />
        <KpiCard label="Check-in events today" value={data.checkInOutSummary.checkIns} />
        <KpiCard label="Manual check-outs" value={data.checkInOutSummary.manualCheckOuts} />
        <KpiCard label="Auto check-outs" value={data.checkInOutSummary.autoCheckOuts} />
        <KpiCard label="Branch capacity" value={capacityLabel(data.branchCapacity)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-950">Overall Branch Capacity by Hour</h2>
          {!hasCapacityData ? (
            <EmptyState title="No active sessions recorded today." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={capacityChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="activePeopleCount" name="Active people" stroke="#F97316" strokeWidth={3} dot={{ r: 3 }} />
                  {data.branchCapacity ? <Line type="monotone" dataKey="utilizationPercent" name="Utilization %" stroke="#2563EB" strokeWidth={2} dot={false} /> : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-950">Check-In / Check-Out Counts</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { label: "Check-ins", count: data.checkInOutSummary.checkIns },
                { label: "Manual check-outs", count: data.checkInOutSummary.manualCheckOuts },
                { label: "Auto check-outs", count: data.checkInOutSummary.autoCheckOuts }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#16A34A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="mt-6">
        <DataTable<CheckInUnderlyingRow>
          title="Today Check-in Records"
          rows={data.todayCheckIns}
          columns={[
            { key: "memberName", label: "Member" },
            { key: "branchName", label: "Branch" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status ?? "Unknown"} /> },
            { key: "checkInTime", label: "Check-in", render: (row) => timeLabel(row.checkInTime) },
            { key: "checkOutTime", label: "Check-out", render: (row) => timeLabel(row.checkOutTime) },
            { key: "isAutoCheckOut", label: "Auto checkout", badge: true }
          ]}
        />
      </div>
    </>
  );
}
