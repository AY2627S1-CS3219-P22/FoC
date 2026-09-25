import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@database': path.resolve(__dirname, 'src/database'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
    },
  },
});
