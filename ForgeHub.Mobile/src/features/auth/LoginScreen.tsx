import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { requestPasswordOtp, resetForgottenPassword, verifyPasswordOtp, login } from "@/api/authApi";
import { useAuthStore } from "@/auth/authStore";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { ForgeInput } from "@/components/ui/ForgeInput";
import { useForgeTheme } from "@/theme/theme";
import { ForgotPasswordValues, LoginFormValues, OtpFormValues, ResetPasswordValues, forgotPasswordSchema, loginSchema, otpSchema, resetPasswordSchema } from "@/utils/validation";
import { parseApiError } from "@/utils/errors";

export function LoginScreen() {
  const theme = useForgeTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const authError = useAuthStore((state) => state.authError);
  const setAuthError = useAuthStore((state) => state.setAuthError);
  const applyLogin = useAuthStore((state) => state.applyLogin);
  const { control, handleSubmit, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" }
  });

  useEffect(() => {
    setAuthError(null);
  }, [setAuthError]);

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);
    try {
      const cleanIdentifier = values.identifier.includes("@")
        ? values.identifier.replace(/\s+/g, "").toLowerCase()
        : values.identifier.trim();
      const response = await login(cleanIdentifier, values.password);
      await applyLogin(response);
      if (response.role === "Member") router.replace("/tabs/home");
    } catch (error) {
      setAuthError(parseApiError(error).message);
    }
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.brand, { color: theme.primary }]}>ForgeHub</Text>
        <Text style={[styles.title, { color: theme.text }]}>Member access</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Sign in to manage check-ins, classes, membership, and body insights.</Text>
      </View>
      <ForgeCard style={styles.card}>
        {authError ? <Text style={[styles.error, { color: theme.danger }]}>{authError}</Text> : null}
        <Controller
          control={control}
          name="identifier"
          render={({ field, fieldState }) => (
            <ForgeInput label="Email or phone" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <ForgeInput label="Password" passwordToggle passwordVisible={passwordVisible} onTogglePassword={() => setPasswordVisible((value) => !value)} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Pressable onPress={() => setForgotOpen(true)} style={styles.forgotButton}>
          <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot Password?</Text>
        </Pressable>
        <ForgeButton title={formState.isSubmitting ? "Signing in..." : "Sign in"} onPress={onSubmit} disabled={formState.isSubmitting} />
      </ForgeCard>
      <Text style={[styles.noteText, { color: theme.muted }]}>
        Credentials are assigned by your gym branch front desk. Change your password in Settings after logging in.
      </Text>
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </KeyboardAvoidingView>
  );
}

function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useForgeTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const requestForm = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { identifier: "" } });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });
  const resetForm = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: "", confirmPassword: "" } });

  const requestOtp = requestForm.handleSubmit(async (values) => {
    setError(null);
    try {
      const cleanIdentifier = values.identifier.includes("@")
        ? values.identifier.replace(/\s+/g, "").toLowerCase()
        : values.identifier.trim();
      const response = await requestPasswordOtp(cleanIdentifier);
      setIdentifier(cleanIdentifier);
      setResetToken(response.resetToken);
      setMessage(response.message);
      setStep(2);
    } catch (err) {
      setError(parseApiError(err).message);
    }
  });

  const verifyOtp = otpForm.handleSubmit(async (values) => {
    setError(null);
    try {
      const response = await verifyPasswordOtp(identifier, values.otp, resetToken);
      setOtp(values.otp);
      setResetToken(response.resetToken);
      setMessage(response.message);
      setStep(3);
    } catch (err) {
      setError(parseApiError(err).message);
    }
  });

  const resetPassword = resetForm.handleSubmit(async (values) => {
    setError(null);
    try {
      const response = await resetForgottenPassword(identifier, otp, resetToken, values.newPassword);
      setMessage(response.message);
      resetForm.reset();
      otpForm.reset();
      requestForm.reset();
      setStep(1);
      onClose();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalShade}>
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Reset password</Text>
            <Pressable onPress={onClose} style={styles.closeHit}><Text style={[styles.closeText, { color: theme.text }]}>x</Text></Pressable>
          </View>
          {message ? <Text style={[styles.message, { color: theme.success }]}>{message}</Text> : null}
          {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
          {step === 1 ? (
            <>
              <Controller control={requestForm.control} name="identifier" render={({ field, fieldState }) => (
                <ForgeInput label="Phone, WhatsApp, or email" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="none" />
              )} />
              <ForgeButton title={requestForm.formState.isSubmitting ? "Requesting..." : "Request OTP"} disabled={requestForm.formState.isSubmitting} onPress={requestOtp} />
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Controller control={otpForm.control} name="otp" render={({ field, fieldState }) => (
                <ForgeInput label="OTP code" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="number-pad" />
              )} />
              <ForgeButton title={otpForm.formState.isSubmitting ? "Verifying..." : "Verify OTP"} disabled={otpForm.formState.isSubmitting} onPress={verifyOtp} />
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Controller control={resetForm.control} name="newPassword" render={({ field, fieldState }) => (
                <ForgeInput label="New password" passwordToggle passwordVisible={newPasswordVisible} onTogglePassword={() => setNewPasswordVisible((value) => !value)} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller control={resetForm.control} name="confirmPassword" render={({ field, fieldState }) => (
                <ForgeInput label="Confirm password" passwordToggle passwordVisible={confirmVisible} onTogglePassword={() => setConfirmVisible((value) => !value)} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <ForgeButton title={resetForm.formState.isSubmitting ? "Saving..." : "Reset password"} disabled={resetForm.formState.isSubmitting} onPress={resetPassword} />
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 20, gap: 24 },
  hero: { gap: 8 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: 0 },
  title: { fontSize: 34, fontWeight: "900", letterSpacing: 0 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  card: { gap: 16 },
  forgotButton: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center" },
  forgotText: { fontWeight: "900" },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  sheet: { gap: 14, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 22, fontWeight: "900", letterSpacing: 0 },
  closeHit: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, fontWeight: "900" },
  message: { fontWeight: "800", lineHeight: 20 },
  error: { fontWeight: "800", lineHeight: 20 },
  noteText: { fontSize: 13, lineHeight: 18, fontWeight: "700", textAlign: "center", marginTop: 4 }
});
