# Sprint 4b — Hub UI (F-008 + F-018)

## TL;DR

> **Quick Summary**: Build the Hub Dashboard UI with sidebar navigation, 4 pages (Dashboard, OverlaySettings, Profiles, Settings), and the Overlay Configuration System (F-018) with auto-generated settings forms from Zod schemas.
> 
> **Deliverables**:
> - HubLayout with sidebar + react-router navigation (T4.5)
> - DashboardPage — sim status, quick settings (T4.6)
> - OverlaySettingsPage — per-overlay config with auto-generated forms (T4.7 + F-018)
> - ProfilesPage — full CRUD for profiles (T4.8)
> - SettingsPage — app-wide settings form (T4.9)
> - Zod schemas: Profile discrim union, OverlayConfig discrim union, DeltaBarConfig, StreamAlertsConfig
> - Zod validation at IPC boundary (profiles:save)
> - Refactored Profile type with Zod-inferred types
> - Storybook stories for Hub components
> - OverlayShell theme fetch wired (existing TODO)
> - `enum View` + `app-store.activeView` deleted
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: T4.5 (HubLayout + Router) → T4.6/T4.7/T4.8/T4.9 (parallel) → T4.10 → Final Wave

---

## Context

### Original Request
Continuar con Sprint 4 del roadmap. Sprint 4b = Hub Dashboard (F-008) + Overlay Configuration System (F-018). Según ROADMAP.md: T4.5 (Layout + sidebar), T4.6 (DashboardPage), T4.7 (OverlaySettingsPage), T4.8 (ProfilesPage), T4.9 (Settings persistence).

### Interview Summary
**Key Discussions**:
- **Scope split**: Sprint 4a (overlays + bundles) completado. Sprint 4b = Hub UI únicamente.
- **Profile refactor (Option B)**: Refactorizar `Profile.overlays` para usar tipos inferidos de Zod. Zod schema validate en el IPC boundary (profiles:save).
- **SettingsPage**: Ruta completa /settings como 4to item en sidebar.
- **View enum**: Eliminar `enum View` en App.tsx y `activeView` en app-store.ts. react-router como única fuente de verdad.
- **SettingsForm**: Vive en `@vantare/ui-core` junto a los Zod schemas existentes.
- **useOverlayConfig**: Se mantiene como hook read-only. Se crea `useOverlayConfigStore` Zustand encima para writes.
- **Empty state**: HubLayout muestra estado vacío cuando `getActiveProfile()` retorna null.

**Research Findings**:
- `react-router-dom@^7` ya instalado pero sin uso → usarlo con BrowserRouter
- `electron-store` ya conectado con IPC completo (settings:get/save, profiles:* todas, themes:get-active)
- Zod schemas existentes en `packages/ui-core/src/schemas/`: `StandingsConfigSchema`, `RelativeConfigSchema`
- FALTAN schemas para DeltaBar y StreamAlerts (se crean en Sprint 4b)
- Profile type actual: `overlays: Record<string, OverlayConfig>` con `settings: Record<string, unknown>` — sin tipo
- `TODO(sprint-4b)` en `OverlayShell.tsx:6` — hardcoded `THEME_ID = 'default'`
- IPC handlers para profiles:save aceptan `unknown` sin validación Zod

### Metis Review
**Identified Gaps** (addressed):
- **R1 Schema bridge**: RESUELTO — Opción B: Refactorizar Profile con tipos Zod-inferred, validación en IPC boundary
- **R2 IPC validation**: RESUELTO — Zod validation en profiles:save handler
- **R3 View enum clash**: RESUELTO — Delete enum + activeView, react-router como source of truth
- **R4 Theme fetch dual**: RESUELTO — OverlayShell IPC + Hub header display como sub-tareas separadas
- **R5 Settings page scope**: RESUELTO — SettingsPage completa, 4 items en sidebar
- **Q4 Missing Delta/StreamAlerts schemas**: RESUELTO — Se crean en T4.7
- **Q7 Empty state**: RESUELTO — HubLayout muestra empty state con CTA "Create profile"

---

## Work Objectives

### Core Objective
Build the Hub Dashboard UI with react-router sidebar navigation and 4 full pages (Dashboard, OverlaySettings, Profiles, Settings), including the Overlay Configuration System (F-018) with Zod schema validation at the IPC boundary and auto-generated settings forms.

### Concrete Deliverables
- `apps/desktop/src/renderer/hub/HubLayout.tsx` — Sidebar + Outlet wrapper
- `apps/desktop/src/renderer/hub/pages/DashboardPage.tsx`
- `apps/desktop/src/renderer/hub/pages/OverlaySettingsPage.tsx`
- `apps/desktop/src/renderer/hub/pages/ProfilesPage.tsx`
- `apps/desktop/src/renderer/hub/pages/SettingsPage.tsx`
- `packages/ui-core/src/schemas/overlay-config.ts` — New: DeltaBarConfigSchema, StreamAlertsConfigSchema, OverlayConfigDiscriminatedSchema
- `packages/ui-core/src/schemas/profile.ts` — New: ProfileSchema
- `packages/ui-core/src/components/SettingsForm.tsx` — Generic auto-generated form from Zod schema
- `apps/desktop/src/renderer/shared/stores/settings-store.ts` — Zustand store for app settings
- `apps/desktop/src/renderer/shared/stores/profile-store.ts` — Zustand store for profile CRUD
- `apps/desktop/src/renderer/shared/stores/overlay-config-store.ts` — Zustand store for overlay config edits
- `apps/desktop/src/main/ipc/handlers.ts` — Updated: Zod validation in profiles:save
- `shared/types/profile.ts` — Updated: Zod-inferred types for OverlayConfig
- `apps/desktop/src/renderer/App.tsx` — Updated: react-router, no View enum
- `apps/desktop/src/renderer/overlays/OverlayShell.tsx` — Updated: IPC theme fetch
- `packages/ui-core/src/schemas/index.ts` — Updated: barrel exports for new schemas

### Definition of Done
- [ ] `pnpm --filter @vantare/desktop typecheck` → 0 errors
- [ ] `pnpm --filter @vantare/desktop test` → 178+ tests pass (baseline + new)
- [ ] `pnpm --filter @vantare/desktop build` → exit 0
- [ ] `pnpm --filter @vantare/desktop test:e2e` → Hub routing flow passes
- [ ] `pnpm --filter @vantare/desktop build-storybook` → exit 0

