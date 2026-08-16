import { StyleSheet, Text, View } from "react-native";
import { useForgeTheme } from "@/theme/theme";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  const theme = useForgeTheme();
  return (
    <View style={styles.box}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.muted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 28, alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "800", textAlign: "center", letterSpacing: 0 },
  message: { fontSize: 14, textAlign: "center", lineHeight: 20 }
});
