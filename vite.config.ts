import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/hanguk/",
  plugins: [
    preact(),
    VitePWA({
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