### Must Have
- Sidebar con navegación a 4 páginas (Dashboard, Overlays, Profiles, Settings)
- OverlaySettingsPage con formularios auto-generados desde Zod schemas para los 4 overlays
- ProfilesPage con CRUD completo (crear, leer, actualizar, eliminar, activar, importar, exportar)
- SettingsPage con todos los campos del Settings type
- Zod schema para Profile con validación de overlays como discriminated union
- Zod schema validation en IPC handler profiles:save
- OverlayShell lee theme activo desde electron-store (en lugar de hardcoded 'default')
- Hub header muestra nombre del theme activo (read-only)
- Empty state cuando no hay perfiles
- `enum View` eliminado de App.tsx, `activeView` eliminado de app-store.ts

### Must NOT Have (Guardrails)
- NO ThemeProvider / CSS variable injection (Sprint 6 — F-009)
- NO Tailwind @theme directive setup (Sprint 6)
- NO auth / licensing UI (Sprint 6 — F-010)
- NO feature gating UI (Sprint 6 — F-016)
- NO nueva Electron BrowserWindow para el Hub (Hub es la ventana principal)
- NO nuevos IPC channels (todos los necesarios ya existen)
- NO cambiar la forma de OverlayConfig en shared/types más allá de inferir tipos de Zod
- NO sobreescribir la lógica de OverlayManager/Hub overlay window wiring
- NO librerías de UI externas (MUI, shadcn, etc.) — todo con Tailwind v4 + componentes custom
- NO animaciones JS — solo utilidades CSS existentes (hf-* de Sprint 4a)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + testing-library)
- **Automated tests**: TDD (rojo-verde-refactor)
- **Framework**: Vitest + @testing-library/react
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright (playwright skill) — Navigate routes, interact with forms, assert DOM, screenshot
- **API/Backend**: Bash (curl IPC-equivalent) — Verify IPC handlers, schema validation
- **Library/Module**: Bash (vitest) — Run tests, verify assertions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately, MAX PARALLEL):
├── T4.5: HubLayout + Router + View enum deletion [deep]
├── T4.5b: Zod schemas (Profile, OverlayConfig discrim, DeltaBar, StreamAlerts) [deep]
├── T4.5c: Zustand stores (settings, profile, overlay-config) [quick]
└── T4.5d: SettingsForm generic component [quick]

Wave 2 (Pages — after Wave 1, MAX PARALLEL):
├── T4.6: DashboardPage (depends: T4.5) [visual-engineering]
├── T4.7: OverlaySettingsPage (depends: T4.5, T4.5b, T4.5d) [deep]
├── T4.8: ProfilesPage (depends: T4.5, T4.5c) [visual-engineering]
└── T4.9: SettingsPage + OverlayShell theme wire (depends: T4.5, T4.5c, T4.5d) [unspecified-high]

