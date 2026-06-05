# Sprint 2 — Telemetry Pipeline

## TL;DR

> **Quick Summary**: Complete the telemetry pipeline from mock sim → Zustand store → React, wire the existing SimNormalizer and Calculations modules, implement real process detection for iRacing/LMU/AC, and build debug/preview overlays. Enhance the existing (dead) telemetry store and hook with proper selectors, error handling, and a single-source-of-truth TelemetryBridge component.
>
> **Deliverables**:
> - Enhanced telemetry store with singleton + memoized selectors + error state
> - SimNormalizer wired into SimManager.getTelemetry()
> - Windows process detection for 3 sims (iRacing, LMU, AC)
> - IPC handlers: sim:available + sim:active
> - TelemetryBridge component (sole IPC→store subscriber)
> - Refactored useTelemetry hook (uses Zustand, proper loading/error states)
> - Debug Tools Overlay (FPS counter + pipeline latency)
> - Preview Overlay (dev-only perf stats)
> - E2E test: mock data reaches React component
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves + final verification
> **Critical Path**: Task 1 → Task 5 → Task 9 → Final Wave

---

## Context

### Original Request
Continuar Sprint 2 del roadmap: Telemetry Pipeline. Objetivo: pipeline completo de telemetría desde mock sim → Zustand store → React con detección real de procesos, debug overlay, y preview overlay.

### Interview Summary
**Key Discussions**:
- **Alcance**: Gaps reales + revisar lo ya construido (no rehacer lo que funciona)
- **Detección de procesos**: En Sprint 2, no diferido a Sprint 5 — implementar `findRunningSims()` con child_process
- **Testing**: TDD (RED-GREEN-REFACTOR) en todas las tareas
- **Native adapters**: Fuera de scope para Sprint 2 (van en Sprint 5 — Multi-Sim)

**Research Findings** (Metis + explore agents):
- **Hallazgo crítico**: `useTelemetry()` hook y `createTelemetryStore()` ya existen en `@vantare/ui-core`, pero están en estado zombie: el store nunca recibe datos (nada llama a `setTelemetry`), y el hook usa `useState` local ignorando el store. Tres suscriptores independientes al mismo IPC event, cero coordinación.
- El `SimNormalizer` (17 tests, Zod) existe pero no está conectado al pipeline — `getTelemetry()` retorna datos crudos sin normalizar.
- El módulo `Calculations` (83 tests, fuel/delta/gap/sector) no está integrado.
- `findRunningSims()` es un stub que retorna `[]`.
- Los handlers IPC `sim:available` y `sim:active` están declarados en el preload pero no implementados.

### Metis Review
**Identified Gaps** (addressed):
- **Store zombie**: Plan incluye refactor del store con singleton + selectores memoizados → Task 1
- **Bridge pattern**: Nuevo `<TelemetryBridge />` como único suscriptor IPC → store → Task 5
- **Normalizer unwired**: Conectar en `getTelemetry()` → Task 3
- **Race conditions**: Store recibe datos antes que React monte → TelemetryBridge usa `useEffect` con cleanup
- **Guardrails**: No implementar native adapters (N-API, UDP, Python sidecar) — son Sprint 5
- **Scope creep**: OBS integration, LMU sidecar, AC UDP reader → excluidos explícitamente

---

## Work Objectives

### Core Objective
Pipeline completo y verificable: mock sim → SimManager (con Normalizer) → IPC → Zustand store (con selectores) → React (con useTelemetry hook). Más detección real de procesos y overlays de debug.

### Concrete Deliverables
- `packages/ui-core/src/stores/telemetry-store.ts` — Enhanced: singleton export, memoized selectors, error state
- `packages/ui-core/src/hooks/useTelemetry.ts` — Refactored: consumes store, returns `{telemetry, connected, error}`
- `apps/desktop/src/renderer/TelemetryBridge.tsx` — New: sole IPC→store subscriber
- `apps/desktop/src/main/sim/sim-manager.ts` — Enhanced: SimNormalizer wired, process detection
- `apps/desktop/src/main/ipc/handlers.ts` — Enhanced: sim:available + sim:active handlers
- `apps/desktop/src/renderer/DebugOverlay.tsx` — New: F-020 (FPS, latency)
- `apps/desktop/src/renderer/PreviewOverlay.tsx` — New: F-028 (perf stats, dev-only)

### Definition of Done
- [ ] `pnpm test` → ALL tests pass (existing + new TDD tests)
- [ ] `pnpm typecheck` → zero errors
- [ ] `pnpm build` → 5/5 packages build successfully
- [ ] Mock sim → React: pipeline end-to-end verifiable
- [ ] Debug overlay shows FPS counter + pipeline latency
- [ ] Process detection correctly identifies running sims

### Must Have
- Singleton telemetry store with memoized selectors for player, engine, tyres, lap, session
- useTelemetry hook consuming the store (not local useState)
- SimNormalizer wired into the data flow
- Windows process detection for iRacing, LMU, AC executables
- IPC handlers for sim:available + sim:active
- Debug overlay with FPS counter and pipeline latency
- All new code TDD (tests written first)

