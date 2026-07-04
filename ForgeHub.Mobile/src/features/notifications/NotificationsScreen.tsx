import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, View, Alert, TouchableOpacity } from "react-native";
import { getNotifications, markNotificationRead } from "@/api/notificationsApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { useForgeTheme } from "@/theme/theme";
import { formatDateTime } from "@/utils/formatDate";
import { NotificationItem } from "@/types/notification";

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const theme = useForgeTheme();
  const readMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => markNotificationRead(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const handleNotificationPress = (item: NotificationItem) => {
    Alert.alert(
      item.title,
      item.message,
      [
        {
          text: "OK",
          onPress: () => {
            if (!item.isRead) {
              readMutation.mutate([item.id]);
            }
          }
        }
      ]
    );
  };

  return (
    <ForgeScreen title="Notifications" subtitle="Member updates" showNotifications={false} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data?.length === 0 ? <EmptyState title="No notifications" message="Updates from your gym will appear here." /> : null}
      {query.data?.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => handleNotificationPress(item)} activeOpacity={0.7}>
          <ForgeCard style={[styles.card, !item.isRead ? { borderColor: theme.primary } : null]}>
            <View style={styles.row}>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <StatusBadge label={item.priority || (item.isRead ? "Read" : "Unread")} tone={item.isRead ? "neutral" : toneForStatus(item.priority)} />
            </View>
            <Text style={[styles.message, { color: theme.muted }]}>{item.message}</Text>
            <Text style={[styles.date, { color: theme.muted }]}>{formatDateTime(item.createdAt)}</Text>
          </ForgeCard>
        </TouchableOpacity>
      ))}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  message: { lineHeight: 20, fontWeight: "600" },
  date: { fontSize: 12, fontWeight: "800" }
});
