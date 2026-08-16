import { useQuery } from "@tanstack/react-query";
import { getHomeDashboard } from "@/api/homeApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useForgeTheme } from "@/theme/theme";
import { StyleSheet, Text, View } from "react-native";
import { MembershipSummaryCard } from "./components/MembershipSummaryCard";
import { CheckInStatusCard } from "./components/CheckInStatusCard";
import { QuickActionsGrid } from "./components/QuickActionsGrid";

export function HomeScreen() {
  const query = useQuery({ queryKey: ["home"], queryFn: getHomeDashboard });
  const theme = useForgeTheme();
  const data = query.data;
  const firstName = data?.user?.fullName?.split(" ")[0] ?? "Member";
  const homeBranchName = data?.user?.branchName ?? data?.membership?.currentMembership?.branches?.[0]?.branchName ?? data?.membership?.branchAccess?.[0]?.branchName ?? "Home branch";
  const status = data?.membership?.status ?? data?.user?.membershipStatus ?? "No Membership";
  const remainingDays = data?.membership?.remainingDays ?? data?.user?.remainingDays ?? 0;

  return (
    <ForgeScreen title={`Hi, ${firstName}`} subtitle={homeBranchName} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {data?.warnings.length ? <Text style={[styles.warning, { color: theme.warning }]}>Some dashboard sections could not load: {data.warnings.join(", ")}</Text> : null}
      <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.warm }]}>Membership</Text>
            <Text style={[styles.heroName, { color: theme.text }]}>{data?.user?.fullName ?? "Gymind Member"}</Text>
          </View>
          <Text style={[styles.statusPill, statusTone(status, theme)]}>{displayStatus(status)}</Text>
        </View>
        <Text style={[styles.heroMeta, { color: theme.warm }]}>{remainingDays > 0 ? `${remainingDays} days remaining` : "No remaining membership days"}</Text>
      </View>
      <MembershipSummaryCard membership={data?.membership ?? null} homeBranchName={homeBranchName} />
      <CheckInStatusCard session={data?.currentGymSession ?? null} />
      <SectionTitle title="Quick actions" />
      <QuickActionsGrid hasActiveSession={Boolean(data?.currentGymSession?.hasActiveCheckIn)} />
    </ForgeScreen>
  );
}

function displayStatus(status: string) {
  const normalized = status.trim();
  if (!normalized || normalized === "Pending") return "No Membership";
  return normalized.replace(/_/g, " ");
}

function statusTone(status: string, theme: any) {
  const normalized = status.toLowerCase();
  if (normalized.includes("active")) return { color: theme.background, backgroundColor: theme.warm };
  if (normalized.includes("frozen")) return { color: theme.background, backgroundColor: "#FBBF24" };
  if (normalized.includes("expired") || normalized.includes("cancel")) return { color: "#FFFFFF", backgroundColor: theme.danger };
  return { color: theme.warm, backgroundColor: theme.secondary };
}

const styles = StyleSheet.create({
  warning: { backgroundColor: "rgba(245,158,11,0.12)", padding: 12, borderRadius: 8, fontWeight: "800", lineHeight: 19 },
  hero: { gap: 12, borderWidth: 1, borderRadius: 8, padding: 18 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  eyebrow: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0 },
  heroName: { fontSize: 24, fontWeight: "900", marginTop: 4, letterSpacing: 0 },
  heroMeta: { fontSize: 14, fontWeight: "800" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: "900", maxWidth: 140, textAlign: "center" }
});
