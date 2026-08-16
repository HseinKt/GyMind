import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookClass, cancelBooking, cancelClassBooking } from "@/api/classesApi";
import { GymClass } from "@/types/class";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { colors } from "@/theme/colors";
import { formatDateTime } from "@/utils/formatDate";
import { parseApiError } from "@/utils/errors";

export function TodayClassesPreview({ classes }: { classes: GymClass[] }) {
  const queryClient = useQueryClient();
  const action = useMutation({
    mutationFn: ({ classId, bookingId, booked }: { classId: number; bookingId?: number | null; booked?: boolean }) => {
      if (!booked) return bookClass(classId);
      return bookingId ? cancelBooking(bookingId) : cancelClassBooking(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    }
  });

  if (!classes.length) {
    return (
      <View style={styles.empty}>
        <EmptyState title="No upcoming classes" message="Classes from your active membership branches will appear here." />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {action.error ? <Text style={styles.error}>{parseApiError(action.error).message}</Text> : null}
      {classes.slice(0, 4).map((item) => (
        <ForgeCard key={item.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{item.title}</Text>
            {item.booked ? <Text style={styles.badge}>Booked</Text> : null}
          </View>
          <Text style={styles.meta}>{item.coach || item.trainerName || "Coach TBA"} - {formatDateTime(item.startAt)}</Text>
          {item.branchName ? <Text style={styles.meta}>{item.branchName}</Text> : null}
          <ForgeButton
            title={item.booked ? "Cancel booking" : "Book"}
            variant={item.booked ? "secondary" : "primary"}
            disabled={action.isPending}
            onPress={() => action.mutate({ classId: item.id, bookingId: item.bookingId ?? null, booked: Boolean(item.booked) })}
          />
        </ForgeCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { gap: 12 },
  list: { gap: 10 },
  card: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: colors.text, fontSize: 16, fontWeight: "900", letterSpacing: 0 },
  meta: { color: colors.muted, fontWeight: "700" },
  badge: { overflow: "hidden", borderRadius: 8, backgroundColor: colors.primary, color: colors.white, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: "900" },
  error: { color: colors.danger, fontWeight: "800", lineHeight: 20 }
});
