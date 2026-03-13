/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import { fileURLToPath, URL } from 'node:url'

const getRemoteUrl = (envKey: string, port: number) => {
  const env = process.env[envKey]
  if (env && typeof env === 'string' && env.trim()) return `${env.trim()}/assets/remoteEntry.js`
  return `http://localhost:${port}/assets/remoteEntry.js`
}

export default defineConfig(({ command }) => {
  const useLocalhost = command === 'serve'
  return {
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        auth: useLocalhost ? 'http://localhost:5174/assets/remoteEntry.js' : getRemoteUrl('VITE_REMOTE_AUTH_URL', 5174),
        user: useLocalhost ? 'http://localhost:5175/assets/remoteEntry.js' : getRemoteUrl('VITE_REMOTE_USER_URL', 5175),
        company: useLocalhost ? 'http://localhost:5176/assets/remoteEntry.js' : getRemoteUrl('VITE_REMOTE_COMPANY_URL', 5176),
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    pool: 'threads',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  }
})
