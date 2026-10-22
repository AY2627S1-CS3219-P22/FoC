// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Connected approved Order UI/API flow; author review pending.
// Prompts and verification: ../order-service/usage-log.md.
import { loadEnv, defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// /backend/* calls are forwarded to the backend services (avoids CORS in dev)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // refresh cookie is set on Path=/users, so remap it or the browser never sends it back
        "/backend/orders": {
          target: env.ORDER_SERVICE_URL || "http://localhost:3003",
          rewrite: (p) => p.replace(/^\/backend/, ""),
        },
        "/backend/credits": {
          target: env.CREDIT_SERVICE_URL || "http://localhost:3004",
          rewrite: (p) => p.replace(/^\/backend/, ""),
        },
        "/backend/users": {
          target: env.USER_SERVICE_URL || "http://localhost:3001",
          rewrite: (p) => p.replace(/^\/backend/, ""),
          cookiePathRewrite: { "/users": "/backend/users" },
        },
        "/backend/suppliers": {
          target: env.SUPPLIER_SERVICE_URL || "http://localhost:3002",
          rewrite: (p) => p.replace(/^\/backend/, ""),
        },
        "/backend/supplier": {
          target: env.SUPPLIER_SERVICE_URL || "http://localhost:3002",
          rewrite: (p) => p.replace(/^\/backend/, ""),
        },
      },
    },
  }
})
