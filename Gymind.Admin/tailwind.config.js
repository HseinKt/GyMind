/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#F7F8FA",
          sidebar: "#0F172A",
          primary: "#EA580C",
          primarySoft: "#FFF7ED",
          accent: "#22C55E",
          ink: "#111827",
          muted: "#6B7280",
          border: "#E5E7EB"
        }
      },
      boxShadow: {
        panel: "0 18px 50px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
