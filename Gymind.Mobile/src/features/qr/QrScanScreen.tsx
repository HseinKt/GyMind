import { useEffect, useRef, useState } from "react";
import { Animated, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { scanQr } from "@/api/checkInApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { ForgeButton } from "@/components/ui/ForgeButton";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { CapacityBar } from "@/components/ui/CapacityBar";
import { useForgeTheme } from "@/theme/theme";
import { QrScanResult } from "@/types/checkIn";
import { qrErrorMessage } from "@/utils/errors";

const cachedLocationMaxAgeMs = 60_000;

export function QrScanScreen() {
  const theme = useForgeTheme();
  const { width } = useWindowDimensions();
  const frameSize = Math.min(320, Math.round(width * 0.75));
  const halfFrame = frameSize / 2;
  const scanMaskColor = theme.mode === "light" ? "rgba(10,10,10,0.64)" : theme.overlay;
  const scanLine = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [locationStatus, setLocationStatus] = useState<Location.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((response) => setLocationStatus(response.status))
      .catch(() => setLocationStatus(null));
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1700, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanLine]);

  const mutation = useMutation({
    mutationFn: async (payload: string) => {
      if (locationStatus !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission is required for attendance validation.");
      }

      const preciseLocation = getPreciseLocation();
      const cached = await Location.getLastKnownPositionAsync({ maxAge: cachedLocationMaxAgeMs });
      if (cached) {
        try {
          const result = await scanQr(payload, cached.coords.latitude, cached.coords.longitude);
          void preciseLocation.catch(() => undefined);
          return result;
        } catch (error) {
          if (!isRangeError(error)) throw error;
          const precise = await preciseLocation;
          return scanQr(payload, precise.coords.latitude, precise.coords.longitude);
        }
      }

      const position = await preciseLocation;
      return scanQr(payload, position.coords.latitude, position.coords.longitude);
    },
    onSuccess: async (data) => {
      setResult(data);
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["branches", "access"] }),
        queryClient.invalidateQueries({ queryKey: ["membership"] }),
        queryClient.invalidateQueries({ queryKey: ["activeCheckIn"] })
      ]);
    },
    onError: (err) => {
      setError(qrErrorMessage(err));
      setLocked(false);
    }
  });

  const submitScan = (data: string) => {
    if (locked || mutation.isPending || result || !data.trim()) return;
    setLocked(true);
    setManualOpen(false);
    mutation.mutate(data.trim());
  };

  const cameraGranted = Boolean(permission?.granted);
  const locationGranted = locationStatus === Location.PermissionStatus.GRANTED;
  const canScan = cameraGranted && locationGranted;
  const locationDenied = locationStatus === Location.PermissionStatus.DENIED;
  const cameraDenied = permission?.status === "denied";

  const requestLocationPermission = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(response.status);
  };

  if (!canScan) {
    return (
      <ForgeScreen title="QR Check In" subtitle="Permissions required">
        <ForgeCard style={styles.card}>
          <Text style={[styles.title, { color: theme.text }]}>Before you scan</Text>
          <Text style={[styles.text, { color: theme.muted }]}>Gymind uses the camera to read the branch QR code and location only to validate gym check-in distance.</Text>
          <PermissionRow label="Camera" ok={cameraGranted} status={cameraGranted ? "Granted" : cameraDenied ? "Denied" : "Needed"} />
          <PermissionRow label="Location" ok={locationGranted} status={locationGranted ? "Granted" : locationDenied ? "Denied" : "Needed"} />
          {cameraDenied || locationDenied ? <Text style={[styles.error, { color: theme.danger }]}>Permission is disabled. Open settings and allow camera and foreground location to continue.</Text> : null}
          {!cameraGranted && !cameraDenied ? <ForgeButton title="Allow Camera" onPress={requestPermission} /> : null}
          {!locationGranted && !locationDenied ? <ForgeButton title="Allow Location" variant={cameraGranted ? "primary" : "secondary"} onPress={requestLocationPermission} /> : null}
          {cameraDenied || locationDenied ? <ForgeButton title="Open Settings" onPress={() => Linking.openSettings()} /> : null}
          <ForgeButton title="Cancel" variant="secondary" onPress={() => router.back()} />
        </ForgeCard>
      </ForgeScreen>
    );
  }

  const lineTranslate = scanLine.interpolate({ inputRange: [0, 1], outputRange: [10, frameSize - 14] });

  return (
    <ForgeScreen title="QR Check In" subtitle="Align the QR code inside the frame" scroll={false}>
      <View style={[styles.scanner, { backgroundColor: theme.background }]}>
        {!result ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={locked ? undefined : ({ data }) => submitScan(data)}
          />
        ) : null}
        {!result ? (
          <>
            <View style={[styles.shade, styles.topShade, { marginBottom: halfFrame, backgroundColor: scanMaskColor }]} />
            <View style={[styles.middleRow, { height: frameSize, transform: [{ translateY: -halfFrame }] }]}>
              <View style={[styles.sideShade, { backgroundColor: scanMaskColor }]} />
              <View style={[styles.frame, { width: frameSize, height: frameSize, shadowColor: theme.primary }]}>
                <Corner position="tl" />
                <Corner position="tr" />
                <Corner position="bl" />
                <Corner position="br" />
                <Animated.View style={[styles.scanLine, { backgroundColor: theme.primary, transform: [{ translateY: lineTranslate }], shadowColor: theme.primary }]} />
                {mutation.isPending ? <Text style={styles.validating}>Validating...</Text> : null}
              </View>
              <View style={[styles.sideShade, { backgroundColor: scanMaskColor }]} />
            </View>
            <View style={[styles.shade, styles.bottomShade, { marginTop: halfFrame, backgroundColor: scanMaskColor }]} />
          </>
        ) : null}

        {error ? (
          <ForgeCard style={styles.feedback}>
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
            <ForgeButton title="Scan again" variant="secondary" onPress={() => { setError(null); setLocked(false); }} />
          </ForgeCard>
        ) : null}
        {result ? (
          <ForgeCard style={styles.feedback}>
            <Text style={[styles.success, { color: theme.success }]}>{result.alreadyCheckedIn ? "Already checked in" : "Check-in confirmed"}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{result.branchName ?? "Branch"}</Text>
            <Text style={[styles.text, { color: theme.muted }]}>{result.message}</Text>
            {result.capacity ? <CapacityBar percentage={((result.currentOccupancy ?? 0) / result.capacity) * 100} /> : null}
            {result.capacity ? <Text style={[styles.text, { color: theme.muted }]}>{result.currentOccupancy ?? 0}/{result.capacity} inside</Text> : null}
            <ForgeButton title="Active check-in" onPress={() => router.replace("/active-checkin")} />
            <ForgeButton title="Home" variant="secondary" onPress={() => router.replace("/tabs/home")} />
          </ForgeCard>
        ) : null}

        {!result ? (
          <View style={styles.actions}>
            <RoundAction icon={torch ? "flashlight-off" : "flashlight"} label="Flash" active={torch} onPress={() => setTorch((value) => !value)} />
            <RoundAction icon="camera-flip-outline" label="Switch" onPress={() => setFacing((value) => value === "back" ? "front" : "back")} />
            <RoundAction icon="keyboard-outline" label="Manual" onPress={() => setManualOpen(true)} />
            <RoundAction icon="close" label="Cancel" onPress={() => router.back()} />
          </View>
        ) : null}
      </View>
      <Modal visible={manualOpen} transparent animationType="slide" onRequestClose={() => setManualOpen(false)}>
        <View style={styles.modalShade}>
          <ForgeCard style={styles.manualSheet}>
            <Text style={[styles.title, { color: theme.text }]}>Manual code</Text>
            <TextInput value={manualCode} onChangeText={setManualCode} placeholder="Enter branch QR code" placeholderTextColor={theme.muted} style={[styles.manualInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface2 }]} />
            <ForgeButton title="Submit code" disabled={mutation.isPending || !manualCode.trim()} onPress={() => submitScan(manualCode)} />
            <ForgeButton title="Cancel" variant="secondary" onPress={() => setManualOpen(false)} />
          </ForgeCard>
        </View>
      </Modal>
    </ForgeScreen>
  );
}

