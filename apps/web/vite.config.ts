import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))
// Shared env lives at the monorepo root so client and server read one file.
const envDir = path.resolve(dirname, '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  // `||`, not `??`: an unset-but-present var reads as '' and would proxy nowhere.
  const serverUrl =
    env.VITE_SERVER_URL?.trim() || env.SERVER_URL?.trim() || 'http://localhost:4000'

  return {
    envDir,
    plugins: [
      // Must come before @vitejs/plugin-react.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Same-origin in dev: the browser talks to :5173 only, so auth cookies
      // stay first-party and no cross-site CORS/SameSite gymnastics are needed.
      proxy: {
        '/api': {
          target: serverUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
