import { forwardRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useForgeTheme } from "@/theme/theme";

interface Props extends TextInputProps {
  label: string;
  error?: string | undefined;
  passwordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
  rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}

export const ForgeInput = forwardRef<TextInput, Props>(({ label, error, style, passwordToggle, passwordVisible, onTogglePassword, rightIcon, ...props }, ref) => {
  const theme = useForgeTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: error ? theme.danger : theme.border, backgroundColor: theme.surface2 }]}>
        <TextInput
          ref={ref}
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text }, (passwordToggle || rightIcon) && styles.inputWithIcon, style]}
          secureTextEntry={passwordToggle ? !passwordVisible : props.secureTextEntry}
          {...props}
        />
        {passwordToggle ? (
          <Pressable onPress={onTogglePassword} style={styles.eye} hitSlop={8}>
            <MaterialCommunityIcons name={passwordVisible ? "eye-off-outline" : "eye-outline"} color={theme.muted} size={22} />
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.eye}>
            <MaterialCommunityIcons name={rightIcon} color={theme.muted} size={22} />
          </View>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
});

ForgeInput.displayName = "ForgeInput";

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", letterSpacing: 0 },
  inputWrap: { minHeight: 52, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, minHeight: 52, paddingHorizontal: 16, fontSize: 16 },
  inputWithIcon: { paddingRight: 4 },
  eye: { width: 48, minHeight: 52, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 12, fontWeight: "700" }
});
