import path from 'node:path';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: {
    '@': path.resolve(import.meta.dirname, 'src'),
    '@database': path.resolve(import.meta.dirname, 'src/database'),
    '@data': path.resolve(import.meta.dirname, 'src/data'),
    '@api': path.resolve(import.meta.dirname, 'src/api'),
  } },
  test: { environment: 'node', include: ['tests/unit/authorization.test.ts'] },
});
