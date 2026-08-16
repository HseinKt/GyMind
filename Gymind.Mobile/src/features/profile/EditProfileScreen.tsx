import { useEffect, useState, useRef } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getProfile, updateProfile } from "@/api/profileApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { ForgeInput } from "@/components/ui/ForgeInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors } from "@/theme/colors";
import { useForgeTheme } from "@/theme/theme";
import { MemberProfile } from "@/types/profile";
import { profileSchema, ProfileFormValues } from "@/utils/validation";
import { parseApiError } from "@/utils/errors";

const measurementsFields: Array<keyof ProfileFormValues> = [
  "heightCm",
  "weightKg",
  "targetWeightKg",
  "dailyCaloriesTarget",
  "proteinTargetGrams",
  "carbsTargetGrams",
  "fatTargetGrams",
  "waterTargetMl"
];

const preferencesFields: Array<keyof ProfileFormValues> = [
  "dob",
  "gender",
  "fitnessGoal",
  "activityLevel",
  "trainingExperience",
  "favoriteWorkoutType",
  "preferredTrainingDays",
  "preferredWorkoutTime"
];

const healthFields: Array<keyof ProfileFormValues> = [
  "medicalConditions",
  "allergies",
  "medicalActionPlans",
  "injuries",
  "medications",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone"
];

function getFieldLabel(name: string): string {
  const custom: Record<string, string> = {
    heightCm: "Height (cm)",
    weightKg: "Weight (kg)",
    targetWeightKg: "Target Weight (kg)",
    bodyFatPercentage: "Body Fat (%)",
    waistCm: "Waist (cm)",
    chestCm: "Chest (cm)",
    shoulderCm: "Shoulder (cm)",
    hipCm: "Hip (cm)",
    neckCm: "Neck (cm)",
    armCm: "Arm (cm)",
    thighCm: "Thigh (cm)",
    dob: "Date of Birth (YYYY-MM-DD)",
    gender: "Gender",
    fitnessGoal: "Fitness Goal",
    activityLevel: "Activity Level",
    trainingExperience: "Training Experience",
    favoriteWorkoutType: "Favorite Workout Type",
    preferredTrainingDays: "Preferred Training Days",
    preferredWorkoutTime: "Preferred Workout Time",
    medicalConditions: "Medical Conditions",
    allergies: "Allergies",
    medicalActionPlans: "Medical Action Plans",
    injuries: "Injuries",
    medications: "Medications",
    healthNotes: "Health Notes",
    emergencyContactName: "Emergency Contact Name (Optional)",
    emergencyContactRelationship: "Emergency Contact Relationship (Optional)",
    emergencyContactPhone: "Emergency Contact Phone (Optional)",
    emergencyContactAltPhone: "Emergency Contact Alt Phone (Optional)",
    dailyCaloriesTarget: "Daily Calories Target (kcal)",
    proteinTargetGrams: "Protein Target (g)",
    carbsTargetGrams: "Carbohydrates Target (g)",
    fatTargetGrams: "Fat Target (g)",
    waterTargetMl: "Water Target (ml)",
    language: "Language",
    theme: "Theme",
    measurementUnit: "Measurement Unit",
    profilePhotoUrl: "Profile Photo URL"
  };
  return custom[name] ?? name.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
}

function getFieldPlaceholder(name: string): string {
  const placeholders: Record<string, string> = {
    heightCm: "120 - 250 cm",
    weightKg: "40 - 250 kg",
    targetWeightKg: "40 - 250 kg",
    dailyCaloriesTarget: "1200 - 5000 kcal",
    proteinTargetGrams: "50 - 300 g",
    carbsTargetGrams: "100 - 500 g",
    fatTargetGrams: "30 - 150 g",
    waterTargetMl: "1500 - 5000 ml",
    dob: "e.g. 1995-08-25",
    gender: "e.g. Male, Female, Other",
    fitnessGoal: "e.g. Muscle gain, Weight loss",
    activityLevel: "e.g. Light, Moderate, Active",
    trainingExperience: "e.g. Beginner, Intermediate",
    favoriteWorkoutType: "e.g. Strength, HIIT, Cardio",
    preferredTrainingDays: "e.g. Mon, Wed, Fri",
    preferredWorkoutTime: "e.g. Morning, Evening",
    language: "e.g. English, Arabic",
    theme: "e.g. Dark, Light",
    measurementUnit: "e.g. Metric, Imperial",
    profilePhotoUrl: "e.g. https://example.com/photo.jpg",
    medicalConditions: "e.g. None, Hypertension",
    allergies: "e.g. None, Peanuts",
    medicalActionPlans: "e.g. Asthma action plan, EpiPen instructions",
    injuries: "e.g. None, Knee sprain",
    medications: "e.g. None",
    healthNotes: "e.g. General health notes",
    emergencyContactName: "e.g. John Doe",
    emergencyContactRelationship: "e.g. Spouse",
    emergencyContactPhone: "e.g. +1234567890",
    emergencyContactAltPhone: "e.g. +1098765432"
  };
  return placeholders[name] ?? "";
}

