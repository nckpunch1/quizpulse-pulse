import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom', setupFiles: ['./tests/setup.js'], clearMocks: true, restoreMocks: true,
    coverage: {
      provider: 'v8', reporter: ['text', 'html', 'json-summary'],
      include: ['src/routes/*.{js,jsx}', 'src/hooks/*.js', 'src/ErrorBoundary.jsx', 'src/App.jsx', 'src/lib/*.js'],
      // Scoped regression floors, not a claim of full app/browser coverage.
      thresholds: {
        statements: 94, lines: 94, branches: 89, functions: 95,
        'src/routes/Display.jsx': { statements: 92, lines: 92, branches: 88, functions: 96 },
        'src/hooks/*.js': { statements: 100, lines: 100, branches: 90, functions: 93 },
        // Routes, and the environment guard (docs/environment-separation.md).
        '{src/App.jsx,src/lib/*.js}': { statements: 100, lines: 100, branches: 94, functions: 100 },
      },
    },
  },
})
