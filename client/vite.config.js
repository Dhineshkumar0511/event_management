import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    // Raise chunk size warning threshold (1223 kB bundle was triggering it)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // Suppress warnings about Node.js built-in modules being referenced
      // by browser-incompatible code paths inside packages like xlsx.
      // These code paths are never executed in the browser — they are dead
      // branches that Rollup flags but cannot actually break the runtime.
      onwarn(warning, warn) {
        if (
          warning.code === 'UNRESOLVED_IMPORT' ||
          (warning.message && warning.message.includes('externalize'))
        ) return
        warn(warning)
      },
    },
  },
})