### Must NOT Have (Guardrails)
- **NO native adapter implementations** (iRacing N-API C++ addon, LMU Python sidecar, AC UDP reader) — Sprint 5
- **NO OBS Browser Source integration** (HTTP server, SSE) — Sprint 3
- **NO overlay system** (registry, OverlayManager) — Sprint 3
- **NO full overlay implementations** (Standings, Relative, Delta, Stream Alerts) — Sprint 3/4
- **NO Supabase integration** (already built in Sprint 1, only review)
- **NO direct window.vantare calls in components** outside TelemetryBridge — single source of truth
- **NO `as any` casts** in new production code (tests exempt)
- **NO new Zustand stores** — enhance the existing one, don't create duplicates

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest in sim-core + ui-core + desktop)
- **Automated tests**: TDD — RED (failing test) → GREEN (minimal impl) → REFACTOR
- **Framework**: vitest (already configured in all packages)

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.
- **Backend/CLI**: Bash (curl + child_process) — verify IPC handlers, process detection
- **UI**: Playwright — verify debug/preview overlays render, telemetry data visible
- **API/Module**: Bash (bun REPL) — import and verify store selectors, normalizer output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, ALL PARALLEL):
├── Task 1: Enhance telemetry store (selectors, singleton, error state, calculations)
├── Task 2: Wire SimNormalizer into SimManager.getTelemetry()
├── Task 3: Implement process detection (findRunningSims)
├── Task 4: Add IPC handlers sim:available + sim:active
└── Task 5: Review & fix existing code (types, IPC, adapters)
  Note: After all Wave 1 tasks complete, run a final review pass on modified files before Wave 2.

Wave 2 (After Wave 1 — integration + overlays, MAX PARALLEL):
├── Task 6: Refactor useTelemetry hook (consume store, loading/error)
├── Task 7: Create TelemetryBridge component (sole IPC→store subscriber)
├── Task 8: Refactor App.tsx (use useTelemetry hook)
├── Task 9: Create Debug Overlay (F-020: FPS, latency)
├── Task 10: Create Preview Overlay (F-028: perf stats)
└── Task 11: E2E test (mock data reaches React component)

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
└── Task F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay
```

**Critical Path**: Task 1 → Task 5 → Task 7 → Task 9 → Final Wave
**Parallel Speedup**: ~65% faster than sequential (Wave 1: 5 parallel, Wave 2: 6 parallel)
**Max Concurrent**: 6 (Wave 2)

### Agent Dispatch Summary

- **Wave 1**: **5** — T1→deep, T2→deep, T3→deep, T4→quick, T5→unspecified-high
- **Wave 2**: **6** — T6→quick, T7→quick, T8→quick, T9→visual-engineering, T10→visual-engineering, T11→unspecified-high
- **FINAL**: **4** — F1→oracle, F2→unspecified-high, F3→unspecified-high, F4→deep

---

## TODOs

- [x] 1. Enhance Telemetry Store — Singleton + Memoized Selectors + Error State

  **What to do**:
  - Convert `createTelemetryStore` factory into a named singleton `useTelemetryStore` (still export factory for tests)
  - Add memoized selectors for raw data: `selectPlayer`, `selectEngine`, `selectTyres`, `selectLap`, `selectSession`, `selectVehicles`, `selectTrack`, `selectInputs`, `selectWeather`
  - Add calculated selectors (wire Calculations module): `selectFuelCalculations` (fuel per lap, laps remaining, fuel to end), `selectGapCalculations` (gap to leader, gap to car ahead), `selectDeltaCalculations` (delta to best, sector delta)
  - Add `error` state field (string | null) and `setError` action
  - Add `selectConnected` selector: `(state) => state.connected` (top-level store field, not inside telemetry)
  - Add `selectIsMock` selector: derived from store metadata
  - Write TDD tests FIRST (RED): test each selector returns correct slice, test error state transitions, test data immutability
  - Then implement (GREEN), then clean up (REFACTOR)
  - File: `packages/ui-core/src/stores/telemetry-store.ts`
  - Update exports in `packages/ui-core/src/index.ts` to export both `useTelemetryStore` and `createTelemetryStore`

  **Must NOT do**:
  - Don't create a new store — enhance the existing file
  - Don't remove `createTelemetryStore` factory (needed for test isolation)
  - Don't change the store's dependency on `@vantare/sim-core` types

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex state architecture with memoized selectors, multiple concern areas, strict TDD workflow
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: RED-GREEN-REFACTOR workflow required for all selectors

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Task 7 (TelemetryBridge), Task 8 (App.tsx refactor)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/ui-core/src/stores/telemetry-store.ts:1-15` — Current implementation: factory pattern, 3 fields, no selectors. Understand what exists before enhancing.
  - `packages/sim-core/src/types/index.ts:1-14` — Telemetry interface: the shape the store holds. All selectors derive from this.
  - `packages/sim-core/src/types/index.ts:16-30` — PlayerData, VehicleData, EngineData: key sub-types for selectors.
  - `https://zustand.docs.pmnd.rs/guides/auto-generating-selectors` — Zustand selector patterns: createSelectors utility.

  **Acceptance Criteria**:
  - [ ] Test: `useTelemetryStore.getState().setTelemetry(mockData)` → `selectPlayer()` returns correct PlayerData
  - [ ] Test: `setTelemetry(null)` after valid data → `error` state is set
  - [ ] Test: Each of 9 selectors returns correct data slice from mock Telemetry
  - [ ] Test: `createTelemetryStore()` factory still works for test isolation
  - [ ] `pnpm test -- packages/ui-core` → NEW tests pass + existing tests unaffected

  **QA Scenarios**:
  ```
  Scenario: Store receives telemetry, selectors return correct slices
    Tool: Bash (bun REPL)
    Preconditions: Store module imported, mock Telemetry data available
    Steps:
      1. Import useTelemetryStore from @vantare/ui-core
      2. Call useTelemetryStore.getState().setTelemetry(mockIracingData)
      3. Call useTelemetryStore.getState().selectPlayer() → assert speed, rpm, gear match mock
      4. Call useTelemetryStore.getState().selectEngine() → assert fuelLevel, waterTemp match mock
      5. Call selectTyres(), selectLap(), selectSession(), selectVehicles() → all match
      6. Call setTelemetry(null) → assert error state is set
    Expected Result: All selectors return exact mock values, error state activates on null
    Failure Indicators: Selector returns undefined, wrong data, or crashes on null
    Evidence: .sisyphus/evidence/task-1-store-selectors.txt

  Scenario: Factory still works for isolated tests
    Tool: Bash (bun REPL)
    Preconditions: createTelemetryStore imported
    Steps:
      1. Create two separate stores: storeA = createTelemetryStore(), storeB = createTelemetryStore()
      2. Push data to storeA → assert storeB is unaffected
      3. Push different data to storeB → assert storeA still has original data
    Expected Result: Two stores are completely isolated
    Evidence: .sisyphus/evidence/task-1-store-isolation.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui-core): enhance telemetry store — singleton, memoized selectors, error state`
  - Files: `packages/ui-core/src/stores/telemetry-store.ts`, `packages/ui-core/src/index.ts`
  - Pre-commit: `pnpm test -- packages/ui-core`

