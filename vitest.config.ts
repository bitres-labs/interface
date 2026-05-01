import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'e2e/**', '**/e2e/**', '**/tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true, // Include all files, not just imported ones
      include: ['src/**/*.{ts,tsx}'], // Include all source code
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types.ts',
        '**/*.d.ts',
        'src/abis/',
        'src/main.tsx',
        'src/App.tsx',
        'src/vite-env.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
