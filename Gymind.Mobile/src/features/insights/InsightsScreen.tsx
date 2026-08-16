import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { getInsights } from "@/api/insightsApi";
import { getDietPlans } from "@/api/dietPlanApi";
import { getProfile } from "@/api/profileApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { colors } from "@/theme/colors";
import { formatNumber } from "@/utils/formatNumber";
import { useState } from "react";
import { BodyRatiosCard } from "./BodyRatiosCard";
import { InsightMetricCard } from "./InsightMetricCard";
import { MissingFieldsCard } from "./MissingFieldsCard";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function InsightsScreen() {
  const [activeTab, setActiveTab] = useState<"stats" | "diet">("stats");
  const insightsQuery = useQuery({ queryKey: ["insights"], queryFn: getInsights });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const dietQuery = useQuery({ queryKey: ["diet-plans"], queryFn: getDietPlans });

  const data = insightsQuery.data;
  const profile = profileQuery.data;
  const dietList = dietQuery.data ?? [];
  const activeDiet = dietList[0];

  const handleRefresh = async () => {
    await Promise.all([
      insightsQuery.refetch(),
      profileQuery.refetch(),
      dietQuery.refetch()
    ]);
  };

  const loading = insightsQuery.isLoading || profileQuery.isLoading || dietQuery.isLoading;
  const error = insightsQuery.error || profileQuery.error || dietQuery.error;

  return (
    <ForgeScreen
      title="Insights"
      subtitle="Body and nutrition dashboard"
      refreshing={insightsQuery.isRefetching || profileQuery.isRefetching || dietQuery.isRefetching}
      onRefresh={handleRefresh}
    >
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={handleRefresh} /> : null}

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("stats")}
          style={[styles.tabButton, activeTab === "stats" && styles.tabButtonActive]}
        >
          <Text style={[styles.tabLabel, activeTab === "stats" && styles.tabLabelActive]}>Body Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("diet")}
          style={[styles.tabButton, activeTab === "diet" && styles.tabButtonActive]}
        >
          <Text style={[styles.tabLabel, activeTab === "diet" && styles.tabLabelActive]}>Diet Plan</Text>
        </TouchableOpacity>
      </View>

      {!loading && !error && activeTab === "stats" && data ? (
        <>
          <ForgeCard style={styles.hero}>
            <Text style={styles.label}>BMI</Text>
            <Text style={styles.bmi}>{formatNumber(data.bmi ?? data.bodyMassIndex)}</Text>
            <Text style={styles.category}>{data.bmiCategory ?? "Category unavailable"} · Ideal {data.idealWeightRange ?? "not available"}</Text>
          </ForgeCard>
          <View style={styles.grid}>
            <InsightMetricCard label="Body fat" value={data.bodyFatPercentage} suffix="%" accent />
            <InsightMetricCard label="Lean mass" value={data.leanBodyMassKg} suffix=" kg" />
            <InsightMetricCard label="BMR" value={data.bmr} />
            <InsightMetricCard label="Maintenance" value={data.maintenanceCalories} />
            <InsightMetricCard label="Protein" value={data.proteinTargetGrams} suffix=" g" />
            <InsightMetricCard label="Carbs" value={data.carbsTargetGrams} suffix=" g" />
            <InsightMetricCard label="Fat" value={data.fatTargetGrams} suffix=" g" />
            <InsightMetricCard label="Water" value={data.waterTargetMl} suffix=" ml" />
          </View>

          {/* Latest Professional Assessment measurements */}
          {profile ? (
            <ForgeCard style={styles.card}>
              <Text style={styles.cardTitle}>Latest Fitness Assessment</Text>
              <Text style={styles.cardSubtitle}>Recorded by trainer during checkups</Text>
              <View style={styles.assessmentGrid}>
                <AssessmentItem label="Waist" value={profile.waistCm} unit="cm" />
                <AssessmentItem label="Chest" value={profile.chestCm} unit="cm" />
                <AssessmentItem label="Shoulders" value={profile.shoulderCm} unit="cm" />
                <AssessmentItem label="Hips" value={profile.hipCm} unit="cm" />
                <AssessmentItem label="Neck" value={profile.neckCm} unit="cm" />
                <AssessmentItem label="Arms" value={profile.armCm} unit="cm" />
                <AssessmentItem label="Thighs" value={profile.thighCm} unit="cm" />
                <AssessmentItem label="Blood Type" value={profile.bloodType} unit="" />
              </View>
            </ForgeCard>
          ) : null}

          <BodyRatiosCard insights={data} />
          <MissingFieldsCard fields={data.missingFields} />
        </>
      ) : null}

      {!loading && !error && activeTab === "diet" ? (
        activeDiet ? (
          <View style={styles.dietContainer}>
            <ForgeCard style={styles.activeDietCard}>
              <View style={styles.dietHeader}>
                <MaterialCommunityIcons name="silverware-fork-knife" color={colors.primary} size={24} />
                <Text style={styles.dietTitle}>{activeDiet.title}</Text>
              </View>
              {activeDiet.description ? (
                <Text style={styles.dietDesc}>{activeDiet.description}</Text>
              ) : null}

              <View style={styles.nutritionGrid}>
                <NutritionCard label="Calories" value={activeDiet.dailyCaloriesTarget} unit="kcal" icon="fire" />
                <NutritionCard label="Protein" value={activeDiet.proteinGrams} unit="g" icon="egg" />
                <NutritionCard label="Carbohydrates" value={activeDiet.carbsGrams} unit="g" icon="bread-slice" />
                <NutritionCard label="Fats" value={activeDiet.fatGrams} unit="g" icon="water" />
              </View>
            </ForgeCard>

            {dietList.length > 1 ? (
              <ForgeCard style={styles.card}>
                <Text style={styles.cardTitle}>Plan History</Text>
                <View style={styles.historyList}>
                  {dietList.slice(1).map((plan) => (
                    <View key={plan.id} style={styles.historyItem}>
                      <View>
                        <Text style={styles.historyTitle}>{plan.title}</Text>
                        <Text style={styles.historyDate}>{new Date(plan.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.historyCalories}>{plan.dailyCaloriesTarget ?? "N/A"} kcal</Text>
                    </View>
                  ))}
                </View>
              </ForgeCard>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="food-apple-outline" color={colors.muted} size={64} />
            <Text style={styles.emptyTitle}>No active diet plan</Text>
            <Text style={styles.emptySubtitle}>Your personal trainer has not assigned a nutrition plan yet.</Text>
          </View>
        )
      ) : null}
    </ForgeScreen>
  );
}

function AssessmentItem({ label, value, unit }: { label: string; value: any; unit: string }) {
  return (
    <View style={styles.assessmentItem}>
      <Text style={styles.assessmentLabel}>{label}</Text>
      <Text style={styles.assessmentValue}>{value ? `${value} ${unit}` : "Not set"}</Text>
    </View>
  );
}

function NutritionCard({ label, value, unit, icon }: { label: string; value: any; unit: string; icon: string }) {
  return (
    <View style={styles.nutritionCard}>
      <View style={styles.nutritionHeader}>
        <MaterialCommunityIcons name={icon as any} color={colors.primary} size={18} />
        <Text style={styles.nutritionLabel}>{label}</Text>
      </View>
      <Text style={styles.nutritionValue}>{value ?? "N/A"}</Text>
      <Text style={styles.nutritionUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  tabButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { color: colors.warm, fontSize: 14, fontWeight: "800" },
  tabLabelActive: { color: colors.white },
  hero: { gap: 6 },
  label: { color: colors.muted, fontWeight: "800" },
  bmi: { color: colors.primary, fontSize: 44, fontWeight: "900", letterSpacing: 0 },
  category: { color: colors.text, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { gap: 12 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  cardSubtitle: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: -6 },
  assessmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  assessmentItem: { width: "48%", backgroundColor: colors.surface2, borderRadius: 8, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.border },
  assessmentLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  assessmentValue: { color: colors.text, fontSize: 14, fontWeight: "900" },
  dietContainer: { gap: 16 },
  activeDietCard: { gap: 16 },
  dietHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  dietTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  dietDesc: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  nutritionCard: { width: "48%", backgroundColor: colors.surface2, borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  nutritionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  nutritionLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  nutritionValue: { color: colors.primary, fontSize: 28, fontWeight: "900" },
  nutritionUnit: { color: colors.text, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  historyList: { gap: 10 },
  historyItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  historyDate: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  historyCalories: { color: colors.text, fontSize: 14, fontWeight: "900" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  emptySubtitle: { color: colors.muted, fontSize: 14, textAlign: "center", paddingHorizontal: 40, lineHeight: 20, fontWeight: "600" }
});
