import { StyleSheet, Text, View } from "react-native";
import { ForgeCard } from "./ForgeCard";
import { useForgeTheme } from "@/theme/theme";
import { WeeklyActivityDay } from "@/types/profileDashboard";

const fallbackDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyActivityCard({ activity, averageMinutes }: { activity: WeeklyActivityDay[]; averageMinutes?: number | undefined }) {
  const theme = useForgeTheme();
  const days = normalizeWeek(activity);
  const maxMinutes = Math.max(1, ...days.map((day) => day.minutes));
  const average = averageMinutes ?? Math.round(days.reduce((sum, day) => sum + day.minutes, 0) / Math.max(days.length, 1));

  return (
    <ForgeCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Weekly Activity</Text>
          <Text style={[styles.title, { color: theme.text }]}>Training minutes</Text>
        </View>
        <View style={[styles.avgPill, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
          <Text style={[styles.avgValue, { color: theme.text }]}>{average}</Text>
          <Text style={[styles.avgLabel, { color: theme.muted }]}>avg min</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {days.map((day) => {
          const height = Math.max(8, Math.round((day.minutes / maxMinutes) * 104));
          return (
            <View key={`${day.day}-${day.date}`} style={styles.dayColumn}>
              <View style={[styles.barTrack, { backgroundColor: theme.surface2 }]}>
                <View style={[styles.bar, { height, backgroundColor: day.isToday ? theme.primary : theme.secondary, shadowColor: theme.primary, shadowOpacity: day.isToday ? 0.28 : 0 }]} />
              </View>
              <Text style={[styles.minutes, { color: day.isToday ? theme.primary : theme.text }]}>{day.minutes}</Text>
              <Text style={[styles.day, { color: day.isToday ? theme.primary : theme.muted }]}>{shortDay(day.day)}</Text>
            </View>
          );
        })}
      </View>
    </ForgeCard>
  );
}

function normalizeWeek(activity: WeeklyActivityDay[]) {
  if (activity.length > 0) {
    return activity.slice(0, 7).map((day, index) => ({
      ...day,
      day: day.day || fallbackDays[index] || "",
      minutes: Number.isFinite(day.minutes) ? Math.max(0, day.minutes) : 0
    }));
  }

  const today = new Date().getDay();
  const mondayBasedToday = today === 0 ? 6 : today - 1;
  return fallbackDays.map((day, index) => ({
    day,
    date: "",
    minutes: 0,
    isToday: index === mondayBasedToday
  }));
}

function shortDay(day: string) {
  const normalized = day.trim();
  return normalized.length <= 3 ? normalized : normalized.slice(0, 3);
}

const styles = StyleSheet.create({
  card: { gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: 0, marginTop: 3 },
  avgPill: { minWidth: 76, borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" },
  avgValue: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  avgLabel: { fontSize: 10, fontWeight: "800" },
  chart: { height: 168, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 7 },
  dayColumn: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { width: "100%", maxWidth: 30, height: 112, borderRadius: 999, justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", borderRadius: 999, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  minutes: { fontSize: 11, fontWeight: "900", letterSpacing: 0 },
  day: { fontSize: 11, fontWeight: "900" }
});
