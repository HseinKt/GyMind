import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";

export function MissingFieldsCard({ fields }: { fields: string[] }) {
  const memberManagedFields = ["heightCm", "weightKg", "dob", "gender", "fitnessGoal", "activityLevel"];
  const filteredFields = fields.filter(f => memberManagedFields.includes(f));
  if (!filteredFields.length) return null;

  // Map to friendly names
  const friendlyNames: Record<string, string> = {
    heightCm: "Height",
    weightKg: "Weight",
    dob: "Date of Birth",
    gender: "Gender",
    fitnessGoal: "Fitness Goal",
    activityLevel: "Activity Level"
  };
  const list = filteredFields.map(f => friendlyNames[f] ?? f);

  return (
    <ForgeCard style={styles.card}>
      <Text style={styles.title}>Complete profile to improve insights</Text>
      <Text style={styles.text}>{list.join(", ")}</Text>
      <ForgeButton title="Update profile" variant="secondary" onPress={() => router.push("/tabs/profile")} />
    </ForgeCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  text: { color: colors.muted, lineHeight: 20, fontWeight: "700" }
});
