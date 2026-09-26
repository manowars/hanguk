import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

// `npm run build:android` sets CAPACITOR=1: the app is served from the APK root, without a service worker.
const android = process.env.CAPACITOR === "1";

export default defineConfig({
  base: android ? "./" : "/hanguk/",
  plugins: [
    preact(),
    VitePWA({
      disable: android,
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Hanguk",
        short_name: "Hanguk",
        description: "Luyện tiếng Hàn cho giảng dạy, thuyết trình, thảo luận",
        lang: "vi",
        display: "standalone",
        start_url: "/hanguk/",
        background_color: "#0f1115",
        theme_color: "#0f1115",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
