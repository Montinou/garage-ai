import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/tests/e2e/**', // Exclude Playwright E2E tests
      '**/*.e2e.test.*',
      '**/*.playwright.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/build/**',
        '**/.next/**',
        'pages/_app.tsx',
        'pages/_document.tsx',
        'components/ui/**', // Exclude shadcn/ui components from coverage
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        // Higher thresholds for critical components
        'agents/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'pages/api/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '~/': resolve(__dirname, './')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});