import { useMemo, useState } from "react";
import { paymentsApi } from "../../api/paymentsApi";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { useApi } from "../../hooks/useApi";
import type { Payment } from "../../types/payment";
import { dateLabel, money } from "../../utils/formatters";

const pageSize = 10;

function amountValue(payment: Payment) {
  if (typeof payment.amountValue === "number") return payment.amountValue;
  if (typeof payment.amount === "number") return payment.amount;
  const parsed = Number(String(payment.amount ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function isDayPass(payment: Payment) {
  const text = `${payment.paymentType ?? ""} ${payment.method ?? ""} ${payment.notes ?? ""} ${payment.plan ?? ""}`;
  return /DAY_PASS|one day|day pass/i.test(text);
}

export function StaffPaymentsPage() {
  const { data, loading, error } = useApi(paymentsApi.getPayments, []);
  const [page, setPage] = useState(1);
  const payments = data ?? [];
  const todayPayments = useMemo(() => payments.filter((payment) => isToday(payment.paidAt ?? payment.at)), [payments]);
  const dayPassPayments = useMemo(() => todayPayments.filter(isDayPass), [todayPayments]);
  const membershipPayments = useMemo(() => todayPayments.filter((payment) => !isDayPass(payment)), [todayPayments]);
  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const rows = payments.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Payments recorded for your assigned branch." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Today's total" value={money(todayPayments.reduce((sum, payment) => sum + amountValue(payment), 0))} />
        <KpiCard label="Today's payments" value={todayPayments.length} />
        <KpiCard label="Day-pass count" value={dayPassPayments.length} />
        <KpiCard label="Day-pass revenue" value={money(dayPassPayments.reduce((sum, payment) => sum + amountValue(payment), 0))} />
        <KpiCard label="Membership revenue" value={money(membershipPayments.reduce((sum, payment) => sum + amountValue(payment), 0))} />
      </div>

      <DataTable<Payment>
        title="Branch Payments"
        rows={rows}
        columns={[
          { key: "member", label: "Member", render: (row) => row.member || (isDayPass(row) ? "One Day Pass" : "Member") },
          { key: "plan", label: "Plan", render: (row) => row.plan || (isDayPass(row) ? "One Day Pass" : "Not assigned") },
          { key: "amount", label: "Amount", render: (row) => money(amountValue(row)) },
          { key: "paymentType", label: "Type", render: (row) => row.paymentType || (isDayPass(row) ? "DAY_PASS" : "MEMBERSHIP") },
          { key: "paidAt", label: "Date", render: (row) => dateLabel(row.paidAt ?? row.at) },
          { key: "cashier", label: "Cashier", render: (row) => row.cashier || "Not assigned" },
          { key: "status", label: "Status", badge: true }
        ]}
      />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalCount={payments.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
