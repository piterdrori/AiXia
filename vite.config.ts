import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { agentOpsApiDevPlugin } from "./scripts/agentops-api-dev-plugin"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [agentOpsApiDevPlugin(), inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    /** Fixed port so browser QA and bookmarks always match (see scripts/dev-server-utils.mjs). */
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
});
