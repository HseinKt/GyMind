import { ActiveCheckIn, AutoCheckOutResult, CurrentGymSession, QrScanResult } from "@/types/checkIn";
import { getJson, postJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapHistory } from "./mappers";

export async function scanQr(qrPayload: string, latitude: number, longitude: number): Promise<QrScanResult> {
  return postJson<QrScanResult>(endpoints.qrScan, {
    qrPayload,
    timestamp: new Date().toISOString(),
    latitude,
    longitude
  });
}

export async function checkout() {
  return postJson(endpoints.checkout, { timestamp: new Date().toISOString() });
}

export async function checkoutCurrentGymSession() {
  return postJson(endpoints.mobileCheckout, { method: "MOBILE_CHECKOUT", timestamp: new Date().toISOString() });
}

export async function getActiveCheckIn(): Promise<ActiveCheckIn> {
  return getJson<ActiveCheckIn>(endpoints.activeCheckIn);
}

export async function getCurrentGymSession(): Promise<CurrentGymSession> {
  return getJson<CurrentGymSession>(endpoints.currentGymSession);
}

export async function sendCheckInHeartbeat() {
  return postJson(endpoints.heartbeat, { timestamp: new Date().toISOString() });
}

export async function autoCheckout(latitude: number, longitude: number): Promise<AutoCheckOutResult> {
  return postJson<AutoCheckOutResult>(endpoints.autoCheckout, {
    latitude,
    longitude,
    method: "mobile-geofence-auto-checkout",
    timestamp: new Date().toISOString()
  });
}

export async function updateLocation(latitude: number, longitude: number, insideGym: boolean) {
  return postJson(endpoints.locationUpdate, { latitude, longitude, insideGym });
}

export async function getCheckInHistory() {
  const data = await getJson<any[]>(endpoints.history);
  return Array.isArray(data) ? data.map(mapHistory) : [];
}
