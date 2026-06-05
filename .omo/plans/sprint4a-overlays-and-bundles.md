# Sprint 4a — More Overlays + Bundle Architecture

## TL;DR

> **Quick Summary**: Ship a bundle-loadable registry plus 2 new overlays (Delta Bar, Stream Alerts), a complete CSS Animation system (F-024), fix the Standings auto-scroll bug, and lay the bundle infrastructure foundation for future themed variants.
> 
> **Deliverables**:
> - Bundle architecture (`bundles/default/` + lazy registry)
> - Refactor: existing Standings + Relative moved into bundle
> - CSS Animation System (F-024) — keyframes, utilities, theme-aware
> - Delta Bar Overlay (mínimo viable: barra visual + delta numérico)
> - Stream Alerts engine + UI (3 core types: overtake, pole, fastest lap)
> - Storybook stories for new overlays
> - Auto-scroll fix in Standings
> - Integration with OverlayManager + HttpServer
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves + final verification
> **Critical Path**: T1 (bundle infra) → T2/T3/T4 (parallel) → T5 → T6/T7 (parallel) → Final Wave

---

## Context

### Original Request
Continuar con Sprint 4 del roadmap. Decisión de scope: dividir en 4a (overlays nuevos + bundle infra) y 4b (Hub UI). Además, introducir arquitectura de bundles (foundation para futuras variantes temáticas) y resolver la deuda técnica del auto-scroll de Standings.

### Interview Summary
**Key Discussions**:
- **Scope split**: 4a (overlays) + 4b (Hub) — más manejable
- **Bundle architecture**: User introdujo la restricción "overlays deben ser bundles temáticos juntos" (preparar estructura para futuro)
- **Delta Bar**: Mínimo viable (barra + delta numérico, sin sectores/predicción/historial)
- **Stream Alerts**: 3 core types (overtake, pole, fastest lap)
- **CSS Animations**: Sistema completo con keyframes
- **Auto-scroll**: Incluir como T0
- **Alert engine**: Renderer hook
- **Mock events**: Storybook args + TelemetryFixture replay
- **Queue UX**: Single visible
- **Theme-aware animations**: Sí

**Metis Findings (incorporated)**:
- 5 empty placeholder directories to delete
- `mock-telemetry-seeder.ts` boundary violation (main → renderer import) — must move
- Inline CSS in Standings/Relative duplicates per window — must move to bundle CSS
- `useAppStore` is dead code — don't use for alerts
- Existing `calculateDeltaToBest` and `lap.isSessionBest` flag — REUSE
- Bundle cache: `Map<string, Promise<Bundle>>` for in-flight dedup

**Oracle Findings (incorporated)**:
- URL keys: `delta` (no `-bar` suffix) to match `OverlayManager.registerDefaults()` line 24
- Active theme: hardcode `'default'` for Sprint 4a, TODO for Sprint 4b
- Auto-scroll criterion: explicit and testable
- Pole detection: explicit logic with `sessionInfo.type === 'Qualifying'`
- Directory structure: nested per-overlay (matches existing placeholder pattern)

### Metis + Oracle Review
**Issues Addressed**:
- Bundle refactor risk → 142 existing tests must still pass
- CSS animation conflicts → `hf-` prefix
- Alert engine complexity → explicit state machine
- `delta-bar` URL test (line 89) → update to `?overlay=delta`
- 5 empty placeholder directories → delete in T1
- `mock-telemetry-seeder.ts` boundary → move to renderer-safe location
- Bundle registry cache → `Map<string, Promise<Bundle>>`
- TDD pitfalls for animations → wiring tests only (className assertion)

---

## Work Objectives

### Core Objective
Ship a bundle-loadable registry plus 2 new overlays (Delta Bar, Stream Alerts), a complete CSS Animation system (F-024), fix the Standings auto-scroll bug, and lay the bundle infrastructure foundation for future themed variants.

### Concrete Deliverables
- `apps/desktop/src/renderer/bundles/registry.ts` — lazy registry with in-flight dedup
- `apps/desktop/src/renderer/bundles/types.ts` — Bundle interface
- `apps/desktop/src/renderer/bundles/default/` — nested per-overlay bundle
  - `standings/Standings.tsx` + tests + stories
  - `relative/Relative.tsx` + tests + stories
  - `delta/DeltaBar.tsx` + tests + stories
  - `stream-alerts/StreamAlerts.tsx` + tests + stories
  - `styles.css`, `animations.css`
  - `index.ts` (manifest)
- `apps/desktop/src/renderer/shared/hooks/useAlertDetector.ts` — renderer hook
- `apps/desktop/src/renderer/shared/stores/alerts-store.ts` — Zustand store
- `apps/desktop/src/renderer/__fixtures__/mock-telemetry-seeder.ts` — moved from main
- `apps/desktop/src/renderer/overlays/OverlayShell.tsx` — refactored to bundle-aware

### Definition of Done
- [ ] `pnpm turbo test typecheck build` — all packages pass
- [ ] `?overlay=delta` returns Delta Bar component via HttpServer
- [ ] `?overlay=stream-alerts` returns Stream Alerts component via HttpServer
- [ ] Auto-scroll fires when player position changes outside viewport
- [ ] Alert engine detects overtake/pole/fastest_lap from telemetry
- [ ] Storybook stories for DeltaBar + StreamAlerts + animations demo
- [ ] All 142 existing tests still pass (no regression from bundle refactor)
- [ ] 5 empty placeholder directories deleted

