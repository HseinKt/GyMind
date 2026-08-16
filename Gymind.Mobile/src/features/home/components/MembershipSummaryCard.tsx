import { StyleSheet, Text, View } from "react-native";
import { Membership } from "@/types/membership";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { useForgeTheme } from "@/theme/theme";
import { formatDate } from "@/utils/formatDate";

export function MembershipSummaryCard({ membership, homeBranchName }: { membership: Membership | null; homeBranchName?: string | null }) {
  const current = membership?.currentMembership ?? null;
  const remainingDays = current?.remainingDays ?? membership?.remainingDays ?? 0;
  const status = current?.status ?? membership?.status ?? "No Membership";
  const planName = current?.planName ?? membership?.planName ?? "No active plan";
  const endsSoon = remainingDays <= 2 && remainingDays >= 0 && status.toLowerCase().includes("active");
  const theme = useForgeTheme();

  return (
    <ForgeCard style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={[styles.label, { color: theme.warm }]}>Membership</Text>
          <Text style={[styles.title, { color: theme.text }]}>{planName || "No active plan"}</Text>
        </View>
        <StatusBadge label={status} tone={toneForStatus(status)} />
      </View>
      <View style={styles.detailGrid}>
        <Detail label="Start" value={formatDate(current?.startDate)} />
        <Detail label="End" value={formatDate(current?.endDate)} />
        <Detail label="Days left" value={String(remainingDays)} />
        <Detail label="Home branch" value={homeBranchName || current?.branches?.[0]?.branchName || "No branch assigned"} />
      </View>
      {endsSoon ? (
        <Text style={[styles.warning, { backgroundColor: theme.danger }]}>Your membership ends in {remainingDays} {remainingDays === 1 ? "day" : "days"}. Renew now to avoid interruption.</Text>
      ) : null}
    </ForgeCard>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useForgeTheme();
  return (
    <View style={[styles.detail, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.detailLabel, { color: theme.warm }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { fontWeight: "800", fontSize: 12 },
  title: { fontSize: 20, fontWeight: "900", marginTop: 4, letterSpacing: 0 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detail: { width: "48%", borderRadius: 8, borderWidth: 1, padding: 12, gap: 4 },
  detailValue: { fontWeight: "900", fontSize: 14, letterSpacing: 0 },
  detailLabel: { fontWeight: "800", fontSize: 11 },
  warning: { color: "#FFFFFF", borderRadius: 8, padding: 12, fontWeight: "900", lineHeight: 19, overflow: "hidden" }
});
