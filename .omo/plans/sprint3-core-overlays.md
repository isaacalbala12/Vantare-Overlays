# Sprint 3 — Core Overlays

## TL;DR

> **Quick Summary**: Wire the Standings and Relative overlays through the existing OverlayManager, HttpServer (native http), and IPC pipeline with SSE telemetry delivery, Zod config schemas, and Storybook documentation.
> 
> **Deliverables**:
> - OverlayManager wired to IPC handlers + dev URL fix
> - HttpServer completes: telemetry broadcast, overlay SPA pages, health endpoint, SSE hello frame
> - Vite single-entry with `?overlay=id` query param routing
> - OverlayShell component (routes to correct overlay)
> - Standings overlay (full feature: table, gaps, multiclass, player highlight)
> - Relative overlay (3 ahead/3 behind, gap interpolation, color coding)
> - Zod schemas for overlay config
> - Storybook setup + stories for Standings + Relative
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: Task 1 → Task 4 → Task 7 → Task 9 → Final Wave

---

## Context

### Original Request
Continuar Sprint 3 del roadmap: Core Overlays. Objetivo: Standings + Relative overlays funcionando en Electron windows y OBS Browser Source via HTTP server.

### Interview Summary
**Key Discussions**:
- **Routing**: `?overlay=id` query param — single Vite entry point
- **HTTP Server**: Mejorar HttpServer existente (native http, puerto 3200). NO Express (evitar rewrite).
- **Standings**: Full feature, multiclass con background coloreado + chip, player highlight via `isPlayer` flag
- **Relative**: Full feature, 3 ahead / 3 behind, gap interpolation, color coding
- **Storybook**: Setup + stories para Standings y Relative (3 estados cada uno)
- **Player ID**: `Telemetry.vehicles[].isPlayer` — funciona para cualquier sim

**Research Findings** (Metis + explore agents):
- `OverlayManager.ts` exists at `apps/desktop/src/main/windows/overlay-manager.ts` — show/hide/position/size registered, dev URL wrong
- `HttpServer.ts` exists at `apps/desktop/src/main/server/http-server.ts` — SSE at `/events`, overlay pages at `/overlays/:id`, port 3200, native http. Telemetry pipeline NOT connected, bundle.js doesn't exist
- Preload declares overlay IPC channels but `handlers.ts` has NO handlers for them
- `GlassPanel`, `TimeDisplay`, `PositionBadge`, `DeltaIndicator` exist in ui-core
- Zustand store ready with telemetry selectors

### Metis + Oracle Review
**Issues Addressed**:
- **Express vs native http**: Resolved — keep native http, no Express rewrite
- **Port**: Resolved — keep 3200 (existing), bind to 127.0.0.1
- **Test strategy**: Resolved — TDD for components, vitest + @testing-library/react, agent QA with curl/playwright
- **Storybook scope**: Resolved — setup + stories for Standings + Relative (3 states each)

---

## Work Objectives

### Core Objective
Wire the Standings and Relative overlays through the existing OverlayManager, HttpServer, and IPC pipeline with SSE telemetry delivery, Zod config schemas, and Storybook documentation.

### Concrete Deliverables
- `apps/desktop/src/main/windows/overlay-manager.ts` — Fixed dev URL + wired IPC handlers
- `apps/desktop/src/main/ipc/handlers.ts` — Overlay IPC handlers registered
- `apps/desktop/src/main/server/http-server.ts` — Completed: telemetry pipeline, overlay SPA pages, health, hello frame
- `apps/desktop/src/renderer/overlays/OverlayShell.tsx` — New: `?overlay=id` routing component
- `apps/desktop/src/renderer/overlays/Standings.tsx` — New: full standings overlay
- `apps/desktop/src/renderer/overlays/Relative.tsx` — New: full relative overlay
- `packages/ui-core/src/schemas/overlay-config.ts` — New: Zod schemas for overlay config
- Storybook setup + stories

### Definition of Done
- [ ] `pnpm build` — all packages build (5/5)
- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm test` — all tests pass (new + existing)
- [ ] Standings visible in Electron window at `?overlay=standings`
- [ ] Relative visible in Electron window at `?overlay=relative`
- [ ] SSE stream delivers telemetry via `http://127.0.0.1:3200/events`
- [ ] Overlay HTML served via `http://127.0.0.1:3200/overlays/standings`
- [ ] Storybook stories render Standings + Relative with mock data

### Must Have
- Standings overlay with full feature (table, gaps, multiclass, player highlight)
- Relative overlay with 3 ahead/3 behind, gap interpolation, color coding
- HTTP server serving overlays for OBS Browser Source
- OverlayManager creates transparent Electron windows on demand
- SSE telemetry stream broadcasting at telemetry rate
- Zod schemas validating overlay config before IPC apply
- Storybook stories for both overlays with 3 states each

### Must NOT Have (Guardrails)
- **NO Express rewrite** — keep native http module
- **NO Stream Alerts overlay feature** (Sprint 4)
- **NO Delta Bar overlay feature** (Sprint 4)
- **NO settings persistence UI** (Sprint 4+)
- **NO hot-reload for overlay config**
- **NO custom themes per overlay** (Sprint 6)
- **NO multi-monitor positioning** (Sprint 4+)
- **NO internationalization**
- **NO OBS dockable controls**
- **NO authentication for HTTP server** (local-only)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest in desktop + ui-core)
- **Automated tests**: TDD for new React components (Standings, Relative)
- **Framework**: vitest + @testing-library/react
- **If TDD**: RED (failing test) → GREEN (minimal impl) → REFACTOR for each overlay

