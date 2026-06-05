import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  workers: 1,

  webServer: {
    command: 'npx vite --config vite.renderer.config.ts --port 3000 --strictPort',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30000,
  },

  use: {
    trace: 'on-first-retry',
  },
});
