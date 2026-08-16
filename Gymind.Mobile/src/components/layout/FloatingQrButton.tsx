import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/theme/colors";

export function FloatingQrButton() {
  return (
    <Pressable accessibilityLabel="Scan QR" onPress={() => router.push("/qr-scan")} style={styles.button}>
      <MaterialCommunityIcons name="qrcode-scan" size={30} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    alignSelf: "center",
    bottom: 28,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: colors.background
  }
});
