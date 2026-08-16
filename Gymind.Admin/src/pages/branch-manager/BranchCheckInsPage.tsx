import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { checkInsApi } from "../../api/checkInsApi";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { CheckIn } from "../../types/checkIn";

type DateRange = "1d" | "7d" | "1m";
type AlertFilter = "all" | "sus";
const pageSize = 10;
const rangeLabels: Record<DateRange, string> = {
  "1d": "1 day",
  "7d": "7 days",
  "1m": "1 month"
};

function timeLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function alertTone(level?: string) {
  if (level === "high") return "danger" as const;
  if (level === "medium") return "warning" as const;
  return "info" as const;
}

export function BranchCheckInsPage() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<DateRange>("1m");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");
  const { data, loading, error, reload } = useApi(() => checkInsApi.getCheckInHistoryPage({
    page,
    pageSize,
    range,
    suspiciousOnly: alertFilter === "sus"
  }), [page, range, alertFilter]);
  const [checkout, setCheckout] = useState<CheckIn | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const rows = data?.items ?? [];
  const suspiciousRows = useMemo(() => rows.filter((row) => row.isSuspicious), [rows]);
  const activeRows = useMemo(() => rows.filter((row) => !row.checkOutTime), [rows]);

  async function manualCheckOut(row: CheckIn) {
    setActionError("");
    try {
      await checkInsApi.manualCheckOut(row.id);
      setCheckout(null);
      setNotice("Manual checkout completed.");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to complete checkout.");
    }
  }

  if (loading) return <LoadingState label="Loading branch check-ins..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Check-ins" description="Branch attendance activity with suspicious repeated check-in alerts." />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <KpiCard label="Recent check-ins" value={data?.totalCount ?? rows.length} />
        <KpiCard label="Open sessions" value={activeRows.length} />
        <KpiCard label="Suspicious alerts" value={suspiciousRows.length} />
      </div>
      {suspiciousRows.length ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="mr-2 inline" size={16} />
          Review suspicious repeated check-in activity. Alerts are informational and do not block valid check-ins.
        </div>
      ) : null}
      <DataTable
        title="Branch Check-ins"
        rows={rows}
        toolbar={(
          <>
            <Select className="min-w-36" value={range} onChange={(event) => { setRange(event.target.value as DateRange); setPage(1); }}>
              {Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select className="min-w-36" value={alertFilter} onChange={(event) => { setAlertFilter(event.target.value as AlertFilter); setPage(1); }}>
              <option value="all">All alerts</option>
              <option value="sus">SUS only</option>
            </Select>
          </>
        )}
        columns={[
          { key: "memberName", label: "Member" },
          { key: "branchName", label: "Branch", render: (row) => row.branchName || "Assigned branch" },
          { key: "status", label: "Status", badge: true },
          { key: "checkInTime", label: "Check-in", render: (row) => timeLabel(row.checkInTime ?? row.at) },
          { key: "checkOutTime", label: "Check-out", render: (row) => timeLabel(row.checkOutTime) },
          { key: "source", label: "Source" },
          {
            key: "suspicionReason",
            label: "Alert",
            render: (row) => row.isSuspicious
              ? <Badge tone={alertTone(row.suspicionLevel)}>{row.alertType || "SUS"}: {row.alertMessage || row.suspicionReason || "Suspicious check-in detected"}</Badge>
              : <Badge tone="success">Normal</Badge>
          }
        ]}
        actions={[
          { label: "Manual checkout", variant: "secondary", onClick: setCheckout, hidden: (row) => Boolean(row.checkOutTime) }
        ]}
      />
      <PaginationControls
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 1}
        totalCount={data?.totalCount}
        pageSize={data?.pageSize ?? pageSize}
        onPageChange={setPage}
      />
      <ConfirmDialog
        open={Boolean(checkout)}
        title="Manual checkout"
        message={`Close the open session for ${checkout?.memberName ?? "this member"}?`}
        onClose={() => setCheckout(null)}
        onConfirm={() => checkout ? manualCheckOut(checkout) : undefined}
      />
    </>
  );
}
