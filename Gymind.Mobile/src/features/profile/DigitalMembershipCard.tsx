import React, { useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useForgeTheme } from "@/theme/theme";
import { AuthUser } from "@/types/auth";
import { MemberProfile } from "@/types/profile";
import { Membership } from "@/types/membership";
import { API_ORIGIN } from "@/config/apiConfig";

interface Props {
  user: AuthUser | null;
  profile: MemberProfile | null;
  membership: Membership | null;
}

export function DigitalMembershipCard({ user, profile, membership }: Props) {
  const theme = useForgeTheme();
  const [flipped, setFlipped] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    Animated.spring(animatedValue, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  // Resolve user values
  const name = user?.fullName ?? "Gymind Member";
  const memberNumber = user?.memberId ? `FH-${String(user.memberId).padStart(5, "0")}` : `FH-${user?.userId ?? "00000"}`;
  const planName = membership?.planName || user?.membershipPlan || "No Active Plan";
  const status = (membership?.status || user?.membershipStatus || "Pending").toUpperCase();
  const isActive = membership?.isActive || user?.membershipActive || false;
  
  // Expose check-in QR Payload or user QR Code
  const qrCodeData = profile?.qrCode ?? user?.qrCode ?? `MEMBER-CHECKIN:${user?.memberId ?? user?.userId ?? 0}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}&color=0-0-0&bgcolor=255-255-255`;

  // Profile photo uri
  const persistedPhotoUrl = user?.profilePhotoUrl ?? profile?.profilePhotoUrl;
  const photoUri = persistedPhotoUrl
    ? persistedPhotoUrl.startsWith("http")
      ? persistedPhotoUrl
      : `${API_ORIGIN}${persistedPhotoUrl.startsWith("/") ? "" : "/"}${persistedPhotoUrl}`
    : null;

  return (
    <View style={styles.container}>
      <Pressable onPress={flipCard} style={styles.cardContainer}>
        {/* FRONT SIDE */}
        <Animated.View
          pointerEvents={flipped ? "none" : "auto"}
          style={[
            styles.cardFace,
            frontAnimatedStyle,
            { opacity: flipped ? 0 : 1, zIndex: flipped ? 1 : 2 },
          ]}
        >
          <LinearGradient
            colors={theme.mode === "light" ? ["#1E293B", "#0F172A"] : [theme.card, theme.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderColor: theme.primary, borderWidth: 1 }]}
          >
            {/* Chip/Logo Row */}
            <View style={styles.topRow}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="dumbbell" size={24} color={theme.primary} />
                <Text style={styles.logoText}>FORGE<Text style={{ color: theme.primary }}>HUB</Text></Text>
              </View>
              <View style={[styles.chip, { backgroundColor: isActive ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)" }]}>
                <Text style={[styles.chipText, { color: isActive ? theme.success : theme.warning }]}>
                  {status}
                </Text>
              </View>
            </View>

            {/* Content Row */}
            <View style={styles.bodyRow}>
              <View style={styles.infoCol}>
                <View style={styles.avatarRow}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.cardAvatar} />
                  ) : (
                    <View style={[styles.cardAvatarFallback, { backgroundColor: theme.surface2 }]}>
                      <MaterialCommunityIcons name="account" size={32} color={theme.primary} />
                    </View>
                  )}
                  <View style={styles.nameContainer}>
                    <Text numberOfLines={1} style={styles.memberName}>{name}</Text>
                    <Text style={[styles.memberIdText, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>{memberNumber}</Text>
                  </View>
                </View>
                
                <View style={styles.planContainer}>
                  <Text style={[styles.labelTitle, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>MEMBERSHIP PLAN</Text>
                  <Text style={styles.planValue} numberOfLines={1}>{planName}</Text>
                </View>
              </View>

              {/* QR Code Column */}
              <View style={styles.qrCol}>
                <View style={styles.qrWrapper}>
                  <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                </View>
                <Text style={styles.scanLabel}>TAP TO FLIP</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* BACK SIDE */}
        <Animated.View
          pointerEvents={flipped ? "auto" : "none"}
          style={[
            styles.cardFace,
            backAnimatedStyle,
            styles.cardBack,
            { opacity: flipped ? 1 : 0, zIndex: flipped ? 2 : 1 },
          ]}
        >
          <LinearGradient
            colors={theme.mode === "light" ? ["#1E293B", "#0F172A"] : [theme.card, theme.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderColor: theme.primary, borderWidth: 1 }]}
          >
            {/* Header */}
            <View style={styles.backHeader}>
              <Text style={styles.backHeaderTitle}>MEMBERSHIP PASS DETAILS</Text>
              <MaterialCommunityIcons name="security" size={20} color={theme.primary} />
            </View>

            {/* Grid details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.backLabel, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>JOIN DATE</Text>
                <Text style={styles.backValue}>{membership?.currentMembership?.startDate ?? "N/A"}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.backLabel, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>EXPIRY DATE</Text>
                <Text style={styles.backValue}>{membership?.currentMembership?.endDate ?? "No Active Plan"}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.backLabel, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>ASSIGNED TRAINER</Text>
                <Text style={styles.backValue} numberOfLines={1}>{profile?.trainerName ?? "None Assigned"}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.backLabel, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>HOME BRANCH</Text>
                <Text style={styles.backValue} numberOfLines={1}>{user?.branchName ?? "Main Branch"}</Text>
              </View>
            </View>

            {/* Emergency Contact banner */}
            <View style={[styles.emergencyBanner, { backgroundColor: theme.surface2 }]}>
              <View style={styles.emergencyIconWrapper}>
                <MaterialCommunityIcons name="phone-alert" size={16} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.backLabel, { color: theme.mode === "light" ? "rgba(0,0,0,0.6)" : theme.muted, fontSize: 9 }]}>EMERGENCY CONTACT</Text>
                <Text style={[styles.emergencyValue, { color: theme.text }]} numberOfLines={1}>
                  {profile?.emergencyContactName ? `${profile.emergencyContactName} (${profile.emergencyContactPhone ?? "No Phone"})` : "Not Configured"}
                </Text>
              </View>
            </View>

            <Text style={[styles.flipPrompt, { color: theme.mode === "light" ? "rgba(255,255,255,0.6)" : theme.muted }]}>TAP TO SHOW QR PASS</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  cardContainer: {
    width: "100%",
    height: 206,
  },
  cardFace: {
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: "row",
    flex: 1,
    marginTop: 12,
    gap: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cardAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 0, 0.4)",
  },
  nameContainer: {
    flex: 1,
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  memberIdText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  planContainer: {
    marginTop: 10,
  },
  labelTitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  planValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  qrCol: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
  },
  qrWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  qrImage: {
    width: 78,
    height: 78,
  },
  scanLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 8,
    opacity: 0.6,
  },
  backHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
    paddingBottom: 8,
  },
  backHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    marginVertical: 10,
  },
  detailItem: {
    width: "50%",
    paddingRight: 6,
  },
  backLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  backValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 10,
    marginTop: 2,
  },
  emergencyIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyValue: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  flipPrompt: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.6,
  },
});
