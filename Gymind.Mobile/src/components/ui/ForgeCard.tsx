import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { spacing } from "@/theme/spacing";
import { shadows } from "@/theme/shadows";
import { useForgeTheme } from "@/theme/theme";

export function ForgeCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useForgeTheme();
  return (
    <View style={[{
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 22,
      padding: spacing.lg,
      ...shadows.card
    }, style]}>
      {children}
    </View>
  );
}