- [ ] 2. Enhance SimManager — Wire SimNormalizer into getTelemetry()

  **What to do**:
  - Import `SimNormalizer` from `@vantare/sim-core` into `sim-manager.ts`
  - Modify `getTelemetry()`: after receiving raw data from mockProvider.getData(), pipe through `SimNormalizer.normalize()`
  - The normalizer already handles type coercion, defaults, and validation via Zod (17 existing tests)
  - Write TDD test FIRST: mock raw data in → assert normalized Telemetry out with correct types and defaults
  - File: `apps/desktop/src/main/sim/sim-manager.ts`

  **Must NOT do**:
  - Don't modify SimNormalizer (it already has 17 passing tests)
  - Don't change the MockProvider interface or mock implementations
  - Don't change the telemetry push interval (62ms / ~16Hz)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration of existing module into pipeline, requires understanding both normalizer and mock data shapes
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: TDD test for normalizer integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Task 7 (TelemetryBridge consumes normalized data)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/main/sim/sim-manager.ts:85-91` — Current getTelemetry(): returns raw mockProvider.getData() without normalization
  - `packages/sim-core/src/normalizer.ts:1-200` — SimNormalizer implementation: Zod safe parsers, extraction helpers, normalize() method. Understand input/output shapes.
  - `packages/sim-core/src/__tests__/` — Existing normalizer tests (17). Use as pattern for new tests.

  **Acceptance Criteria**:
  - [ ] Test: Raw mock data → SimNormalizer.normalize(raw) → output is valid Telemetry shape
  - [ ] Test: Null/missing fields in raw data → normalizer applies defaults (e.g., speed=0, gear=0)
  - [ ] Test: Invalid raw types (string where number expected) → normalizer coerces safely
  - [ ] Test: Triple-zero frame suppression — speed=0, rpm=0, gear=0 simultaneously → data still valid, not rejected as error
  - [ ] `getTelemetry()` returns Telemetry, not unknown/raw type
  - [ ] Existing mock tests (85) still pass

  **QA Scenarios**:
  ```
  Scenario: SimManager.getTelemetry() returns normalized data
    Tool: Bash (bun REPL via vitest)
    Preconditions: SimManager instantiated with mock mode active
    Steps:
      1. Create SimManager with MockSimFactory.create('iracing', 'race')
      2. Call simManager.getTelemetry()
      3. Assert result.sim === 'iracing'
      4. Assert result.player.speed is a number (not undefined)
      5. Assert result.engine.rpm >= 0
      6. Assert result.vehicles is an array
    Expected Result: All Telemetry fields populated with valid types/values
    Failure Indicators: Any field undefined, wrong type, or null (except expected nulls)
    Evidence: .sisyphus/evidence/task-2-normalizer-wired.txt

  Scenario: Graceful degradation on malformed mock data
    Tool: Bash (bun REPL via vitest)
    Preconditions: Mock provider configured to return partial data
    Steps:
      1. Create mock with missing fields (no engine data)
      2. Normalize → assert engine.rpm defaults to 0, not undefined or crash
      3. Put string "fast" where speed (number) expected → assert coerced to 0
    Expected Result: Normalizer applies all defaults, no crashes, valid Telemetry
    Evidence: .sisyphus/evidence/task-2-normalizer-graceful.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): wire SimNormalizer into SimManager.getTelemetry()`
  - Files: `apps/desktop/src/main/sim/sim-manager.ts`
  - Pre-commit: `pnpm test -- packages/sim-core apps/desktop`

- [ ] 3. Implement SimManager.findRunningSims() — Windows Process Detection

  **What to do**:
  - Implement real process detection replacing the stub `return []`
  - Use Node.js `child_process.execSync('tasklist')` to get Windows process list
  - Parse output for known sim executables: `iRacingSim64DX11.exe`, `LeMansUltimate.exe`, `acs.exe`
  - Write TDD test FIRST: mock child_process output, assert correct sim names detected
  - Handle edge cases: tasklist fails (process not available), sim not running, multiple sims
  - File: `apps/desktop/src/main/sim/sim-manager.ts`

  **Must NOT do**:
  - Don't use native addons or external dependencies — pure Node.js child_process
  - Don't start/stop sim processes — detection only
  - Don't change the polling interval (2s)
  - Don't connect to sim shared memory — just detect process exists

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: System-level integration, needs understanding of Windows process management and error handling
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: TDD with mocked child_process

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 5 (sim:available IPC uses detection result)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/main/sim/sim-manager.ts:55-57` — Current stub: `findRunningSims(): string[] { return []; }`
  - `apps/desktop/src/main/sim/sim-manager.ts:46-52` — detectSim(): calls findRunningSims, activates mock if empty

  **Acceptance Criteria**:
  - [ ] Test: Mock `tasklist` output containing `iRacingSim64DX11.exe` → returns `['iracing']`
  - [ ] Test: Mock output with `acs.exe` → returns `['ac']`
  - [ ] Test: Mock output with `LeMansUltimate.exe` → returns `['lmu']`
  - [ ] Test: Mock empty output → returns `[]` (falls back to mock)
  - [ ] Test: Mock tasklist error/exception → returns `[]` gracefully (no crash)
  - [ ] Test: Multiple sims running → returns all matching names

  **QA Scenarios**:
  ```
  Scenario: Process detection identifies running sim
    Tool: Bash (PowerShell - actual tasklist)
    Preconditions: No real sim needs to be running (test uses mock)
    Steps:
      1. Run vitest with mocked child_process
      2. Assert findRunningSims with iRacing process → ['iracing']
      3. Assert detectSim activates that sim (not mock)
    Expected Result: Sim detected, mock NOT activated when sim process is present
    Failure Indicators: Returns [] when process should be detected, crash, or wrong sim name
    Evidence: .sisyphus/evidence/task-3-process-detection.txt

  Scenario: Graceful fallback when no sim is running
    Tool: Bash (PowerShell)
    Steps:
      1. Mock tasklist with no sim processes
      2. Assert findRunningSims() returns []
      3. Assert detectSim() activates mock mode
    Expected Result: Empty detection → mock fallback, no crash
    Evidence: .sisyphus/evidence/task-3-fallback-mock.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): implement process detection for iRacing, LMU, AC`
  - Files: `apps/desktop/src/main/sim/sim-manager.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

- [ ] 4. Add IPC Handlers — sim:available + sim:active

  **What to do**:
  - Add `ipcMain.handle('sim:available', ...)` handler in handlers.ts: calls `simManagerRef.findRunningSims()` and returns dynamic SimInfo[] based on actual process detection (not static MockSimFactory list). Falls back to MockSimFactory.getAvailableSims() when no sims detected.
  - Add `ipcMain.handle('sim:active', ...)` handler: returns the currently active sim type (string | null)
  - Both handlers use `simManagerRef` (already injected via `setSimManager()`)
  - Existing `sim:get-mock-status` handler (line 82) serves as pattern
  - Write TDD test FIRST: mock SimManager, verify handler returns correct data
  - File: `apps/desktop/src/main/ipc/handlers.ts`

  **Must NOT do**:
  - Don't create new IPC channels beyond sim:available and sim:active
  - Don't change the preload script (already declares both channels)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward handler additions following existing patterns, limited scope
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: TDD for IPC handlers

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None (TelemetryBridge can use existing channels)
  - **Blocked By**: Task 3 (sim:available needs process detection), but can start independently with mock data

  **References**:
  - `apps/desktop/src/main/ipc/handlers.ts:82-89` — Existing sim:get-mock-status handler: pattern to follow (uses simManagerRef)
  - `apps/desktop/src/main/ipc/handlers.ts:29-32` — setSimManager(): how simManagerRef is injected
  - `apps/desktop/src/preload/index.ts:40-41` — Preload declarations: getAvailableSims() and getActiveSim() already call these channels
  - `packages/sim-core/src/mock/mock-provider.ts:11-15` — SimInfo type: {id, name, available}

  **Acceptance Criteria**:
  - [ ] Test: ipcMain.handle('sim:available') → returns SimInfo[] with 3 sims
  - [ ] Test: ipcMain.handle('sim:active') → returns 'iracing' when mock active
  - [ ] Test: ipcMain.handle('sim:active') → returns null when no sim connected
  - [ ] Test: Handlers return gracefully when simManagerRef is null (app startup race)
  - [ ] Preload calls window.vantare.getAvailableSims() → resolves correctly

  **QA Scenarios**:
  ```
  Scenario: sim:available returns all known sims
    Tool: Bash (vitest with mocked ipcMain)
    Preconditions: SimManager started in mock mode
    Steps:
      1. Invoke 'sim:available' handler
      2. Assert response is array with 3 items
      3. Assert items have id, name, available fields
      4. Assert iracing.available === true (mock active)
    Expected Result: [{id:'iracing',name:'iRacing',available:true}, {id:'lmu',...}, {id:'ac',...}]
    Fear Indicators: Empty array, wrong field names, crash when simManagerRef null
    Evidence: .sisyphus/evidence/task-4-ipc-sim-handlers.txt

  Scenario: sim:active returns current sim
    Tool: Bash (vitest with mocked ipcMain)
    Steps:
      1. Start with mock iracing → assert sim:active returns 'iracing'
      2. Stop mock → assert sim:active returns null
    Expected Result: Correct sim type or null
    Evidence: .sisyphus/evidence/task-4-ipc-sim-active.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(desktop): add sim:available and sim:active IPC handlers`
  - Files: `apps/desktop/src/main/ipc/handlers.ts`
  - Pre-commit: `pnpm test -- apps/desktop`

- [ ] 5. Review & Fix Existing Code — Types, IPC, Adapters

  **What to do**:
  - Review all import paths: ensure `@vantare/sim-core` types are used consistently (not `any` or `unknown`)
  - Check `sim-manager.ts` for type safety: `getTelemetry()` return type, callback signatures
  - Verify `app-store.ts` doesn't duplicate telemetry concerns (it shouldn't — it's UI-only state)
  - Check desktop adapter stubs (apps/desktop/src/main/sim/adapters/) — ensure directories exist but contain only base interface
  - Verify no circular dependencies between packages
  - Run `pnpm typecheck` across all packages and fix any errors
  - Run existing test suites: `pnpm test` — document any failing tests
  - Look for `as any` casts or `@ts-ignore` in production code — flag for removal
  - File: multiple (review only, fixes only if critical)

  **Must NOT do**:
  - Don't implement native adapters (N-API, UDP, Python sidecar)
  - Don't refactor working code that doesn't need changes
  - Don't add features — review + critical fixes only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Broad review requiring type system expertise, dependency analysis, and test suite verification
  - **Skills**: [`code-review-expert`]
    - `code-review-expert`: Senior engineer lens for SOLID violations, type safety, and anti-patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: None (advisory — findings inform Wave 2 tasks)
  - **Blocked By**: None

  **References**:
  - `packages/sim-core/src/types/index.ts` — All unified telemetry types
  - `shared/types/bridge.ts` — VantareBridge interface
  - `apps/desktop/src/main/sim/sim-manager.ts` — Full SimManager implementation
  - `apps/desktop/src/preload/index.ts` — All IPC channel declarations

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` passes with zero errors in all packages
  - [ ] `pnpm test` passes all existing 194 tests (no regressions)
  - [ ] Report: list of `as any` / `@ts-ignore` in production code (for future cleanup)
  - [ ] No broken import paths or missing type references
  - [ ] Circular dependency report: clean (or documented if exists)

  **QA Scenarios**:
  ```
  Scenario: Full typecheck passes
    Tool: Bash
    Steps:
      1. Run `pnpm typecheck` in root
      2. Assert exit code 0
      3. Assert zero errors in output
    Expected Result: Clean typecheck across all packages
    Fear Indicators: Type errors in any package
    Evidence: .sisyphus/evidence/task-5-typecheck.txt

  Scenario: All existing tests pass
    Tool: Bash
    Steps:
      1. Run `pnpm test` in root
      2. Assert 194+ tests pass
      3. Assert zero failures
    Expected Result: All existing tests green
    Fear Indicators: Regression in any existing test
    Evidence: .sisyphus/evidence/task-5-test-regression.txt
  ```

  **Commit**: YES (groups with Wave 1, only if fixes made)
  - Message: `fix: type safety review and cleanup for Sprint 2 prep`
  - Files: Any files with critical fixes
  - Pre-commit: `pnpm typecheck && pnpm test`