### Must Have
- Bundle infrastructure with lazy registry and in-flight dedup
- All 4 overlays (Standings, Relative, Delta, StreamAlerts) in `bundles/default/`
- CSS Animation system with `hf-` prefixed classes
- Delta Bar mínimo viable (barra visual + delta numérico)
- Stream Alerts (3 core types, single visible, auto-dismiss 5s)
- Auto-scroll in Standings
- All existing tests pass
- PURE CSS animations (no JS libs)

### Must NOT Have (Guardrails)
- **NO** JS animation libraries (framer-motion, react-spring, anime.js, gsap, etc.)
- **NO** audio alerts (visual-only for Sprint 4a)
- **NO** sectors, lap history, or prediction in Delta Bar
- **NO** custom alert conditions (exactly 3 core types)
- **NO** hotkey dismissal for alerts
- **NO** useAppStore for alerts (it's dead code; create new dedicated store)
- **NO** active theme via IPC (hardcode 'default' for Sprint 4a)
- **NO** Hub UI changes (Sprint 4b scope)
- **NO** real telemetry events (Sprint 5)
- **NO** per-overlay settings UI (Sprint 4b Hub)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest + @testing-library/react from Sprint 3)
- **Automated tests**: TDD (rojo-verde-refactor)
- **Framework**: Vitest + @testing-library/react
- **Animation tests**: Wiring tests only (className assertion) — JSDOM doesn't run CSS animations
- **Alert engine tests**: Behavioral with `createTelemetryStore()` factory + `vi.useFakeTimers()`

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Component**: Vitest + render from @testing-library/react
- **Bundle registry**: Vitest + Promise.race for in-flight dedup test
- **CSS animation**: Vitest (wiring test) + snapshot test of CSS file content
- **HttpServer**: Bash (curl)
- **Storybook**: Bash (build-storybook exit code)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — auto-scroll fix + bundle foundation):
├── T0: Fix auto-scroll in Standings [quick]
└── T1: Bundle infrastructure + refactor existing overlays [deep]

Wave 2 (After Wave 1 — parallel foundation modules):
├── T2: CSS Animation System (F-024) [quick]
├── T3: Delta Bar Overlay [deep]
└── T4: Stream Alerts Engine (hook + store + detection) [deep]

Wave 3 (After Wave 2 — UI layer):
└── T5: Stream Alerts Overlay UI [deep]

Wave 4 (After Wave 3 — stories + integration):
├── T6: Storybook stories (DeltaBar, StreamAlerts, animations) [quick]
└── T7: Integration (OverlayManager + HttpServer) [deep]

Final Verification Wave (After ALL implementation):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high)
└── F4: Scope Fidelity Check (deep)

Critical Path: T1 → T4 → T5 → T7 → F1-F4 (T2/T3 parallel)
Parallel Speedup: ~55% faster than sequential
Max Concurrent: 3 (Wave 2)
```

### Dependency Matrix
- **T0**: None (independent) → standalone
- **T1**: None (foundation) → blocks T2, T3, T4, T5, T6, T7
- **T2**: T1 → blocks T5 (needs animations)
- **T3**: T1 → blocks T6, T7
- **T4**: T1 → blocks T5
- **T5**: T1, T2, T4 → blocks T6, T7
- **T6**: T1, T3, T5 → standalone
- **T7**: T1, T3, T5 → standalone
- **F1-F4**: All above

### Agent Dispatch Summary
- **Wave 1 (2)**: T0 → `quick`, T1 → `deep`
- **Wave 2 (3)**: T2 → `quick`, T3 → `deep`, T4 → `deep`
- **Wave 3 (1)**: T5 → `deep`
- **Wave 4 (2)**: T6 → `quick`, T7 → `deep`
- **Final (4)**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Fix auto-scroll in Standings (T0)

  **What to do**:
  - Define success criterion (Oracle #3 fix): `scrollIntoView({ behavior: 'smooth', block: 'center' })` called on player row when (a) initial render AND player position > 20, OR (b) player position changes AND new position is not in current viewport
  - Add `useRef<HTMLDivElement>` for player row
  - Add `useRef<HTMLDivElement>` for container
  - Add `useEffect` that compares container scroll position vs player row position
  - Call `playerRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })` when out of view
  - TDD: write failing test first (ref callback spy captures scrollIntoView call)
  - Update `apps/desktop/src/renderer/bundles/default/standings/Standings.test.tsx`

  **Must NOT do**:
  - Don't change Standings visual design
  - Don't add scroll buttons or manual scroll controls
  - Don't refactor anything else

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Small targeted fix with clear AC. TDD pattern established in Sprint 3.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None (independent of bundle refactor)

  **References**:
  - `apps/desktop/src/renderer/overlays/Standings.tsx:1-200` — current implementation
  - `apps/desktop/src/renderer/overlays/__tests__/Standings.test.tsx` — existing test patterns
  - `packages/sim-core/src/types/index.ts:32-50` — VehicleData with `position` and `isPlayer`
  - `apps/desktop/.storybook/main.ts:5` — story glob

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop test -- Standings.test.tsx -t "auto-scroll"` exits 0
  - [ ] Test asserts `scrollIntoView` was called when position changes from 3 to 25
  - [ ] Test asserts `scrollIntoView` was NOT called when position changes from 3 to 5 (still in viewport)
  - [ ] Test asserts `scrollIntoView` was called on initial render when player position is 25
  - [ ] No regression in existing Standings tests

  **QA Scenarios**:
  ```
  Scenario: Player position change triggers auto-scroll
    Tool: Vitest + @testing-library/react
    Preconditions: Standings rendered with 30 vehicles, player at position 3
    Steps:
      1. Render Standings with 30 vehicles (positions 1-30)
      2. Verify scrollIntoView NOT called (position 3 is in first 20 rows)
      3. Update player position from 3 to 25 (re-render)
      4. Assert scrollIntoView was called on player row
    Expected Result: Test passes
    Evidence: .omo/evidence/task-1-auto-scroll-position-change.png

  Scenario: Player position within viewport does NOT trigger scroll
    Tool: Vitest
    Preconditions: Standings rendered with 30 vehicles, player at position 3
    Steps:
      1. Render Standings
      2. Update player position from 3 to 5
      3. Assert scrollIntoView NOT called
    Expected Result: Test passes
    Evidence: .omo/evidence/task-1-auto-scroll-no-change.png
  ```

  **Commit**: YES
  - Message: `fix(standings): auto-scroll player row when position changes outside viewport`
  - Files: `apps/desktop/src/renderer/bundles/default/standings/Standings.tsx`, `apps/desktop/src/renderer/bundles/default/standings/Standings.test.tsx`