### QA Policy
Every task MUST include agent-executed QA scenarios.
- **HTTP/SSE**: Bash (curl) — health endpoint, SSE events, overlay HTML pages
- **UI/Overlays**: Playwright — render overlays in Storybook, verify DOM structure
- **IPC/Electron**: Vitest with mocked ipcMain — verify handler registration and response

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — infrastructure, ALL PARALLEL):
├── Task 1: OverlayManager fix + IPC handlers wiring (quick)
├── Task 2: Complete HttpServer (telemetry pipeline, overlay pages, hello frame) (deep)
├── Task 3: Vite config + OverlayShell (?overlay=id routing) (quick)
├── Task 4: Zod schemas for overlay config (quick)
├── Task 5: Mock telemetry seeder (quick)
└── Task 6: Storybook initial setup (quick)

Wave 2 (After Wave 1 — overlays, MAX PARALLEL):
├── Task 7: Standings Overlay (visual-engineering)
└── Task 8: Relative Overlay (visual-engineering)

Wave 3 (After Wave 2 — integration):
├── Task 9: Storybook stories for Standings + Relative (writing)
└── Task 10: Integration verification + dev mode test (unspecified-high)

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
└── Task F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 3 → Task 7 → Task 9 → Final Wave
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 1)
```

### Agent Dispatch Summary

- **Wave 1**: **6** — T1→quick, T2→deep, T3→quick, T4→quick, T5→quick, T6→quick
- **Wave 2**: **2** — T7→visual-engineering, T8→visual-engineering
- **Wave 3**: **2** — T9→writing, T10→unspecified-high
- **FINAL**: **4** — F1→oracle, F2→unspecified-high, F3→unspecified-high, F4→deep

---

## TODOs

- [x] 1. Fix OverlayManager + Wire IPC Handlers

  **What to do**:
  - Fix dev URL in `overlay-manager.ts` line 61: change from `http://localhost:3000?overlay=${id}` to `http://localhost:3000/?overlay=${id}` (add trailing slash before ?)
  - Register IPC handlers in `handlers.ts`:
    - `ipcMain.handle('overlays:get-windows', ...)` → returns `overlayManager.getAll()`
    - `ipcMain.handle('overlays:show', (_, id) => ...)` → calls `overlayManager.show(id)`
    - `ipcMain.handle('overlays:hide', (_, id) => ...)` → calls `overlayManager.hide(id)`
    - `ipcMain.handle('overlays:set-position', (_, id, x, y) => ...)` → calls `overlayManager.setPosition(id, x, y)`
    - `ipcMain.handle('overlays:set-size', (_, id, w, h) => ...)` → calls `overlayManager.setSize(id, w, h)`
  - Import `OverlayManager` in `handlers.ts` (or use a ref pattern like `simManagerRef`)
  - Write TDD test FIRST: mock `OverlayManager`, verify each IPC handler calls the correct method with correct args
  - Files: `apps/desktop/src/main/windows/overlay-manager.ts`, `apps/desktop/src/main/ipc/handlers.ts`

  **Must NOT do**:
  - Don't add IPC channels beyond the preload contract
  - Don't change OverlayManager constructor or registerDefaults

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Tasks 7, 8 (overlays need IPC handlers)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/main/windows/overlay-manager.ts` — Existing manager with show/hide/position/size methods
  - `apps/desktop/src/main/ipc/handlers.ts:95-109` — Pattern: sim:available and sim:active handlers using simManagerRef
  - `apps/desktop/src/preload/index.ts:33-39` — Preload overlay IPC declarations

  **Acceptance Criteria**:
  - [ ] Test: ipcMain.handle('overlays:show') with id='standings' → calls OverlayManager.show('standings')
  - [ ] Test: ipcMain.handle('overlays:hide') with id='relative' → calls OverlayManager.hide('relative')
  - [ ] Test: ipcMain.handle('overlays:set-position') with id, x, y → calls OverlayManager.setPosition(id, x, y)
  - [ ] Test: ipcMain.handle('overlays:get-windows') → returns array with visible/hidden status
  - [ ] Test: All handlers return gracefully when overlayManagerRef is null (app startup race)
  - [ ] Verify dev URL changed from `?overlay=${id}` to `/?overlay=${id}`

  **QA Scenarios**:
  ```
  Scenario: IPC handlers invoke OverlayManager methods
    Tool: Bash (vitest with mocked ipcMain + OverlayManager)
    Preconditions: OverlayManager instantiated, handlers registered
    Steps:
      1. Invoke 'overlays:show' with id='standings'
      2. Assert OverlayManager.show('standings') was called
      3. Invoke 'overlays:hide' with id='relative'
      4. Assert OverlayManager.hide('relative') was called
      5. Invoke 'overlays:set-position' with id='standings', x=100, y=200
      6. Assert OverlayManager.setPosition('standings', 100, 200) was called
    Expected Result: All handler invocations delegated to OverlayManager
    Evidence: .omo/evidence/task-1-ipc-overlay-handlers.txt

  Scenario: Dev URL fixed
    Tool: Bash (grep)
    Steps:
      1. grep 'localhost:3000' apps/desktop/src/main/windows/overlay-manager.ts
      2. Assert URL contains '/?overlay=' (with trailing slash)
    Expected Result: URL is 'http://localhost:3000/?overlay=${id}'
    Evidence: .omo/evidence/task-1-dev-url.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): wire OverlayManager to IPC handlers, fix dev URL`
  - Files: `apps/desktop/src/main/windows/overlay-manager.ts`, `apps/desktop/src/main/ipc/handlers.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

