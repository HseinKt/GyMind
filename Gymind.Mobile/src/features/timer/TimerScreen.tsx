import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { checkoutCurrentGymSession, getCurrentGymSession, sendCheckInHeartbeat } from "@/api/checkInApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors } from "@/theme/colors";
import { formatDateTime } from "@/utils/formatDate";
import { CurrentGymSession } from "@/types/checkIn";

function parseTime(value?: string | null) {
  if (!value) return null;
  const parts = value.split(":").map((part) => Number(part));
  const hours = parts[0] ?? Number.NaN;
  const minutes = parts[1] ?? Number.NaN;
  const seconds = parts[2] ?? 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return { hours, minutes, seconds: Number.isFinite(seconds) ? seconds : 0 };
}

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function formatDuration(milliseconds: number) {
  const safeSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getBranchCloseDate(now: Date, closeTime?: string | null) {
  const parsed = parseTime(closeTime);
  if (!parsed) return null;
  const closeDate = new Date(now);
  closeDate.setHours(parsed.hours, parsed.minutes, parsed.seconds, 0);
  if (closeDate.getTime() < now.getTime()) {
    closeDate.setDate(closeDate.getDate() + 1);
  }
  return closeDate;
}

export function TimerScreen() {
  return (
    <ForgeScreen title="Timer" subtitle="Current gym session">
      <TimerPanel />
    </ForgeScreen>
  );
}

export function TimerPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["currentGymSession"],
    queryFn: getCurrentGymSession,
    refetchOnMount: "always"
  });
  const { refetch } = query;

  const checkoutMutation = useMutation({
    mutationFn: checkoutCurrentGymSession,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["currentGymSession"] }),
        queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["history"] })
      ]);
    }
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refetch();
      }
    });
    return () => subscription.remove();
  }, [refetch]);

  useEffect(() => {
    if (!query.data?.hasActiveCheckIn) return undefined;
    const heartbeat = setInterval(() => {
      sendCheckInHeartbeat()
        .then(() => queryClient.invalidateQueries({ queryKey: ["currentGymSession"] }))
        .catch(() => undefined);
    }, 60000);
    return () => clearInterval(heartbeat);
  }, [query.data?.hasActiveCheckIn, queryClient]);

  const serverOffsetMs = useMemo(() => {
    const serverTime = query.data?.serverTime ? new Date(query.data.serverTime).getTime() : NaN;
    return Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
  }, [query.data?.serverTime]);

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <TickingTimerPanel
      session={query.data ?? null}
      serverOffsetMs={serverOffsetMs}
      checkoutMutation={checkoutMutation}
    />
  );
}

interface TickingTimerProps {
  session: CurrentGymSession | null;
  serverOffsetMs: number;
  checkoutMutation: any;
}