---

- [x] 2. Bundle infrastructure + refactor existing overlays (T1)

  **What to do**:
  - Create `apps/desktop/src/renderer/bundles/types.ts`:
    ```ts
    export type OverlayId = 'standings' | 'relative' | 'delta' | 'stream-alerts';
    export interface Bundle {
      id: string;
      name: string;
      components: Record<OverlayId, React.ComponentType>;
    }
    ```
  - Create `apps/desktop/src/renderer/bundles/registry.ts`:
    - `Map<string, Promise<Bundle>>` for in-flight dedup
    - `loadBundle(themeId: string): Promise<Bundle>` — lazy import with fallback to 'default'
    - `getAvailableBundles(): string[]` — list registered bundles
    - `__resetBundleCache(): void` — test helper
  - Create `apps/desktop/src/renderer/bundles/default/` with nested structure:
    - `standings/Standings.tsx` (move from `overlays/Standings.tsx`)
    - `standings/Standings.test.tsx`
    - `standings/Standings.stories.tsx`
    - `relative/Relative.tsx` (move)
    - `relative/Relative.test.tsx`
    - `relative/Relative.stories.tsx`
    - `styles.css` — extracted from inline `<style>` blocks
    - `index.ts` — exports `{ default: { id: 'default', name: 'Default', components: {...} } }`
  - Move `apps/desktop/src/main/sim/mock-telemetry-seeder.ts` to `apps/desktop/src/renderer/__fixtures__/mock-telemetry-seeder.ts`
  - Update all imports: `Standings.stories.tsx:3`, `Relative.stories.tsx:3`, `Standings.test.tsx`, `Relative.test.tsx`
  - Refactor `apps/desktop/src/renderer/overlays/OverlayShell.tsx`:
    - Use `loadBundle('default')` to get bundle
    - Resolve component via `bundle.components[overlayId]`
    - Hardcode `themeId = 'default'` with TODO comment
  - Update `apps/desktop/src/renderer/overlays/__tests__/OverlayShell.test.tsx`:
    - Change test on line 89 from `?overlay=delta-bar` to `?overlay=delta`
    - Add test: `?overlay=delta` returns Delta Bar component (after T3)
  - Delete 5 empty placeholder directories:
    - `apps/desktop/src/renderer/overlays/delta/`
    - `apps/desktop/src/renderer/overlays/stream-alerts/`
    - `apps/desktop/src/renderer/overlays/standings/`
    - `apps/desktop/src/renderer/overlays/relative/`
    - `apps/desktop/src/renderer/hub/pages/`
  - Update `apps/desktop/.storybook/main.ts` stories glob to include `bundles/`
  - TDD: write tests for bundle registry first (loadBundle, dedup, fallback)

  **Must NOT do**:
  - Don't change existing Standings/Relative visual design (just move + extract CSS)
  - Don't add dark/blood/midnight bundles yet
  - Don't wire IPC for active theme
  - Don't touch `bundles/default/standings/Standings.tsx` auto-scroll (that's T0)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Multi-file refactor with 5 file deletions, import updates across multiple files, and architectural foundation. Requires careful sequencing.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T0)
  - **Parallel Group**: Wave 1
  - **Blocks**: T2, T3, T4, T5, T6, T7
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/renderer/overlays/Standings.tsx:1-200` — current Standings (to move)
  - `apps/desktop/src/renderer/overlays/Relative.tsx:1-260` — current Relative (to move)
  - `apps/desktop/src/renderer/overlays/OverlayShell.tsx:1-67` — current router (to refactor)
  - `apps/desktop/src/main/sim/mock-telemetry-seeder.ts:1-200` — to move
  - `apps/desktop/src/renderer/overlays/Standings.stories.tsx:3` — import to update
  - `apps/desktop/src/renderer/overlays/Relative.stories.tsx:3` — import to update
  - `apps/desktop/src/renderer/overlays/__tests__/Standings.test.tsx:170` — inline CSS assertion to update
  - `apps/desktop/src/renderer/overlays/__tests__/OverlayShell.test.tsx:89` — test to update
  - `apps/desktop/src/main/windows/overlay-manager.ts:24-25` — `delta` and `stream-alerts` IDs
  - `apps/desktop/.storybook/main.ts:5` — stories glob

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop typecheck` returns 0 errors
  - [ ] `pnpm --filter @vantare/desktop test` returns all 142 existing tests pass + 5+ new bundle/registry tests
  - [ ] `find apps/desktop/src/renderer/overlays -type d -empty` returns 0 results
  - [ ] `find apps/desktop/src/renderer/hub/pages -type d -empty` returns 0 results
  - [ ] `pnpm --filter @vantare/desktop test -- bundles/__tests__/registry.test.ts -t "dedupes in-flight loads"` exits 0
  - [ ] `pnpm --filter @vantare/desktop test -- bundles/__tests__/registry.test.ts -t "falls back to default on missing theme"` exits 0
  - [ ] `pnpm --filter @vantare/desktop test -- OverlayShell.test.tsx -t "delta"` exits 0 (now resolves to component, not null)
  - [ ] `pnpm --filter @vantare/desktop test -- Standings.test.tsx` exits 0 (refactored, all tests pass)
  - [ ] `pnpm --filter @vantare/desktop test -- Relative.test.tsx` exits 0 (refactored, all tests pass)

  **QA Scenarios**:
  ```
  Scenario: Bundle registry loads 'default' bundle
    Tool: Vitest
    Preconditions: None
    Steps:
      1. Call loadBundle('default')
      2. Assert result.id === 'default'
      3. Assert result.components.standings is a React component
    Expected Result: Test passes
    Evidence: .omo/evidence/task-2-bundle-load.png

  Scenario: In-flight load dedup
    Tool: Vitest
    Preconditions: None
    Steps:
      1. Call loadBundle('default') twice in parallel
      2. Assert both return the same Promise
      3. Assert import counter is 1
    Expected Result: Test passes
    Evidence: .omo/evidence/task-2-bundle-dedup.png

  Scenario: Missing theme falls back to default
    Tool: Vitest
    Preconditions: None
    Steps:
      1. Call loadBundle('nonexistent')
      2. Assert result.id === 'default'
    Expected Result: Test passes
    Evidence: .omo/evidence/task-2-bundle-fallback.png

  Scenario: Empty directories deleted
    Tool: Bash
    Preconditions: T1 complete
    Steps:
      1. Run `find apps/desktop/src/renderer/overlays apps/desktop/src/renderer/hub/pages -type d -empty`
      2. Assert no output
    Expected Result: Empty (no empty directories)
    Evidence: .omo/evidence/task-2-empty-dirs-deleted.txt
  ```

  **Commit**: YES
  - Message: `refactor(renderer): introduce bundle architecture with default/ bundle`
  - Files: `bundles/`, `overlays/`, `__fixtures__/`, `.storybook/main.ts`