- [x] 2. Complete HttpServer — Telemetry Pipeline + Overlay Pages + Hello Frame

  **What to do**:
  - Add `setSimManager(simManager)` method to `HttpServer` class for telemetry source
  - Modify SimManager to call `httpServer.broadcastTelemetry(data)` after each getTelemetry() call
  - Add health endpoint `GET /healthz` → returns 200 `{"status":"ok"}`
  - Fix `renderOverlayPage()`:
    - Replace `bundle.js` script with inline HTML that loads the overlay SPA
    - Set `<base href="http://localhost:3000/">` in dev mode so assets load from Vite
    - Inline the SSE connection script
  - Bind server to `127.0.0.1` instead of `0.0.0.0` (security)
  - Add SSE "hello" frame: on client connect, send current telemetry state immediately
  - Write TDD test FIRST: connect to SSE, verify data received within 2s
  - Files: `apps/desktop/src/main/server/http-server.ts`, `apps/desktop/src/main/sim/sim-manager.ts`

  **Must NOT do**:
  - Don't add Express dependency — keep native http module
  - Don't change the SSE `/events` or `/overlays/:id` route structure
  - Don't add authentication

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Tasks 7, 8 (overlays need SSE for OBS mode)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/main/server/http-server.ts:1-83` — Current implementation: SSE, overlay pages, broadcastTelemetry
  - `apps/desktop/src/main/sim/sim-manager.ts:99-105` — getTelemetry(): returns normalized Telemetry or null
  - `apps/desktop/src/main/index.ts:68-83` — app.whenReady(): where HttpServer and SimManager are instantiated

  **Acceptance Criteria**:
  - [ ] Test: `curl http://127.0.0.1:3200/healthz` returns 200 `{"status":"ok"}`
  - [ ] Test: `curl -N http://127.0.0.1:3200/events` shows `data: {...}` within 2s of mock telemetry firing
  - [ ] Test: `curl http://127.0.0.1:3200/overlays/standings` returns 200 with HTML containing `<div id="root">`
  - [ ] Test: Server binds to 127.0.0.1 (not 0.0.0.0)
  - [ ] Test: First SSE event on connect is a "hello" frame with current telemetry state
  - [ ] Test: SimManager calls broadcastTelemetry on each getTelemetry tick

  **QA Scenarios**:
  ```
  Scenario: Health endpoint responds
    Tool: Bash (curl)
    Preconditions: Electron app started (or server standalone)
    Steps:
      1. curl -sS http://127.0.0.1:3200/healthz
      2. Assert HTTP 200
      3. Assert body contains {"status":"ok"}
    Expected Result: Healthy
    Evidence: .omo/evidence/task-2-health.txt

  Scenario: SSE delivers telemetry
    Tool: Bash (curl with timeout)
    Steps:
      1. curl -N http://127.0.0.1:3200/events (capture 3s of output)
      2. Assert first event contains "hello" or current telemetry data
      3. Assert subsequent events contain telemetry data JSON
    Expected Result: SSE stream active with data events
    Evidence: .omo/evidence/task-2-sse-stream.txt

  Scenario: Overlay HTML page served
    Tool: Bash (curl)
    Steps:
      1. curl -sS http://127.0.0.1:3200/overlays/standings
      2. Assert HTTP 200
      3. Assert response contains '<div id="root">'
    Expected Result: Valid HTML for OBS Browser Source
    Evidence: .omo/evidence/task-2-overlay-page.txt

  Scenario: Server binds to 127.0.0.1
    Tool: Bash (PowerShell)
    Steps:
      1. netstat -an | findstr :3200
      2. Assert address is 127.0.0.1:3200, not 0.0.0.0:3200
    Expected Result: Localhost only
    Evidence: .omo/evidence/task-2-bind.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): complete HttpServer — telemetry pipeline, health, SSE hello, bind 127.0.0.1`
  - Files: `apps/desktop/src/main/server/http-server.ts`, `apps/desktop/src/main/sim/sim-manager.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

- [x] 3. Vite Config + OverlayShell — Query Param Routing

  **What to do**:
  - Add overlay entry points to vite.config.ts:
    - Keep main `src/renderer/index.html` as default
    - The same bundle handles overlay routing via `?overlay=id`
  - Create `apps/desktop/src/renderer/overlays/OverlayShell.tsx`:
    - Reads `?overlay=` from URL search params
    - Based on param, renders correct overlay:
      - `?overlay=standings` → `<Standings />`
      - `?overlay=relative` → `<Relative />`
      - Otherwise → renders a placeholder or redirects to Hub
    - Provides shared overlay context (telemetry data via useTelemetry hook)
    - Applies transparent background class in overlay mode
  - Create `apps/desktop/src/renderer/overlays/overlay.css`:
    - Base styles for overlay mode: transparent background, no scrollbars
  - Wire OverlayShell into `App.tsx` or `main.tsx` (read query param on mount)
  - Write TDD test FIRST: mount OverlayShell with `?overlay=standings` → assert Standings renders
  - Files: `apps/desktop/vite.config.ts`, `apps/desktop/src/renderer/overlays/OverlayShell.tsx`, `apps/desktop/src/renderer/overlays/overlay.css`

  **Must NOT do**:
  - Don't create separate Vite entry points per overlay — single SPA bundle
  - Don't add React Router dependency — native URLSearchParams is sufficient
  - Don't modify the Hub/App.tsx layout — OverlayShell is a wrapper that replaces App when `?overlay=` is present

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6)
  - **Blocks**: Tasks 7, 8 (overlays need a shell to render in)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/vite.config.ts:46-52` — Current build config: single input `index.html`
  - `apps/desktop/src/renderer/main.tsx` — React entry point, mount app here
  - `apps/desktop/src/renderer/App.tsx` — Hub app, should NOT render when overlay mode

  **Acceptance Criteria**:
  - [ ] Test: URL `?overlay=standings` → OverlayShell renders Standings component
  - [ ] Test: URL `?overlay=relative` → OverlayShell renders Relative component
  - [ ] Test: URL without `?overlay` → renders Hub App normally
  - [ ] Test: Unknown overlay ID → renders empty state or redirects to Hub
  - [ ] Test: Overlay mode applies transparent background class
  - [ ] Test: Vite build produces a single bundle that works for both Hub and overlays

  **QA Scenarios**:
  ```
  Scenario: OverlayShell renders correct overlay
    Tool: Playwright
    Preconditions: Vite dev server running
    Steps:
      1. Navigate to http://localhost:3000/?overlay=standings
      2. Wait for overlay to render
      3. Assert DOM contains [data-testid="standings-overlay"]
      4. Navigate to http://localhost:3000/?overlay=relative
      5. Assert DOM contains [data-testid="relative-overlay"]
      6. Navigate to http://localhost:3000/ (no param)
      7. Assert Hub App renders (no overlay data attributes)
    Expected Result: Correct component rendered per query param
    Evidence: .omo/evidence/task-3-overlay-shell.png

  Scenario: Transparent background in overlay mode
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/?overlay=standings
      2. Assert body has class "overlay-mode" or background is transparent
    Expected Result: Background is transparent for OBS
    Evidence: .omo/evidence/task-3-transparent-bg.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): add OverlayShell with ?overlay=id query param routing`
  - Files: `apps/desktop/src/renderer/overlays/OverlayShell.tsx`, `apps/desktop/vite.config.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

- [x] 4. Zod Schemas for Overlay Config

  **What to do**:
  - Create `packages/ui-core/src/schemas/overlay-config.ts`:
    - `StandingsConfigSchema`: Zod schema for standings config (row count, show multiclass, columns)
    - `RelativeConfigSchema`: Zod schema for relative config (range, show gaps, color coding)
    - `OverlayPositionSchema`: Zod schema for position/size (x, y, width, height, visible, opacity)
    - Derive TypeScript types via `z.infer<typeof Schema>`
  - Create `packages/ui-core/src/schemas/index.ts` exporting all schemas
  - Export from `packages/ui-core/src/index.ts`
  - Write TDD test FIRST: validate valid config, reject invalid config
  - Files: `packages/ui-core/src/schemas/overlay-config.ts`, `packages/ui-core/src/schemas/index.ts`

  **Must NOT do**:
  - Don't create telemetry schemas (already handled by sim-core normalizer)
  - Don't wire schemas into IPC yet (just create and export them — IPC wiring happens in Task 1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6)
  - **Blocks**: Tasks 7, 8 (overlays use schemas for config validation)
  - **Blocked By**: None

  **References**:
  - `packages/ui-core/src/index.ts` — Export file, add schema exports
  - Zod docs: `https://zod.dev/?id=basic-usage`

  **Acceptance Criteria**:
  - [ ] Test: Valid standings config (rowCount: 20, showMulticlass: true) → passes validation
  - [ ] Test: Invalid config (opacity: 2.0, out of 0-1 range) → fails with structured error
  - [ ] Test: Invalid config (width: -100) → fails validation
  - [ ] Test: Default values applied when optional fields omitted
  - [ ] Test: Types derived via z.infer match expected interfaces

  **QA Scenarios**:
  ```
  Scenario: Zod schemas validate overlay config
    Tool: Bash (bun REPL)
    Preconditions: Schema module imported
    Steps:
      1. Import StandingsConfigSchema from @vantare/ui-core
      2. Validate { rowCount: 20, showMulticlass: true, columns: ["position", "name", "gap"] }
      3. Assert validation passes (success.data)
      4. Validate { opacity: 2.0 } → assert validation fails
      5. Assert error message mentions "opacity" and range
    Expected Result: Valid configs pass, invalid configs fail with clear errors
    Evidence: .omo/evidence/task-4-zod-validation.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui-core): add Zod schemas for overlay config (Standings + Relative)`
  - Files: `packages/ui-core/src/schemas/overlay-config.ts`, `packages/ui-core/src/index.ts`
  - Pre-commit: `pnpm test -- packages/ui-core`

