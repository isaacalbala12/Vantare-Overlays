import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: path.resolve(__dirname, "src/main/index.ts"),
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: "dist/main",
            emptyOutDir: true,
            rollupOptions: {
              external: ["electron", "electron-store", "electron-log", "electron-updater"],
            },
          },
        },
      },
      {
        entry: path.resolve(__dirname, "src/preload/index.ts"),
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: "dist/preload",
            emptyOutDir: true,
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/renderer/index.html"),
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../shared"),
    },
  },
  server: {
    port: 3000,
  },
});