---

- [x] 3. CSS Animation System (F-024)

  **What to do**:
  - Create `apps/desktop/src/renderer/bundles/default/animations.css`:
    - CSS vars: `--hf-accent`, `--hf-glow-color`, `--hf-fade-duration: 200ms`, etc.
    - Keyframes:
      - `@keyframes hf-fade-in` (0% opacity 0, 100% opacity 1)
      - `@keyframes hf-fade-out` (0% opacity 1, 100% opacity 0)
      - `@keyframes hf-slide-up` (translateY(20px) → 0)
      - `@keyframes hf-slide-down` (translateY(-20px) → 0)
      - `@keyframes hf-pulse` (scale 1 → 1.05 → 1)
      - `@keyframes hf-glow` (box-shadow with `--hf-glow-color`)
      - `@keyframes hf-scale-in` (scale 0.9 → 1)
    - Utility classes: `.hf-fade-in`, `.hf-fade-out`, `.hf-slide-up`, `.hf-pulse`, `.hf-glow`, `.hf-scale-in`
    - `@media (prefers-reduced-motion: reduce) { .hf-* { animation-duration: 0.01ms !important; } }`
  - Import in `apps/desktop/src/renderer/bundles/default/index.ts`
  - TDD: write snapshot test of CSS file content, wiring tests for className application
  - DO NOT use JS animation libraries

  **Must NOT do**:
  - No `framer-motion`, `react-spring`, `anime.js`, `gsap`, `motion`
  - No inline animation styles
  - No @keyframes without `prefers-reduced-motion` fallback

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Pure CSS file with clear keyframes spec. No business logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4)
  - **Parallel Group**: Wave 2
  - **Blocks**: T5
  - **Blocked By**: T1

  **References**:
  - `apps/desktop/src/renderer/bundles/default/styles.css` — existing CSS for class naming conventions
  - `apps/desktop/src/renderer/themes/dark.json` — theme tokens (for CSS var reference)
  - `apps/desktop/src/renderer/themes/index.ts` — theme loader

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop test -- bundles/default/__tests__/animations.test.tsx` returns all tests passed
  - [ ] CSS file contains `@keyframes hf-fade-in`, `@keyframes hf-fade-out`, `@keyframes hf-slide-up`, `@keyframes hf-slide-down`, `@keyframes hf-pulse`, `@keyframes hf-glow`, `@keyframes hf-scale-in`
  - [ ] CSS file contains `@media (prefers-reduced-motion: reduce)` block
  - [ ] All keyframes use CSS vars (not hardcoded colors)
  - [ ] Test: `expect(element.className).toContain('hf-fade-in')` passes

  **QA Scenarios**:
  ```
  Scenario: Animation className is applied to element
    Tool: Vitest + @testing-library/react
    Preconditions: animations.css imported
    Steps:
      1. Render `<div className="hf-fade-in" />`
      2. Assert className contains 'hf-fade-in'
    Expected Result: Test passes
    Evidence: .omo/evidence/task-3-anim-classname.png

  Scenario: prefers-reduced-motion CSS rule exists
    Tool: Bash (read CSS file)
    Preconditions: animations.css exists
    Steps:
      1. `grep "prefers-reduced-motion" apps/desktop/src/renderer/bundles/default/animations.css`
      2. Assert non-empty output
    Expected Result: CSS contains the media query
    Evidence: .omo/evidence/task-3-reduced-motion.txt

  Scenario: All keyframes are defined
    Tool: Bash (read CSS file)
    Preconditions: animations.css exists
    Steps:
      1. `grep -c "@keyframes" apps/desktop/src/renderer/bundles/default/animations.css`
      2. Assert output is 7
    Expected Result: 7 keyframes defined
    Evidence: .omo/evidence/task-3-keyframes-count.txt
  ```

  **Commit**: YES
  - Message: `feat(animations): add CSS animation system (F-024) with hf- prefixed keyframes`
  - Files: `apps/desktop/src/renderer/bundles/default/animations.css`, `apps/desktop/src/renderer/bundles/default/__tests__/animations.test.tsx`

---

- [x] 4. Delta Bar Overlay (T3)

  **What to do**:
  - Create `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.tsx`:
    - Reads `lap.lastLaptime` and `lap.bestLaptime` from telemetry
    - Uses `calculateDeltaToBest` from `@vantare/sim-core/calculations/delta`
    - Visual bar: center at 0, expands left (negative, green) / right (positive, red)
    - Numeric display: "+0.234s" or "-1.123s"
    - Handles `bestLaptime === 0` (empty state — show "—")
    - Handles `lastLaptime === 0` (session start — show "—")
    - Handles NaN explicitly (defensive)
  - Create `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.test.tsx`:
    - Renders with valid telemetry → shows delta
    - Renders with `bestLaptime === 0` → shows "—"
    - Renders with `lastLaptime === 0` → shows "—"
    - Renders with `lastLaptime > bestLaptime` → red color
    - Renders with `lastLaptime < bestLaptime` → green color
  - Add to bundle manifest in `apps/desktop/src/renderer/bundles/default/index.ts`:
    ```ts
    components: { ..., delta: DeltaBar }
    ```

  **Must NOT do**:
  - No sectors, lap history, or prediction
  - No Zod config schema (defer to 4b)
  - No custom hooks (use existing `useTelemetry()`)
  - No new state management

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Component with multiple states and edge case handling. TDD with snapshot + behavior tests.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T4)
  - **Parallel Group**: Wave 2
  - **Blocks**: T6, T7
  - **Blocked By**: T1

  **References**:
  - `apps/desktop/src/renderer/bundles/default/standings/Standings.tsx` — visual pattern
  - `packages/sim-core/src/calculations/delta.ts:5-7` — `calculateDeltaToBest`
  - `packages/sim-core/src/types/index.ts:77-90` — `LapData` interface
  - `apps/desktop/src/renderer/bundles/default/styles.css` — shared CSS

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop test -- DeltaBar.test.tsx` returns all tests passed
  - [ ] Test: `bestLaptime === 0` → shows "—" (not NaN, not "0.000s")
  - [ ] Test: `lastLaptime === 0` → shows "—" (not "+0.0s")
  - [ ] Test: `lastLaptime > bestLaptime` → red color class
  - [ ] Test: `lastLaptime < bestLaptime` → green color class
  - [ ] Test: uses `calculateDeltaToBest` from sim-core (not local implementation)
  - [ ] `pnpm --filter @vantare/desktop typecheck` returns 0 errors

  **QA Scenarios**:
  ```
  Scenario: Delta Bar renders with valid telemetry
    Tool: Vitest
    Preconditions: Mock telemetry with lastLaptime=82.5, bestLaptime=82.0
    Steps:
      1. Render <DeltaBar telemetry={mockTelemetry} />
      2. Assert text "+0.500s" is visible
      3. Assert bar has red color class
    Expected Result: Test passes
    Evidence: .omo/evidence/task-4-delta-valid.png

  Scenario: Delta Bar handles empty state
    Tool: Vitest
    Preconditions: Mock telemetry with bestLaptime=0
    Steps:
      1. Render <DeltaBar telemetry={mockTelemetry} />
      2. Assert text "—" is visible
      3. Assert no NaN in DOM
    Expected Result: Test passes
    Evidence: .omo/evidence/task-4-delta-empty.png
  ```

  **Commit**: YES
  - Message: `feat(overlays): add Delta Bar overlay with visual bar and numeric delta`
  - Files: `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.tsx`, `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.test.tsx`, `apps/desktop/src/renderer/bundles/default/index.ts`