- [x] 5. Mock Telemetry Seeder

  **What to do**:
  - Create `apps/desktop/src/main/sim/mock-telemetry-seeder.ts`:
    - Generates varied mock telemetry data for development/testing
    - Provides fixtures for different states:
      - `emptyState()`: no vehicles, no telemetry
      - `midRaceState()`: 20 vehicles, player mid-field, multi-class
      - `endRaceState()`: 20 vehicles, player at front, gaps spread out
      - `playerAtFront()`: player is P1
      - `playerAtBack()`: player is last
    - Each fixture returns a complete `Telemetry` object
  - Export a `SeedData` object with all fixtures
  - Integrate with HttpServer: when no real telemetry available, seeder provides data for SSE
  - Integrate with Storybook: stories import seed data for rendering
  - Files: `apps/desktop/src/main/sim/mock-telemetry-seeder.ts`

  **Must NOT do**:
  - Don't make the seeder a running service — it provides static fixture objects
  - Don't modify existing mock providers

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6)
  - **Blocks**: Tasks 7, 8 (overlays need test data), Task 9 (Storybook stories need fixtures)
  - **Blocked By**: None

  **References**:
  - `packages/sim-core/src/types/index.ts` — Telemetry interface shape
  - `packages/sim-core/src/mock/iracing-mock.ts` — Existing mock implementations
  - `packages/sim-core/src/mock/scenarios.ts` — Scenario patterns

  **Acceptance Criteria**:
  - [ ] Test: `emptyState()` returns Telemetry with vehicles: []
  - [ ] Test: `midRaceState()` returns 20 vehicles, player at position ~10
  - [ ] Test: `endRaceState()` returns vehicles with spread lap times
  - [ ] Test: `playerAtFront()` returns player vehicle at position 1
  - [ ] Test: `playerAtBack()` returns player vehicle at last position
  - [ ] Test: All fixtures have valid Telemetry shape (pass Zod validation if schemas exist)

  **QA Scenarios**:
  ```
  Scenario: Seed data fixtures produce valid telemetry
    Tool: Bash (vitest)
    Preconditions: SeedData imported
    Steps:
      1. const telemetry = SeedData.midRaceState()
      2. Assert telemetry.vehicles.length === 20
      3. Assert telemetry.player.isOnTrack === true
      4. Assert telemetry.vehicles.filter(v => v.isPlayer).length === 1
      5. Assert player position is between 5 and 15
    Expected Result: Valid fixtures for development
    Evidence: .omo/evidence/task-5-seed-data.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): add mock telemetry seeder with varied race state fixtures`
  - Files: `apps/desktop/src/main/sim/mock-telemetry-seeder.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

- [x] 6. Storybook Initial Setup

  **What to do**:
  - Initialize Storybook with Vite builder: `npx storybook@latest init --builder @storybook/react-vite`
  - Configure `apps/desktop/.storybook/main.ts`:
    - Use `@storybook/react-vite` builder
    - Point stories to `src/renderer/overlays/**/*.stories.@(ts|tsx)`
    - Add Vite config with path aliases matching the app
  - Configure `apps/desktop/.storybook/preview.ts`:
    - Import globals.css for Tailwind styles
    - Add overlay viewport settings (transparent background, 1920x1080)
  - Add `storybook` and `build-storybook` scripts to desktop `package.json`
  - Verify: `pnpm storybook` starts on port 6006, `pnpm build-storybook` produces static build
  - Files: `apps/desktop/.storybook/main.ts`, `apps/desktop/.storybook/preview.ts`, `apps/desktop/package.json`

  **Must NOT do**:
  - Don't create stories yet (Task 9)
  - Don't install addons beyond essentials (actions, controls)
  - Don't modify the app's vite.config.ts for Storybook (storybook has its own config)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5)
  - **Blocks**: Task 9 (stories need storybook configured)
  - **Blocked By**: None

  **References**:
  - Storybook with Vite: `https://storybook.js.org/docs/builders/vite`
  - `apps/desktop/vite.config.ts` — Vite config for path aliases

  **Acceptance Criteria**:
  - [ ] `pnpm storybook` starts dev server on port 6006 (or similar)
  - [ ] `pnpm build-storybook` exits 0 and produces `storybook-static/index.html`
  - [ ] Storybook preview shows with correct Tailwind styles (dark background)
  - [ ] No console errors on startup

  **QA Scenarios**:
  ```
  Scenario: Storybook builds successfully
    Tool: Bash
    Steps:
      1. cd apps/desktop && pnpm build-storybook
      2. Assert exit code 0
      3. Assert storybook-static/index.html exists
    Expected Result: Storybook static build produced
    Evidence: .omo/evidence/task-6-storybook-build.txt

  Scenario: Storybook dev server starts
    Tool: Bash (background + curl)
    Steps:
      1. cd apps/desktop && pnpm storybook (background, wait 10s)
      2. curl http://localhost:6006/ (or whatever port)
      3. Assert HTTP 200 with HTML response
    Expected Result: Storybook server running
    Evidence: .omo/evidence/task-6-storybook-server.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): setup Storybook with Vite builder for overlay development`
  - Files: `apps/desktop/.storybook/*`, `apps/desktop/package.json`
  - Pre-commit: `pnpm build-storybook`

