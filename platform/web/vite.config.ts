import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    target: "es2022",
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    exclude: ["@tetrio/mobile-core"],
  },
  worker: {
    format: "es",
  },
});