- [ ] 6. Refactor useTelemetry Hook — Consume Zustand Store

  **What to do**:
  - Rewrite `useTelemetry()` to consume the singletons `useTelemetryStore` (from Task 1) instead of local `useState`
  - Return type changed from `Telemetry | null` to `{ telemetry: Telemetry | null; connected: boolean; error: string | null }`
  - Remove direct `window.vantare.onTelemetry` subscription from the hook
  - The hook becomes a pure store reader — IPC subscription moves to TelemetryBridge (Task 7)
  - Add loading state: `connected === false && telemetry === null && error === null` → loading
  - Write TDD test FIRST: mock store state, verify hook returns correct shape
  - File: `packages/ui-core/src/hooks/useTelemetry.ts`

  **Must NOT do**:
  - Don't subscribe to `window.vantare` directly (that's TelemetryBridge's job)
  - Don't change the hook's import path or package location
  - Don't break existing consumers (App.tsx currently uses it, will be refactored in Task 8)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Refactor of existing 15-line hook, clear pattern to follow, small scope
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: TDD for hook behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 11)
  - **Blocks**: Task 7 (TelemetryBridge), Task 8 (App.tsx refactor)
  - **Blocked By**: Task 1 (needs the enhanced store to exist)

  **References**:
  - `packages/ui-core/src/hooks/useTelemetry.ts:1-15` — Current implementation: local useState, direct IPC subscription
  - `packages/ui-core/src/stores/telemetry-store.ts` — After Task 1: singleton with selectors + error state
  - `packages/ui-core/src/hooks/useSimState.ts:1-18` — Pattern reference: another hook that will likely be refactored similarly (or consolidated)

  **Acceptance Criteria**:
  - [ ] Test: Store has telemetry data → `useTelemetry()` returns `{telemetry: data, connected: true, error: null}`
  - [ ] Test: Store has no data → returns `{telemetry: null, connected: false, error: null}` (loading state)
  - [ ] Test: Store has error → returns `{telemetry: null, connected: false, error: "message"}`
  - [ ] Test: Hook re-renders when store updates (Zustand subscription works)
  - [ ] Hook does NOT call `window.vantare` directly

  **QA Scenarios**:
  ```
  Scenario: Hook returns telemetry from store
    Tool: Bash (bun REPL + vitest)
    Preconditions: Store populated with mock data
    Steps:
      1. Set store telemetry to mockIracingData via useTelemetryStore.getState().setTelemetry(...)
      2. Call useTelemetry() → assert result.telemetry equals mockIracingData
      3. Assert result.connected === true
      4. Assert result.error === null
    Expected Result: {telemetry: {...}, connected: true, error: null}
    Fear Indicators: Returns null when store has data, wrong shape, error populated incorrectly
    Evidence: .sisyphus/evidence/task-6-hook-refactor.txt

  Scenario: Hook shows loading state when store empty
    Tool: Bash (bun REPL + vitest)
    Steps:
      1. Ensure store telemetry is null, connected is false, error is null
      2. Call useTelemetry() → assert telemetry === null, connected === false, error === null
    Expected Result: Loading state (all null/false, no error)
    Evidence: .sisyphus/evidence/task-6-hook-loading.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `refactor(ui-core): useTelemetry consumes Zustand store, not local state`
  - Files: `packages/ui-core/src/hooks/useTelemetry.ts`
  - Pre-commit: `pnpm test -- packages/ui-core`

- [ ] 7. Create TelemetryBridge Component — Sole IPC→Store Subscriber

  **What to do**:
  - Create new React component: `apps/desktop/src/renderer/TelemetryBridge.tsx`
  - This is the SINGLE component that subscribes to `window.vantare.onTelemetry` IPC
  - On telemetry received: call `useTelemetryStore.getState().setTelemetry(data)`
  - On sim-state received: update store's connected field
  - Renders nothing visually (returns null) — pure side-effect component
  - Must handle cleanup: unsubscribe on unmount
  - Mount in `main.tsx` as sibling to `<App />` (wrapping both in React.StrictMode or fragment)
  - Write TDD test FIRST: mock window.vantare, emit telemetry, verify store updated
  - File: `apps/desktop/src/renderer/TelemetryBridge.tsx` (new)

  **Must NOT do**:
  - Don't render any UI — this is a zero-DOM component
  - Don't duplicate IPC subscriptions that exist elsewhere (after this, remove them)
  - Don't call setTelemetry if window.vantare is undefined (non-Electron envs)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-purpose side-effect component, clear pattern, small scope
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: TDD with mocked window.vantare

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11)
  - **Blocks**: Task 8 (App.tsx uses store instead of direct IPC)
  - **Blocked By**: Task 1 (store must exist), Task 6 (hook must exist)

  **References**:
  - `apps/desktop/src/renderer/App.tsx:16-31` — Current App.tsx IPC subscriptions: pattern to MOVE out of App into TelemetryBridge
  - `packages/ui-core/src/stores/telemetry-store.ts` — After Task 1: useTelemetryStore with setTelemetry action
  - `apps/desktop/src/preload/index.ts:4-8` — onTelemetry subscription shape
  - `apps/desktop/src/preload/index.ts:14-18` — onSimState subscription shape

  **Acceptance Criteria**:
  - [ ] Test: window.vantare.onTelemetry fires → store.telemetry updated
  - [ ] Test: window.vantare.onSimState fires → store.connected updated
  - [ ] Test: Component unmounts → IPC listeners cleaned up (no memory leak)
  - [ ] Test: React StrictMode double-mount → no duplicate IPC subscriptions (cleanup runs before re-mount)
  - [ ] Test: window.vantare is undefined → no crash, store not updated
  - [ ] Component renders null (zero DOM nodes)

  **QA Scenarios**:
  ```
  Scenario: TelemetryBridge feeds store from IPC
    Tool: Playwright (Electron app)
    Preconditions: App started with mock sim active
    Steps:
      1. Launch Electron app
      2. Wait 500ms for first telemetry push
      3. In Playwright, evaluate: window.__zustand__ or check DOM for telemetry indicators
      4. Assert store contains data (not null)
    Expected Result: Store populated with mock telemetry data within 1s of app launch
    Failure Indicators: Store stays null after 2s, crash, multiple subscribers detected
    Evidence: .sisyphus/evidence/task-7-bridge-feeds-store.png

  Scenario: Cleanup on unmount
    Tool: Bash (vitest)
    Steps:
      1. Mount TelemetryBridge in test
      2. Verify IPC listener registered
      3. Unmount component
      4. Verify IPC listener removed (mock window.vantare.onTelemetry tracks subscriptions)
    Expected Result: No listeners after unmount
    Evidence: .sisyphus/evidence/task-7-bridge-cleanup.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(desktop): TelemetryBridge — single IPC-to-store subscriber`
  - Files: `apps/desktop/src/renderer/TelemetryBridge.tsx`, `apps/desktop/src/renderer/main.tsx`
  - Pre-commit: `pnpm test -- apps/desktop`

- [ ] 8. Refactor App.tsx — Use useTelemetry Hook + TelemetryBridge

  **What to do**:
  - Replace direct `window.vantare.onTelemetry` and `window.vantare.onSimState` subscriptions in App.tsx with `useTelemetry()` hook
  - Remove `telemetry` local useState — use hook's return value `{telemetry, connected, error}`
  - Remove `demoMode` local useState — derive from hook's connected state or store
  - Mount `<TelemetryBridge />` in `main.tsx` before `<App />`
  - Update demo mode badge: show when `connected && sim is mock` (from store)
  - Remove `(data as any)` casts — use typed telemetry from hook
  - Write TDD test FIRST: render App with mocked store, assert badge renders correctly
  - File: `apps/desktop/src/renderer/App.tsx`

  **Must NOT do**:
  - Don't change App layout or styling
  - Don't add new features beyond telemetry data integration
  - Don't remove the Hub view placeholder

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Refactor of existing 59-line component, clear migration path
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: TDD for component behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 9, 10, 11)
  - **Blocks**: Task 9 (Debug overlay integration), Task 11 (E2E test)
  - **Blocked By**: Task 1 (store), Task 6 (hook), Task 7 (bridge)

  **References**:
  - `apps/desktop/src/renderer/App.tsx:1-59` — Current App.tsx: understand all IPC subscriptions to remove
  - `packages/ui-core/src/hooks/useTelemetry.ts` — After Task 6: new hook signature `{telemetry, connected, error}`
  - `packages/ui-core/src/stores/telemetry-store.ts` — After Task 1: store shape for deriving demo mode

  **Acceptance Criteria**:
  - [ ] Test: App renders with telemetry from store → shows sim name + RPM (not undefined)
  - [ ] Test: App renders without telemetry → shows "Waiting for sim..." message
  - [ ] Test: Demo mode badge visible when store.connected + mock active
  - [ ] Test: No `(data as any)` casts in App.tsx
  - [ ] Test: No direct `window.vantare` calls in App.tsx

  **QA Scenarios**:
  ```
  Scenario: App displays telemetry from store
    Tool: Playwright (Electron app)
    Preconditions: App started, TelemetryBridge mounted, mock sim active
    Steps:
      1. Launch Electron app
      2. Wait for telemetry indicator at bottom-left: "SIM: iracing | RPM: XXXX"
      3. Assert text contains "iracing" (not "-")
      4. Assert RPM is a number > 0
    Expected Result: Telemetry data visible, no "-" placeholders
    Failure Indicators: "SIM: -" shown (no data), crash, type errors
    Evidence: .sisyphus/evidence/task-8-app-telemetry.png

  Scenario: App shows demo mode state correctly
    Tool: Playwright
    Steps:
      1. Mock mode active → assert DEMO MODE badge visible (yellow)
      2. No mock, no sim → assert badge hidden, "Waiting for sim..." shown
    Expected Result: Correct UI state for each connection state
    Evidence: .sisyphus/evidence/task-8-app-demo-mode.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `refactor(desktop): App.tsx uses useTelemetry hook, TelemetryBridge for IPC`
  - Files: `apps/desktop/src/renderer/App.tsx`, `apps/desktop/src/renderer/main.tsx`
  - Pre-commit: `pnpm test -- apps/desktop`

