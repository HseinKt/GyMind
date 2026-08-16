import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-router-dom": "/src/vendor/reactRouterDom.tsx",
      "lucide-react": "/src/vendor/lucideReact.tsx",
      "react-hook-form": "/src/vendor/reactHookForm.ts",
      "recharts": "/src/vendor/recharts.tsx"
    }
  },
  server: {
    port: 5173
  }
});
