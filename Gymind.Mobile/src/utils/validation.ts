import { z } from "zod";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(0).optional());

const heightSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(80, "Height must be between 80 and 250 cm.").max(250, "Height must be between 80 and 250 cm.").optional());

const weightSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(25, "Weight must be between 25 and 300 kg.").max(300, "Weight must be between 25 and 300 kg.").optional());

const phone = z.string().trim().optional().refine((value) => !value || /^\+?[0-9\s().-]{7,20}$/.test(value), "Enter a valid phone number (7 to 20 digits).");

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const cleanIdentifier = (val: string) => {
  if (val.includes("@")) {
    return val.replace(/\s+/g, "").toLowerCase();
  }
  return val.trim();
};

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or phone.")
    .transform(cleanIdentifier)
    .refine((val) => {
      if (val.includes("@") || !/^\+?[0-9\s().-]{7,20}$/.test(val)) {
        return emailRegex.test(val);
      }
      return true;
    }, "Enter a valid email address or phone number."),
  password: z.string().min(1, "Enter your password.")
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, "Enter your phone, WhatsApp number, or email.")
    .transform(cleanIdentifier)
    .refine((val) => {
      if (val.includes("@") || !/^\+?[0-9\s().-]{7,20}$/.test(val)) {
        return emailRegex.test(val);
      }
      return true;
    }, "Enter a valid email address or phone number.")
});

export const otpSchema = z.object({
  otp: z.string().trim().min(4, "Enter the OTP code.")
});

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters.")
  .refine((val) => /[A-Z]/.test(val), "Password must contain at least one uppercase letter.")
  .refine((val) => /[a-z]/.test(val), "Password must contain at least one lowercase letter.")
  .refine((val) => /\d/.test(val), "Password must contain at least one number.")
  .refine((val) => /[\W_]/.test(val), "Password must contain at least one special character.");

const passwordPairSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password.")
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match."
});

export const resetPasswordSchema = passwordPairSchema;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password.")
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match."
});

export const profileSchema = z.object({
  heightCm: heightSchema,
  weightKg: weightSchema,
  fitnessGoal: z.string().trim().min(1, "Goal is required."),
  targetWeightKg: weightSchema,
  dob: z.string().trim().min(1, "Date of Birth is required.").refine(
    (val) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const m = today.getMonth() - date.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      return age >= 10 && age <= 100;
    },
    { message: "Age must be between 10 and 100 years (YYYY-MM-DD)." }
  ),
  gender: z.string().optional(),
  activityLevel: z.string().optional(),
  trainingExperience: z.string().optional(),
  favoriteWorkoutType: z.string().optional(),
  preferredTrainingDays: z.string().optional(),
  preferredWorkoutTime: z.string().optional(),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  injuries: z.string().optional(),
  medications: z.string().optional(),
  doctorClearanceRequired: z.boolean().optional(),
  healthNotes: z.string().optional(),
  medicalActionPlans: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: phone,
  emergencyContactAltPhone: phone,
  dailyCaloriesTarget: optionalNumber,
  proteinTargetGrams: optionalNumber,
  carbsTargetGrams: optionalNumber,
  fatTargetGrams: optionalNumber,
  waterTargetMl: optionalNumber,
  language: z.string().optional(),
  theme: z.string().optional(),
  measurementUnit: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  profilePhotoUrl: z.string().optional()
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
