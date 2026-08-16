import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useForgeTheme } from "@/theme/theme";

const baseBarHeight = 92;
const circleSize = 80;

const iconMap = {
  home: "home-variant-outline",
  classes: "calendar-check-outline",
  "check-in": "qrcode-scan",
  payments: "credit-card",
  profile: "account-circle-outline"
} as const;

export function ForgeBottomTabs() {
  const theme = useForgeTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 0);
  const barHeight = baseBarHeight + bottomInset;
  const activeColor = theme.primary;
  const inactiveColor = theme.mode === "light" ? "#6B7280" : "#A8A8B5";
  const tabBarColor = theme.mode === "light" ? "#FFFFFF" : "#141414";
  const tabBarAccentColor = theme.mode === "light" ? "rgba(17,17,17,0.10)" : "rgba(252,106,10,0.20)";
  const qrGlowColor = theme.mode === "light" ? "rgba(252,106,10,0.24)" : "rgba(252,106,10,0.45)";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <BottomNavShape
            width={width}
            height={barHeight}
            bottomInset={bottomInset}
            backgroundColor={theme.background}
            fillColor={tabBarColor}
            accentColor={tabBarAccentColor}
          />
        ),
        tabBarStyle: {
          position: "absolute",
          height: barHeight,
          paddingTop: 22,
          paddingBottom: bottomInset + 8,
          paddingHorizontal: 8,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          overflow: "visible",
          shadowColor: "#000000",
          shadowOpacity: theme.mode === "light" ? 0.12 : 0,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -4 },
          elevation: theme.mode === "light" ? 12 : 0
        },
        tabBarIcon: ({ color, focused }) => {
          const key = route.name as keyof typeof iconMap;
          if (key === "check-in") {
            return (
              <View style={styles.qrWrap}>
                <View style={[styles.qrGlow, { backgroundColor: theme.mode === "light" ? "rgba(252,106,10,0.10)" : "rgba(252,106,10,0.14)", borderColor: qrGlowColor, shadowColor: activeColor }, focused ? styles.qrGlowActive : null]}>
                  <View style={[styles.qrButton, { backgroundColor: activeColor, borderColor: focused ? "#FFD1B2" : "#FF8A32", shadowColor: activeColor }, focused ? styles.qrButtonActive : null]}>
                    <MaterialCommunityIcons name={iconMap[key]} size={34} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            );
          }
          return (
            <View style={styles.iconStack}>
              <MaterialCommunityIcons name={iconMap[key]} size={26} color={color} />
              {focused ? <View style={[styles.activeDot, { backgroundColor: activeColor }]} /> : null}
            </View>
          );
        }
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="classes" options={{ title: "Classes" }} />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "QR",
          tabBarLabel: () => null
        }}
      />
      <Tabs.Screen name="payments" options={{ title: "Payment" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
    </Tabs>
  );
}

function BottomNavShape({
  width,
  height,
  bottomInset,
  backgroundColor,
  fillColor,
  accentColor
}: {
  width: number;
  height: number;
  bottomInset: number;
  backgroundColor: string;
  fillColor: string;
  accentColor: string;
}) {
  const sideInset = 10;
  const shapeWidth = Math.max(width - sideInset * 2, 320);
  const center = shapeWidth / 2;
  const top = 18;
  const corner = 22;
  const slope = 34;
  const notchEdge = 45;
  const notchDepth = 31;
  const notchBottom = top + notchDepth;
  const bottom = height;
  const fillPath = [
    `M ${corner} ${top}`,
    `H ${center - notchEdge - slope}`,
    `C ${center - notchEdge - 18} ${top}, ${center - notchEdge - 12} ${top + 13}, ${center - notchEdge} ${top + 17}`,
    `C ${center - 36} ${top + 22}, ${center - 35} ${notchBottom}, ${center} ${notchBottom}`,
    `C ${center + 35} ${notchBottom}, ${center + 36} ${top + 22}, ${center + notchEdge} ${top + 17}`,
    `C ${center + notchEdge + 12} ${top + 13}, ${center + notchEdge + 18} ${top}, ${center + notchEdge + slope} ${top}`,
    `H ${shapeWidth - corner}`,
    `Q ${shapeWidth} ${top} ${shapeWidth} ${top + corner}`,
    `V ${bottom}`,
    `H 0`,
    `V ${top + corner}`,
    `Q 0 ${top} ${corner} ${top}`,
    "Z"
  ].join(" ");
  const topPath = [
    `M ${corner} ${top}`,
    `H ${center - notchEdge - slope}`,
    `C ${center - notchEdge - 18} ${top}, ${center - notchEdge - 12} ${top + 13}, ${center - notchEdge} ${top + 17}`,
    `C ${center - 36} ${top + 22}, ${center - 35} ${notchBottom}, ${center} ${notchBottom}`,
    `C ${center + 35} ${notchBottom}, ${center + 36} ${top + 22}, ${center + notchEdge} ${top + 17}`,
    `C ${center + notchEdge + 12} ${top + 13}, ${center + notchEdge + 18} ${top}, ${center + notchEdge + slope} ${top}`,
    `H ${shapeWidth - corner}`,
    `Q ${shapeWidth} ${top} ${shapeWidth} ${top + corner}`
  ].join(" ");

  return (
    <View pointerEvents="none" style={[styles.shapeWrap, { height, left: sideInset, right: sideInset, backgroundColor }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${shapeWidth} ${height}`} preserveAspectRatio="none">
        <Path d={fillPath} fill={fillColor} />
        <Path d={topPath} fill="none" stroke={accentColor} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={[styles.bottomSafeFill, { height: bottomInset, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 2,
    justifyContent: "center"
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -1,
    marginBottom: 0
  },
  shapeWrap: {
    position: "absolute",
    bottom: 0,
    overflow: "visible"
  },
  bottomSafeFill: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18
  },
  iconStack: {
    width: 34,
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  activeDot: {
    position: "absolute",
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2
  },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -54,
    width: circleSize,
    height: circleSize
  },
  qrGlow: {
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.38,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14
  },
  qrGlowActive: {
    shadowOpacity: 0.55
  },
  qrButton: {
    width: circleSize - 6,
    height: circleSize - 6,
    borderRadius: (circleSize - 6) / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 16
  },
  qrButtonActive: {
    borderColor: "#FFD1B2"
  }
});
