import { StyleSheet, Text, View } from "react-native";
import { ForgeButton } from "./ForgeButton";
import { useForgeTheme } from "@/theme/theme";
import { parseApiError } from "@/utils/errors";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const theme = useForgeTheme();
  return (
    <View style={styles.box}>
      <Text style={[styles.title, { color: theme.text }]}>Something needs attention</Text>
      <Text style={[styles.text, { color: theme.muted }]}>{parseApiError(error).message}</Text>
      {onRetry ? <ForgeButton title="Retry" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 24, gap: 14, alignItems: "stretch" },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: 0 },
  text: { fontSize: 14, lineHeight: 20 }
});
