import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Cloudflare Workers build (replaces the old @lovable.dev/vite-tanstack-config wrapper).
// `cloudflare()` wires the SSR build/dev-server to the Workers runtime (see wrangler.jsonc),
// `tanstackStart()` keeps our custom SSR entry at src/server.ts, and tailwindcss/tsConfigPaths
// restore the two build-time features the old wrapper used to provide for free.
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
