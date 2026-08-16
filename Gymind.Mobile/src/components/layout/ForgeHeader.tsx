import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useForgeTheme } from "@/theme/theme";

export function ForgeHeader({ title, subtitle, showNotifications = true }: { title: string; subtitle?: string | undefined; showNotifications?: boolean }) {
  const theme = useForgeTheme();
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text style={[styles.brand, { color: theme.primary }]}>Gymind</Text>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>
      {showNotifications ? (
        <Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={theme.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  titleBlock: { flex: 1, paddingRight: 12 },
  brand: { fontWeight: "900", fontSize: 13, letterSpacing: 0 },
  title: { fontWeight: "900", fontSize: 26, letterSpacing: 0 },
  subtitle: { fontWeight: "700", fontSize: 13, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 }
});
