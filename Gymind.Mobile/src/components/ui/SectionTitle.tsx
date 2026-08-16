import { StyleSheet, Text, View } from "react-native";
import { useForgeTheme } from "@/theme/theme";

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  const theme = useForgeTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0 }
});
