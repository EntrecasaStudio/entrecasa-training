import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/** Recursively list all files in a directory */
function listFiles(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...listFiles(full, base));
    } else {
      results.push('/' + relative(base, full));
    }
  }
  return results;
}

/**
 * Plugin: inject build hash + asset manifest into sw.js.
 * - Replaces CACHE_NAME with unique build hash
 * - Replaces __PRECACHE_MANIFEST__ with full list of built assets
 */
function swVersionPlugin() {
  return {
    name: 'sw-version',
    writeBundle({ dir }) {
      const swPath = resolve(dir, 'sw.js');
      try {
        let sw = readFileSync(swPath, 'utf-8');
        const hash = Date.now().toString(36);

        // Collect all built assets for precaching
        const allFiles = listFiles(dir).filter((f) =>
          !f.endsWith('sw.js') && !f.includes('.DS_Store')
        );
        const base = '/entrecasa-training';
        const manifest = allFiles.map((f) => `'${base}${f}'`).join(',\n  ');

        sw = sw.replace(/'__BUILD_HASH__'/, `'gym-app-${hash}'`);
        sw = sw.replace(/'__PRECACHE_MANIFEST__'/, `[\n  ${manifest}\n]`);
        writeFileSync(swPath, sw);
        console.log(`[sw-version] Cache gym-app-${hash} — ${allFiles.length} assets precached`);
      } catch (e) {
        console.warn('[sw-version] Error:', e.message);
      }
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
