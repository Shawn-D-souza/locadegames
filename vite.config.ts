import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { soundFiles } from "./scripts/soundFilesPlugin.ts";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

/** Local `wrangler dev` Worker that `/api` is forwarded to during `npm run dev:web`. */
const DEV_SERVER = { target: "http://localhost:8787", origin: "http://localhost:5173" } as const;

export default defineConfig({
  root: "src/web",
  envDir: projectRoot,
  plugins: [react(), tailwindcss(), soundFiles()],
  server: {
    // Same-origin `/api` in dev, so phones on the LAN (`--host`) reach the Worker too.
    proxy: {
      "/api": {
        target: DEV_SERVER.target,
        ws: true,
        // The Worker only allows listed origins; LAN addresses vary, so present the local one.
        headers: { origin: DEV_SERVER.origin },
      },
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist/web", import.meta.url)),
    emptyOutDir: true,
  },
});