---

- [x] 5. Stream Alerts Engine (T4)

  **What to do**:
  - Create `apps/desktop/src/renderer/shared/types/alerts.ts`:
    ```ts
    export type AlertType = 'overtake' | 'pole' | 'fastest_lap';
    export interface Alert {
      id: string;          // unique, e.g., `${timestamp}-${type}`
      type: AlertType;
      timestamp: number;
      message: string;
      data: Record<string, unknown>;
    }
    ```
  - Create `apps/desktop/src/renderer/shared/stores/alerts-store.ts`:
    - Zustand store with state: `{ currentAlert: Alert | null; queue: Alert[]; }`
    - Actions: `enqueueAlert(alert)`, `dismissCurrent()`, `clearQueue()`
    - Queue cap: 5 alerts (drop oldest on overflow)
    - State machine: `idle` → `showing` → `dismissing` → `idle`
  - Create `apps/desktop/src/renderer/shared/hooks/useAlertDetector.ts`:
    - Uses `useTelemetryStore` from `@vantare/ui-core`
    - Compares consecutive telemetry snapshots
    - Detection logic:
      - **Overtake**: `prevPlayerPosition > newPlayerPosition` (player moved up) AND multi-car
      - **Pole**: `sessionInfo.type === 'Qualifying'` AND `newPlayerPosition === 1` AND `prevPlayerPosition !== 1`
      - **Fastest lap**: `lap.isSessionBest === true` AND was `false` previously
    - Calls `enqueueAlert()` when detected
    - On telemetry disconnect: `clearQueue()`
  - Add `deterministicRaceState()` to `apps/desktop/src/renderer/__fixtures__/mock-telemetry-seeder.ts`:
    - Sequential player positions: 5 → 3 → 1 → 2 (for testing overtake, pole)
    - Lap with `isSessionBest: true` (for fastest lap)
  - TDD: write tests first with `createTelemetryStore()` factory + `vi.useFakeTimers()`

  **Must NOT do**:
  - No IPC extra (use existing telemetry store)
  - No audio (visual-only)
  - No custom alert conditions (exactly 3 types)
  - No `useAppStore` (dead code)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Complex state machine + hook + detection logic. TDD with deterministic fixtures.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T3)
  - **Parallel Group**: Wave 2
  - **Blocks**: T5
  - **Blocked By**: T1

  **References**:
  - `packages/sim-core/src/types/index.ts:32-50` — `VehicleData` (position, isPlayer)
  - `packages/sim-core/src/types/index.ts:77-90` — `LapData` (isSessionBest flag!)
  - `packages/sim-core/src/types/index.ts:92-102` — `SessionData` (type: string for qualifying)
  - `apps/desktop/src/renderer/__fixtures__/mock-telemetry-seeder.ts:144, 171` — existing Math.random() usage to fix
  - `@vantare/ui-core` — `useTelemetryStore`, `createTelemetryStore()` factory

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop test -- useAlertDetector.test.tsx` returns all tests passed
  - [ ] Test: overtake detected when player position changes from 5 to 3
  - [ ] Test: pole detected when `sessionInfo.type === 'Qualifying'` and position changes to 1
  - [ ] Test: fastest lap detected when `lap.isSessionBest === true` (was false)
  - [ ] Test: queue cap = 5, oldest dropped on 6th enqueue
  - [ ] Test: queue drained on telemetry disconnect
  - [ ] Test: deterministic telemetry used (no Math.random() in test path)
  - [ ] `pnpm --filter @vantare/desktop typecheck` returns 0 errors

  **QA Scenarios**:
  ```
  Scenario: Overtake detection
    Tool: Vitest + vi.useFakeTimers
    Preconditions: Create telemetry store with deterministic seeder
    Steps:
      1. Push telemetry with player position 5
      2. Advance timers by 62.5ms
      3. Push telemetry with player position 3
      4. Advance timers by 62.5ms
      5. Assert store.currentAlert is not null
      6. Assert store.currentAlert.type === 'overtake'
    Expected Result: Overtake alert in queue
    Evidence: .omo/evidence/task-5-overtake-detected.png

  Scenario: Pole position detection
    Tool: Vitest
    Preconditions: sessionInfo.type === 'Qualifying'
    Steps:
      1. Push telemetry with player position 2, qualifying session
      2. Push telemetry with player position 1, qualifying session
      3. Assert store.currentAlert.type === 'pole'
    Expected Result: Pole alert in queue
    Evidence: .omo/evidence/task-5-pole-detected.png

  Scenario: Fastest lap detection
    Tool: Vitest
    Preconditions: Player on track
    Steps:
      1. Push telemetry with lap.isSessionBest: false
      2. Push telemetry with lap.isSessionBest: true
      3. Assert store.currentAlert.type === 'fastest_lap'
    Expected Result: Fastest lap alert in queue
    Evidence: .omo/evidence/task-5-fastest-detected.png

  Scenario: Queue cap
    Tool: Vitest
    Preconditions: Queue has 5 alerts
    Steps:
      1. Enqueue 6th alert
      2. Assert queue length === 5
      3. Assert oldest alert was dropped
    Expected Result: Queue capped at 5
    Evidence: .omo/evidence/task-5-queue-cap.png
  ```

  **Commit**: YES
  - Message: `feat(alerts): add useAlertDetector hook with overtake/pole/fastest_lap detection`
  - Files: `apps/desktop/src/renderer/shared/types/alerts.ts`, `apps/desktop/src/renderer/shared/stores/alerts-store.ts`, `apps/desktop/src/renderer/shared/hooks/useAlertDetector.ts`, `apps/desktop/src/renderer/__fixtures__/mock-telemetry-seeder.ts`

---

- [x] 6. Stream Alerts UI (T5)

  **What to do**:
  - Create `apps/desktop/src/renderer/bundles/default/stream-alerts/StreamAlerts.tsx`:
    - Subscribes to `useAlertsStore` (from T4)
    - Renders `currentAlert` if not null
    - Auto-dismiss after 5s (`ALERT_DISMISS_MS = 5000`)
    - Click to dismiss
    - Uses `hf-fade-in` + `hf-fade-out` classes from T2 animations
    - On `onAnimationEnd`, calls `dismissCurrent()` and triggers next in queue
    - Handles `prefers-reduced-motion: reduce` (animations disabled via CSS)
  - Create `apps/desktop/src/renderer/bundles/default/stream-alerts/StreamAlerts.test.tsx`:
    - Renders no alert when queue empty
    - Renders current alert when one present
    - Click dismisses alert
    - Auto-dismiss after 5s (use `vi.useFakeTimers()` + `vi.advanceTimersByTime(5000)`)
    - Animations applied (`hf-fade-in` className on enter)
  - Add to bundle manifest

  **Must NOT do**:
  - No keyboard dismissal (out of scope for 4a)
  - No settings UI for alert position/duration
  - No audio

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: UI component with state management, animations, and timing logic.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (alone)
  - **Blocks**: T6, T7
  - **Blocked By**: T1, T2, T4

  **References**:
  - `apps/desktop/src/renderer/shared/stores/alerts-store.ts` — store from T4
  - `apps/desktop/src/renderer/bundles/default/animations.css` — animation classes from T2
  - `apps/desktop/src/renderer/bundles/default/standings/Standings.tsx` — component pattern
  - `apps/desktop/src/renderer/bundles/default/styles.css` — shared CSS

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop test -- StreamAlerts.test.tsx` returns all tests passed
  - [ ] Test: no alert rendered when `currentAlert === null`
  - [ ] Test: alert rendered with `hf-fade-in` class when entering
  - [ ] Test: click on alert dismisses it
  - [ ] Test: auto-dismiss after 5s (`vi.advanceTimersByTime(5000)`)
  - [ ] Test: next alert in queue shown after current dismissed
  - [ ] Test: `prefers-reduced-motion: reduce` → no `hf-fade-in` class
  - [ ] `pnpm --filter @vantare/desktop typecheck` returns 0 errors

  **QA Scenarios**:
  ```
  Scenario: Alert renders with animation class
    Tool: Vitest + @testing-library/react
    Preconditions: Alert in store
    Steps:
      1. Add overtake alert to store
      2. Render <StreamAlerts />
      3. Assert alert element has 'hf-fade-in' class
    Expected Result: Test passes
    Evidence: .omo/evidence/task-6-alert-anim.png

  Scenario: Click dismisses alert
    Tool: Vitest
    Preconditions: Alert in store
    Steps:
      1. Add overtake alert
      2. Render component
      3. Click on alert element
      4. Assert currentAlert === null
    Expected Result: Test passes
    Evidence: .omo/evidence/task-6-click-dismiss.png

  Scenario: Auto-dismiss after 5 seconds
    Tool: Vitest + vi.useFakeTimers
    Preconditions: Alert in store
    Steps:
      1. Add overtake alert
      2. Render component
      3. vi.advanceTimersByTime(5000)
      4. Assert currentAlert === null
    Expected Result: Test passes
    Evidence: .omo/evidence/task-6-auto-dismiss.png
  ```

  **Commit**: YES
  - Message: `feat(overlays): add Stream Alerts overlay with auto-dismiss and queue`
  - Files: `apps/desktop/src/renderer/bundles/default/stream-alerts/StreamAlerts.tsx`, `apps/desktop/src/renderer/bundles/default/stream-alerts/StreamAlerts.test.tsx`, `apps/desktop/src/renderer/bundles/default/index.ts`