function PermissionRow({ label, status, ok }: { label: string; status: string; ok: boolean }) {
  const theme = useForgeTheme();
  return (
    <View style={[styles.permissionRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.permissionLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.permissionStatus, { color: ok ? theme.success : theme.warning }]}>{status}</Text>
    </View>
  );
}

function Corner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const theme = useForgeTheme();
  return <View style={[styles.corner, styles[position], { borderColor: theme.primary }]} />;
}

function RoundAction({ icon, label, active, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; active?: boolean; onPress: () => void }) {
  const theme = useForgeTheme();
  return (
    <Pressable onPress={onPress} style={[styles.action, { backgroundColor: active ? theme.primary : theme.card, borderColor: active ? theme.primary : theme.border }]}>
      <MaterialCommunityIcons name={icon} color={active ? "#FFFFFF" : theme.text} size={22} />
      <Text style={[styles.actionLabel, { color: active ? "#FFFFFF" : theme.muted }]}>{label}</Text>
    </Pressable>
  );
}

function getPreciseLocation() {
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<Location.LocationObject>((_, reject) => setTimeout(() => reject(new Error("Unable to get your location. Please try again.")), 12000))
  ]);
}

function isRangeError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("outside") || message.includes("range") || message.includes("distance");
}

const styles = StyleSheet.create({
  scanner: { flex: 1, justifyContent: "center" },
  shade: { position: "absolute", left: 0, right: 0 },
  topShade: { top: 0, bottom: "50%" },
  bottomShade: { top: "50%", bottom: 0 },
  middleRow: { position: "absolute", left: 0, right: 0, top: "50%", flexDirection: "row" },
  sideShade: { flex: 1 },
  frame: { alignSelf: "center", borderRadius: 28, overflow: "hidden", backgroundColor: "transparent", shadowOpacity: 0.28, shadowRadius: 18 },
  corner: { position: "absolute", width: 48, height: 48, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 24 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 24 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 24 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 24 },
  scanLine: { position: "absolute", left: 22, right: 22, height: 3, borderRadius: 2, shadowOpacity: 0.7, shadowRadius: 10 },
  validating: { position: "absolute", alignSelf: "center", bottom: 20, color: "#FFFFFF", fontWeight: "900", backgroundColor: "rgba(10,10,10,0.68)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: "hidden" },
  actions: { position: "absolute", left: 16, right: 16, bottom: 22, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  action: { flex: 1, minHeight: 64, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: "900" },
  feedback: { position: "absolute", left: 20, right: 20, top: "24%", gap: 14 },
  card: { gap: 14 },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: 0 },
  text: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  permissionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1 },
  permissionLabel: { fontWeight: "900" },
  permissionStatus: { fontWeight: "900" },
  error: { fontWeight: "800", lineHeight: 20 },
  success: { fontSize: 14, fontWeight: "900", letterSpacing: 0 },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  manualSheet: { gap: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  manualInput: { minHeight: 52, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: "700" }
});
