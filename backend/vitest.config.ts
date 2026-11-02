import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    // Integrationstests deler én database, så filerne må ikke køre samtidig.
    fileParallelism: false,
  },
});
