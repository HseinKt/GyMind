import { StyleSheet, Text, View } from "react-native";
import { useForgeTheme } from "@/theme/theme";

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  const theme = useForgeTheme();

  const toneStyles = {
    success: {
      backgroundColor: theme.success + "1f",
      textColor: theme.success
    },
    warning: {
      backgroundColor: theme.warning + "1f",
      textColor: theme.warning
    },
    danger: {
      backgroundColor: theme.danger + "1f",
      textColor: theme.danger
    },
    neutral: {
      backgroundColor: theme.surface2,
      textColor: theme.text
    }
  };

  const currentTone = toneStyles[tone] || toneStyles.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: currentTone.backgroundColor }]}>
      <Text style={[styles.text, { color: currentTone.textColor }]}>{label}</Text>
    </View>
  );
}

export function toneForStatus(status?: string) {
  const value = status?.toLowerCase() ?? "";
  if (value.includes("available") || value.includes("active") || value.includes("open")) return "success" as const;
  if (value.includes("almost") || value.includes("pending")) return "warning" as const;
  if (value.includes("full") || value.includes("closed") || value.includes("inactive")) return "danger" as const;
  return "neutral" as const;
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "800", letterSpacing: 0 }
});
