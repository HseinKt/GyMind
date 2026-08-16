import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useForgeTheme } from "@/theme/theme";

export function LoadingState({ label = "Loading Gymind" }: { label?: string }) {
  const theme = useForgeTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[styles.text, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: "center", justifyContent: "center", gap: 12 },
  text: { fontWeight: "700", letterSpacing: 0 }
});
