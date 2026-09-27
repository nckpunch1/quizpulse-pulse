import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import process from 'node:process'

// Which deployment this build is for: VITE_DEPLOY_ENV if set, else Vercel's own
// VERCEL_ENV (production | preview | development), else a local build. The
// Firebase environment guard (src/lib/firebaseEnvGuard.js) reads it.
const deployEnv = process.env.VITE_DEPLOY_ENV || process.env.VERCEL_ENV || 'local'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEPLOY_ENV': JSON.stringify(deployEnv)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})