- [ ] 9. Create Debug Tools Overlay — F-020 (FPS Counter + Latency Display)

  **What to do**:
  - Create `apps/desktop/src/renderer/DebugOverlay.tsx`
  - FPS Counter: use `requestAnimationFrame` loop, calculate rolling average over last 60 frames
  - Pipeline Latency: measure time from IPC receive (store timestamp) to render — display in ms
  - Re-render counter: track component render count via `useRef`
  - Memory usage: `performance.memory.usedJSHeapSize` (Chrome-only, graceful fallback)
  - Style: fixed top-left, semi-transparent dark background, monospace font, compact layout
  - Toggle: keyboard shortcut `Ctrl+Shift+D` (primary), `?debug=true` query param (secondary)
  - Write TDD test FIRST: render overlay, assert FPS counter updates
  - File: `apps/desktop/src/renderer/DebugOverlay.tsx` (new)

  **Must NOT do**:
  - Don't show debug overlay in production builds (check `process.env.NODE_ENV === 'production'`)
  - Don't affect main app performance — lightweight, off main thread
  - Don't use external animation libraries — pure rAF + React

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with performance-sensitive animation loop, visual design, and dev-tool UX
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Component tests for FPS counter, latency display

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 10, 11)
  - **Blocks**: Task 11 (E2E test verifies debug overlay)
  - **Blocked By**: Task 1 (store for latency measurement)

  **References**:
  - `apps/desktop/src/renderer/shared/components/StatusIndicator.tsx` — Pattern: shared component style to match
  - `packages/ui-core/src/stores/telemetry-store.ts` — Store timestamp for latency calculation

  **Acceptance Criteria**:
  - [ ] Test: DebugOverlay renders FPS counter (number updating)
  - [ ] Test: DebugOverlay shows pipeline latency in ms
  - [ ] Test: DebugOverlay hidden when `?debug=true` NOT in URL
  - [ ] Test: DebugOverlay visible when `?debug=true` in URL
  - [ ] Test: Memory usage displayed (or "N/A" gracefully if unavailable)

  **QA Scenarios**:
  ```
  Scenario: Debug overlay shows FPS and latency
    Tool: Playwright (Electron app)
    Preconditions: App started with ?debug=true, mock sim active
    Steps:
      1. Launch Electron app with debug param
      2. Assert debug overlay visible at top-left
      3. Assert FPS counter shows a number (e.g., "60 FPS")
      4. Assert latency display shows a number in ms
      5. Assert memory usage row visible
    Expected Result: All debug metrics visible and updating
    Failure Indicators: Overlay not visible, FPS shows 0 or NaN, crash
    Evidence: .sisyphus/evidence/task-9-debug-overlay.png

  Scenario: Debug overlay hidden without query param
    Tool: Playwright
    Steps:
      1. Launch Electron app without debug param
      2. Assert debug overlay NOT in DOM
    Expected Result: Overlay absent
    Evidence: .sisyphus/evidence/task-9-debug-hidden.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(desktop): Debug Tools overlay — FPS, latency, memory (F-020)`
  - Files: `apps/desktop/src/renderer/DebugOverlay.tsx`, `apps/desktop/src/renderer/App.tsx`
  - Pre-commit: `pnpm test -- apps/desktop`

