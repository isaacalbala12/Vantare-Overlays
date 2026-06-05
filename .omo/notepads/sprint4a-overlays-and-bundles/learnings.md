# Sprint 4a: Overlays and Bundles - Learnings

## [2025-06-03] Task: T0 auto-scroll fix
- Used HTMLTableRowElement not HTMLDivElement for player row ref (it's a <tr>)
- Wrapped GlassPanel in <div ref={containerRef}> since GlassPanel mock doesn't forward refs
- scrollIntoView mock on Element.prototype works in JSDOM
- Tests use maxRows={30} to ensure all positions are in DOM
- Mocked Element.prototype.getBoundingClientRect with position-based top values to simulate viewport checks
- @testing-library/react was missing from devDependencies, had to install it

## [2025-06-03 12:58] Task: T1 bundle infrastructure
- Bundle registry uses Map<string, Promise<Bundle>> for in-flight dedup — concurrent loadBundle('default') calls return the exact same Promise.
- Theme is hardcoded 'default' for Sprint 4a, with `// TODO(sprint-4b)` marker for the IPC-driven electron-store wiring.
- Used `ComponentType<any>` in `Bundle.components` because each overlay accepts different props (Standings needs `{ telemetry, maxRows }`, Relative needs `{ telemetry }`, placeholders take nothing). The `as any` cast at the placeholder site (delta, stream-alerts → Standings) keeps the manifest shape complete for T3/T5 to replace.
- 5 empty placeholder directories deleted: `overlays/delta/`, `overlays/stream-alerts/`, `overlays/standings/`, `overlays/relative/`, `hub/pages/`. The leftover `overlays/__tests__/` was also deleted (only contained the now-moved OverlayShell.test.tsx).
- File moves use `git mv` to preserve history. All 8 renames show as `R` in `git status --short` and `100%` similarity in the diff stat — history is clean.
- Standings.test.tsx and Relative.test.tsx moved with their component files (no path adjustment needed for `'../Standings'` / `'../Relative'` since the relative siblings stayed together).
- The `__fixtures__/mock-telemetry-seeder.test.ts` test was also moved alongside the seeder; placed under a nested `__fixtures__/__tests__/` so the typecheck's `**/__tests__/**` exclude glob continues to skip it. Sibling-of-source placement would have broken the exclude and surfaced implicit-any errors.
- OverlayShell test mocks the bundle registry directly (`vi.mock('../registry', ...)`) — fully decoupled from the actual file structure under `bundles/default/`. This is the right pattern for testing the shell's routing logic.
- Storybook stories glob updated from `overlays/**` to `{overlays,bundles}/**` so stories from the new bundle locations are discovered.
- TDD cycle verified: registry test failed with `Failed to resolve import "../registry"` (RED), then 4/4 passed after implementing registry + types + manifest (GREEN).
- All 150 tests pass (was 145 + 4 new registry tests + 1 moved seeder test). The seeder test was previously hidden from the suite count because the test was discovered via the `__tests__` glob — after the move the count went up by one.
- T0's auto-scroll changes (useRef<HTMLTableRowElement>, useEffect chain) survived the move untouched thanks to `git mv` — no content rewrite needed.

## [2025-06-03 13:23] Task: T5 Stream Alerts UI
- Single alert visible at a time, auto-dismiss after 5s (`ALERT_DISMISS_MS = 5000` constant), click to dismiss, fade-in animation via `hf-fade-in` class from animations.css.
- Subscribes to `useAlertsStore` via selector `useAlertsStore((s) => s.currentAlert)` — never `.getState()` in render. Re-render driven by the selector triggers when the store shifts the queue.
- `useEffect([currentAlert, dismissCurrent])` with `setTimeout` for auto-dismiss; cleanup function calls `clearTimeout` so unmount or alert change cancels the pending timer cleanly.
- Queue semantics: `dismissCurrent()` shifts `queue[0]` into `currentAlert`; the component re-renders and the new alert restarts the 5s timer (because the dep array includes `currentAlert`).
- GlassPanel wrapper for visual consistency with other overlays; outer `div.stream-alert-shell` carries the `data-testid="stream-alert"`, click handler, `data-alert-type`, and the `hf-fade-in` class so the full alert area is clickable (not just the inner content).
- Type-only `Alert` import uses `AlertType` from the same `shared/types/alerts` module — `getAlertLabel(alert.type)` is a pure switch on the discriminated union.
- Test file uses vanilla vitest matchers (`toBeTruthy()`, `toBeNull()`, `.toContain('hf-fade-in')` on className) instead of `@testing-library/jest-dom` matchers like `toBeInTheDocument` — the project has no `jest-dom` setup file and "no new dependencies" was a hard constraint. Also follows the existing DeltaBar pattern of manual `cleanup()` in `afterEach`.
- Relative path convention: the test file at `__tests__/StreamAlerts.test.tsx` needs **4** `../` to reach `renderer/shared/`, while the component at `stream-alerts/StreamAlerts.tsx` only needs **3** `../` — the test is one directory deeper. The original spec's `../../../../shared/...` was right for the test, wrong for the component.
- Bundle manifest (`apps/desktop/src/renderer/bundles/default/index.ts`) no longer needs the `'stream-alerts': Standings as any` placeholder + `TODO(sprint-4a-t5)` comment — replaced with the real `StreamAlerts` import and binding.
- TDD red→green cycle verified: test file alone failed with `Failed to resolve import "../StreamAlerts"` (RED), then after implementation failed with `Failed to resolve import "../../../../shared/..."` (path typo in spec), fixed to `../../../shared/...` for the component and 6/6 tests passed (GREEN).
- All 178 tests pass (was 172 + 6 new StreamAlerts tests). `tsc --noEmit` returns 0 errors. `lsp_diagnostics` clean on both new files and the updated manifest.
- Commit: `366190f feat(overlays): add Stream Alerts overlay with auto-dismiss and queue` (4 files, +205/-3).

## [2025-06-03 13:31] Task: T7 Integration
- T7 turned out to be a pure verification task — the entire integration surface was already wired by T0–T5.
- `OverlayManager.registerDefaults()` at `apps/desktop/src/main/windows/overlay-manager.ts:21-26` already registers all 4 overlays (`standings`, `relative`, `delta`, `stream-alerts`) with the correct `id`, `name`, and `(x, y, width, height)` window rect. The `delta` (400×80) and `stream-alerts` (400×80) sit below the two 400×600 main overlays. No code change.
- `HttpServer` at `apps/desktop/src/main/server/http-server.ts:52-61` uses a **generic** `/overlays/:id` regex (`/^\/overlays\/(.+)$/`) that captures the overlay id and pipes it into `renderOverlayPage(overlayId)`, which injects `?overlay=${id}` into the served HTML's URL bar. This means `delta` and `stream-alerts` are served automatically without any per-route registration. No code change. The 7 existing `http-server.test.ts` tests still pass.
- `OverlayShell.tsx` `ROUTABLE_OVERLAYS` const (lines 9-14) already lists all 4 keys, and `bundle.components[overlayId]` (line 70) is fully populated by the real `bundles/default/index.ts` manifest — no placeholders remain. No code change.
- The only real edit: `apps/desktop/src/renderer/bundles/__tests__/OverlayShell.test.tsx` had stale `(placeholder)` wording in the two test names + a comment claiming the manifest mapped `delta` to a placeholder. Both were updated to reflect the current state (real DeltaBar/StreamAlerts components). Diff: +6 / -4.
- Did NOT touch `bundles/types.ts` even though its JSDoc still mentions "the placeholders take nothing" — the broader reasoning (each overlay has different props, so `ComponentType<any>` is the right call) is still correct, and out-of-scope for a verification task. Note for T8/T9 docs cleanup.
- Verification: `pnpm --filter @vantare/desktop typecheck` → 0 errors. `pnpm --filter @vantare/desktop test` → 178/178 pass across 20 files (12.38s). The 8 OverlayShell tests cover all 4 routes. The 7 http-server tests cover the generic overlay route handler. The pre-existing `act(...) not configured` stderr noise from vitest is unrelated (no global act setup; the test still passes because React 19's `act` falls back to a noop warning).
- Commit: `38ad1a6 feat(overlays): wire Delta Bar and Stream Alerts into OverlayManager + HttpServer` (1 file, +6/-4).