Wave 3 (Integration):
├── T4.10: Storybook stories for Hub components [visual-engineering]
├── T4.10b: IPC Zod validation in profiles:save handler [quick]
└── T4.10c: Integration test — full profile round-trip [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix
- **T4.5**: - → T4.6, T4.7, T4.8, T4.9
- **T4.5b**: - → T4.7, T4.10b
- **T4.5c**: - → T4.8, T4.9
- **T4.5d**: T4.5b → T4.7, T4.9
- **T4.6**: T4.5 → F1-F4
- **T4.7**: T4.5, T4.5b, T4.5d → F1-F4
- **T4.8**: T4.5, T4.5c → F1-F4
- **T4.9**: T4.5, T4.5c, T4.5d → F1-F4
- **T4.10**: T4.6, T4.7, T4.8, T4.9 → F1-F4
- **T4.10b**: T4.5b → F1-F4
- **T4.10c**: T4.7, T4.8, T4.10b → F1-F4

---

## TODOs

- [x] 1. T4.5 — HubLayout + Router + View enum deletion

  **What to do**:
  - Create `apps/desktop/src/renderer/hub/HubLayout.tsx` — Sidebar (Dashboard, Overlays, Profiles, Settings) + `<Outlet />` for react-router pages
  - Configure `BrowserRouter` in `App.tsx` with Routes: `/` → DashboardPage, `/overlays` → OverlaySettingsPage, `/profiles` → ProfilesPage, `/settings` → SettingsPage
  - DELETE `enum View` from App.tsx (lines 7-13) and all conditional rendering using it
  - DELETE `activeView` + `setActiveView` from `apps/desktop/src/renderer/shared/stores/app-store.ts`
  - Keep `demoMode`, `setDemoMode`, `isLoading`, `setIsLoading` in app-store (non-routing state)
  - Sidebar uses existing Tailwind patterns (`bg-surface`, `text-text`, `border-border`, glass-panel)
  - Sidebar item for active route is highlighted
  - Empty state when `getActiveProfile()` returns null: `[data-testid="no-profiles-empty-state"]` with "Create profile" button (navigates to `/profiles`)
  - Add `data-testid` attributes: `hub-sidebar`, `sidebar-dashboard`, `sidebar-overlays`, `sidebar-profiles`, `sidebar-settings`, `no-profiles-empty-state`

  **Must NOT do**:
  - NO ThemeProvider or CSS variable injection
  - NO overlay window management from Hub (no overlays:show wiring)
  - NO change to existing OverlayShell routing (still uses ?overlay= URL param)

  **Recommended Agent Profile**:
  - **Category**: `deep` — architectural change (routing rewire, enum deletion, store refactor)
  - **Skills**: `next-best-practices`, `frontend-responsive-design-standards`
  - **Skills Evaluated but Omitted**: `brainstorming` (design already decided)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T4.5b, T4.5c, T4.5d)
  - **Blocks**: T4.6, T4.7, T4.8, T4.9
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/renderer/App.tsx:1-48` — Current App.tsx to modify (replace placeholder + delete enum)
  - `apps/desktop/src/renderer/shared/stores/app-store.ts:1-25` — Current store (delete activeView, keep rest)
  - `packages/ui-core/src/components/GlassPanel.tsx:1-25` — Existing glass-panel pattern for sidebar style
  - `apps/desktop/src/renderer/styles/globals.css:1-10` — Global CSS (glass-panel class)
  - `docs/ROADMAP.md:225-229` — T4.5 requirements
  - `react-router-dom@^7.0.0` — Already installed, use `createBrowserRouter` or `<BrowserRouter>`

  **Acceptance Criteria**:
  - [ ] App.tsx loads without `enum View` — uses react-router only
  - [ ] app-store.ts has no `activeView` or `setActiveView` — keeps demoMode/isLoading
  - [ ] `pnpm typecheck` passes after changes
  - [ ] `pnpm test` passes (store tests updated)

  **QA Scenarios**:
  ```
  Scenario: Hub routing smoke
    Tool: Playwright
    Preconditions: App loaded with react-router, electron-store has at least one profile
    Steps:
      1. Navigate to `/` — assert `[data-testid="sidebar-dashboard"]` has active class
      2. Click `[data-testid="sidebar-overlays"]` — assert URL is `/overlays`
      3. Click `[data-testid="sidebar-profiles"]` — assert URL is `/profiles`
      4. Click `[data-testid="sidebar-settings"]` — assert URL is `/settings`
      5. Click `[data-testid="sidebar-dashboard"]` — assert URL is `/`
    Expected Result: All 4 routes navigate correctly, active sidebar item highlighted
    Evidence: .omo/evidence/task-1-routing-smoke.png

  Scenario: Empty state with no profiles
    Tool: Playwright
    Preconditions: electron-store has NO profiles (fresh state)
    Steps:
      1. Navigate to `/`
      2. Assert `[data-testid="no-profiles-empty-state"]` is visible
      3. Assert "Create profile" button/link exists
      4. Click "Create profile" CTA — assert URL is `/profiles`
    Expected Result: Empty state renders, CTA navigates to `/profiles`
    Evidence: .omo/evidence/task-1-empty-state.png
  ```

- [x] 2. T4.5b — Zod schemas (Profile, OverlayConfig discrim, DeltaBar, StreamAlerts)

  **What to do**:
  - Create `packages/ui-core/src/schemas/profile.ts`:
    - `ProfileSchema` — Zod schema matching Profile interface (id, name, createdAt, updatedAt, overlays, themeId)
    - `OverlayConfigDiscriminatedSchema` — discriminated union keyed by overlayId
    - `ProfilesSchema` — z.array(ProfileSchema) for the full profiles list
    - Export inferred types: `Profile`, `OverlayConfigMap`
  - Create `packages/ui-core/src/schemas/delta-bar-config.ts`:
    - `DeltaBarConfigSchema` — showDelta (boolean), showPrediction (boolean), barPosition (enum: top/bottom), opacity (number 0-1)
  - Create `packages/ui-core/src/schemas/stream-alerts-config.ts`:
    - `StreamAlertsConfigSchema` — enabled (boolean), duration (number 3-15), position (enum), queueCap (number 1-10)
  - Update `packages/ui-core/src/schemas/overlay-config.ts`:
    - Ensure `StandingsConfigSchema` and `RelativeConfigSchema` are compatible with the discriminated union structure
    - Add `overlayId` discriminator field to each schema
  - Update `packages/ui-core/src/schemas/index.ts` — barrel export all new schemas + types
  - Update `shared/types/profile.ts` — refactor `OverlayConfig` to use Zod-inferred types:
    - `export type OverlayConfig = z.infer<typeof OverlayConfigDiscriminatedSchema>`
    - `export type Profile = z.infer<typeof ProfileSchema>`

  **Must NOT do**:
  - NO change to existing `StandingsConfigSchema` / `RelativeConfigSchema` shape (only add discriminator)
  - NO delete the old `OverlayConfig` interface until downstream consumers are verified
  - NO touching the IPC handler validation here (that's T4.10b)

  **Recommended Agent Profile**:
  - **Category**: `deep` — schema design, type system, refactoring shared types
  - **Skills**: none needed (pure TypeScript/Zod work)
  - **Skills Evaluated but Omitted**: `brainstorming` (design decided), `test-driven-development` (tests required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T4.5, T4.5c, T4.5d)
  - **Blocks**: T4.7, T4.10b
  - **Blocked By**: None

  **References**:
  - `packages/ui-core/src/schemas/overlay-config.ts:1-50` — Existing schema pattern (StandingsConfigSchema)
  - `shared/types/profile.ts:1-20` — Current Profile + OverlayConfig types to refactor
  - `packages/ui-core/src/schemas/index.ts:1-11` — Existing barrel export pattern
  - `shared/types/settings.ts:1-20` — Settings type (no changes needed, reference only)
  - `apps/desktop/src/renderer/bundles/default/delta/DeltaBar.tsx` — DeltaBar props for schema design
  - `apps/desktop/src/renderer/shared/types/alerts.ts` — Alert types for StreamAlerts schema design

  **Acceptance Criteria**:
  - [ ] DeltaBarConfigSchema created with showDelta, showPrediction, barPosition, opacity
  - [ ] StreamAlertsConfigSchema created with enabled, duration, position, queueCap
  - [ ] OverlayConfigDiscriminatedSchema unions all 4 overlay configs
  - [ ] ProfileSchema validates full Profile structure
  - [ ] `pnpm typecheck` passes in both `@vantare/ui-core` and `@vantare/desktop`
  - [ ] `pnpm test` passes

  **QA Scenarios**:
  ```
  Scenario: ProfileSchema validates valid profile
    Tool: Bash (vitest)
    Preconditions: ProfileSchema exported from @vantare/ui-core
    Steps:
      1. Write test: create valid profile object with all 4 overlays
      2. Invoke: `ProfileSchema.parse(validProfile)`
    Expected Result: Parses successfully, returns typed Profile
    Evidence: .omo/evidence/task-2-valid-schema.txt

  Scenario: ProfileSchema rejects invalid profile
    Tool: Bash (vitest)
    Preconditions: ProfileSchema exported
    Steps:
      1. Write test: profile with invalid overlay config (rowCount=999)
      2. Invoke: `ProfileSchema.safeParse(invalidProfile)`
    Expected Result: safeParse returns success=false with ZodError
    Evidence: .omo/evidence/task-2-invalid-schema.txt

  Scenario: OverlayConfigDiscriminatedSchema validates each type
    Tool: Bash (vitest)  
    Preconditions: OverlayConfigDiscriminatedSchema exported
    Steps:
      1. Parse StandingConfig with discriminator "standings"
      2. Parse DeltaBarConfig with discriminator "delta"
      3. Parse StreamAlertsConfig with discriminator "stream-alerts"
      4. Parse RelativeConfig with discriminator "relative"
    Expected Result: Each parses correctly with the right discriminator
    Evidence: .omo/evidence/task-2-discriminated-union.txt
  ```

- [x] 3. T4.5c — Zustand stores (settings, profile, overlay-config)

  **What to do**:
  - Create `apps/desktop/src/renderer/shared/stores/settings-store.ts`:
    - `useSettingsStore` — wraps `window.vantare.getSettings()` / `window.vantare.saveSettings()`
    - State: `settings: Settings | null`, `isLoading: boolean`, `error: string | null`
    - Actions: `loadSettings()`, `saveSettings(partial: Partial<Settings>)`
  - Create `apps/desktop/src/renderer/shared/stores/profile-store.ts`:
    - `useProfileStore` — wraps all profile IPC channels
    - State: `profiles: Profile[]`, `activeProfile: Profile | null`, `isLoading`, `error`
    - Actions: `loadProfiles()`, `createProfile(name: string)`, `saveProfile(profile: Profile)`, `deleteProfile(id: string)`, `setActiveProfile(id: string)`, `importProfile(data: string)`, `exportProfile(id: string): string`
  - Create `apps/desktop/src/renderer/shared/stores/overlay-config-store.ts`:
    - `useOverlayConfigStore` — wraps profile-overlay settings editing
    - State: `draftConfigs: Record<OverlayId, Record<string, unknown>>` (edit buffer), `saving: boolean`
    - Actions: `loadOverlayConfig(overlayId)`, `updateOverlayConfig(overlayId, partial)`, `saveOverlayConfig(overlayId)`, `discardChanges(overlayId)`
  - Update `apps/desktop/src/renderer/shared/stores/index.ts` — export new stores

  **Must NOT do**:
  - NO direct electron-store access (all via IPC)
  - NO caching logic (electron-store handles persistence)
  - NO validation in stores (validation is in Zod schemas + IPC handler)

  **Recommended Agent Profile**:
  - **Category**: `quick` — Zustand store pattern, follows existing code
  - **Skills**: none needed
  - **Skills Evaluated but Omitted**: `test-driven-development` (tests required but TDD pattern)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T4.5, T4.5b, T4.5d)
  - **Blocks**: T4.8, T4.9
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/renderer/shared/stores/app-store.ts:1-25` — Existing Zustand store pattern
  - `apps/desktop/src/renderer/shared/stores/alerts-store.ts:1-40` — Another Zustand store reference
  - `apps/desktop/src/renderer/shared/stores/index.ts:1-3` — Barrel export pattern
  - `apps/desktop/src/renderer/shared/hooks/useOverlayConfig.ts:1-25` — Existing read hook (don't modify)
  - `shared/types/settings.ts:1-20` — Settings type
  - `shared/types/profile.ts` — Profile type (after T4.5b refactor)

  **Acceptance Criteria**:
  - [ ] useSettingsStore loads settings via IPC on init
  - [ ] useSettingsStore.saveSettings calls window.vantare.saveSettings
  - [ ] useProfileStore loads profiles and sets activeProfile
  - [ ] useProfileStore.createProfile adds to local state and persists
  - [ ] useProfileStore.deleteProfile removes from local state and persists
  - [ ] useOverlayConfigStore.loadOverlayConfig reads from active profile
  - [ ] useOverlayConfigStore.saveOverlayConfig updates profile and persists
  - [ ] All stores exported from barrel index
  - [ ] `pnpm test` passes

  **QA Scenarios**:
  ```
  Scenario: Settings store round-trip
    Tool: Bash (vitest)
    Preconditions: useSettingsStore created, IPC mocked
    Steps:
      1. Call useSettingsStore.getState().loadSettings()
      2. Assert isLoading transitions true→false
      3. Assert settings is populated from IPC mock
      4. Call useSettingsStore.getState().saveSettings({ autostart: true })
      5. Assert IPC mock called with updated settings
    Expected Result: Store loads, edits, and persists settings correctly
    Evidence: .omo/evidence/task-3-settings-store.txt

  Scenario: Profile store CRUD
    Tool: Bash (vitest)
    Preconditions: useProfileStore created, IPC mocked
    Steps:
      1. loadProfiles() — assert profiles array populated
      2. createProfile("Test") — assert new profile in list
      3. deleteProfile(profile.id) — assert profile removed
      4. setActiveProfile(profile.id) — assert activeProfile updated
    Expected Result: Full CRUD cycle works
    Evidence: .omo/evidence/task-3-profile-crud.txt
  ```

- [x] 4. T4.5d — SettingsForm generic component

  **What to do**:
  - Create `packages/ui-core/src/components/SettingsForm.tsx`:
    - Generic component: `SettingsForm<T>({ schema, values, onChange, overlayId, testId })`
    - Auto-renders form fields from Zod schema introspection:
      - `z.number()` → `<input type="number" />` or slider (range-based)
      - `z.string()` → `<input type="text" />`
      - `z.boolean()` → `<input type="checkbox" />` or toggle switch
      - `z.enum()` → `<select>` dropdown
      - `z.number().min(0).max(1)` → `<input type="range" step="0.1" />`
    - Props: `schema: ZodType<T>`, `values: T`, `onChange: (partial: Partial<T>) => void`, `overlayId?: OverlayId`, `testId?: string`
    - Renders a save button (calls `onChange` with current values)
    - Renders a reset button (calls `onChange` with schema defaults)
  - Export from `packages/ui-core/src/components/index.ts`
  - Create `packages/ui-core/src/components/__tests__/SettingsForm.test.tsx`:
    - Test with StandingsConfigSchema — renders number input for rowCount, toggle for showGaps
    - Test with DeltaBarConfigSchema — renders select for barPosition, range for opacity
    - Test validation feedback — invalid input shows error state

  **Must NOT do**:
  - NO direct IPC calls (pure UI component, receives props)
  - NO complex field types (date pickers, color pickers — Sprint 6)
  - NO form library (react-hook-form, formik, etc.) — pure Zod introspection
  - NO async validation (sync only)

  **Recommended Agent Profile**:
  - **Category**: `quick` — React component, clear spec, reusable
  - **Skills**: `test-driven-development`
  - **Skills Evaluated but Omitted**: `brainstorming` (design decided)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T4.5, T4.5b, T4.5c)
  - **Blocks**: T4.7, T4.9
  - **Blocked By**: T4.5b (needs schemas to test against)

  **References**:
  - `packages/ui-core/src/components/GlassPanel.tsx:1-25` — Component pattern (TS interface, Tailwind)
  - `packages/ui-core/src/components/index.ts:1-10` — Barrel export pattern
  - `packages/ui-core/src/schemas/overlay-config.ts:1-50` — Schemas the form will render
  - `packages/ui-core/src/schemas/index.ts` — Schema barrel (after T4.5b)

  **Acceptance Criteria**:
  - [ ] SettingsForm renders number input for z.number() fields
  - [ ] SettingsForm renders toggle for z.boolean() fields
  - [ ] SettingsForm renders select for z.enum() fields
  - [ ] SettingsForm renders slider for z.number().min(0).max(1)
  - [ ] SettingsForm fires onChange with partial update on field change
  - [ ] SettingsForm shows validation error for out-of-range values
  - [ ] `pnpm test` passes
  - [ ] `pnpm typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: SettingsForm renders correct field types
    Tool: Bash (vitest)
    Preconditions: SettingsForm component, StandingsConfigSchema
    Steps:
      1. Render `<SettingsForm schema={StandingsConfigSchema} values={defaults} onChange={vi.fn()} />`
      2. Assert `<input type="number">` exists for rowCount
      3. Assert `<input type="checkbox">` exists for showGaps (boolean)
      4. Assert screen contains "Row Count" label derived from schema
    Expected Result: Each Zod type maps to correct HTML input
    Evidence: .omo/evidence/task-4-field-types.txt

  Scenario: SettingsForm fires onChange
    Tool: Bash (vitest)
    Preconditions: SettingsForm rendered with mock onChange
    Steps:
      1. Fire change event on rowCount input: clear and type "25"
      2. Assert onChange called with { rowCount: 25 }
      3. Click save button
      4. Assert onChange called at least once
    Expected Result: onChange fires with partial updates
    Evidence: .omo/evidence/task-4-onchange.txt

  Scenario: SettingsForm validation error
    Tool: Bash (vitest)
    Preconditions: SettingsForm with StandingsConfigSchema (rowCount 5-40)
    Steps:
      1. Type "999" into rowCount input
      2. Assert validation error message is visible
      3. Assert save button is disabled
    Expected Result: Invalid values shown as errors, save disabled
    Evidence: .omo/evidence/task-4-validation.txt
  ```