- [x] 7. Standings Overlay — Full Feature

  **What to do**:
  - Create `apps/desktop/src/renderer/overlays/Standings.tsx`:
    - Table showing all vehicles with columns: Position, Driver Name, Car#, Class, Gap, Last Lap, Best Lap, Interval
    - Player row highlighted with accent color (bg-blood-500/20 + border-left blood accent)
    - Multi-class support: background color per class + small class chip label
    - Sort by position ascending (always)
    - Gap column: shows time gap to car ahead (or "LEADER" for P1)
    - Interval column: interval from player's car
    - Default: show top 20 rows (configurable via Zod schema)
    - Use `GlassPanel` component for the container
    - Use `TimeDisplay` component for lap time columns
    - Use `PositionBadge` component for position column
    - Auto-scroll to keep player visible if they fall outside default view
    - Accept `telemetry: Telemetry | null` prop (from useTelemetry or seed data)
  - Handle edge cases:
    - No telemetry → empty state with `data-testid="standings-empty"`
    - Player not in standings (DNF) → show "OUT" badge on player row if last known
    - Single class → no class column shown, simplified layout
    - Long driver names → truncate with ellipsis + title attribute
  - Write TDD test FIRST with seed data fixtures:
    - Test: renders correct number of rows
    - Test: player row has `data-testid="player-highlight"`
    - Test: multiclass shows colored backgrounds
    - Test: P1 shows "LEADER" in gap column
    - Test: empty state renders when no telemetry
  - File: `apps/desktop/src/renderer/overlays/Standings.tsx`

  **Must NOT do**:
  - No Canvas rendering — pure DOM/CSS
  - No animations beyond CSS transitions (200ms entry)
  - No click handlers or interactivity (read-only overlay)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwind`, `frontend-responsive-design-standards`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 8)
  - **Blocks**: Task 9 (Storybook story)
  - **Blocked By**: Task 3 (OverlayShell), Task 4 (Zod schemas), Task 5 (seed data)

  **References**:
  - `apps/desktop/src/renderer/overlays/OverlayShell.tsx` — After Task 3: shell that renders this component
  - `packages/sim-core/src/types/index.ts` — Telemetry, VehicleData types
  - `packages/ui-core/src/components/GlassPanel.tsx` — Container component
  - `packages/ui-core/src/components/TimeDisplay.tsx` — Lap time formatting
  - `packages/ui-core/src/components/PositionBadge.tsx` — Position display

  **Acceptance Criteria**:
  - [ ] Test: Renders 20 rows with mock telemetry data
  - [ ] Test: Player row has `data-testid="player-highlight"` attribute
  - [ ] Test: Multi-class vehicles show colored backgrounds and class chip
  - [ ] Test: P1 shows "LEADER" text in gap column
  - [ ] Test: Empty state renders `data-testid="standings-empty"` when no telemetry
  - [ ] Test: Gap column shows time gap to car ahead (not interval to player)
  - [ ] Test: Player always visible (auto-scroll if outside viewport)
  - [ ] Test: Long driver names truncated with ellipsis

  **QA Scenarios**:
  ```
  Scenario: Standings renders with mid-field player
    Tool: Playwright (Storybook)
    Preconditions: Storybook running, Standings story with midRaceState fixture
    Steps:
      1. Open Standings story in browser
      2. Assert table has 20 rows with data-testid="standings-row"
      3. Assert one row has data-testid="player-highlight"
      4. Assert player row has position badge number matching fixture
      5. Assert P1 row shows "LEADER" in gap column
      6. Assert class chip visible on each row
      7. Take screenshot
    Expected Result: Full standings table with player highlight, multiclass, gaps
    Evidence: .omo/evidence/task-7-standings-midfield.png

  Scenario: Standings empty state
    Tool: Playwright
    Preconditions: Storybook with emptyState fixture
    Steps:
      1. Open Standings empty story
      2. Assert [data-testid="standings-empty"] is visible
      3. Assert no rows rendered
    Expected Result: Graceful empty state
    Evidence: .omo/evidence/task-7-standings-empty.png

  Scenario: Player at front
    Tool: Playwright
    Steps:
      1. Open Standings story with playerAtFront fixture
      2. Assert player row has position 1
      3. Assert player gap column shows "LEADER"
    Expected Result: Correct display for leading player
    Evidence: .omo/evidence/task-7-standings-leader.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(desktop): Standings overlay — full feature with multiclass, gaps, player highlight`
  - Files: `apps/desktop/src/renderer/overlays/Standings.tsx`
  - Pre-commit: `pnpm test -- apps/desktop`

- [x] 8. Relative Overlay — Full Feature

  **What to do**:
  - Create `apps/desktop/src/renderer/overlays/Relative.tsx`:
    - Shows exactly 3 cars ahead and 3 cars behind the player
    - Player row centered with accent color
    - Each row shows: Position, Gap (to player), Driver Name, Car#, Class
    - Color coding:
      - Cars ahead of player: Red-ish tint (increasing gap = less red)
      - Cars behind player: Green-ish tint (increasing gap = less green)
      - Player: Neutral white/silver with blood accent border
    - Gap column: time difference to player (negative = ahead, positive = behind)
    - Gap interpolation: smooth transitions between telemetry updates
    - Edge cases:
      - Player at front (P1): show 0 ahead + 6 behind
      - Player at back (P20): show 6 ahead + 0 behind
      - Only 10 cars total: show what exists in 3/3 pattern
      - No telemetry: empty state with `data-testid="relative-empty"`
      - Player DNF: show last known ±3 with "OUT" indicator
    - Use `GlassPanel` component for the container
    - Use `PositionBadge` component for position column
  - Write TDD test FIRST with seed data fixtures:
    - Test: renders 7 rows total (3 ahead + player + 3 behind)
    - Test: player row centered with `data-testid="player-highlight"`
    - Test: colors correct (red tint ahead, green tint behind)
    - Test: player at front shows 0 ahead + 6 behind
    - Test: player at back shows 6 ahead + 0 behind
    - Test: empty state renders when no telemetry
  - File: `apps/desktop/src/renderer/overlays/Relative.tsx`

  **Must NOT do**:
  - No Canvas rendering
  - No "radar" or proximity visualization (future overlay)
  - No click handlers

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwind`, `frontend-responsive-design-standards`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 7)
  - **Blocks**: Task 9 (Storybook story)
  - **Blocked By**: Task 3 (OverlayShell), Task 4 (Zod schemas), Task 5 (seed data)

  **References**:
  - `apps/desktop/src/renderer/overlays/Standings.tsx` — After Task 7: similar pattern, color coding approach
  - `packages/ui-core/src/components/GlassPanel.tsx` — Container
  - `packages/sim-core/src/types/index.ts` — Telemetry, VehicleData types

  **Acceptance Criteria**:
  - [ ] Test: Renders 7 rows when player mid-field (3 ahead + player + 3 behind)
  - [ ] Test: Player at front: 0 ahead + player + 6 behind = 7 rows
  - [ ] Test: Player at back: 6 ahead + player + 0 behind = 7 rows
  - [ ] Test: Player row has `data-testid="player-highlight"`
  - [ ] Test: Cars ahead have red-ish background tint
  - [ ] Test: Cars behind have green-ish background tint
  - [ ] Test: Gap column shows time to player (negative ahead, positive behind)
  - [ ] Test: Empty state renders `data-testid="relative-empty"` when no telemetry
  - [ ] Test: Only 10 cars: renders correct subset (3/3 pattern adjusted)

  **QA Scenarios**:
  ```
  Scenario: Relative shows cars around player
    Tool: Playwright (Storybook)
    Preconditions: Storybook running, Relative story with midRaceState fixture (player at P10)
    Steps:
      1. Open Relative story
      2. Assert 7 rows rendered: P7, P8, P9, P10 (player), P11, P12, P13
      3. Assert player row has data-testid="player-highlight"
      4. Assert P7 row has red tint, gap is negative (ahead)
      5. Assert P13 row has green tint, gap is positive (behind)
      6. Take screenshot
    Expected Result: Relative display with correct cars, colors, gaps
    Evidence: .omo/evidence/task-8-relative-midfield.png

  Scenario: Player at front
    Tool: Playwright
    Steps:
      1. Open Relative story with playerAtFront fixture (player at P1)
      2. Assert 7 rows: P1 (player) + P2-P7 (all behind, all green)
      3. Assert player highlighted
    Expected Result: 0 ahead, 6 behind
    Evidence: .omo/evidence/task-8-relative-front.png

  Scenario: Empty state
    Tool: Playwright
    Steps:
      1. Open Relative story with emptyState fixture
      2. Assert [data-testid="relative-empty"] visible
    Expected Result: Graceful empty state
    Evidence: .omo/evidence/task-8-relative-empty.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(desktop): Relative overlay — 3 ahead/3 behind with gap interpolation and color coding`
  - Files: `apps/desktop/src/renderer/overlays/Relative.tsx`
  - Pre-commit: `pnpm test -- apps/desktop`