- [ ] 10. Create Preview Overlay — F-028 (Dev-Only Perf Stats)

  **What to do**:
  - Create `apps/desktop/src/renderer/PreviewOverlay.tsx`
  - Shows real-time performance metrics for developers: FPS, frame time, store update frequency, component tree depth
  - Store update rate: count `setTelemetry` calls per second, display as "Updates: N/s"
  - Render time: use React Profiler or `performance.now()` around render
  - Bundle size indicator: static value from build (hardcoded or import.meta)
  - Style: fixed bottom-right, distinct from debug overlay (different color scheme: purple/blue tones)
  - Always visible in dev (`process.env.NODE_ENV !== 'production'`), hidden in production
  - Note: do NOT import `app` from electron in renderer — contextIsolation blocks it. Use env variable or IPC instead.
  - Write TDD test FIRST
  - File: `apps/desktop/src/renderer/PreviewOverlay.tsx` (new)

  **Must NOT do**:
  - Don't duplicate DebugOverlay (Task 9) — they show different metrics
  - Don't show in production builds

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with animated metrics, distinct visual design from debug overlay
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Component tests

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 11)
  - **Blocks**: Task 11 (E2E test)
  - **Blocked By**: Task 1 (store for update counting)

  **References**:
  - `apps/desktop/src/renderer/DebugOverlay.tsx` — After Task 9: sibling component, avoid visual overlap
  - `packages/ui-core/src/stores/telemetry-store.ts` — Store for counting update frequency

  **Acceptance Criteria**:
  - [ ] Test: PreviewOverlay renders in dev mode
  - [ ] Test: PreviewOverlay hidden in production (`process.env.NODE_ENV === 'production'`)
  - [ ] Test: Update rate counter increments when store updates
  - [ ] Test: Frame time displayed in ms
  - [ ] Visual: bottom-right position, purple/blue color scheme, does NOT overlap debug overlay

  **QA Scenarios**:
  ```
  Scenario: Preview overlay shows dev metrics
    Tool: Playwright (Electron app)
    Preconditions: App started in dev mode, mock sim active
    Steps:
      1. Launch Electron app
      2. Assert preview overlay visible at bottom-right
      3. Assert "Updates: N/s" counter shown (N > 0 after a few seconds)
      4. Assert frame time metric visible
    Expected Result: All dev metrics visible and updating
    Failure Indicators: Overlay not visible, counters stuck at 0, overlaps with debug overlay
    Evidence: .sisyphus/evidence/task-10-preview-overlay.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(desktop): Preview overlay — dev-only perf stats (F-028)`
  - Files: `apps/desktop/src/renderer/PreviewOverlay.tsx`, `apps/desktop/src/renderer/App.tsx`
  - Pre-commit: `pnpm test -- apps/desktop`

