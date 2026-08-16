import { AxiosError } from "axios";
import { API_ORIGIN } from "@/config/apiConfig";

export class ForgeApiError extends Error {
  statusCode?: number | undefined;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "ForgeApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function parseApiError(error: unknown): ForgeApiError {
  if (error instanceof ForgeApiError) return error;
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const serverMessage =
      typeof data === "string"
        ? data
        : data?.message ?? data?.title ?? data?.error ?? firstValidationError(data?.errors);

    if (status === 400) return new ForgeApiError(serverMessage ?? "Some fields need attention.", status, data);
    if (status === 401) return new ForgeApiError(serverMessage ?? "Your session expired. Please sign in again.", status, data);
    if (status === 403) return new ForgeApiError("You do not have permission to perform this action.", status, data);
    if (status === 404) return new ForgeApiError("This Gymind API endpoint is not available yet.", status, data);
    if (status === 409) return new ForgeApiError(serverMessage ?? "This request conflicts with your current attendance state.", status, data);
    if (status && status >= 500) return new ForgeApiError("Gymind API had a server error. Please try again.", status, data);
    if (axiosError.code === "ECONNABORTED" || axiosError.message?.toLowerCase().includes("network")) {
      return new ForgeApiError(
        __DEV__
          ? `Cannot reach Gymind.API at ${API_ORIGIN}. Test this URL from your phone browser: ${API_ORIGIN}/swagger`
          : "Cannot connect to Gymind. Check your internet connection and try again."
      );
    }
    return new ForgeApiError(serverMessage ?? "Request failed. Please try again.", status, data);
  }
  return new ForgeApiError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
}

function firstValidationError(errors: unknown) {
  if (!errors || typeof errors !== "object") return undefined;
  const first = Object.values(errors as Record<string, unknown>)[0];
  return Array.isArray(first) ? first[0]?.toString() : undefined;
}

export function qrErrorMessage(error: unknown) {
  const parsed = parseApiError(error);
  const text = parsed.message.toLowerCase();
  if (text.includes("closed")) return "This branch is currently closed.";
  if (text.includes("full") || text.includes("capacity")) return "This branch is currently full.";
  if (text.includes("membership") && (text.includes("inactive") || text.includes("active"))) return "Your membership is not active.";
  if (text.includes("access")) return "Your membership does not include this branch.";
  if (text.includes("already")) return "You already have an active attendance session.";
  if (text.includes("latest printed qr") || text.includes("no longer valid")) return "This branch QR was regenerated. Please scan the latest printed QR.";
  if (text.includes("expired")) return "This QR code is expired. Please scan the latest branch QR.";
  if (text.includes("invalid") || text.includes("qr")) return "This QR code is invalid. Please scan the official branch QR.";
  return parsed.message;
}