- [x] 5. T4.6 — DashboardPage

  **What to do**:
  - Create `apps/desktop/src/renderer/hub/pages/DashboardPage.tsx`
  - Sim status card:
    - Uses `useSimState()` from `@vantare/ui-core` to show sim connected/disconnected
    - Uses `StatusIndicator` component (`apps/desktop/src/renderer/shared/components/StatusIndicator.tsx`)
    - Shows sim name (iRacing, LMU, AC) when connected
  - Quick settings section:
    - Toggle for demo mode (`demoMode` in useAppStore)
    - Toggle for overlay visibility placeholder (UI only, actual IPC wiring deferred)
    - Server status: shows HTTP server port (reads from `useSettingsStore`)
  - Active profile display: name of active profile + "Manage" link → `/profiles`
  - Active theme display: name of active theme (from `window.vantare.getActiveTheme()`, read-only)
  - Uses glass-panel card pattern for each section
  - Add `data-testid` attributes: `dashboard-sim-status`, `dashboard-quick-settings`, `dashboard-active-profile`, `dashboard-active-theme`

  **Must NOT do**:
  - NO overlay:show IPC wiring (deferred)
  - NO theme application (read-only name display only)
  - NO auth status (Sprint 6)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — UI layout, component composition
  - **Skills**: `frontend-responsive-design-standards`
  - **Skills Evaluated but Omitted**: `test-driven-development` (tests written after)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4.7, T4.8, T4.9)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.5

  **References**:
  - `packages/ui-core/src/hooks/useTheme.ts` — Theme hook for getActiveTheme()
  - `apps/desktop/src/renderer/shared/components/StatusIndicator.tsx:1-25` — Status component
  - `apps/desktop/src/renderer/shared/stores/settings-store.ts` — Settings store (T4.5c)
  - `packages/ui-core/src/stores/telemetry-store.ts` — Telemetry store (useSimState)

  **Acceptance Criteria**:
  - [ ] Dashboard shows sim status (connected/disconnected)
  - [ ] Dashboard shows demo mode toggle
  - [ ] Dashboard shows active profile name with link to /profiles
  - [ ] Dashboard shows active theme name
  - [ ] `pnpm test` passes

  **QA Scenarios**:
  ```
  Scenario: Dashboard renders all sections
    Tool: Playwright
    Preconditions: App loaded, react-router at `/`, electron-store has profile + settings
    Steps:
      1. Navigate to `/`
      2. Assert `[data-testid="dashboard-sim-status"]` is visible
      3. Assert `[data-testid="dashboard-quick-settings"]` is visible
      4. Assert `[data-testid="dashboard-active-profile"]` is visible
      5. Assert `[data-testid="dashboard-active-theme"]` is visible
    Expected Result: All 4 dashboard sections render
    Evidence: .omo/evidence/task-5-dashboard-sections.png

  Scenario: Dashboard quick settings toggle works
    Tool: Playwright
    Preconditions: At `/`
    Steps:
      1. Find demo mode toggle in `[data-testid="dashboard-quick-settings"]`
      2. Click it
      3. Assert demo mode state toggled
    Expected Result: Demo mode toggles on/off
    Evidence: .omo/evidence/task-5-demo-toggle.png
  ```

