import { StyleSheet, Text, View } from "react-native";
import { BodyInsights } from "@/types/insights";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";
import { formatNumber } from "@/utils/formatNumber";

export function BodyRatiosCard({ insights }: { insights: BodyInsights }) {
  return (
    <ForgeCard style={styles.card}>
      <Text style={styles.title}>Body ratios</Text>
      <View style={styles.row}><Text style={styles.label}>Weight to height</Text><Text style={styles.value}>{formatNumber(insights.weightToHeightRatio)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Shoulder to waist</Text><Text style={styles.value}>{formatNumber(insights.shoulderToWaistRatio)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Chest to waist</Text><Text style={styles.value}>{formatNumber(insights.chestToWaistRatio)}</Text></View>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  label: { color: colors.muted, fontWeight: "700" },
  value: { color: colors.text, fontWeight: "900" }
});
