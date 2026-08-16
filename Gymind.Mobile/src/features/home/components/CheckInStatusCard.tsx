import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkoutCurrentGymSession } from "@/api/checkInApi";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { useForgeTheme } from "@/theme/theme";
import { CurrentGymSession } from "@/types/checkIn";
import { formatDateTime } from "@/utils/formatDate";
import { parseApiError } from "@/utils/errors";

const LAP_SECONDS = 10 * 60;

export function CheckInStatusCard({ session }: { session?: CurrentGymSession | null }) {
  const queryClient = useQueryClient();
  const theme = useForgeTheme();
  const [nowMs, setNowMs] = useState(Date.now());
  const hasActive = Boolean(session?.hasActiveCheckIn && (session.checkInTime ?? session.checkInTimeUtc));
  const checkInTime = session?.checkInTime ?? session?.checkInTimeUtc ?? null;
  const serverOffsetMs = useMemo(() => {
    const serverMs = session?.serverTime ? new Date(session.serverTime).getTime() : NaN;
    return Number.isNaN(serverMs) ? 0 : serverMs - Date.now();
  }, [session?.serverTime]);

  const checkoutMutation = useMutation({
    mutationFn: checkoutCurrentGymSession,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] }),
        queryClient.invalidateQueries({ queryKey: ["history"] }),
        queryClient.invalidateQueries({ queryKey: ["membership"] })
      ]);
    }
  });

  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasActive]);

  const currentServerMs = nowMs + serverOffsetMs;
  const checkInMs = checkInTime ? new Date(checkInTime).getTime() : NaN;
  const elapsedSeconds = hasActive && !Number.isNaN(checkInMs)
    ? Math.max(0, Math.floor((currentServerMs - checkInMs) / 1000))
    : 0;
  const lapSeconds = elapsedSeconds % LAP_SECONDS;
  const closeMs = useMemo(() => getBranchCloseMs(currentServerMs, session?.branchCloseTime), [currentServerMs, session?.branchCloseTime]);
  const countdownSeconds = closeMs ? Math.max(0, Math.floor((closeMs - currentServerMs) / 1000)) : null;

  return (
    <ForgeCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: theme.primary }]}>Gym session</Text>
          <Text style={[styles.title, { color: theme.text }]}>{hasActive ? "You are checked in" : "No active session"}</Text>
        </View>
        <Text style={[styles.badge, hasActive ? { backgroundColor: theme.primary, color: "#FFFFFF" } : { backgroundColor: theme.surface2, color: theme.warm }]}>{hasActive ? "Inside" : "Ready"}</Text>
      </View>
      {hasActive ? (
        <>
          <View style={[styles.timerBlock, { backgroundColor: theme.primary }]}>
            <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
            <Text style={styles.timerLabel}>Time in gym</Text>
          </View>
          <View style={styles.grid}>
            <TimerFact label="Current time" value={formatClock(currentServerMs)} />
            <TimerFact label="Check-in" value={formatDateTime(checkInTime)} />
            <TimerFact label="Lap timer" value={formatDuration(lapSeconds)} />
            <TimerFact label="Countdown" value={countdownSeconds === null ? "Not set" : formatDuration(countdownSeconds)} muted={countdownSeconds === null} />
          </View>
          <Text style={[styles.text, { color: theme.warm }]}>{session?.branchName ?? "Branch"} - {session?.status ?? "Inside Gym"}</Text>
          {checkoutMutation.error ? <Text style={[styles.error, { color: theme.danger }]}>{parseApiError(checkoutMutation.error).message}</Text> : null}
          <ForgeButton title={checkoutMutation.isPending ? "Checking out..." : "Check Out"} disabled={checkoutMutation.isPending} onPress={() => checkoutMutation.mutate()} />
        </>
      ) : (
        <>
          <Text style={[styles.text, { color: theme.warm }]}>Scan your branch QR code when you arrive. Gymind will reload your active database session whenever the app opens.</Text>
          <ForgeButton title="Check In" onPress={() => router.push("/qr-scan")} />
        </>
      )}
      <ForgeButton title="Session details" variant="secondary" onPress={() => router.push("/active-checkin")} />
    </ForgeCard>
  );
}

function TimerFact({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  const theme = useForgeTheme();
  return (
    <View style={[styles.fact, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
      <Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.factLabel, { color: muted ? theme.secondary : theme.warm }]}>{label}</Text>
    </View>
  );
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

// Keep helper functions unmodified

function formatClock(ms: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

function getBranchCloseMs(nowMs: number, closeTime?: string | null) {
  if (!closeTime) return null;
  const [hoursText, minutesText, secondsText] = closeTime.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;

  const close = new Date(nowMs);
  close.setHours(hours, minutes, seconds, 0);
  if (close.getTime() < nowMs) {
    close.setDate(close.getDate() + 1);
  }

  return close.getTime();
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  kicker: { fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  text: { lineHeight: 20, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: "900" },
  timerBlock: { borderRadius: 8, padding: 18 },
  timer: { color: "#FFFFFF", fontSize: 36, fontWeight: "900", letterSpacing: 0 },
  timerLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", marginTop: 2, textTransform: "uppercase", letterSpacing: 0 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { width: "48%", borderRadius: 8, borderWidth: 1, padding: 12, gap: 4 },
  factValue: { fontSize: 15, fontWeight: "900", letterSpacing: 0 },
  factLabel: { fontSize: 11, fontWeight: "800" },
  error: { fontWeight: "800" }
});