- [x] 6. T4.7 — OverlaySettingsPage

  **What to do**:
  - Create `apps/desktop/src/renderer/hub/pages/OverlaySettingsPage.tsx`
  - List or nav tabs for selecting which overlay to configure (Standings, Relative, Delta Bar, Stream Alerts)
  - Selected overlay renders `<SettingsForm schema={...} values={...} onChange={...} />` from `@vantare/ui-core`
  - Loads initial values from `useOverlayConfigStore.loadOverlayConfig(overlayId)`
  - Save button calls `useOverlayConfigStore.saveOverlayConfig(overlayId)`
  - Discard button calls `useOverlayConfigStore.discardChanges(overlayId)`
  - Save confirmation toast/snackbar (simple, no animation lib)
  - Each overlay type uses its Zod schema:
    - `standings` → `StandingsConfigSchema`
    - `relative` → `RelativeConfigSchema`
    - `delta` → `DeltaBarConfigSchema` (created in T4.5b)
    - `stream-alerts` → `StreamAlertsConfigSchema` (created in T4.5b)
  - Add `data-testid` attributes: `overlay-settings-nav`, `overlay-settings-form`, `settings-save`, `settings-discard`, `settings-confirmation`

  **Must NOT do**:
  - NO per-overlay settings that don't exist in schemas (no adding fields)
  - NO real-time preview of overlay changes
  - NO multi-profile overlay editing (edits active profile only)

  **Recommended Agent Profile**:
  - **Category**: `deep` — connects SettingsForm, stores, schemas, and IPC
  - **Skills**: `test-driven-development`
  - **Skills Evaluated but Omitted**: `brainstorming` (design decided)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4.6, T4.8, T4.9)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.5, T4.5b, T4.5d

  **References**:
  - `packages/ui-core/src/components/SettingsForm.tsx` — Generic form (T4.5d)
  - `apps/desktop/src/renderer/shared/stores/overlay-config-store.ts` — Store (T4.5c)
  - `packages/ui-core/src/schemas/index.ts` — All schemas (T4.5b)
  - `apps/desktop/src/renderer/bundles/default/index.ts` — OverlayId types

  **Acceptance Criteria**:
  - [ ] Can select each of the 4 overlays
  - [ ] Each overlay shows correct SettingsForm with its schema fields
  - [ ] Save persists to profile via overlay-config-store
  - [ ] Discard reverts to original values
  - [ ] All tests pass

  **QA Scenarios**:
  ```
  Scenario: Navigate and edit each overlay config
    Tool: Playwright
    Preconditions: App loaded, profile with all 4 overlays
    Steps:
      1. Navigate to `/overlays`
      2. Click overlay selector for "Standings"
      3. Assert `[data-testid="overlay-settings-form"]` has rowCount input
      4. Change rowCount to 25
      5. Click `[data-testid="settings-save"]`
      6. Assert `[data-testid="settings-confirmation"]` appears
      7. Repeat for Relative (rangeAhead), Delta (showDelta toggle), Stream Alerts (duration)
    Expected Result: Each overlay type shows correct fields, save works
    Evidence: .omo/evidence/task-6-edit-all-overlays.png

  Scenario: Discard reverts changes
    Tool: Playwright
    Preconditions: At `/overlays`, standings selected, original rowCount=15
    Steps:
      1. Change rowCount to 30
      2. Click `[data-testid="settings-discard"]`
      3. Assert rowCount input shows 15 (original value)
    Expected Result: Discard reverts to saved values
    Evidence: .omo/evidence/task-6-discard.png
  ```

