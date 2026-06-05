import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      '@vantare/ui-core': path.resolve(__dirname, '../../packages/ui-core/src'),
      '@vantare/sim-core': path.resolve(__dirname, '../../packages/sim-core/src'),
      '@vantare/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@vantare/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  build: {
    outDir: 'dist/main',
    emptyOutDir: true,
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['electron', 'electron-store', 'electron-log', 'electron-updater'],
    },
  },
});
