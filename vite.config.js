import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

/** Plugin: inject build hash into sw.js so cache busts on every deploy */
function swVersionPlugin() {
  return {
    name: 'sw-version',
    writeBundle({ dir }) {
      const swPath = resolve(dir, 'sw.js');
      try {
        let sw = readFileSync(swPath, 'utf-8');
        const hash = Date.now().toString(36);
        sw = sw.replace(/gym-app-v\d+/, `gym-app-${hash}`);
        writeFileSync(swPath, sw);
        console.log(`[sw-version] Cache name → gym-app-${hash}`);
      } catch {}
    },
  };
}

export default defineConfig(({ command }) => ({
  root: '.',
  publicDir: 'public',
  base: command === 'build' ? '/entrecasa-training/' : '/',
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
  plugins: [swVersionPlugin()],
  server: {
    port: 3002,
    open: false,
  },
}));
