import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Sprint 5b LMU Hub smoke', () => {
  test('inspector route loads and sim list includes lmu', async () => {
    test.setTimeout(60_000);
    const consoleErrors: string[] = [];

    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'dist', 'main', 'index.js')],
      env: { ...process.env, E2E_TEST: '1' },
    });

    const window = await electronApp.firstWindow();

    window.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    window.on('pageerror', (error) => consoleErrors.push(error.message));

    await window.waitForLoadState('domcontentloaded');

    await expect(window.getByTestId('hub-sidebar')).toBeVisible({ timeout: 15_000 });
    await expect(window.getByTestId('sidebar-inspector')).toBeVisible({ timeout: 10_000 });
    await window.getByTestId('sidebar-inspector').click();
    await expect(window.getByTestId('telemetry-inspector-page')).toBeVisible({ timeout: 10000 });

    await window.getByTestId('sim-switcher-trigger').click();
    await expect(window.getByTestId('sim-option-lmu')).toBeVisible({ timeout: 5000 });

    expect(consoleErrors).toHaveLength(0);

    await electronApp.close();
  });
});