- [ ] 11. E2E Test — Mock Data Appears in React Component

  **What to do**:
  - Write Playwright E2E test that verifies the FULL pipeline end-to-end
  - Test: Launch Electron app → verify debug overlay shows telemetry → verify App.tsx displays sim name + RPM
  - Test: No crash on startup, no console errors
  - Test: Telemetry data flows within 2 seconds of app launch
  - Test: Demo mode badge visible when mock active
  - Use `apps/desktop/` existing Playwright config (`@playwright/test`)
  - Write test LAST (TDD: all unit tests pass first, E2E validates integration)
  - File: `apps/desktop/e2e/telemetry-pipeline.spec.ts` (new)

  **Must NOT do**:
  - Don't test individual units (those have their own vitest tests)
  - Don't test UI layout/styling — focus on data flow

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: End-to-end integration test requiring Playwright + Electron, validates full pipeline
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: E2E test as final validation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10)
  - **Blocks**: None (final gate before Final Wave)
  - **Blocked By**: Tasks 7, 8, 9 (all pipeline pieces must exist)

  **References**:
  - `apps/desktop/package.json:13` — Playwright test command: `playwright test`
  - `apps/desktop/src/renderer/App.tsx` — After Task 8: component to verify against
  - `apps/desktop/src/main/sim/sim-manager.ts` — After Task 2, 3: SimManager with normalization + detection

  **Acceptance Criteria**:
  - [ ] Test: `playwright test e2e/telemetry-pipeline` → PASS
  - [ ] Test: Telemetry data visible in DOM within 2s of launch
  - [ ] Test: Demo mode badge visible
  - [ ] Test: Sim name and RPM show real values (not "-" or undefined)
  - [ ] Test: No console errors during startup

  **QA Scenarios**:
  ```
  Scenario: Full pipeline E2E — mock data reaches React
    Tool: Playwright
    Preconditions: Built app, mock sim active
    Steps:
      1. Launch Electron app via Playwright
      2. Wait for selector: text=/SIM: iracing/
      3. Assert element contains "SIM: iracing | RPM: " followed by number > 0
      4. Assert DEMO MODE badge visible (yellow)
      5. Check console for errors → assert empty
    Expected Result: All pipeline stages verified: mock → SimManager → IPC → store → React
    Failure Indicators: No telemetry after 5s, console errors, crash on launch
    Evidence: .sisyphus/evidence/task-11-e2e-pipeline.png
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `test(desktop): E2E test for full telemetry pipeline`
  - Files: `apps/desktop/e2e/telemetry-pipeline.spec.ts`
  - Pre-commit: `pnpm test:e2e`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns (native adapters, OBS integration, `as any` in production code). Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [8/8] | Must NOT Have [7/7] | Tasks [11/11] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + linter + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in production, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify no duplicate IPC subscriptions outside TelemetryBridge.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute QA scenarios from Tasks 1-11 in sequence. Test cross-task integration: normalized data in store → hook returns it → App displays it → debug overlay shows metrics. Test edge cases: no sim running (mock fallback), rapid sim start/stop, empty process list, window destroyed during telemetry push. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance per task. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [11/11 compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(sim-core): enhance telemetry pipeline — store, normalizer, process detection`
- **Wave 2**: `feat(desktop): TelemetryBridge, debug overlays, useTelemetry integration`

---

## Success Criteria

### Verification Commands
```bash
pnpm test                    # All tests pass (existing + new TDD)
pnpm typecheck               # Zero type errors
pnpm build                   # 5/5 packages
```

### Final Checklist
- [ ] Mock sim → SimManager → Normalizer → IPC → Store → React: pipeline working
- [ ] Process detection correctly identifies iRacing/LMU/AC executables
- [ ] Debug overlay renders FPS counter and latency
- [ ] No `as any` in production code
- [ ] No duplicate IPC subscribers
- [ ] All tests pass with TDD workflow
