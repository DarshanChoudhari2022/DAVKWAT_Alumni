import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The `@/` alias mirrors the `paths` entry in tsconfig.json (`"@/*": ["./*"]`),
// resolving to the project root so imports like `@/lib/...` work in tests.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  test: {
    // jsdom powers render/snapshot tests via @testing-library/react.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist', 'test/e2e/**'],
  },
});