---

- [x] 7. Storybook stories (T6)

  **What to do**:
  - Create `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.stories.tsx` (3+ stories):
    - `Default` — negative delta (faster than best)
    - `SlowerThanBest` — positive delta
    - `EmptyState` — `bestLaptime === 0`
    - `SessionStart` — `lastLaptime === 0`
  - Create `apps/desktop/src/renderer/bundles/default/stream-alerts/StreamAlerts.stories.tsx` (3+ stories):
    - `Overtake` — overtake alert visible
    - `Pole` — pole alert
    - `FastestLap` — fastest lap alert
    - `Queue` — multiple alerts queued (one shown, others in queue)
  - Create `apps/desktop/src/renderer/bundles/default/__stories__/animations.stories.tsx` (1+ story):
    - `AllAnimations` — show element with each animation class for visual verification
  - Use CSF3 format (same as Sprint 3)
  - Verify `pnpm --filter @vantare/desktop build-storybook` exits 0

  **Must NOT do**:
  - No new dependencies
  - No complex story composition (keep simple)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Pattern established in Sprint 3. CSF3 format. Simple copy-adapt.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T1, T3, T5

  **References**:
  - `apps/desktop/src/renderer/bundles/default/standings/Standings.stories.tsx` — existing CSF3 pattern
  - `apps/desktop/src/renderer/bundles/default/relative/Relative.stories.tsx` — existing CSF3 pattern
  - `apps/desktop/.storybook/main.ts` — story config
  - `apps/desktop/.storybook/preview.ts` — preview config

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @vantare/desktop build-storybook` exits 0
  - [ ] DeltaBar.stories.tsx has ≥3 stories (Default, SlowerThanBest, EmptyState)
  - [ ] StreamAlerts.stories.tsx has ≥3 stories (Overtake, Pole, FastestLap)
  - [ ] animations.stories.tsx has ≥1 story demonstrating all animation classes
  - [ ] All stories use CSF3 format
  - [ ] No new dependencies added

  **QA Scenarios**:
  ```
  Scenario: Storybook build succeeds
    Tool: Bash
    Preconditions: All stories created
    Steps:
      1. Run `pnpm --filter @vantare/desktop build-storybook`
      2. Assert exit code 0
    Expected Result: Build succeeds
    Evidence: .omo/evidence/task-7-storybook-build.txt

  Scenario: All stories count
    Tool: Bash
    Preconditions: All stories created
    Steps:
      1. `find apps/desktop/src/renderer/bundles -name "*.stories.tsx" | wc -l`
      2. Assert output >= 3 (DeltaBar, StreamAlerts, animations)
    Expected Result: At least 3 story files
    Evidence: .omo/evidence/task-7-stories-count.txt
  ```

  **Commit**: YES
  - Message: `docs(storybook): add stories for DeltaBar, StreamAlerts, and animations demo`
  - Files: `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.stories.tsx`, `apps/desktop/src/renderer/bundles/default/stream-alerts/StreamAlerts.stories.tsx`, `apps/desktop/src/renderer/bundles/default/__stories__/animations.stories.tsx`

---

- [x] 8. Integration: wire into OverlayManager + HttpServer (T7)

  **What to do**:
  - Verify `apps/desktop/src/main/windows/overlay-manager.ts:24-25` already registers `delta` and `stream-alerts` (Metis finding)
  - If not, register them
  - Update `apps/desktop/src/main/server/http-server.ts` to serve the bundle:
    - Bundle files served at `/overlays/delta` and `/overlays/stream-alerts`
    - `?overlay=delta` query param works in HttpServer response
  - Update `apps/desktop/src/renderer/overlays/OverlayShell.tsx` to:
    - Load bundle via `loadBundle('default')`
    - Resolve `?overlay=delta` → `bundle.components.delta`
    - Resolve `?overlay=stream-alerts` → `bundle.components['stream-alerts']`
  - E2E test: spin up HttpServer, curl `?overlay=delta` route, verify response
  - Verify `pnpm --filter @vantare/desktop test:e2e` (or equivalent) passes

  **Must NOT do**:
  - Don't add new HTTP routes beyond what already exists
  - Don't change `OverlayManager.registerDefaults()` IDs (`delta` and `stream-alerts` are correct)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`
  - **Reason**: Multi-process integration. Requires understanding of Electron main/renderer boundary.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T1, T3, T5

  **References**:
  - `apps/desktop/src/main/windows/overlay-manager.ts:18-25` — `registerDefaults()` already has delta + stream-alerts
  - `apps/desktop/src/main/server/http-server.ts:1-300` — HttpServer
  - `apps/desktop/src/renderer/overlays/OverlayShell.tsx:1-67` — current router
  - `apps/desktop/src/renderer/bundles/registry.ts` — from T1

  **Acceptance Criteria**:
  - [ ] `curl -s http://127.0.0.1:3200/overlays/delta` returns HTML with `<div id="root">` and bundle script
  - [ ] `curl -s http://127.0.0.1:3200/overlays/stream-alerts` returns HTML with `<div id="root">` and bundle script
  - [ ] `?overlay=delta` query param resolved to Delta Bar component (verified in OverlayShell test)
  - [ ] `?overlay=stream-alerts` query param resolved to Stream Alerts component
  - [ ] `pnpm --filter @vantare/desktop typecheck` returns 0 errors
  - [ ] `pnpm --filter @vantare/desktop test -- OverlayShell.test.tsx` all tests pass

  **QA Scenarios**:
  ```
  Scenario: HttpServer serves delta overlay HTML
    Tool: Bash (curl)
    Preconditions: HttpServer running on 127.0.0.1:3200
    Steps:
      1. `curl -s http://127.0.0.1:3200/overlays/delta`
      2. Assert response contains '<div id="root">'
      3. Assert response contains script tag
    Expected Result: HTML served
    Evidence: .omo/evidence/task-8-http-delta.html

  Scenario: OverlayShell routes ?overlay=delta
    Tool: Vitest
    Preconditions: Bundle loaded
    Steps:
      1. setUrl('/?overlay=delta')
      2. Render <OverlayShell />
      3. Assert Delta Bar component rendered
    Expected Result: Routing works
    Evidence: .omo/evidence/task-8-route-delta.png

  Scenario: OverlayShell routes ?overlay=stream-alerts
    Tool: Vitest
    Preconditions: Bundle loaded
    Steps:
      1. setUrl('/?overlay=stream-alerts')
      2. Render <OverlayShell />
      3. Assert Stream Alerts component rendered
    Expected Result: Routing works
    Evidence: .omo/evidence/task-8-route-stream-alerts.png
  ```

  **Commit**: YES
  - Message: `feat(overlays): wire Delta Bar and Stream Alerts into OverlayManager + HttpServer`
  - Files: `apps/desktop/src/renderer/overlays/OverlayShell.tsx`, `apps/desktop/src/main/server/http-server.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `vitest`. Review all changed files for `as any`/`@ts-ignore`, empty catches, console.log. Check AI slop.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute every QA scenario. Test cross-task integration. Test edge cases. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T0**: `fix(standings): auto-scroll player row when position changes outside viewport`
