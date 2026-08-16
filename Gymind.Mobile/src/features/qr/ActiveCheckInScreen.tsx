import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkout, getActiveCheckIn } from "@/api/checkInApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors } from "@/theme/colors";
import { formatDateTime } from "@/utils/formatDate";
import { parseApiError } from "@/utils/errors";

export function ActiveCheckInScreen() {
  const queryClient = useQueryClient();
  const [locationDenied, setLocationDenied] = useState(false);
  const query = useQuery({ queryKey: ["activeCheckIn"], queryFn: getActiveCheckIn });
  const mutation = useMutation({
    mutationFn: checkout,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["history"] }),
        queryClient.invalidateQueries({ queryKey: ["branches", "access"] }),
        queryClient.invalidateQueries({ queryKey: ["membership"] })
      ]);
    }
  });

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((response) => setLocationDenied(response.status === Location.PermissionStatus.DENIED))
      .catch(() => setLocationDenied(false));
  }, []);

  return (
    <ForgeScreen title="Active check-in" subtitle="Attendance session" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {!query.isLoading && !query.error && query.data?.hasActiveCheckIn === false ? (
        <EmptyState title="No active check-in" message="Scan the branch QR code when you arrive to start an attendance session." />
      ) : null}
      {query.data?.hasActiveCheckIn ? (
      <ForgeCard style={styles.card}>
        <Text style={styles.title}>{query.data.branchName ?? "Branch"}</Text>
        <Text style={styles.text}>Checked in: {formatDateTime(query.data.checkInTimeUtc)}</Text>
        <Text style={styles.text}>Duration: {query.data.durationMinutes ?? 0} minutes</Text>
        {query.data.status ? <Text style={styles.text}>Status: {query.data.status}</Text> : null}
        <Text style={styles.notice}>Auto checkout active while this screen/app is open. Background tracking is not implemented, so Gymind does not track your location after the app is closed.</Text>
        {locationDenied ? <Text style={styles.error}>Foreground location permission is denied. Auto checkout cannot run until location access is allowed.</Text> : null}
        {mutation.error ? <Text style={styles.error}>{parseApiError(mutation.error).message}</Text> : null}
        {mutation.isSuccess ? <Text style={styles.success}>Checkout request completed.</Text> : null}
        <ForgeButton title={mutation.isPending ? "Checking out..." : "Manual checkout"} disabled={mutation.isPending} onPress={() => mutation.mutate()} />
      </ForgeCard>
      ) : null}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: 0 },
  text: { color: colors.muted, lineHeight: 20, fontWeight: "600" },
  notice: { color: colors.text, lineHeight: 20, fontWeight: "700", backgroundColor: "rgba(249,115,22,0.12)", borderColor: colors.primary, borderWidth: 1, borderRadius: 8, padding: 12 },
  error: { color: colors.danger, fontWeight: "800" },
  success: { color: colors.success, fontWeight: "900" }
});
