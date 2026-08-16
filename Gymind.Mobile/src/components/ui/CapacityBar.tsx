import { StyleSheet, Text, View } from "react-native";
import { useForgeTheme } from "@/theme/theme";

export function CapacityBar({ percentage }: { percentage: number }) {
  const theme = useForgeTheme();
  const width = Math.max(0, Math.min(100, percentage));
  const fill = width >= 100 ? theme.danger : width >= 80 ? theme.warning : theme.success;
  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: theme.surface2 }]}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: fill }]} />
      </View>
      <Text style={[styles.label, { color: theme.muted }]}>{Math.round(width)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10, alignItems: "center" },
  track: { flex: 1, height: 10, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  label: { width: 42, textAlign: "right", fontSize: 12, fontWeight: "800" }
});
