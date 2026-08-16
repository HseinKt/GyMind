import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getHomeDashboard } from "@/api/homeApi";
import { getProfile, getProfileDashboard, removeProfilePhoto, uploadProfilePhoto } from "@/api/profileApi";
import { logout } from "@/api/authApi";
import { getWorkoutSessions } from "@/api/workoutsApi";
import { API_ORIGIN } from "@/config/apiConfig";
import { useAuthStore } from "@/auth/authStore";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { TrainingProgressCard } from "@/components/ui/TrainingProgressCard";
import { WeeklyActivityCard } from "@/components/ui/WeeklyActivityCard";
import { useForgeTheme } from "@/theme/theme";
import { parseApiError } from "@/utils/errors";
import { HealthInfoCard } from "./HealthInfoCard";
import { EmergencyInfoCard } from "./EmergencyInfoCard";
import { DigitalMembershipCard } from "./DigitalMembershipCard";

export function ProfileScreen() {
  const theme = useForgeTheme();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [pendingPhoto, setPendingPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const homeQuery = useQuery({ queryKey: ["home"], queryFn: getHomeDashboard });
  const dashboardQuery = useQuery({ queryKey: ["profileDashboard"], queryFn: getProfileDashboard });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkoutSessions });
  const profile = profileQuery.data;
  const dashboard = dashboardQuery.data;
  const workouts = workoutsQuery.data ?? [];
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 3);
  const dashboardUser = homeQuery.data?.user;
  const membership = homeQuery.data?.membership;
  const persistedPhotoUrl = dashboardUser?.profilePhotoUrl ?? user?.profilePhotoUrl ?? profile?.profilePhotoUrl;
  const photoUri = pendingPhoto?.uri ?? resolvePhotoUrl(persistedPhotoUrl);

  const photoMutation = useMutation({
    mutationFn: uploadProfilePhoto,
    onSuccess: async (response) => {
      setPendingPhoto(null);
      if (user) setUser({ ...user, profilePhotoUrl: response.profilePhotoUrl });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] })
      ]);
    }
  });

  const removeMutation = useMutation({
    mutationFn: removeProfilePhoto,
    onSuccess: async () => {
      setPendingPhoto(null);
      if (user) setUser({ ...user, profilePhotoUrl: null });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] })
      ]);
    }
  });

  const signOut = async () => {
    try { await logout(); } finally { await clearSession(); }
  };

  const pickPhoto = async (source: "camera" | "library") => {
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.82 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.82, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets[0]) {
      setPendingPhoto(result.assets[0]);
    }
  };

  const [activeTab, setActiveTab] = useState<"overview" | "history" | "health">("overview");

  return (
    <ForgeScreen title="Profile" subtitle={user?.fullName ?? "Member profile"} refreshing={profileQuery.isRefetching || homeQuery.isRefetching || dashboardQuery.isRefetching || workoutsQuery.isRefetching} onRefresh={() => { profileQuery.refetch(); homeQuery.refetch(); dashboardQuery.refetch(); workoutsQuery.refetch(); }}>
      {profileQuery.isLoading ? <LoadingState /> : null}
      {profileQuery.error ? <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} /> : null}
      
      <View style={styles.settingsRow}>
        <View />
        <Pressable onPress={() => router.push("/settings")} style={[styles.settingsButton, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="cog-outline" size={22} color={theme.text} />
        </Pressable>
      </View>

      <DigitalMembershipCard user={user} profile={profile ?? null} membership={membership ?? null} />

      <ForgeButton
        title="Edit Profile"
        onPress={() => router.push("/profile/edit")}
        style={{ marginVertical: 10 }}
      />

      <View style={styles.tabsContainer}>
        {(["overview", "history", "health"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabButton,
              activeTab === tab 
                ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                : { backgroundColor: theme.surface2, borderColor: theme.border }
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? "#FFFFFF" : theme.text }
              ]}
            >
              {tab === "overview" ? "Overview" : tab === "history" ? "History" : "Health & Settings"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "overview" && (
        <View style={{ gap: 16 }}>
          <View style={styles.kpiGrid}>
            <KpiCard icon="dumbbell" label="Total Workouts" value={dashboard?.totalWorkouts ?? 0} badge={formatPercentBadge(dashboard?.workoutsChangePercent)} />
            <KpiCard icon="clock-outline" label="Total Hours" value={dashboard?.totalHours ?? 0} badge={formatPercentBadge(dashboard?.hoursChangePercent)} />
            <KpiCard icon="calendar-check-outline" label="Classes Attended" value={dashboard?.classesAttended ?? 0} badge={formatPercentBadge(dashboard?.classesChangePercent)} />
            <KpiCard icon="card-account-details-star-outline" label="Membership Days" value={dashboard?.membershipRemainingDays ?? membership?.remainingDays ?? user?.remainingDays ?? 0} badge={dashboard?.membershipStatus ?? membership?.status ?? user?.membershipStatus ?? undefined} />
          </View>

          <WeeklyActivityCard activity={dashboard?.weeklyActivity ?? []} averageMinutes={dashboard?.averageTrainingMinutes} />
          {homeQuery.data?.stats ? <TrainingProgressCard stats={homeQuery.data.stats} activity={homeQuery.data.activityHeatmap ?? []} /> : null}
        </View>
      )}

      {activeTab === "history" && (
        <ForgeCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Workouts</Text>
          {workoutsQuery.isLoading ? (
            <Text style={{ color: theme.muted, fontWeight: "700" }}>Loading workouts...</Text>
          ) : recentWorkouts.length === 0 ? (
            <Text style={{ color: theme.muted, fontWeight: "700" }}>No workouts logged yet.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {recentWorkouts.map((workout) => {
                const formattedDate = (() => {
                  try {
                    const d = new Date(workout.completedAt);
                    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                  } catch {
                    return workout.completedAt;
                  }
                })();
                const durationText = (() => {
                  const mins = Math.floor(workout.durationSeconds / 60);
                  const secs = workout.durationSeconds % 60;
                  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                })();
                return (
                  <View key={workout.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" }}>
                        <MaterialCommunityIcons name="dumbbell" color={theme.primary} size={18} />
                      </View>
                      <View>
                        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 14 }}>Workout Session</Text>
                        <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>{formattedDate}</Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 14 }}>{durationText}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ForgeCard>
      )}

      {activeTab === "health" && (
        <View style={{ gap: 16 }}>
          {profile && <HealthInfoCard profile={profile} />}
          {profile && <EmergencyInfoCard profile={profile} />}

          <ForgeCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile photo</Text>
            {pendingPhoto ? <Text style={[styles.previewText, { color: theme.primary }]}>Preview selected. Upload to save it to your account.</Text> : null}
            <View style={styles.photoActions}>
              <ForgeButton title={pendingPhoto ? "Upload" : "Upload"} variant={pendingPhoto ? "primary" : "secondary"} disabled={photoMutation.isPending} onPress={() => pendingPhoto ? photoMutation.mutate(pendingPhoto) : pickPhoto("library")} style={styles.flex} />
              <ForgeButton title="Camera" variant="secondary" disabled={photoMutation.isPending} onPress={() => pickPhoto("camera")} style={styles.flex} />
              <ForgeButton title={pendingPhoto ? "Cancel" : "Remove"} variant="secondary" disabled={(!pendingPhoto && !persistedPhotoUrl) || removeMutation.isPending} onPress={() => pendingPhoto ? setPendingPhoto(null) : removeMutation.mutate()} style={styles.flex} />
            </View>
            {(photoMutation.error || removeMutation.error) ? <Text style={[styles.error, { color: theme.danger }]}>{parseApiError(photoMutation.error ?? removeMutation.error).message}</Text> : null}
          </ForgeCard>

          <ForgeCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Security and settings</Text>
            <Text style={[styles.rowText, { color: theme.muted }]}>{user?.email || "Email unavailable"}</Text>
            <Text style={[styles.rowText, { color: theme.muted }]}>Status: {membership?.status ?? user?.membershipStatus ?? "Unknown"}</Text>
            {dashboardQuery.error ? <Text style={[styles.subtleError, { color: theme.muted }]}>Some profile statistics are temporarily unavailable.</Text> : null}
            <ForgeButton title="Security and settings" variant="secondary" onPress={() => router.push("/settings")} />
            <ForgeButton title="Logout" variant="danger" onPress={signOut} />
          </ForgeCard>
        </View>
      )}
    </ForgeScreen>
  );
}

function KpiCard({ icon, label, value, badge }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; value: string | number; badge?: string | undefined }) {
  const theme = useForgeTheme();
  return (
    <ForgeCard style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <View style={[styles.kpiIcon, { backgroundColor: theme.surface2 }]}>
          <MaterialCommunityIcons name={icon} color={theme.primary} size={22} />
        </View>
        {badge ? <Text style={[styles.kpiBadge, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.surface2 }]}>{badge}</Text> : null}
      </View>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.muted }]}>{label}</Text>
    </ForgeCard>
  );
}

