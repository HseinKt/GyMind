import { PropsWithChildren } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForgeTheme } from "@/theme/theme";
import { ForgeHeader } from "./ForgeHeader";

interface Props extends PropsWithChildren {
  title: string;
  subtitle?: string | undefined;
  scroll?: boolean | undefined;
  refreshing?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
  showNotifications?: boolean | undefined;
}

export function ForgeScreen({ title, subtitle, children, scroll = true, refreshing, onRefresh, showNotifications = true }: Props) {
  const theme = useForgeTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl tintColor={theme.primary} refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ForgeHeader title={title} subtitle={subtitle} showNotifications={showNotifications} />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 140 }
});
