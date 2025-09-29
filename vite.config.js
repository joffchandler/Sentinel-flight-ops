import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If your repo name is different, change the string below to: '/<your-repo-name>/'
export default defineConfig({
  plugins: [react()],
  base: '/Sentinelsky-flight-ops/'
})
