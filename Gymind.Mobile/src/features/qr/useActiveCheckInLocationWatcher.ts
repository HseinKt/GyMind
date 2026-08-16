import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { autoCheckout, getActiveCheckIn } from "@/api/checkInApi";
import { useAuthStore } from "@/auth/authStore";
import { ActiveCheckIn } from "@/types/checkIn";

const CHECK_INTERVAL_MS = 60_000;
const MOVEMENT_INTERVAL_METERS = 75;
const REQUIRED_OUTSIDE_DETECTIONS = 3;

const checkoutInvalidationKeys = [
  ["activeCheckIn"],
  ["home"],
  ["history"],
  ["branches", "access"],
  ["membership"]
] as const;

export function useActiveCheckInLocationWatcher() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCheckInRef = useRef<ActiveCheckIn | null>(null);
  const outsideDetectionsRef = useRef(0);
  const inFlightRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeCheckInQuery = useQuery({
    queryKey: ["activeCheckIn"],
    queryFn: getActiveCheckIn,
    enabled: Boolean(user),
    refetchInterval: CHECK_INTERVAL_MS
  });

  useEffect(() => {
    activeCheckInRef.current = activeCheckInQuery.data ?? null;
  }, [activeCheckInQuery.data]);

  useEffect(() => {
    if (!user || !activeCheckInQuery.data?.hasActiveCheckIn) {
      stopWatching();
      outsideDetectionsRef.current = 0;
      setMessage(null);
      return;
    }

    if (!hasGeofence(activeCheckInQuery.data)) {
      stopWatching();
      setMessage("Auto checkout needs branch geofence data. Manual checkout is still available.");
      return;
    }

    let cancelled = false;

    const startWatching = async () => {
      const permission = await ensureForegroundLocationPermission();
      if (cancelled) return;

      if (!permission) {
        stopWatching();
        setMessage("Location permission is denied. Auto checkout cannot run until foreground location is allowed.");
        return;
      }

      setMessage(null);

      if (!subscriptionRef.current) {
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: MOVEMENT_INTERVAL_METERS,
            timeInterval: CHECK_INTERVAL_MS
          },
          (position) => {
            void handlePosition(position);
          }
        );
      }
    };

    void startWatching();

    return () => {
      cancelled = true;
    };
  }, [user, activeCheckInQuery.data?.hasActiveCheckIn, activeCheckInQuery.data?.checkInId]);

  useEffect(() => stopWatching, []);

  const invalidateCheckoutQueries = async () => {
    await Promise.all(checkoutInvalidationKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  const handlePosition = async (position: Location.LocationObject) => {
    const activeCheckIn = activeCheckInRef.current;
    if (!activeCheckIn?.hasActiveCheckIn || !hasGeofence(activeCheckIn) || inFlightRef.current) {
      return;
    }

    const distanceMeters = calculateDistanceMeters(
      activeCheckIn.branchLatitude,
      activeCheckIn.branchLongitude,
      position.coords.latitude,
      position.coords.longitude
    );

    if (distanceMeters <= activeCheckIn.radiusMeters) {
      outsideDetectionsRef.current = 0;
      return;
    }

    outsideDetectionsRef.current += 1;
    if (outsideDetectionsRef.current < REQUIRED_OUTSIDE_DETECTIONS) {
      return;
    }

    inFlightRef.current = true;
    try {
      const response = await autoCheckout(position.coords.latitude, position.coords.longitude);
      if (response.checkedOut) {
        stopWatching();
        outsideDetectionsRef.current = 0;
        setMessage(response.message ?? "Auto checkout completed.");
        await invalidateCheckoutQueries();
      }
    } catch {
      setMessage("Auto checkout could not complete. Manual checkout is still available.");
    } finally {
      inFlightRef.current = false;
    }
  };

  const stopWatching = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return {
    message,
    isWatching: Boolean(subscriptionRef.current || intervalRef.current),
    permissionDenied: message?.includes("Location permission is denied") ?? false
  };
}

async function ensureForegroundLocationPermission() {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === Location.PermissionStatus.GRANTED) {
    return true;
  }

  if (existing.status === Location.PermissionStatus.DENIED && !existing.canAskAgain) {
    return false;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === Location.PermissionStatus.GRANTED;
}

function hasGeofence(activeCheckIn: ActiveCheckIn): activeCheckIn is ActiveCheckIn & {
  branchLatitude: number;
  branchLongitude: number;
  radiusMeters: number;
} {
  return (
    typeof activeCheckIn.branchLatitude === "number" &&
    typeof activeCheckIn.branchLongitude === "number" &&
    typeof activeCheckIn.radiusMeters === "number"
  );
}

function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusMeters = 6371000;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
