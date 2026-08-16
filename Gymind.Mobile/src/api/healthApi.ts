import axios from "axios";
import { API_ORIGIN } from "@/config/apiConfig";

export interface HealthCheckResult {
  ok: boolean;
  url?: string;
  status?: number;
  message: string;
}

const healthPaths = ["/health", "/swagger/index.html", "/swagger"];

export async function checkApiHealth(): Promise<HealthCheckResult> {
  for (const path of healthPaths) {
    const url = `${API_ORIGIN}${path}`;
    try {
      const response = await axios.get(url, { timeout: 5000 });
      if (response.status >= 200 && response.status < 400) {
        return {
          ok: true,
          url,
          status: response.status,
          message: `Gymind.API is reachable at ${url}.`
        };
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("[Gymind] Health check failed:", url, error);
      }
    }
  }

  return {
    ok: false,
    message: __DEV__
      ? `Cannot reach Gymind.API at ${API_ORIGIN}. Open this URL on your phone browser: ${API_ORIGIN}/swagger. If it does not open, allow dotnet.exe or port 5156 in Windows Firewall.`
      : "Cannot connect to Gymind. Check your internet connection and try again."
  };
}
