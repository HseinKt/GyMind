import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { paymentsApi } from "../../api/paymentsApi";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { Payment } from "../../types/payment";
import { money } from "../../utils/formatters";

type DateFilter = "today" | "last7" | "month";

const filterLabels: Record<DateFilter, string> = {
  today: "Today / 1 day",
  last7: "Last 7 days",
  month: "This month"
};

function paymentDate(payment: Payment) {
  const value = payment.paidAt ?? payment.at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function filterStart(filter: DateFilter) {
  const today = startOfToday();
  if (filter === "today") return today;
  if (filter === "last7") {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return date;
  }
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function amountValue(payment: Payment) {
  const value = payment.amountValue ?? payment.amount ?? 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function escapeCell(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function exportExcel(payments: Payment[]) {
  const headers = ["Member name", "Branch", "Plan", "Amount", "Payment date", "Status", "Method"];
  const rows = payments.map((payment) => [
    payment.member,
    payment.branch,
    payment.plan,
    amountValue(payment).toFixed(2),
    payment.paidAt ?? payment.at,
    payment.status,
    payment.method
  ]);
  const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gymind-branch-payments.xls";
  link.click();
  URL.revokeObjectURL(url);
}

export function BranchPaymentsPage() {
  const { data, loading, error } = useApi(paymentsApi.getPayments, []);
  const [filter, setFilter] = useState<DateFilter>("today");

  const filtered = useMemo(() => {
    const start = filterStart(filter);
    return (data ?? []).filter((payment) => {
      const date = paymentDate(payment);
      return Boolean(date && date >= start);
    });
  }, [data, filter]);
  const total = useMemo(() => filtered.reduce((sum, payment) => sum + amountValue(payment), 0), [filtered]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Branch Payments" description="Payments for your assigned branch only." />
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <KpiCard label={`Total ${filterLabels[filter]}`} value={money(total)} />
        <KpiCard label="Payments shown" value={filtered.length} />
      </div>
      <DataTable
        title="Payments"
        rows={filtered}
        toolbar={(
          <>
            <Select className="min-w-40" value={filter} onChange={(event) => setFilter(event.target.value as DateFilter)}>
              {Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Button type="button" variant="secondary" onClick={() => exportExcel(filtered)} disabled={!filtered.length}>
              <Download size={16} /> Export
            </Button>
          </>
        )}
        columns={[
          { key: "member", label: "Member" },
          { key: "branch", label: "Branch", render: (row) => row.branch || "Assigned branch" },
          { key: "plan", label: "Plan", render: (row) => row.plan || "Not assigned" },
          { key: "amount", label: "Amount", render: (row) => money(amountValue(row)) },
          { key: "method", label: "Method" },
          { key: "status", label: "Status", badge: true },
          { key: "at", label: "Time", render: (row) => row.paidAt ? new Date(row.paidAt).toLocaleString() : row.at ?? "Not assigned" }
        ]}
      />
    </>
  );
}
