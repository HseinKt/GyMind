import { API_BASE_URL } from "../api/apiClient";

export function resolveAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url.startsWith("/") ? url : `/${url}`, API_BASE_URL).toString();
}
