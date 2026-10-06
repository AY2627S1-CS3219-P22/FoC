import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/users/': { target: env.USER_SERVICE_URL || 'http://localhost:3001', changeOrigin: true, rewrite: path => path.replace(/^\/api\/users/, '') },
        '/api/suppliers/': { target: env.SUPPLIER_SERVICE_URL || 'http://localhost:3002', changeOrigin: true, rewrite: path => path.replace(/^\/api\/suppliers/, '') },
      },
    },
  }
})
