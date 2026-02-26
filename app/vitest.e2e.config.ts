import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['../tests/e2e/staging/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    sequence: { concurrent: false },
  },
});
