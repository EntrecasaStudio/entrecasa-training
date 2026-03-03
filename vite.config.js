import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  root: '.',
  publicDir: 'public',
  base: command === 'build' ? '/treiner/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@js': resolve(__dirname, './src/js'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3002,
    open: false,
  },
}));