- [x] 7. T4.8 — ProfilesPage

  **What to do**:
  - Create `apps/desktop/src/renderer/hub/pages/ProfilesPage.tsx`
  - Profile list: cards/grid showing each profile with name, createdAt, themeId badge
  - Active profile highlighted with "Active" badge
  - Actions per profile card: Activate, Edit Name, Export, Delete
  - "Create Profile" button → inline form or modal for name input
  - Edit name → inline text input on the card
  - Export → downloads JSON string (via `window.vantare.exportProfile(id)`)
  - Import → file picker or textarea for JSON paste + validate with ProfileSchema before saving
  - Delete → confirm dialog, then `useProfileStore.deleteProfile(id)`
  - Uses `useProfileStore` for all operations
  - Add `data-testid` attributes: `profile-list`, `profile-card-{id}`, `profile-create`, `profile-activate-{id}`, `profile-edit-{id}`, `profile-export-{id}`, `profile-delete-{id}`, `profile-empty-state`

  **Must NOT do**:
  - NO drag-and-drop reordering
  - NO bulk operations
  - NO profile comparison UI
  - NO cloud sync (Sprint 6)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — CRUD UI with multiple interaction patterns
  - **Skills**: `frontend-responsive-design-standards`
  - **Skills Evaluated but Omitted**: `test-driven-development` (tests required but patterns clear)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4.6, T4.7, T4.9)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.5, T4.5c

  **References**:
  - `apps/desktop/src/renderer/shared/stores/profile-store.ts` — Profile store (T4.5c)
  - `apps/desktop/src/renderer/shared/hooks/useOverlayConfig.ts` — Reference for IPC vs store pattern
  - `apps/desktop/src/main/ipc/handlers.ts:90-150` — IPC handlers for profiles (CRUD)
  - `packages/ui-core/src/schemas/profile.ts` — ProfileSchema for import validation (T4.5b)

  **Acceptance Criteria**:
  - [ ] Profile list shows all profiles from store
  - [ ] Active profile has "Active" badge
  - [ ] Create profile adds new profile and navigates to it
  - [ ] Edit name updates in place
  - [ ] Export returns JSON string
  - [ ] Import validates with ProfileSchema before saving
  - [ ] Delete removes profile with confirm dialog
  - [ ] Empty state shows when no profiles exist
  - [ ] All tests pass

  **QA Scenarios**:
  ```
  Scenario: Full profile CRUD cycle
    Tool: Playwright
    Preconditions: At `/profiles`, one existing profile
    Steps:
      1. Assert `[data-testid="profile-list"]` shows profile cards
      2. Click `[data-testid="profile-create"]` — enter name "Race Setup"
      3. Assert new card with name "Race Setup" appears
      4. Click `[data-testid="profile-activate-{id}"]` on new profile
      5. Assert "Active" badge moves to new profile
      6. Click `[data-testid="profile-export-{id}"]` — assert JSON string appears
      7. Click `[data-testid="profile-delete-{id}"]` — confirm dialog
      8. Assert profile removed from list
    Expected Result: Create → Activate → Export → Delete cycle works
    Evidence: .omo/evidence/task-7-crud-cycle.png

  Scenario: Import validates with ProfileSchema
    Tool: Playwright
    Preconditions: At `/profiles`
    Steps:
      1. Click import button
      2. Paste invalid JSON (missing required fields)
      3. Assert validation error message shown
      4. Paste valid profile JSON
      5. Assert profile added to list
    Expected Result: Import validates before saving
    Evidence: .omo/evidence/task-7-import-validation.png
  ```

