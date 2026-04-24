// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable cloudflare plugin for Vercel
  cloudflare: false,
  // Configure TanStack Start for Vercel
  tanstackStart: {
    server: {
      preset: "vercel",
    },
  },
  vite: {
    server: {
      allowedHosts: [
        "ts4.zocomputer.io",
        "zocomputer.io",
        ".zocomputer.io",
        ".zo.computer",
      ],
    },
  },
});
