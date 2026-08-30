import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackStartVite } from '@tanstack/start/vite'

export default defineConfig({
  plugins: [
    react(),
    TanStackStartVite(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})