- [x] 9. Storybook Stories for Standings + Relative

  **What to do**:
  - Create `apps/desktop/src/renderer/overlays/Standings.stories.tsx`:
    - 3 stories with seed data: `default` (midRaceState), `empty` (emptyState), `playerAtFront` (leader)
    - `default`: 20 vehicles, player mid-field → full table with all features
    - `empty`: no telemetry → empty state with "No telemetry data" message
    - `playerAtFront`: player P1 → "LEADER" in gap column
  - Create `apps/desktop/src/renderer/overlays/Relative.stories.tsx`:
    - 3 stories: `default` (midRaceState), `empty` (emptyState), `leading` (playerAtFront)
    - `default`: player at P10 → 3 ahead/3 behind with color coding
    - `empty`: no telemetry → empty state
    - `leading`: player at P1 → 0 ahead, 6 behind (edge case)
  - Each story passes the appropriate seed data fixture as telemetry prop
  - Stories are auto-generated with controls for debugging
  - Verify stories render in Storybook UI
  - Files: `apps/desktop/src/renderer/overlays/Standings.stories.tsx`, `apps/desktop/src/renderer/overlays/Relative.stories.tsx`

  **Must NOT do**:
  - Don't create stories for non-Sprint-3 components (TimeDisplay, PositionBadge, DeltaIndicator)
  - Don't add complex addons (a11y, docs) — essentials only

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 6 (Storybook setup), Task 7 (Standings), Task 8 (Relative), Task 5 (seed data)

  **References**:
  - `apps/desktop/src/renderer/overlays/Standings.tsx` — After Task 7
  - `apps/desktop/src/renderer/overlays/Relative.tsx` — After Task 8
  - `apps/desktop/src/main/sim/mock-telemetry-seeder.ts` — After Task 5: seed data fixtures
  - Storybook CSF3 format: `https://storybook.js.org/docs/api/csf`

  **Acceptance Criteria**:
  - [ ] `pnpm build-storybook` exits 0
  - [ ] Standings default story renders with 20 rows + player highlight
  - [ ] Standings empty story renders empty state
  - [ ] Standings playerAtFront story shows "LEADER" for P1
  - [ ] Relative default story renders 7 rows with color coding
  - [ ] Relative empty story renders empty state
  - [ ] Relative leading story shows 0 ahead, 6 behind

  **QA Scenarios**:
  ```
  Scenario: All stories render in Storybook
    Tool: Playwright
    Preconditions: Storybook running on port 6006
    Steps:
      1. Open http://localhost:6006/?path=/story/overlays-standings--default
      2. Assert standings table rendered with 20 rows
      3. Assert player row highlighted
      4. Open http://localhost:6006/?path=/story/overlays-relative--default
      5. Assert relative rendered with 7 rows
      6. Assert color coding visible (red ahead, green behind)
    Expected Result: All stories render correctly
    Evidence: .omo/evidence/task-9-storybook-stories.png

  Scenario: Empty state stories render
    Tool: Playwright
    Steps:
      1. Open Standings empty story
      2. Assert [data-testid="standings-empty"] visible
      3. Open Relative empty story
      4. Assert [data-testid="relative-empty"] visible
    Expected Result: Empty states displayed
    Evidence: .omo/evidence/task-9-storybook-empty.png
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(desktop): Storybook stories for Standings and Relative overlays`
  - Files: `apps/desktop/src/renderer/overlays/Standings.stories.tsx`, `apps/desktop/src/renderer/overlays/Relative.stories.tsx`
  - Pre-commit: `pnpm build-storybook`