- [x] 8. T4.9 — SettingsPage + OverlayShell theme wire

  **What to do**:
  **Part A — SettingsPage**:
  - Create `apps/desktop/src/renderer/hub/pages/SettingsPage.tsx`
  - Form connected to `useSettingsStore`
  - Fields from `shared/types/settings.ts`:
    - Language (select: en, es, etc.)
    - Auto-start (toggle)
    - Minimize to tray (toggle)
    - Start minimized (toggle)
    - Overlay visibility key (text input)
    - Preferred sim (select: auto, iRacing, LMU, AC)
    - Alert volume (range slider, 0-1)
    - Alert enabled (toggle)
    - Auto-update (toggle)
    - Update channel (select: stable, beta)
    - HTTP server port (number input)
    - Network access (toggle)
  - Uses `SettingsForm` from `@vantare/ui-core` (generic or manual form for Settings type)
  - NOTE: Since Settings is a flat interface (not a per-overlay config), either create a `SettingsSchema` or build the form manually using the same pattern
  - Decision: Create `SettingsSchema` in `packages/ui-core/src/schemas/settings.ts` for form auto-generation
  - Save button with confirmation
  - Add `data-testid` attributes: `settings-page`, `settings-form`, `settings-port-input`, `settings-auto-start-toggle`
  
  **Part B — OverlayShell theme wire**:
  - Edit `apps/desktop/src/renderer/overlays/OverlayShell.tsx`:
    - Replace `THEME_ID = 'default'` with IPC call: `const theme = await window.vantare.getActiveTheme()`
    - Use `theme.id` to load the bundle
    - Fallback to `'default'` if IPC fails
  - Add `data-testid` attributes: `overlay-shell`

  **Part C — Hub header theme display**:
  - In `HubLayout.tsx` sidebar or header: show active theme name
  - Read from `window.vantare.getActiveTheme()` on mount
  - Display: "Theme: {name}" text, read-only (no selector — Sprint 6)
  - Add `data-testid`: `hub-theme-display`

  **Must NOT do**:
  - NO theme selector/editor (Sprint 6)
  - NO language switcher with i18n (display only)
  - NO auth/licensing section (Sprint 6)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 3 sub-tasks, connects multiple systems
  - **Skills**: `test-driven-development`
  - **Skills Evaluated but Omitted**: `brainstorming` (design decided)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4.6, T4.7, T4.8)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.5, T4.5c, T4.5d

  **References**:
  - `shared/types/settings.ts:1-20` — Settings interface
  - `apps/desktop/src/renderer/shared/stores/settings-store.ts` — Settings store (T4.5c)
  - `apps/desktop/src/renderer/overlays/OverlayShell.tsx:1-30` — Current hardcoded THEME_ID
  - `apps/desktop/src/preload/index.ts:30-35` — IPC getActiveTheme definition
  - `packages/ui-core/src/components/SettingsForm.tsx` — Generic form (T4.5d)
  - `packages/ui-core/src/schemas/index.ts` — Schema barrel (T4.5b)

  **Acceptance Criteria**:
  - [ ] SettingsPage renders all Settings fields with correct input types
  - [ ] Save persists via useSettingsStore.saveSettings
  - [ ] OverlayShell calls getActiveTheme() on mount
  - [ ] OverlayShell falls back to 'default' if IPC fails
  - [ ] Hub header shows active theme name
  - [ ] All tests pass

  **QA Scenarios**:
  ```
  Scenario: SettingsPage form round-trip
    Tool: Playwright
    Preconditions: At `/settings`, app with settings in store
    Steps:
      1. Assert `[data-testid="settings-form"]` has all fields
      2. Change port: clear `[data-testid="settings-port-input"]` and type "3300"
      3. Toggle `[data-testid="settings-auto-start-toggle"]`
      4. Click save
      5. Assert confirmation shown
      6. Reload page
      7. Assert port still shows "3300" and auto-start toggle is still set
    Expected Result: Settings persist across reload
    Evidence: .omo/evidence/task-9-settings-persist.png

  Scenario: OverlayShell loads theme from store
    Tool: Bash (vitest)
    Preconditions: OverlayShell component, IPC mocked
    Steps:
      1. Mock window.vantare.getActiveTheme to resolve { id: 'midnight', name: 'Midnight' }
      2. Render `<OverlayShell />`
      3. Assert getActiveTheme was called
      4. Assert default theme used as fallback
    Expected Result: Theme fetch from IPC, not hardcoded
    Evidence: .omo/evidence/task-9-overlay-theme.txt

  Scenario: Hub header shows theme name
    Tool: Playwright
    Preconditions: App loaded, active theme is "Dark"
    Steps:
      1. Navigate to `/`
      2. Assert `[data-testid="hub-theme-display"]` contains "Dark"
    Expected Result: Theme name visible in Hub header
    Evidence: .omo/evidence/task-9-theme-display.png
  ```

- [x] 9. T4.10 — Storybook stories for Hub components

  **What to do**:
  - Create `apps/desktop/src/renderer/hub/__stories__/HubLayout.stories.tsx` — Sidebar navigation story (4 routes visible, one active)
  - Create `apps/desktop/src/renderer/hub/__stories__/DashboardPage.stories.tsx` — Dashboard with mocked sim status + settings
  - Create `apps/desktop/src/renderer/hub/__stories__/OverlaySettingsPage.stories.tsx` — Settings page with mocked profile data
  - Create `apps/desktop/src/renderer/hub/__stories__/ProfilesPage.stories.tsx` — Profile list with mock profiles
  - Create `apps/desktop/src/renderer/hub/__stories__/SettingsPage.stories.tsx` — Settings form with mocked settings
  - Create `apps/desktop/src/renderer/hub/__stories__/EmptyState.stories.tsx` — Empty state (no profiles)
  - Create `packages/ui-core/src/components/__stories__/SettingsForm.stories.tsx` — SettingsForm with StandingsConfigSchema, showing field types
  - Use CSF3 format (matching existing stories in `bundles/default/__stories__/`)
  - Mock IPC calls as needed for each story
  - Add `data-testid` as needed

  **Must NOT do**:
  - NO stories for components outside Hub scope (already exist for overlays)
  - NO stories that require real IPC/electron-store

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — Storybook stories, UI showcase
  - **Skills**: none needed
  - **Skills Evaluated but Omitted**: `test-driven-development` (stories ≠ tests)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T4.10b, T4.10c)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.6, T4.7, T4.8, T4.9

  **References**:
  - `apps/desktop/src/renderer/bundles/default/__stories__/DeltaBar.stories.tsx:1-50` — Existing CSF3 Storybook pattern
  - `apps/desktop/.storybook/main.ts` — Storybook config
  - Each Hub page component (T4.6, T4.7, T4.8, T4.9)
  - `packages/ui-core/src/components/SettingsForm.tsx` (T4.5d)

  **Acceptance Criteria**:
  - [ ] 7 story files created (6 Hub + 1 SettingsForm)
  - [ ] `pnpm build-storybook` exits 0
  - [ ] Each story renders without runtime error

  **QA Scenarios**:
  ```
  Scenario: Storybook builds without error
    Tool: Bash
    Preconditions: All story files created
    Steps:
      1. Run: `pnpm --filter @vantare/desktop build-storybook`
    Expected Result: Exit code 0, no errors
    Evidence: .omo/evidence/task-10-storybook-build.txt
  ```

