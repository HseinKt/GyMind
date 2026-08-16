import { StyleSheet, Text, View } from "react-native";
import { ForgeCard } from "./ForgeCard";
import { useForgeTheme } from "@/theme/theme";

export function MetricCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean | undefined }) {
  const theme = useForgeTheme();
  return (
    <ForgeCard style={styles.card}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.text }, accent && { color: theme.primary }]}>{value}</Text>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 144, gap: 8 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0 },
  value: { fontSize: 22, fontWeight: "900", letterSpacing: 0 }
});
