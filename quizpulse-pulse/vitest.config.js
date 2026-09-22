import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom', setupFiles: ['./tests/setup.js'], clearMocks: true, restoreMocks: true,
    coverage: {
      provider: 'v8', reporter: ['text', 'html', 'json-summary'],
      include: ['src/routes/*.{js,jsx}', 'src/hooks/*.js', 'src/ErrorBoundary.jsx'],
      // Scoped regression floors, not a claim of full app/browser coverage.
      thresholds: {
        statements: 77, lines: 77, branches: 84, functions: 85,
        'src/routes/Display.jsx': { statements: 72, lines: 72, branches: 83, functions: 80 },
        'src/hooks/*.js': { statements: 100, lines: 100, branches: 90, functions: 93 },
      },
    },
  },
})
