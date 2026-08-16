import { StyleSheet, Text, View } from "react-native";
import { BranchAccess } from "@/types/branch";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { useForgeTheme } from "@/theme/theme";

export function BranchAccessCard({ branch }: { branch: BranchAccess }) {
  const theme = useForgeTheme();
  const okStyle = { color: theme.success, backgroundColor: theme.success + "1f" };
  const warnStyle = { color: theme.warning, backgroundColor: theme.warning + "1f" };

  return (
    <ForgeCard style={styles.card}>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={[styles.name, { color: theme.text }]}>{branch.branchName}</Text>
          <Text style={[styles.address, { color: theme.muted }]}>{branch.address}</Text>
        </View>
        <StatusBadge label={branch.status} tone={toneForStatus(branch.status)} />
      </View>
      <Text style={[styles.hours, { color: theme.muted }]}>{branch.openTime || "--"} - {branch.closeTime || "--"}</Text>
      <CapacityBar percentage={branch.capacityPercentage} />
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: theme.text }]}>{branch.currentOccupancy}/{branch.capacity} inside</Text>
        <Text style={[styles.meta, { color: theme.text }]}>{branch.remainingSpots} spots left</Text>
      </View>
      <View style={styles.flags}>
        <Text style={[styles.flag, branch.canCheckIn ? okStyle : warnStyle]}>{branch.canCheckIn ? "Check-in available" : "Check-in unavailable"}</Text>
        <Text style={[styles.flag, branch.membershipAccess ? okStyle : warnStyle]}>{branch.membershipAccess ? "Included" : "Not included"}</Text>
      </View>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  top: { flexDirection: "row", gap: 12, alignItems: "flex-start", justifyContent: "space-between" },
  titleBlock: { flex: 1, gap: 3 },
  name: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  address: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  hours: { fontSize: 13, fontWeight: "800" },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontWeight: "800", fontSize: 13 },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flag: { fontSize: 12, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" }
});
