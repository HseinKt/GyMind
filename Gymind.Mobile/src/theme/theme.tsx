import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";
import { colors, lightColors } from "./colors";

export type ThemePreference = "system" | "dark" | "light";
type ColorTokens = { [Key in keyof typeof colors]: string };
export type ForgeTheme = ColorTokens & {
  mode: "dark" | "light";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  glow: string;
  overlay: string;
};

const storageKey = "gymind.theme.preference";

const ThemeContext = createContext<ForgeTheme | null>(null);

export function ForgeThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((value) => {
      if (value === "system" || value === "dark" || value === "light") setPreferenceState(value);
    }).catch(() => undefined);
  }, []);

  const setPreference = async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(storageKey, next);
  };

  const mode = resolveMode(preference, system);
  const value = useMemo<ForgeTheme>(() => ({
    ...(mode === "light" ? lightColors : colors),
    mode,
    preference,
    setPreference,
    glow: mode === "light" ? "rgba(252,106,10,0.20)" : "rgba(252,106,10,0.28)",
    overlay: mode === "light" ? "rgba(255,255,255,0.84)" : "rgba(10,10,10,0.70)"
  }), [mode, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useForgeTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useForgeTheme must be used inside ForgeThemeProvider");
  return theme;
}

function resolveMode(preference: ThemePreference, system: ColorSchemeName): "dark" | "light" {
  if (preference === "light") return "light";
  if (preference === "system") return system === "light" ? "light" : "dark";
  return "dark";
}