- [x] 10. T4.10b — IPC Zod validation in profiles:save handler

  **What to do**:
  - Edit `apps/desktop/src/main/ipc/handlers.ts`:
    - Import `ProfileSchema` from `@vantare/ui-core/schemas`
    - In the `profiles:save` handler, add Zod validation before storing:
      ```ts
      const parsed = ProfileSchema.parse(profile);
      store.set('profiles', parsed); // or update in-place
      ```
    - Return proper error on validation failure (reject with ZodError message)
  - If the handler currently stores `unknown` data, update the type signature
  - Add test: `apps/desktop/src/main/__tests__/handlers.test.ts` or similar
    - Test: valid profile passes validation and is stored
    - Test: invalid profile is rejected with ZodError

  **Must NOT do**:
  - NO change to other IPC handlers (settings, themes, auth)
  - NO change to the renderer store (it already calls safe operations)

  **Recommended Agent Profile**:
  - **Category**: `quick` — single handler edit, single test file
  - **Skills**: none needed
  - **Skills Evaluated but Omitted**: `brainstorming` (design decided)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T4.10, T4.10c)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.5b

  **References**:
  - `apps/desktop/src/main/ipc/handlers.ts:90-110` — profiles:save handler
  - `packages/ui-core/src/schemas/profile.ts` — ProfileSchema (T4.5b)
  - `apps/desktop/src/main/__tests__/` — Check if test file exists, create if not

  **Acceptance Criteria**:
  - [ ] profiles:save validates with ProfileSchema before storing
  - [ ] Valid profiles saved successfully
  - [ ] Invalid profiles rejected with error message
  - [ ] `pnpm test` passes

  **QA Scenarios**:
  ```
  Scenario: Valid profile passes validation
    Tool: Bash (vitest)
    Preconditions: IPC handler test, ProfileSchema imported
    Steps:
      1. Create valid profile object
      2. Invoke profiles:save handler
      3. Assert handler resolves, store called
    Expected Result: Valid profile saved
    Evidence: .omo/evidence/task-10b-valid-save.txt

  Scenario: Invalid profile rejected
    Tool: Bash (vitest)
    Preconditions: Same test
    Steps:
      1. Create invalid profile (missing name, bad overlay config)
      2. Invoke profiles:save handler
      3. Assert handler rejects with ZodError
    Expected Result: Invalid profile rejected, store not called
    Evidence: .omo/evidence/task-10b-invalid-reject.txt
  ```

- [x] 11. T4.10c — Integration test: full profile round-trip

  **What to do**:
  - Create `apps/desktop/src/renderer/hub/__tests__/profile-roundtrip.e2e.ts` (Playwright E2E)
  - Full user flow:
    1. App starts with empty profiles (electron-store pre-cleared)
    2. Empty state visible at `/`
    3. Navigate to `/profiles`
    4. Create a new profile "Test Race"
    5. Navigate to `/overlays`
    6. Select Standings, change rowCount to 25, save
    7. Select Delta Bar, enable showDelta, save
    8. Navigate to `/profiles`
    9. Export the profile, verify JSON contains the expected settings
    10. Create a second profile "Qualifying"
    11. Activate "Test Race" again
    12. Navigate to `/overlays`, verify Standings rowCount is still 25
    13. Reload page
    14. Navigate to `/overlays`, verify Standings rowCount is STILL 25 (persisted)
  - Assert at each step
  - Add `data-testid` attributes as needed
  - Evidence screenshots at key steps

  **Must NOT do**:
  - NO unit tests (those are in per-task tests)
  - NO IPC integration tests (separate concern)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Playwright E2E, multi-step flow
  - **Skills**: none needed
  - **Skills Evaluated but Omitted**: `test-driven-development` (test is the deliverable)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T4.10, T4.10b)
  - **Blocks**: F1-F4
  - **Blocked By**: T4.7, T4.8, T4.10b

  **References**:
  - `apps/desktop/src/renderer/hub/pages/ProfilesPage.tsx` (T4.8)
  - `apps/desktop/src/renderer/hub/pages/OverlaySettingsPage.tsx` (T4.7)
  - `apps/desktop/src/renderer/hub/HubLayout.tsx` (T4.5)
  - Any existing e2e test file for pattern reference

  **Acceptance Criteria**:
  - [ ] Full playbook executes without failure
  - [ ] All assertions pass
  - [ ] Final state after reload matches expected
  - [ ] `pnpm test:e2e` passes

  **QA Scenarios**:
  ```
  Scenario: Full profile round-trip executes
    Tool: Bash
    Preconditions: All Hub components built, electron-store mockable
    Steps:
      1. Run: `pnpm --filter @vantare/desktop test:e2e -- --grep "profile round-trip"`
    Expected Result: All steps pass
    Evidence: .omo/evidence/task-10c-e2e.txt
  ```

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: empty state, invalid input, rapid actions.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T4.5**: `feat(hub): HubLayout + react-router + delete View enum`
- **T4.5b**: `feat(schemas): add Profile, OverlayConfig discrim, DeltaBar, StreamAlerts schemas`
- **T4.5c**: `feat(hub): add Zustand stores (settings, profile, overlay-config)`
- **T4.5d**: `feat(ui-core): add generic SettingsForm component`
- **T4.6**: `feat(hub): DashboardPage with sim status and quick settings`
- **T4.7**: `feat(hub): OverlaySettingsPage with auto-generated forms`
- **T4.8**: `feat(hub): ProfilesPage with full CRUD`
- **T4.9**: `feat(hub): SettingsPage + OverlayShell theme fetch wire`
- **T4.10**: `feat(hub): Storybook stories for Hub components`
- **T4.10b**: `feat(ipc): add Zod validation to profiles:save handler`
- **T4.10c**: `test(hub): integration test for full profile round-trip`

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter @vantare/desktop typecheck  # Expected: 0 errors
pnpm --filter @vantare/desktop test        # Expected: all tests pass
pnpm --filter @vantare/desktop build       # Expected: exit 0
pnpm --filter @vantare/desktop build-storybook  # Expected: exit 0
pnpm --filter @vantare/desktop test:e2e    # Expected: Hub routing flow passes
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] OverlayShell renders with theme from electron-store (not hardcoded)
- [ ] Hub route `/` shows Dashboard
- [ ] Hub route `/overlays` shows OverlaySettingsPage
- [ ] Hub route `/profiles` shows ProfilesPage
- [ ] Hub route `/settings` shows SettingsPage
- [ ] Empty state renders when no profiles exist