function TickingTimerPanel({ session, serverOffsetMs, checkoutMutation }: TickingTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentDate = useMemo(() => new Date(now + serverOffsetMs), [now, serverOffsetMs]);
  const checkInDate = useMemo(() => {
    if (!session?.checkInTime) return null;
    const value = new Date(session.checkInTime);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [session?.checkInTime]);
  const branchCloseDate = useMemo(() => getBranchCloseDate(currentDate, session?.branchCloseTime), [currentDate, session?.branchCloseTime]);

  const elapsed = checkInDate ? currentDate.getTime() - checkInDate.getTime() : 0;
  const countdown = branchCloseDate ? branchCloseDate.getTime() - currentDate.getTime() : 0;

  if (!session?.hasActiveCheckIn) {
    return (
      <ForgeCard style={styles.clockCard}>
        <ClockHeader status="Not Checked In" />
        <View style={styles.centerStage}>
          <Text style={styles.faceLabel}>Current time</Text>
          <Text style={styles.clockFace}>{formatClock(currentDate)}</Text>
        </View>
        <View style={styles.iphoneRow}>
          <Text style={styles.rowLabel}>Gym Session</Text>
          <Text style={styles.rowValue}>You are not currently checked in.</Text>
        </View>
        <EmptyState title="Not Checked In" message="You are not currently checked in." />
      </ForgeCard>
    );
  }

  return (
    <ForgeCard style={styles.clockCard}>
      <ClockHeader status="Inside Gym" />
      <View style={styles.centerStage}>
        <Text style={styles.faceLabel}>Elapsed</Text>
        <Text style={styles.timerFace}>{formatDuration(elapsed)}</Text>
        <Text style={styles.branch}>{session.branchName ?? "Gym branch"}</Text>
      </View>

      <View style={styles.sideBySide}>
        <TimeDial label="Current" value={formatClock(currentDate)} />
        <TimeDial
          label="Countdown"
          value={branchCloseDate ? formatDuration(countdown) : "--:--:--"}
          warning={Boolean(branchCloseDate && countdown <= 30 * 60 * 1000)}
        />
      </View>

      <View style={styles.iphoneList}>
        <View style={styles.iphoneRow}>
          <Text style={styles.rowLabel}>Check-in</Text>
          <Text style={styles.rowValue}>{checkInDate ? formatDateTime(session.checkInTime) : "Not available"}</Text>
        </View>
        <View style={styles.iphoneRow}>
          <Text style={styles.rowLabel}>Status</Text>
          <Text style={styles.rowValue}>Inside Gym</Text>
        </View>
      </View>

      {checkoutMutation.error ? <Text style={styles.error}>Checkout failed. Please try again.</Text> : null}
      <View style={styles.controls}>
        <CircleButton title={checkoutMutation.isPending ? "..." : "Stop"} disabled={checkoutMutation.isPending} onPress={() => checkoutMutation.mutate()} />
      </View>
    </ForgeCard>
  );
}

// Subcomponents:
function ClockHeader({ status }: { status: string }) {
  return (
    <View style={styles.headerRow}>
      <MaterialCommunityIcons name="timer-outline" color={colors.primary} size={22} />
      <Text style={styles.title}>Gym Timer</Text>
      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}

function TimeDial({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <View style={styles.dial}>
      <Text style={styles.dialLabel}>{label}</Text>
      <Text style={[styles.dialValue, warning && styles.warningNumber]}>{value}</Text>
    </View>
  );
}

function CircleButton({ title, disabled, onPress }: { title: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.circleButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.circleButtonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clockCard: { gap: 22, backgroundColor: colors.black, borderColor: "rgba(245,236,228,0.12)", paddingVertical: 22 },
  headerRow: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", letterSpacing: 0 },
  statusPill: { borderRadius: 999, backgroundColor: "rgba(252,106,10,0.18)", paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 0 },
  centerStage: { alignItems: "center", gap: 6, paddingVertical: 8 },
  faceLabel: { color: colors.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0 },
  clockFace: { color: colors.text, fontSize: 48, fontWeight: "300", letterSpacing: 0 },
  timerFace: { color: colors.primary, fontSize: 56, fontWeight: "300", letterSpacing: 0 },
  branch: { color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: 0 },
  sideBySide: { flexDirection: "row", gap: 12 },
  dial: { flex: 1, minHeight: 86, borderRadius: 18, backgroundColor: "#1C1C1E", padding: 14, justifyContent: "center", gap: 6 },
  dialLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0 },
  dialValue: { color: colors.text, fontSize: 23, fontWeight: "400", letterSpacing: 0 },
  iphoneList: { overflow: "hidden", borderRadius: 18, backgroundColor: "#1C1C1E" },
  iphoneRow: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: "rgba(245,236,228,0.1)", paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center", gap: 4 },
  rowLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: "600", letterSpacing: 0, lineHeight: 20 },
  controls: { alignItems: "center", paddingTop: 4 },
  circleButton: { width: 86, height: 86, borderRadius: 43, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(231,69,4,0.2)", borderWidth: 2, borderColor: "rgba(231,69,4,0.34)" },
  circleButtonText: { color: colors.danger, fontSize: 16, fontWeight: "800", letterSpacing: 0 },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  warningNumber: { color: colors.danger },
  error: { color: colors.danger, fontWeight: "800" }
});
