import { Pressable, StyleSheet, Text, ViewStyle, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useForgeTheme } from "@/theme/theme";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function ForgeButton({ title, onPress, variant = "primary", disabled, loading, style }: Props) {
  const theme = useForgeTheme();
  
  const spinnerColor = variant === "secondary" ? theme.text : "#FFFFFF";
  const content = loading ? (
    <ActivityIndicator size="small" color={spinnerColor} />
  ) : (
    <Text style={[styles.text, variant !== "primary" && { color: theme.text }]}>{title}</Text>
  );

  const isButtonDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isButtonDisabled}
      style={({ pressed }) => [
        styles.base,
        variant !== "primary" && {
          backgroundColor: variant === "danger" ? theme.danger : theme.surface2,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: theme.border
        },
        isButtonDisabled && styles.disabled,
        pressed && !isButtonDisabled && styles.pressed,
        style
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={[theme.primary, theme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  gradient: { minHeight: 52, alignSelf: "stretch", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  text: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", letterSpacing: 0 }
});
