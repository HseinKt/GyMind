import { StyleSheet, Text } from "react-native";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { useForgeTheme } from "@/theme/theme";
import { MemberProfile } from "@/types/profile";

export function EmergencyInfoCard({ profile }: { profile: MemberProfile }) {
  const theme = useForgeTheme();
  return (
    <ForgeCard style={styles.card}>
      <Text style={[styles.title, { color: theme.text }]}>Emergency contact</Text>
      <Text style={[styles.value, { color: theme.text }]}>{profile.emergencyContactName || "No emergency contact"}</Text>
      <Text style={[styles.text, { color: theme.muted }]}>{profile.emergencyContactRelationship || "Relationship not set"} · {profile.emergencyContactPhone || "Phone not set"}</Text>
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  text: { lineHeight: 20, fontWeight: "600" },
  value: { fontSize: 16, fontWeight: "900" }
});
