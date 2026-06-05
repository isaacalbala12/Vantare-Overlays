import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      '@vantare/ui-core': path.resolve(__dirname, '../../packages/ui-core/src'),
      '@vantare/sim-core': path.resolve(__dirname, '../../packages/sim-core/src'),
      '@vantare/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@vantare/auth/feature-gate': path.resolve(__dirname, '../../packages/auth/src/feature-gate.ts'),
      '@vantare/auth/types': path.resolve(__dirname, '../../packages/auth/src/types.ts'),
      '@vantare/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  server: {
    port: 3000,
  },
});
