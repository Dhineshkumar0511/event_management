import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Node.js built-ins that xlsx and similar packages reference.
// These code paths are never executed in the browser — they're dead
// server-only branches. We stub them so the browser bundle resolves cleanly.
const NODE_BUILTINS = [
  'fs', 'path', 'crypto', 'stream', 'os', 'net', 'tls',
  'http', 'https', 'zlib', 'events', 'util', 'buffer',
  'assert', 'url', 'querystring', 'string_decoder', 'child_process',
  'worker_threads', 'cluster', 'dns', 'readline',
]

const stubNodeBuiltins = {
  name: 'stub-node-builtins',
  resolveId(id) {
    const bare = id.startsWith('node:') ? id.slice(5) : id
    if (NODE_BUILTINS.includes(bare)) return '\0node-stub:' + bare
  },
  load(id) {
    if (id.startsWith('\0node-stub:')) {
      return 'export default {}; export const readFileSync = () => null; export const writeFileSync = () => {}; export const existsSync = () => false; export const createReadStream = () => ({}); export const createWriteStream = () => ({}); export const randomBytes = () => new Uint8Array(0);'
    }
  },
}

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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      plugins: [stubNodeBuiltins],
      onwarn(warning, warn) {
        // Silence the "externalize" warning — our stub plugin handles these
        if (
          warning.code === 'UNRESOLVED_IMPORT' ||
          warning.message?.includes('externalize')
        ) return
        warn(warning)
      },
    },
  },
})
