import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/api/authApi";
import { apiBaseUrl } from "@/api/apiClient";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { ForgeInput } from "@/components/ui/ForgeInput";
import { ThemePreference, useForgeTheme } from "@/theme/theme";
import { ChangePasswordValues, changePasswordSchema } from "@/utils/validation";
import { parseApiError } from "@/utils/errors";

const themeOptions: Array<{ label: string; value: ThemePreference; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = [
  { label: "System default", value: "system", icon: "theme-light-dark" },
  { label: "Dark mode", value: "dark", icon: "weather-night" },
  { label: "Light mode", value: "light", icon: "white-balance-sunny" }
];

export function SettingsScreen() {
  const theme = useForgeTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <ForgeScreen title="Settings" subtitle="Appearance, security and app info">
      <ForgeCard style={styles.section}>
        <Text style={[styles.title, { color: theme.text }]}>Appearance</Text>
        <View style={styles.options}>
          {themeOptions.map((option) => {
            const active = theme.preference === option.value;
            return (
              <Pressable key={option.value} onPress={() => theme.setPreference(option.value)} style={[styles.option, { backgroundColor: active ? theme.primary : theme.surface2, borderColor: active ? theme.primary : theme.border }]}>
                <MaterialCommunityIcons name={option.icon} size={22} color={active ? "#FFFFFF" : theme.text} />
                <Text style={[styles.optionText, { color: active ? "#FFFFFF" : theme.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ForgeCard>

      <ForgeCard style={styles.section}>
        <Text style={[styles.title, { color: theme.text }]}>Security</Text>
        <ForgeButton title="Change password" variant="secondary" onPress={() => setPasswordOpen(true)} />
        <Text style={[styles.copy, { color: theme.muted }]}>Forgot password is available from the login screen before sign-in.</Text>
      </ForgeCard>

      <ForgeCard style={styles.section}>
        <Text style={[styles.title, { color: theme.text }]}>App info</Text>
        <Text style={[styles.copy, { color: theme.muted }]}>{apiBaseUrl}</Text>
      </ForgeCard>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </ForgeScreen>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useForgeTheme();
  const [currentVisible, setCurrentVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, formState, reset } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: ChangePasswordValues) => changePassword(values.currentPassword, values.newPassword),
    onSuccess: (response) => {
      setMessage(response.message);
      reset();
    }
  });
  const submit = handleSubmit((values) => {
    setMessage(null);
    mutation.mutate(values);
  });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <ForgeCard style={styles.sheet}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Change password</Text>
            <Pressable onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={22} color={theme.text} /></Pressable>
          </View>
          {message ? <Text style={[styles.success, { color: theme.success }]}>{message}</Text> : null}
          {mutation.error ? <Text style={[styles.error, { color: theme.danger }]}>{parseApiError(mutation.error).message}</Text> : null}
          <Controller control={control} name="currentPassword" render={({ field, fieldState }) => (
            <ForgeInput label="Current password" passwordToggle passwordVisible={currentVisible} onTogglePassword={() => setCurrentVisible((value) => !value)} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller control={control} name="newPassword" render={({ field, fieldState }) => (
            <ForgeInput label="New password" passwordToggle passwordVisible={newVisible} onTogglePassword={() => setNewVisible((value) => !value)} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller control={control} name="confirmPassword" render={({ field, fieldState }) => (
            <ForgeInput label="Confirm password" passwordToggle passwordVisible={confirmVisible} onTogglePassword={() => setConfirmVisible((value) => !value)} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <ForgeButton title={formState.isSubmitting || mutation.isPending ? "Saving..." : "Save password"} disabled={mutation.isPending} onPress={submit} />
        </ForgeCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  options: { gap: 10 },
  option: { minHeight: 54, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  optionText: { fontWeight: "900" },
  copy: { lineHeight: 20, fontWeight: "700" },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  sheet: { gap: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  success: { fontWeight: "900" },
  error: { fontWeight: "800", lineHeight: 20 }
});
