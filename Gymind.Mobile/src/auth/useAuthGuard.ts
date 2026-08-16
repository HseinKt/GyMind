import { useEffect } from "react";
import { router, useSegments } from "expo-router";
import { getMe } from "@/api/authApi";
import { clearTokens, getAccessToken } from "./tokenStorage";
import { useAuthStore } from "./authStore";

export function useAuthGuard() {
  const user = useAuthStore((state) => state.user);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const setUser = useAuthStore((state) => state.setUser);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);
  const segments = useSegments();

  useEffect(() => {
    if (bootstrapped) return;

    let alive = true;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (alive) setUser(null);
          return;
        }

        const currentUser = await getMe();
        if (!alive) return;
        if (currentUser.role !== "Member") {
          await clearTokens();
          setUser(null);
          useAuthStore.getState().setAuthError("This app is only for gym members.");
          return;
        }

        setUser(currentUser);
      } catch {
        await clearTokens();
        if (alive) setUser(null);
      } finally {
        if (alive) setBootstrapped(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bootstrapped, setBootstrapped, setUser]);

  useEffect(() => {
    if (!bootstrapped) return;
    const firstSegment = segments[0] as string | undefined;
    const inPublic = firstSegment === "login" || firstSegment === undefined;
    if (!user && !inPublic) router.replace("/login");
    if (user && inPublic) router.replace("/tabs/home");
  }, [bootstrapped, segments, user]);

  const firstSegment = segments[0] as string | undefined;
  const isPublic = firstSegment === "login" || firstSegment === undefined;
  return !isPublic && (!bootstrapped || !user);
}
