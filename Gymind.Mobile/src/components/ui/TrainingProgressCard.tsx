import { StyleSheet, Text, View } from "react-native";
import { ActivityHeatmapDay, DashboardStats } from "@/api/homeApi";
import { useForgeTheme } from "@/theme/theme";

export function TrainingProgressCard({ stats, activity }: { stats: DashboardStats; activity: ActivityHeatmapDay[] }) {
  const theme = useForgeTheme();
  const days = normalizeAttendanceDays(activity);
  const rows = Array.from({ length: 5 }, (_, rowIndex) => days.slice(rowIndex * 6, rowIndex * 6 + 6));
  const attendedDays = days.filter((day) => day.count > 0).length;
  const hasActivity = attendedDays > 0;

  return (
    <View style={[styles.card, { borderColor: "rgba(252,106,10,0.35)", backgroundColor: theme.mode === "light" ? theme.surface : "#1D1D1D" }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Progress</Text>
          <Text style={[styles.title, { color: theme.text }]}>Attendance diagram</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Last 30 days</Text>
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendDot, attendanceCellStyle(1, theme.primary)]} />
          <Text style={[styles.legendText, { color: theme.muted }]}>Attended</Text>
          <View style={[styles.legendDot, attendanceCellStyle(0, theme.primary)]} />
          <Text style={[styles.legendText, { color: theme.muted }]}>Off</Text>
        </View>
      </View>

      <View style={styles.diagram}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.diagramRow}>
            {row.map((day) => (
              <View key={day.date} style={[styles.attendanceCell, attendanceCellStyle(day.count, theme.primary)]}>
                <Text style={[styles.dayNumber, { color: day.count > 0 ? "#FFFFFF" : theme.muted }]}>{day.label}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.rangeRow}>
        <Text style={[styles.rangeText, { color: theme.muted }]}>{formatShortDate(days[0]?.date)}</Text>
        <Text style={[styles.rangeText, { color: theme.muted }]}>{formatShortDate(days[days.length - 1]?.date)}</Text>
      </View>

      {!hasActivity ? <Text style={[styles.emptyText, { color: theme.muted }]}>Start checking in to build your training streak.</Text> : null}

      <View style={styles.statsRow}>
        <MiniStat label="This month" value={stats.visitsThisMonth ?? 0} />
        <MiniStat label="Streak" value={`${stats.currentStreak ?? 0}d`} />
        <MiniStat label="30 days" value={attendedDays} />
      </View>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  const theme = useForgeTheme();
  return (
    <View style={[styles.miniStat, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
      <Text style={[styles.miniStatValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function normalizeAttendanceDays(activity: ActivityHeatmapDay[]) {
  const map = new Map(activity.map((day) => [day.date, day.count]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    return { date: key, count: map.get(key) ?? 0, label: String(date.getDate()) };
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function attendanceCellStyle(count: number, primary: string) {
  if (count <= 0) {
    return {
      backgroundColor: "rgba(165,165,174,0.10)",
      borderColor: "rgba(165,165,174,0.18)"
    };
  }

  return {
    backgroundColor: primary,
    borderColor: "#FFB067",
    shadowColor: primary,
    shadowOpacity: 0.28,
    shadowRadius: 8
  };
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 },
  title: { fontSize: 18, fontWeight: "900", marginTop: 3, letterSpacing: 0 },
  subtitle: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  legend: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 138 },
  legendText: { fontSize: 10, fontWeight: "800" },
  legendDot: { width: 11, height: 11, borderRadius: 4, borderWidth: 1 },
  diagram: { gap: 8 },
  diagramRow: { flexDirection: "row", gap: 8 },
  attendanceCell: { flex: 1, aspectRatio: 1.25, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 } },
  dayNumber: { fontSize: 12, fontWeight: "900", letterSpacing: 0 },
  rangeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  rangeText: { fontSize: 11, fontWeight: "800" },
  emptyText: { fontSize: 12, fontWeight: "800", lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 8 },
  miniStat: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 10, gap: 2 },
  miniStatValue: { fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  miniStatLabel: { fontSize: 10, fontWeight: "800" }
});
