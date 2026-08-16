import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text } from "react-native";
import { getCheckInHistory } from "@/api/checkInApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { useForgeTheme } from "@/theme/theme";
import { formatDateTime } from "@/utils/formatDate";

export function HistoryScreen() {
  const query = useQuery({ queryKey: ["history"], queryFn: getCheckInHistory });
  const theme = useForgeTheme();
  return (
    <ForgeScreen title="History" subtitle="Attendance records" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data?.length === 0 ? <EmptyState title="No attendance history" message="Check-ins returned by the backend will appear here." /> : null}
      {query.data?.map((item) => (
        <ForgeCard key={item.id} style={styles.card}>
          <Text style={[styles.title, { color: theme.text }]}>{item.branchName || "Branch"}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>In: {formatDateTime(item.checkInTime)}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>Out: {formatDateTime(item.checkOutTime)}</Text>
        </ForgeCard>
      ))}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  title: { fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  meta: { fontWeight: "700" }
});
