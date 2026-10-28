import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    setupFiles: ['./tests/setup.js'],
  },
  resolve: {
    alias: {
      'socket.io-client': path.resolve(__dirname, '../client/node_modules/socket.io-client/build/esm/index.js'),
    },
  },
});
