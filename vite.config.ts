import { fileURLToPath, URL } from 'node:url'
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: [
      "cb48-38-134-138-249.ngrok-free.app",
      "localhost",
      "127.0.0.1",
      "sweth.winks.fun"
    ]
  }
})
