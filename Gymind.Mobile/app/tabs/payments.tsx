import { useQuery } from "@tanstack/react-query";
import { FlatList, StyleSheet, Text } from "react-native";
import { getPayments } from "@/api/paymentsApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { useForgeTheme } from "@/theme/theme";

function formatAmount(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PaymentsTab() {
  const query = useQuery({ queryKey: ["payments"], queryFn: getPayments });
  const theme = useForgeTheme();

  return (
    <ForgeScreen title="Payments" subtitle="Your billing history" scroll={false}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}

      {!query.isLoading && !query.error && (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(payment) => String(payment.id)}
          renderItem={({ item: payment }) => (
            <ForgeCard style={styles.card}>
              <Text style={[styles.amount, { color: theme.text }]}>{formatAmount(payment.amountValue ?? payment.amount)}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>{payment.method ?? "Payment"} - {payment.status ?? "Paid"}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>{formatDate(payment.paidAt ?? payment.at)}</Text>
              {payment.notes ? <Text style={[styles.notes, { color: theme.warm }]}>{payment.notes}</Text> : null}
            </ForgeCard>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No payments yet"
              message="Membership payments will appear here after staff records them."
            />
          }
          contentContainerStyle={styles.listContent}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
        />
      )}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  amount: { fontSize: 24, fontWeight: "900", letterSpacing: 0 },
  meta: { fontWeight: "800" },
  notes: { fontWeight: "700", lineHeight: 20 },
  listContent: { padding: 20, gap: 16, paddingBottom: 120 }
});
