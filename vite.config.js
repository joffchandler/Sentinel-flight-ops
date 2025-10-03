import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: replace with your repo name (case-sensitive)
export default defineConfig({
  plugins: [react()],
  base: '/Sentinel-flight-ops/'
})
