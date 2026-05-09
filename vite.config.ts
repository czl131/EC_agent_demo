import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/EC_agent_demo/',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
})
