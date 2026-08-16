import { auditLogsApi, type AuditActorActionCount, type AuditLog } from "../../api/auditLogsApi";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import { useMemo, useState } from "react";

interface BarPoint {
  label: string;
  count: number;
}

type AuditRange = "1d" | "7d" | "1m";

const rangeLabels: Record<AuditRange, string> = {
  "1d": "Last 1 day",
  "7d": "Last 7 days",
  "1m": "Last 1 month"
};

function getRangeStart(range: AuditRange) {
  const start = new Date();
  if (range === "1m") {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setDate(start.getDate() - (range === "7d" ? 7 : 1));
  }
  return start.toISOString();
}

function countBy(rows: AuditLog[], getLabel: (row: AuditLog) => string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const label = getLabel(row).trim() || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function BarList({ title, data }: { title: string; data: BarPoint[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        <span className="text-xs font-bold uppercase text-forge-muted">{data.length} groups</span>
      </div>
      <div className="space-y-3">
        {data.slice(0, 12).map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-800">{item.label}</span>
              <span className="font-black text-slate-950">{item.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-forge-primary" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActorActionChart({ rows }: { rows: AuditActorActionCount[] }) {
  const actions = [...new Set(rows.map((row) => row.action || "Unknown Action"))].sort();
  const actors = [...new Set(rows.map((row) => row.actor || "Unknown Actor"))];
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.actor, (totals.get(row.actor) ?? 0) + row.count));
  const max = Math.max(...rows.map((row) => row.count), 1);
  const chartRows = actors
    .map((actor) => ({ actor, total: totals.get(actor) ?? 0 }))
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 12);

  if (!chartRows.length) {
    return (
      <Card className="p-4">
        <h2 className="mb-4 text-base font-black text-slate-950">Actor Actions Matrix</h2>
        <p className="text-sm font-semibold text-forge-muted">No actor/action activity for the selected filters.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">Actor Actions Matrix</h2>
        <span className="text-xs font-bold uppercase text-forge-muted">{actions.length} actions</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
            <tr>
              <th className="px-3 py-2">Actor</th>
              {actions.map((action) => <th key={action} className="px-3 py-2 text-right">{action}</th>)}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forge-border">
            {chartRows.map(({ actor, total }) => (
              <tr key={actor}>
                <td className="max-w-48 truncate px-3 py-2 font-semibold text-slate-900">{actor}</td>
                {actions.map((action) => {
                  const count = rows.find((row) => row.actor === actor && row.action === action)?.count ?? 0;
                  const strength = count ? Math.max(0.16, count / max) : 0;
                  return (
                    <td key={action} className="px-3 py-2 text-right">
                      <span
                        className="inline-flex min-w-10 justify-center rounded-md px-2 py-1 font-black"
                        style={{ backgroundColor: count ? `rgba(252, 106, 10, ${strength})` : "#F8FAFC", color: strength > 0.55 ? "#FFFFFF" : "#0F172A" }}
                      >
                        {count}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-black text-slate-950">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AuditLogsPage() {
  const [range, setRange] = useState<AuditRange>("1d");
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const from = useMemo(() => getRangeStart(range), [range]);
  const params = useMemo(() => ({
    from,
    actor: actorFilter || undefined,
    action: actionFilter || undefined,
    tableName: tableFilter || undefined
  }), [actionFilter, actorFilter, from, tableFilter]);
  const { data, loading, error } = useApi(() => auditLogsApi.getAuditLogs(params), [params]);
  const actorActions = useApi(() => auditLogsApi.getActorActionCounts(params), [params]);
  const rows = data ?? [];
  const actionCounts = useMemo(() => countBy(rows, (row) => row.action ?? ""), [rows]);
  const actionOptions = useMemo(() => [...new Set(rows.map((row) => row.action).filter((value): value is string => Boolean(value?.trim())))].sort(), [rows]);
  const tableOptions = useMemo(() => [...new Set(rows.map((row) => row.tableName).filter((value): value is string => Boolean(value?.trim())))].sort(), [rows]);
  const latest = rows[0]?.createdAt ? formatDate(rows[0].createdAt) : "No logs yet";

  if (loading || actorActions.loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (actorActions.error) return <ErrorState message={actorActions.error} />;

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description={`Operational audit activity from the backend audit-log endpoint. Showing ${rangeLabels[range].toLowerCase()}.`}
        action={(
          <Select className="min-w-40" value={range} onChange={(event) => setRange(event.target.value as AuditRange)}>
            <option value="1d">Last 1 day</option>
            <option value="7d">Last 7 days</option>
            <option value="1m">Last 1 month</option>
          </Select>
        )}
      />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold text-slate-700">Actor<Input value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} placeholder="Name, email, or ID" /></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Action<Select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="">All actions</option>{actionOptions.map((action) => <option key={action} value={action}>{action}</option>)}</Select></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Table<Select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)}><option value="">All tables</option>{tableOptions.map((table) => <option key={table} value={table}>{table}</option>)}</Select></label>
        </div>
      </Card>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Logs loaded</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Action types</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{actionCounts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Latest activity</p>
          <p className="mt-2 text-sm font-black text-slate-950">{latest}</p>
        </Card>
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <BarList title="Action vs Count" data={actionCounts} />
        <ActorActionChart rows={actorActions.data ?? []} />
      </div>
      <DataTable<AuditLog>
        title="Raw Audit Logs"
        rows={rows}
        columns={[
          { key: "action", label: "Action" },
          { key: "userName", label: "Actor" },
          { key: "tableName", label: "Table" },
          { key: "recordId", label: "Record" },
          { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) }
        ]}
      />
    </>
  );
}