- **T1**: `refactor(renderer): introduce bundle architecture with default/ bundle`
- **T2**: `feat(animations): add CSS animation system (F-024) with hf- prefixed keyframes`
- **T3**: `feat(overlays): add Delta Bar overlay with visual bar and numeric delta`
- **T4**: `feat(alerts): add useAlertDetector hook with overtake/pole/fastest_lap detection`
- **T5**: `feat(overlays): add Stream Alerts overlay with auto-dismiss and queue`
- **T6**: `docs(storybook): add stories for DeltaBar, StreamAlerts, and animations demo`
- **T7**: `feat(overlays): wire Delta Bar and Stream Alerts into OverlayManager + HttpServer`

---

## Success Criteria

### Verification Commands
```bash
pnpm turbo test typecheck build  # Expected: all packages pass
pnpm --filter @vantare/desktop test  # Expected: 142+ tests pass
pnpm --filter @vantare/desktop build-storybook  # Expected: exit 0
curl -s http://127.0.0.1:3200/overlays/delta  # Expected: HTML
curl -s http://127.0.0.1:3200/overlays/stream-alerts  # Expected: HTML
find apps/desktop/src/renderer/overlays apps/desktop/src/renderer/hub/pages -type d -empty  # Expected: empty
```

### Final Checklist
- [ ] All "Must Have" present (bundle infra, 4 overlays, animations, auto-scroll)
- [ ] All "Must NOT Have" absent (no JS anim libs, no audio, no sectors)
- [ ] All 142 existing tests pass (no regression)
- [ ] 5 empty placeholder directories deleted
- [ ] All 8 implementation tasks committed
- [ ] All 4 final wave reviewers APPROVE
