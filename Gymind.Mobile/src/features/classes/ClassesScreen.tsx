import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { bookClass, cancelBooking, cancelClassBooking, getBookings, getClasses } from "@/api/classesApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { useForgeTheme } from "@/theme/theme";
import { formatDateTime } from "@/utils/formatDate";
import { parseApiError } from "@/utils/errors";

export function ClassesScreen({ bookingsOnly = false }: { bookingsOnly?: boolean }) {
  const queryClient = useQueryClient();
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: getClasses, enabled: !bookingsOnly });
  const bookingsQuery = useQuery({ queryKey: ["bookings"], queryFn: getBookings });
  const theme = useForgeTheme();
  const action = useMutation({
    mutationFn: ({ classId, bookingId, booked }: { classId: number; bookingId?: number | null | undefined; booked: boolean }) => {
      if (!booked) return bookClass(classId);
      return bookingId ? cancelBooking(bookingId) : cancelClassBooking(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    }
  });

  const data = bookingsOnly
    ? bookingsQuery.data?.map((booking) => ({ ...booking, id: booking.classId, bookingId: booking.bookingId ?? booking.id, booked: true }))
    : classesQuery.data;
  const loading = bookingsOnly ? bookingsQuery.isLoading : classesQuery.isLoading;
  const error = bookingsOnly ? bookingsQuery.error : classesQuery.error;
  const refetch = () => {
    classesQuery.refetch();
    bookingsQuery.refetch();
  };
  const isRefetching = classesQuery.isRefetching || bookingsQuery.isRefetching;

  return (
    <ForgeScreen
      title={bookingsOnly ? "Bookings" : "Classes"}
      subtitle={bookingsOnly ? "Your booked sessions" : "Find your next session"}
      scroll={false}
    >
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {action.error ? <Text style={[styles.error, { color: theme.danger }]}>{parseApiError(action.error).message}</Text> : null}

      {!loading && !error && (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) =>
            bookingsOnly
              ? `booking-${item.bookingId ?? item.id}-${item.classId ?? item.id}`
              : `class-${item.id}`
          }
          renderItem={({ item }) => (
            <ForgeCard style={styles.card}>
              <View style={styles.row}>
                <View style={styles.textBlock}>
                  <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>{item.coach || "Coach TBA"} - {formatDateTime(item.startAt)}</Text>
                  {item.branchName ? <Text style={[styles.meta, { color: theme.muted }]}>{item.branchName}</Text> : null}
                  <Text style={[styles.meta, { color: theme.muted }]}>{item.availableSpots ?? "N/A"} spots available</Text>
                </View>
                <ForgeButton
                  title={item.booked ? "Cancel" : "Book"}
                  variant={item.booked ? "secondary" : "primary"}
                  disabled={action.isPending}
                  onPress={() =>
                    action.mutate({
                      classId: item.id,
                      bookingId: item.bookingId,
                      booked: Boolean(item.booked)
                    })
                  }
                  style={styles.button}
                />
              </View>
            </ForgeCard>
          )}
          ListEmptyComponent={
            <EmptyState
              title={bookingsOnly ? "No bookings" : "No classes"}
              message="When the backend returns sessions, they will appear here."
            />
          }
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  textBlock: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  meta: { fontWeight: "700", lineHeight: 19 },
  button: { minWidth: 96 },
  error: { fontWeight: "800" },
  listContent: { padding: 20, gap: 16, paddingBottom: 120 }
});