const dropdownOptions: Record<string, string[]> = {
  gender: ["Male", "Female", "Non-binary", "Prefer not to say"],
  fitnessGoal: ["Weight Loss", "Muscle Gain", "Cardio Endurance", "General Fitness", "Strength Training"],
  activityLevel: ["Light", "Moderate", "Active", "Athlete"],
  trainingExperience: ["Beginner", "Intermediate", "Advanced"],
  favoriteWorkoutType: ["Strength", "Cardio", "HIIT", "Yoga", "Pilates", "CrossFit"],
  language: ["English", "Arabic", "Spanish", "French"],
  theme: ["System", "Dark", "Light"],
  measurementUnit: ["Metric", "Imperial"],
  preferredWorkoutTime: ["Morning", "Afternoon", "Evening", "Night", "Flexible"]
};

const numericFields: Array<keyof ProfileFormValues> = ["heightCm", "weightKg", "targetWeightKg", "dailyCaloriesTarget", "proteinTargetGrams", "carbsTargetGrams", "fatTargetGrams", "waterTargetMl"];
const textFields: Array<keyof ProfileFormValues> = ["dob", "gender", "fitnessGoal", "activityLevel", "trainingExperience", "favoriteWorkoutType", "preferredTrainingDays", "preferredWorkoutTime", "medicalConditions", "allergies", "medicalActionPlans", "injuries", "medications", "emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone"];

