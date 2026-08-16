import { StyleSheet, Text } from "react-native";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { useForgeTheme } from "@/theme/theme";
import { MemberProfile } from "@/types/profile";

export function HealthInfoCard({ profile }: { profile: MemberProfile }) {
  const theme = useForgeTheme();
  return (
    <ForgeCard style={styles.card}>
      <Text style={[styles.title, { color: theme.text }]}>Health info</Text>
      <Text style={[styles.value, { color: theme.text }]}>Blood type: {profile.bloodType || "Not set"}</Text>
      <Text style={[styles.text, { color: theme.muted }]}>Doctor clearance: {profile.doctorClearanceRequired ? "Required" : "Not required"}</Text>
      <Text style={[styles.value, { color: theme.text }]}>Medical conditions: {profile.medicalConditions || "None"}</Text>
      <Text style={[styles.value, { color: theme.text }]}>Allergies: {profile.allergies || "None"}</Text>
      <Text style={[styles.value, { color: theme.text }]}>Action plans: {profile.medicalActionPlans || "None"}</Text>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  text: { lineHeight: 20, fontWeight: "600" },
  value: { fontWeight: "900" }
});
