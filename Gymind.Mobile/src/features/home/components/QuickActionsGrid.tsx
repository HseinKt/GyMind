import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { useForgeTheme } from "@/theme/theme";
import { useWorkoutTimerStore, WorkoutTimerMode } from "@/features/timer/useWorkoutTimerStore";
import { logWorkoutSession } from "@/api/workoutsApi";

const baseActions = [
  { label: "Book Class", icon: "calendar-star", route: "/tabs/classes" },
  { label: "Timer", icon: "timer-outline", route: "timer" },
  { label: "My Plan", icon: "card-account-details-outline", route: "/membership" },
  { label: "Payments", icon: "credit-card-outline", route: "/tabs/payments" },
  { label: "Capacity", icon: "chart-donut", route: "/branches" }
] as const;

export function QuickActionsGrid({ hasActiveSession = false }: { hasActiveSession?: boolean }) {
  const [timerOpen, setTimerOpen] = useState(false);
  const theme = useForgeTheme();
  const actions = [
    { label: hasActiveSession ? "Check Out" : "Check In", icon: hasActiveSession ? "exit-run" : "qrcode-scan", route: hasActiveSession ? "/active-checkin" : "/qr-scan" },
    ...baseActions
  ] as const;
  const rows = [actions.slice(0, 3), actions.slice(3, 6)];

  return (
    <>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((action) => (
              <Pressable key={action.label} onPress={() => action.route === "timer" ? setTimerOpen(true) : router.push(action.route)} style={[styles.item, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
                <MaterialCommunityIcons name={action.icon} color={theme.primary} size={24} />
                <Text style={[styles.label, { color: theme.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <TimerMiniModal open={timerOpen} onClose={() => setTimerOpen(false)} />
    </>
  );
}

function TimerMiniModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [minutes, setMinutes] = useState("1");
  const timer = useWorkoutTimerStore();
  const elapsedMs = timer.getElapsedMs();
  const remainingMs = timer.getRemainingMs();
  const selectedMode = timer.mode === "countdown" ? "countdown" : "timer";
  const displayMs = selectedMode === "countdown" ? remainingMs : elapsedMs;
  const theme = useForgeTheme();
  
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void now;
    timer.syncCountdownCompletion();
  }, [now, timer]);

  const switchMode = (mode: WorkoutTimerMode) => {
    timer.switchMode(mode);
  };

  const start = () => {
    if (selectedMode === "countdown") {
      timer.startTimer("countdown", { countdownDurationMs: Math.max(1, Number(minutes) || 1) * 60_000 });
      return;
    }

    timer.startTimer("timer");
  };

  const handleLogWorkout = async () => {
    if (elapsedMs <= 0) return;
    try {
      setIsSaving(true);
      const durationSeconds = Math.floor(elapsedMs / 1000);
      const completedAt = new Date().toISOString();
      await logWorkoutSession(durationSeconds, completedAt);
      timer.resetTimer();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workouts"] }),
        queryClient.invalidateQueries({ queryKey: ["profileDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] })
      ]);
      Alert.alert("Success", "Workout session logged successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to log workout session. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Clock</Text>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.surface2 }]}>
              <MaterialCommunityIcons name="close" color={theme.text} size={22} />
            </Pressable>
          </View>

          <View style={styles.segmentRow}>
            {(["timer", "countdown"] as WorkoutTimerMode[]).map((mode) => (
              <Pressable key={mode} onPress={() => switchMode(mode)} style={[styles.segment, { borderColor: theme.border, backgroundColor: theme.surface2 }, selectedMode === mode && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                <Text style={[styles.segmentText, { color: theme.text }, selectedMode === mode && { color: "#FFFFFF" }]}>{mode === "countdown" ? "Countdown" : "Timer"}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.timeFace, { color: theme.primary }]}>{formatDuration(displayMs)}</Text>
          <Text style={[styles.modeText, { color: theme.muted }]}>{timer.isRunning ? "Running" : timer.completed ? "Done" : "Ready"}</Text>

          {selectedMode === "countdown" ? (
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.muted }]}>Minutes</Text>
              <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surface2, color: theme.text }]} />
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <ForgeButton title={timer.isRunning ? "Pause" : "Start"} onPress={timer.isRunning ? timer.pauseTimer : start} style={styles.flexButton} />
            <ForgeButton title="Reset" variant="secondary" onPress={timer.resetTimer} style={styles.flexButton} />
          </View>
          {selectedMode === "timer" && !timer.isRunning && elapsedMs > 0 ? (
            <ForgeButton title={isSaving ? "Saving..." : "Log Workout"} disabled={isSaving} onPress={handleLogWorkout} style={{ marginTop: 8 }} />
          ) : null}
          {selectedMode === "timer" ? <ForgeButton title="Lap" variant="secondary" disabled={!timer.isRunning} onPress={timer.addLap} style={{ marginTop: 8 }} /> : null}
          {selectedMode === "timer" && timer.laps.length ? (
            <View style={[styles.lapList, { borderTopColor: theme.border }]}>
              {timer.laps.slice(0, 5).map((lap, index) => <Text key={`${lap}-${index}`} style={[styles.lapText, { color: theme.warm }]}>Lap {timer.laps.length - index}: {formatDuration(lap)}</Text>)}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  gridRow: { flexDirection: "row", gap: 10 },
  item: { flex: 1, minHeight: 86, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 6 },
  label: { fontWeight: "800", fontSize: 13, letterSpacing: 0, textAlign: "center" },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { gap: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 22, fontWeight: "900", letterSpacing: 0 },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1 },
  segmentText: { fontWeight: "900", fontSize: 12 },
  timeFace: { fontSize: 48, fontWeight: "300", letterSpacing: 0, textAlign: "center" },
  modeText: { fontWeight: "800", textAlign: "center" },
  inputRow: { gap: 6 },
  inputLabel: { fontWeight: "800" },
  input: { minHeight: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontWeight: "900" },
  buttonRow: { flexDirection: "row", gap: 10 },
  flexButton: { flex: 1 },
  lapList: { gap: 6, borderTopWidth: 1, paddingTop: 10 },
  lapText: { fontWeight: "800" }
});
