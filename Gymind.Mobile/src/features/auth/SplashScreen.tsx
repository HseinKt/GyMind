import { useEffect } from "react";
import { router } from "expo-router";
import { LoadingState } from "@/components/ui/LoadingState";
import { checkApiHealth } from "@/api/healthApi";
import { getMe } from "@/api/authApi";
import { useAuthStore } from "@/auth/authStore";
import { clearTokens, getAccessToken } from "@/auth/tokenStorage";
import { colors } from "@/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";

export function SplashScreen() {
  const setUser = useAuthStore((state) => state.setUser);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        useAuthStore.getState().setAuthError(null);
        const health = await checkApiHealth();
        if (!health.ok) {
          console.warn("[Gymind] API health check failed.", health.message);
          useAuthStore.getState().setAuthError(health.message);
          setUser(null);
          router.replace("/login");
          return;
        }

        const token = await getAccessToken();
        if (!token) {
          setUser(null);
          router.replace("/login");
          return;
        }

        const user = await getMe();
        if (!alive) return;
        if (user.role !== "Member") {
          try {
            await clearTokens();
          } catch (error) {
            console.warn("Token cleanup failed during splash.", error);
          }
          useAuthStore.getState().setAuthError("This app is only for gym members.");
          setUser(null);
          router.replace("/login");
          return;
        }
        setUser(user);
        router.replace("/tabs/home");
      } catch {
        try {
          await clearTokens();
        } catch (error) {
          console.warn("Token cleanup failed during splash.", error);
        }
        setUser(null);
        router.replace("/login");
      } finally {
        if (alive) setBootstrapped(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setBootstrapped, setUser]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
      <LoadingState label="Preparing your member app" />
    </SafeAreaView>
  );
}
