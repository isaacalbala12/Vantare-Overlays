import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Telemetry Pipeline', () => {
  test('mock data flows from SimManager -> IPC -> Store -> React component', async () => {
    // ── Collect console errors ──────────────────────────────────────
    const consoleErrors: string[] = [];

    // ── Launch Electron app ─────────────────────────────────────────
    // Requires `pnpm build` to have been run first so dist/main/index.js exists.
    // The Playwright webServer (vite.renderer.config.ts) must be running on port 3000.
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'dist', 'main', 'index.js')],
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
    // Verifies the player sub-field is populated correctly from mock data
    const telemetryText = await window.locator('text=SIM:').textContent();
    expect(telemetryText).toMatch(
      /SIM:\s*iracing.*RPM:\s*\d+/i,
      'Should display "SIM: iracing | RPM: <number>"',
    );

    const rpmMatch = telemetryText?.match(/RPM:\s*(\d+)/i);
    expect(rpmMatch).not.toBeNull();
    const rpmValue = Number(rpmMatch![1]);
    expect(rpmValue).toBeGreaterThan(0);

    // ── 4. No console errors during startup ─────────────────────────
    expect(consoleErrors).toHaveLength(0);

    // ── Cleanup ────────────────────────────────────────────────────
    await electronApp.close();
  });
});
