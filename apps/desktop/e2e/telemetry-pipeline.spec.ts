import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Telemetry Pipeline', () => {
  test('mock data flows from SimManager -> IPC -> Store -> React component', async () => {
    test.setTimeout(60_000);
    // ── Collect console errors ──────────────────────────────────────
    const consoleErrors: string[] = [];

    // ── Launch Electron app ─────────────────────────────────────────
    // Requires `pnpm build` to have been run first so dist/main/index.js exists.
    // The Playwright webServer (vite.renderer.config.ts) must be running on port 3000.
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'dist', 'main', 'index.js')],
      env: { ...process.env, E2E_TEST: '1' },
    });

    const window = await electronApp.firstWindow();

    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    window.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    await window.waitForLoadState('domcontentloaded');

    // ── 1. DEMO MODE badge ──────────────────────────────────────────
    // Verifies: SimManager.activateMock() → IPC 'sim-state' →
    // TelemetryBridge → setIsMock(true) → App shows DEMO MODE badge
    await expect(
      window.locator('text=DEMO MODE'),
      'DEMO MODE badge should appear — proves mock state flows through IPC → Store → React',
    ).toBeVisible({ timeout: 10000 });

    // ── 2. Telemetry data visible ───────────────────────────────────
    // Verifies: SimManager telemetry push (62ms) → IPC 'telemetry' →
    // TelemetryBridge → setTelemetry(data) → App renders SIM + RPM
    await expect(
      window.locator('text=SIM:'),
      'Telemetry indicator (SIM: …) should appear — proves data flows through IPC → Store → React',
    ).toBeVisible({ timeout: 10000 });

    // ── 3. RPM value is a positive number ───────────────────────────
    // Mock telemetry ticks every 62ms; wait for a non-idle frame.
    await expect
      .poll(async () => {
        const telemetryText = await window.locator('text=SIM:').textContent();
        const rpmMatch = telemetryText?.match(/RPM:\s*(\d+)/i);
        return rpmMatch ? Number(rpmMatch[1]) : 0;
      }, { timeout: 10_000 })
      .toBeGreaterThan(0);

    // ── 4. No console errors during startup ─────────────────────────
    expect(consoleErrors).toHaveLength(0);

    // ── Cleanup ────────────────────────────────────────────────────
    await electronApp.close();
  });
});
