export const colors = {
  background: "#121318",       // Deep rich obsidian charcoal, soft on eyes
  card: "#1C1D24",             // Sleek dark grey/blue container
  surface: "#1C1D24",
  surface2: "#282A35",          // Highlight container color
  secondary: "#64748B",
  primary: "#FF6B00",          // Premium warm energetic orange
  primaryDark: "#E05E00",
  success: "#10B981",          // Premium emerald green
  warning: "#F59E0B",          // Warm amber
  danger: "#EF4444",           // Rose red
  text: "#F8FAFC",             // Soft off-white to prevent glare
  muted: "#94A3B8",            // Slate secondary text
  border: "rgba(255, 107, 0, 0.15)", // Subtle brand glow border
  warm: "#E2E8F0",
  dark: "#121318",
  black: "#0A0B0D",
  white: "#FFFFFF"
} as const;

export const lightColors = {
  ...colors,
  background: "#FAF9F6",       // Premium soft warm alabaster white
  card: "#FFFFFF",             // Pure white cards for depth
  surface: "#FFFFFF",
  surface2: "#F1F3F5",         // Subtle light grey container
  text: "#1E293B",             // Soft slate dark text, avoiding stark black
  muted: "#475569",            // Highly readable slate secondary text
  border: "#E2E8F0",           // Soft border
  warm: "#334155",             // High-contrast slate text
  dark: "#FFFFFF",
  black: "#1E293B"
} as const;