function formatPercentBadge(value?: number | null) {
  if (value === null || value === undefined) return undefined;
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function resolvePhotoUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

const styles = StyleSheet.create({
  settingsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: -12 },
  settingsButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  identity: { alignItems: "center", gap: 10 },
  avatarRing: { width: 132, height: 132, borderRadius: 66, borderWidth: 3, padding: 4, shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  avatar: { width: "100%", height: "100%", borderRadius: 60 },
  avatarFallback: { width: "100%", height: "100%", borderRadius: 60, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 28, fontWeight: "900", letterSpacing: 0, textAlign: "center" },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontWeight: "900", overflow: "hidden" },
  meta: { fontWeight: "700" },
  photoActions: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiCard: { width: "48%", minHeight: 144, gap: 10, padding: 14 },
  kpiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kpiIcon: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  kpiBadge: { maxWidth: 92, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 10, fontWeight: "900", textAlign: "center" },
  kpiValue: { fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  kpiLabel: { fontSize: 12, fontWeight: "800", lineHeight: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  rowText: { fontWeight: "700", lineHeight: 20 },
  previewText: { fontWeight: "900", textAlign: "center", lineHeight: 20 },
  subtleError: { fontWeight: "700", lineHeight: 20 },
  error: { fontWeight: "800", lineHeight: 20 },
  tabsContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    gap: 8
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  tabText: {
    fontSize: 13,
    fontWeight: "800"
  }
});
