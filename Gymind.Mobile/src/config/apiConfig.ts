import Constants from "expo-constants";

function resolveApiBaseUrl(): string {
  // 1. If explicit env variable is provided, prioritize it
  const envUrl = process.env.EXPO_PUBLIC_GYMIND_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  // 2. Auto-detect host IP from Expo (works dynamically across all Wi-Fi networks)
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp) {
      return `http://${hostIp}:5156`;
    }
  }

  // 3. Fallback for Web / Simulators
  return "http://localhost:5156";
}

const rawApiBaseUrl = resolveApiBaseUrl();
const trimmedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

export const API_ORIGIN = trimmedApiBaseUrl.endsWith("/api")
  ? trimmedApiBaseUrl.slice(0, -4)
  : trimmedApiBaseUrl;

export const API_BASE_URL = trimmedApiBaseUrl.endsWith("/api")
  ? trimmedApiBaseUrl
  : `${trimmedApiBaseUrl}/api`;

if (__DEV__) {
  console.log("[Gymind] Auto-resolved API_ORIGIN =", API_ORIGIN);
  console.log("[Gymind] Auto-resolved API_BASE_URL =", API_BASE_URL);
}