export function EditProfileScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const theme = useForgeTheme();
  const [activeTab, setActiveTab] = useState<"measurements" | "preferences" | "health">("measurements");
  const [pickerField, setPickerField] = useState<keyof ProfileFormValues | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState({ year: 1995, month: 6, day: 15 });

  const { control, handleSubmit, reset, formState, setValue, trigger, getValues } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileFormValues>
  });

  const handleSelectPress = (name: keyof ProfileFormValues, currentValue: any) => {
    if (name === "dob") {
      let year = 1995;
      let month = 6;
      let day = 15;
      if (typeof currentValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(currentValue)) {
        const parts = currentValue.split("-");
        const yStr = parts[0];
        const mStr = parts[1];
        const dStr = parts[2];
        if (yStr && mStr && dStr) {
          year = parseInt(yStr, 10);
          month = parseInt(mStr, 10);
          day = parseInt(dStr, 10);
        }
      }
      setTempDate({ year, month, day });
      setDatePickerOpen(true);
    } else if (dropdownOptions[String(name)]) {
      setPickerField(name);
    }
  };

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (query.data) {
      reset(query.data as ProfileFormValues);
    }
  }, [query.data, reset]);

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const mutation = useMutation({
    mutationFn: ({ profile, tab }: { profile: MemberProfile; tab?: string }) => updateProfile(profile, tab),
    onSuccess: (profile) => {
      reset(profile as ProfileFormValues);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      setToast({ message: "Profile Updated Successfully ✓", type: "success" });

      // Auto-transition to the next step
      if (activeTabRef.current === "measurements") {
        setActiveTab("preferences");
      } else if (activeTabRef.current === "preferences") {
        setActiveTab("health");
      } else if (activeTabRef.current === "health") {
        router.back();
      }
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setToast({ message: `Failed to Save Changes ✕\n${parsed.message}`, type: "error" });
    }
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const onSavePress = async () => {
    let fieldsToValidate: Array<keyof ProfileFormValues> = [];
    if (activeTab === "measurements") {
      fieldsToValidate = measurementsFields;
    } else if (activeTab === "preferences") {
      fieldsToValidate = preferencesFields;
    } else if (activeTab === "health") {
      fieldsToValidate = healthFields;
    }

    const isValid = await trigger(fieldsToValidate);
    if (!isValid) {
      const errors = formState.errors;
      const errorKeys = Object.keys(errors).filter(k => fieldsToValidate.includes(k as keyof ProfileFormValues)) as Array<keyof ProfileFormValues>;
      const firstKey = errorKeys[0];
      if (firstKey) {
        const error = errors[firstKey];
        const errorMsg = error?.message || "Validation failed";
        const friendlyName = getFieldLabel(String(firstKey));
        setToast({ message: `Validation Error (${friendlyName}): ${String(errorMsg)}`, type: "error" });
      }
      return;
    }

    const values = getValues();
    mutation.mutate({ profile: values as unknown as MemberProfile, tab: activeTab });
  };

  return (
    <ForgeScreen title="Edit profile" subtitle="Measurements, goals, health and preferences" scroll={false}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}

      {toast && (
        <View style={[styles.toast, { backgroundColor: toast.type === "success" ? theme.success : theme.danger }]}>
          <MaterialCommunityIcons
            name={toast.type === "success" ? "check-circle-outline" : "alert-circle-outline"}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <View style={styles.tabsContainer}>
        {(["measurements", "preferences", "health"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === "measurements" ? "Targets" : tab === "preferences" ? "Goals" : "Health"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {activeTab === "measurements" && (
            <View style={styles.formSection}>
              {measurementsFields.map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <ForgeInput
                      label={getFieldLabel(String(name))}
                      placeholder={getFieldPlaceholder(String(name))}
                      keyboardType="decimal-pad"
                      value={field.value === undefined || field.value === null ? "" : String(field.value)}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ))}
            </View>
          )}

          {activeTab === "preferences" && (
            <View style={styles.formSection}>
              {preferencesFields.map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => {
                    if (name === "preferredTrainingDays") {
                      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      const selectedDays = typeof field.value === "string"
                        ? field.value.split(",").map(d => d.trim()).filter(Boolean)
                        : [];

                      const toggleDay = (day: string) => {
                        let newSelected: string[];
                        if (selectedDays.includes(day)) {
                          newSelected = selectedDays.filter(d => d !== day);
                        } else {
                          newSelected = daysOfWeek.filter(d => d === day || selectedDays.includes(d));
                        }
                        field.onChange(newSelected.join(", "));
                      };

                      return (
                        <View style={styles.daysContainer} key={name}>
                          <Text style={[styles.daysLabel, { color: theme.muted }]}>
                            {getFieldLabel(String(name))}
                          </Text>
                          <View style={styles.chipsRow}>
                            {daysOfWeek.map((day) => {
                              const isSelected = selectedDays.includes(day);
                              return (
                                <TouchableOpacity
                                  key={day}
                                  onPress={() => toggleDay(day)}
                                  style={[
                                    styles.dayChip,
                                    {
                                      backgroundColor: isSelected ? theme.primary : theme.surface2,
                                      borderColor: isSelected ? theme.primary : theme.border
                                    }
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.dayChipText,
                                      {
                                        color: isSelected ? "#FFFFFF" : theme.text
                                      }
                                    ]}
                                  >
                                    {day}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          {fieldState.error?.message ? (
                            <Text style={[styles.errorText, { color: theme.danger }]}>
                              {fieldState.error.message}
                            </Text>
                          ) : null}
                        </View>
                      );
                    }

                    const isSelect = dropdownOptions[String(name)] !== undefined || name === "dob";
                    if (isSelect) {
                      return (
                        <Pressable key={name} onPress={() => handleSelectPress(name, field.value)}>
                          <View pointerEvents="none">
                            <ForgeInput
                              label={getFieldLabel(String(name))}
                              placeholder={getFieldPlaceholder(String(name))}
                              value={(field.value as string | undefined) ?? ""}
                              error={fieldState.error?.message}
                              editable={false}
                              rightIcon={name === "dob" ? "calendar" : "chevron-down"}
                            />
                          </View>
                        </Pressable>
                      );
                    }
                    return (
                      <ForgeInput
                        key={name}
                        label={getFieldLabel(String(name))}
                        placeholder={getFieldPlaceholder(String(name))}
                        value={(field.value as string | undefined) ?? ""}
                        onChangeText={field.onChange}
                        error={fieldState.error?.message}
                      />
                    );
                  }}
                />
              ))}
            </View>
          )}

          {activeTab === "health" && (
            <View style={styles.formSection}>
              <View style={[styles.privacyBanner, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                <MaterialCommunityIcons name="shield-lock-outline" size={24} color={theme.primary} />
                <View style={styles.privacyTextContainer}>
                  <Text style={[styles.privacyTitle, { color: theme.text }]}>Confidential Health Information</Text>
                  <Text style={[styles.privacyDesc, { color: theme.muted }]}>
                    Your medical and emergency contact details are kept strictly private. They are only used to ensure your safety during workouts.
                  </Text>
                </View>
              </View>
              {healthFields.map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <ForgeInput
                      label={getFieldLabel(String(name))}
                      placeholder={getFieldPlaceholder(String(name))}
                      value={(field.value as string | undefined) ?? ""}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                      keyboardType={name === "emergencyContactPhone" ? "phone-pad" : undefined}
                      multiline={["medicalConditions", "allergies", "injuries", "medications", "healthNotes", "medicalActionPlans"].includes(String(name))}
                    />
                  )}
                />
              ))}
            </View>
          )}

          <ForgeButton
            title={activeTab === "measurements" ? "Save & Next" : activeTab === "preferences" ? "Save & Next" : "Save & Finish"}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onPress={onSavePress}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selection Dropdown Modal */}
      <Modal visible={pickerField !== null} transparent animationType="slide" onRequestClose={() => setPickerField(null)}>
        <View style={styles.modalShade}>
          <ForgeCard style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Select {pickerField ? getFieldLabel(String(pickerField)) : ""}</Text>
              <Pressable onPress={() => setPickerField(null)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {pickerField && dropdownOptions[String(pickerField)]?.map((option) => {
                const isSelected = control._formValues[pickerField] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setValue(pickerField, option, { shouldValidate: true, shouldDirty: true });
                      setPickerField(null);
                    }}
                    style={[styles.optionItem, { backgroundColor: isSelected ? theme.primary : theme.surface2 }]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? "#FFFFFF" : theme.text }]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ForgeCard>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={datePickerOpen} transparent animationType="slide" onRequestClose={() => setDatePickerOpen(false)}>
        <View style={styles.modalShade}>
          <ForgeCard style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Select Date of Birth</Text>
              <Pressable onPress={() => setDatePickerOpen(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.datePickerColumns}>
              {/* Year Column */}
              <View style={styles.datePickerColumnContainer}>
                <Text style={[styles.columnLabel, { color: theme.muted }]}>Year</Text>
                <ScrollView style={[styles.datePickerColumn, { backgroundColor: theme.surface }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {Array.from({ length: 91 }, (_, i) => new Date().getFullYear() - 100 + i).map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setTempDate((d) => ({ ...d, year: y }))}
                      style={[styles.dateItem, tempDate.year === y && { backgroundColor: theme.primary }]}
                    >
                      <Text style={[styles.dateItemText, { color: tempDate.year === y ? "#FFFFFF" : theme.text }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.datePickerColumnContainer}>
                <Text style={[styles.columnLabel, { color: theme.muted }]}>Month</Text>
                <ScrollView style={[styles.datePickerColumn, { backgroundColor: theme.surface }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setTempDate((d) => ({ ...d, month: m }))}
                      style={[styles.dateItem, tempDate.month === m && { backgroundColor: theme.primary }]}
                    >
                      <Text style={[styles.dateItemText, { color: tempDate.month === m ? "#FFFFFF" : theme.text }]}>
                        {new Date(2000, m - 1, 1).toLocaleString("default", { month: "short" })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Column */}
              <View style={styles.datePickerColumnContainer}>
                <Text style={[styles.columnLabel, { color: theme.muted }]}>Day</Text>
                <ScrollView style={[styles.datePickerColumn, { backgroundColor: theme.surface }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {Array.from({ length: new Date(tempDate.year, tempDate.month, 0).getDate() }, (_, i) => i + 1).map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setTempDate((curr) => ({ ...curr, day: d }))}
                      style={[styles.dateItem, tempDate.day === d && { backgroundColor: theme.primary }]}
                    >
                      <Text style={[styles.dateItemText, { color: tempDate.day === d ? "#FFFFFF" : theme.text }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <ForgeButton
              title="Confirm Date"
              onPress={() => {
                const formattedMonth = String(tempDate.month).padStart(2, "0");
                const formattedDay = String(tempDate.day).padStart(2, "0");
                const formattedDate = `${tempDate.year}-${formattedMonth}-${formattedDay}`;
                setValue("dob", formattedDate, { shouldValidate: true, shouldDirty: true });
                setDatePickerOpen(false);
              }}
              style={styles.confirmButton}
            />
          </ForgeCard>
        </View>
      </Modal>
    </ForgeScreen>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 8
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabText: {
    color: colors.warm,
    fontSize: 14,
    fontWeight: "800"
  },
  activeTabText: {
    color: colors.white
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100
  },
  formSection: {
    gap: 12
  },
  saveButton: {
    marginTop: 10
  },
  error: {
    color: colors.danger,
    fontWeight: "800",
    textAlign: "center"
  },
  success: {
    color: colors.success,
    fontWeight: "900",
    textAlign: "center"
  },
  modalShade: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.58)"
  },
  sheet: {
    gap: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    maxHeight: "80%"
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  sheetScroll: {
    maxHeight: 350
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4
  },
  optionText: {
    fontSize: 16,
    fontWeight: "800"
  },
  datePickerColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 12
  },
  datePickerColumnContainer: {
    flex: 1,
    alignItems: "center"
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },
  datePickerColumn: {
    height: 200,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12
  },
  dateItem: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dateItemText: {
    fontSize: 15,
    fontWeight: "800"
  },
  confirmButton: {
    marginTop: 12
  },
  toast: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    flex: 1
  },
  daysContainer: {
    marginVertical: 4,
    gap: 8
  },
  daysLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: "800"
  },
  errorText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  privacyBanner: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: "center"
  },
  privacyTextContainer: {
    flex: 1,
    gap: 2
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: "900"
  },
  privacyDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600"
  }
});