- [x] 10. Integration Verification + Dev Mode Test

  **What to do**:
  - Verify ALL components work together in dev mode:
    1. Start Vite dev server (`pnpm dev`)
    2. Start Electron app (or test via curl/playwright)
    3. Verify `http://127.0.0.1:3200/healthz` returns 200
    4. Verify `http://127.0.0.1:3200/events` broadcasts SSE events
    5. Verify `http://127.0.0.1:3200/overlays/standings` serves HTML page
    6. Verify OverlayManager creates windows on IPC invoke
    7. Verify clean build: `pnpm build` → 5/5 packages
  - Create integration test: `apps/desktop/src/main/__tests__/pipeline.test.ts`:
    - Tests the full chain: SimManager → HttpServer.broadcastTelemetry → SSE event delivered
    - Uses mock SimManager and real HttpServer on random port
    - Connects as SSE client, verifies data event received within 2s
  - File: `apps/desktop/src/main/__tests__/pipeline.test.ts`

  **Must NOT do**:
  - Don't launch actual Electron windows in CI (headless test only)
  - Don't test Storybook rendering here (already covered in Task 9)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential — last task before Final Wave)
  - **Parallel Group**: Wave 3
  - **Blocks**: None (final gate before Final Wave)
  - **Blocked By**: Tasks 1-9

  **References**:
  - `apps/desktop/src/main/server/http-server.ts` — After Task 2
  - `apps/desktop/src/main/sim/sim-manager.ts` — After Task 2: wired to HttpServer

  **Acceptance Criteria**:
  - [ ] Integration test: SimManager tick → HttpServer.broadcastTelemetry called → SSE event delivered
  - [ ] curl health endpoint returns 200
  - [ ] curl SSE endpoint delivers data within 2s
  - [ ] `pnpm build` passes 5/5 packages
  - [ ] All 10 tasks verified working together

  **QA Scenarios**:
  ```
  Scenario: Full pipeline integration test
    Tool: Bash (vitest)
    Preconditions: All Sprint 3 code built
    Steps:
      1. Run integration test
      2. Assert SimManager telemetry tick → SSE event received
      3. Assert event data matches telemetry shape
    Expected Result: Telemetry flows from SimManager through HttpServer to SSE client
    Evidence: .omo/evidence/task-10-pipeline-integration.txt

  Scenario: Dev mode startup verification
    Tool: Bash
    Steps:
      1. pnpm build → assert exit 0
      2. pnpm typecheck → assert exit 0
      3. pnpm test → assert all tests pass
    Expected Result: All verification commands pass
    Evidence: .omo/evidence/task-10-build-verify.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `test(desktop): integration test for telemetry pipeline + dev mode verification`
  - Files: `apps/desktop/src/main/__tests__/pipeline.test.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns (Express dep, Stream Alerts feature, settings UI). Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [6/6] | Must NOT Have [7/7] | Tasks [10/10] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + linter + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute ALL QA scenarios from ALL tasks. Test cross-task integration: SimManager→HttpServer telemetry broadcast → SSE → overlay rendering. Test edge cases: no telemetry, player at front/back of field, multi-class fixture. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [10/10 compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(desktop): overlay infrastructure — Manager, HTTP, IPC, routing, schemas`
- **Wave 2**: `feat(desktop): Standings and Relative overlays`
- **Wave 3**: `feat(desktop): Storybook stories and integration tests`

---

## Success Criteria

### Verification Commands
```bash
pnpm build          # All packages build
pnpm typecheck      # Zero type errors
pnpm test           # All tests pass
curl http://127.0.0.1:3200/healthz    # HTTP server responds 200
curl -N http://127.0.0.1:3200/events  # SSE stream delivers data
curl http://127.0.0.1:3200/overlays/standings  # Overlay HTML served
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Standings overlay renders in Electron window
- [ ] Relative overlay renders in Electron window
- [ ] SSE stream broadcasts telemetry
- [ ] Overlay HTML works as OBS Browser Source
- [ ] Zod schemas validate config before IPC apply
- [ ] Storybook builds with Standings + Relative stories
