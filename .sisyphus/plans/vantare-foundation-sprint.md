# Vantare Overlays — Foundation Sprint

## TL;DR

> **Quick Summary**: Completar la capa fundamental del proyecto Vantare Overlays: tipos compartidos, cálculos de telemetría, normalizador, sistema mock, temas built-in, infraestructura compartida del renderer, y tests (TDD). Todo debe compilar y ejecutarse con datos mock sin necesidad de simuladores reales.
>
> **Deliverables**:
> - @vantare/types poblado con tipos compartidos
> - sim-core con cálculos + normalizer implementados
> - Sistema Mock (iRacing, LMU, AC) con escenarios
> - 3 temas built-in (Dark, Blood, Midnight)
> - Renderer shared infra (components, hooks, stores)
> - SimManager con auto-detección + mock fallback
> - AuthService stub mejorado
> - Infraestructura de tests (vitest) + tests TDD
> - Demo mode funcional con datos mock
>
> **Estimated Effort**: 1-2 semanas (solo dev)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Fix blockers → Core modules → Integration → Demo

---

## Context

### Original Request
"Planear completamente como desarrollar la parte inicial de la app en base a los documentos actuales."

### Interview Summary
**Decisiones Tomadas**:
- **Alcance**: Foundation completo + Mock Data (máximo)
- **Supabase**: NO en este sprint (queda para Sprint 6)
- **Testing**: TDD (tests primero)
- **Stack**: Electron + Vite + React 19 + TypeScript + Tailwind v4 + Zustand
- **Mock System**: Platform-specific mocks por sim (DEC-025), auto-activación sin sim detectado
- **Temas**: Dark (default), Blood, Midnight — tokens CSS via Tailwind v4 @theme

**Hallazgos de Metis**:
- **Build blocker crítico**: `adapters/index.ts` exporta desde `./base` pero archivo no existe
- **Circular import**: `sim-specific/index.ts` tiene `export * from './index'` (auto-referencia)
- **Sin tests**: No hay vitest.config.ts en ningún package, cero tests
- **Scope creep**: Peligro de incluir overlays funcionales (Sprint 3) o Hub UI (Sprint 4)

**Lo que YA existe** (no tocar):
- Electron main process (ventana, tray, IPC handlers con electron-store)
- Preload bridge (contextBridge completo)
- HTTP server con SSE
- OverlayManager (ventanas transparentes)
- @vantare/ui-core (GlassPanel, TimeDisplay, PositionBadge, DeltaIndicator + hooks + store)
- Shared types (bridge.ts, profile.ts, settings.ts, theme.ts)
- Tipos de telemetría (Telemetry, VehicleData, etc.)
- Configs: Vite (main, preload, renderer), electron-builder, turbo, tsconfig
- Doc completa (8 guías)

---

## Work Objectives

### Core Objective
Cerrar toda la capa fundamental para que el proyecto compile, tenga datos mock, temas visuales, y tests, listo para que los Sprints 2-3 (overlays reales) se construyan sobre una base sólida.

### Concrete Deliverables
- [ ] @vantare/types con todos los tipos compartidos re-exportados
- [ ] sim-core/calculations/ con fuel, delta, gap, sector math
- [ ] SimNormalizer funcional
- [ ] Mock System (3 providers: iRacing, LMU, AC + escenarios)
- [ ] 3 temas built-in: Dark, Blood, Midnight
- [ ] Renderer shared: components, hooks, stores
- [ ] SimManager con detección básica + mock fallback
- [ ] AuthService stub mejorado (estructura preparada para Supabase)
- [ ] Tests TDD (vitest configs + tests)
- [ ] Demo mode que corre con datos mock

### Definition of Done
- [ ] `pnpm build` compila sin errores en todos los packages
- [ ] `pnpm test` pasa en sim-core, ui-core, auth
- [ ] `pnpm dev:desktop` inicia la app y se conecta a mock data automáticamente
- [ ] Demo mode muestra datos de telemetría mock en el renderer
- [ ] Temas Dark, Blood, Midnight aplican correctamente

### Must Have
- Fix build blocker (adapters/base.ts en sim-core)
- Fix circular import (sim-specific/index.ts)
- vitest.config.ts en packages sim-core, ui-core, auth
- Mock system auto-activado cuando no hay sim detectado
- Tests escritos con TDD (test → implement → pass)

### Must NOT Have (Guardrails)
- NO implementar conexiones reales a sims (iRacing SDK, LMU shared memory) — Sprint 2
- NO configurar Supabase — Sprint 6
- NO construir overlays completos (Standings, Relative, etc.) — Sprint 3
- NO construir Hub UI (sidebar, layout editor) — Sprint 4
- NO auto-updater real — Sprint 7
- Mock system debe ser data generation, no state machine compleja

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (se creará en este sprint)
- **Automated tests**: TDD
- **Framework**: vitest (en cada package)
- **TDD**: Cada task → test (RED) → implement (GREEN) → refactor

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Library/Module**: Bash + bun REPL — import, call functions, assert results
- **Build verification**: `pnpm build` o `tsc --noEmit` en el package
- **Test verification**: `pnpm test` en el package

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Fixes + Config — foundation para todo lo demás):
├── Task 1: Fix circular import sim-specific/index.ts [quick]
├── Task 2: Create SimAdapter interface in sim-core/adapters/base.ts [quick]
├── Task 3: Setup vitest configs (sim-core, ui-core, auth) [quick]
├── Task 4: Populate @vantare/types + shared/types/index.ts [quick]
└── Task 5: Create shared/types/index.ts barrel export [quick]

Wave 2 (Core Modules — máximo paralelismo):
├── Task 6: Implement sim-core calculations [deep]
├── Task 7: Implement SimNormalizer [deep]
├── Task 8: Implement Mock System (3 providers + scenarios) [deep]
├── Task 9: Implement built-in themes (Dark, Blood, Midnight) [deep]
├── Task 10: Enhance AuthService stub [quick]
└── Task 11: Create renderer shared infrastructure [unspecified-high]

Wave 3 (Integration — conecta todo):
├── Task 12: Enhance SimManager with auto-detect + mock fallback [deep]
├── Task 13: Fix desktop imports (adapters from sim-core) [quick]
├── Task 14: Enhance IPC handlers for mock/demo mode [unspecified-high]
└── Task 15: Wire demo data flow (mock → IPC → SSE → renderer) [deep]

Wave FINAL (Verificación):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
```

---

## TODOs

- [ ] 1. Fix circular import en sim-core/types/sim-specific/index.ts

  **What to do**:
  - Read `packages/sim-core/src/types/sim-specific/index.ts`
  - Fix `export * from './index'` (circular self-import)
  - Either make it export actual types, or redirect to the correct file
  - Ensure types are properly exported from the sim-specific module

  **Must NOT do**:
  - No cambiar la estructura de tipos de telemetría existente

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Trivial fix — one line change
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1 (with Tasks 2, 3, 4, 5)
  - Blocks: Task 6, 7, 8
  - Blocked By: None

  **References**:
  - `packages/sim-core/src/types/sim-specific/index.ts` — File to fix
  - `packages/sim-core/src/types/index.ts` — Parent types file (check what's exported)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes in packages/sim-core
  - [ ] No more circular import warning

  **QA Scenarios**:
  ```
  Scenario: Verify circular import is fixed
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd packages/sim-core
      2. npx tsc --noEmit 2>&1
    Expected Result: No errors, no circular import warnings
    Evidence: .sisyphus/evidence/task-1-circular-fix.txt
  ```

  **Commit**: YES
  - Message: `fix(sim-core): resolve circular self-import in sim-specific/index.ts`
  - Files: `packages/sim-core/src/types/sim-specific/index.ts`
  - Pre-commit: `cd packages/sim-core && npx tsc --noEmit`

---

- [ ] 2. Create SimAdapter interface in sim-core/adapters/base.ts

  **What to do**:
  - Read the existing `SimAdapter` interface at `apps/desktop/src/main/sim/adapters/base.ts`
  - Move/copy the interface definition to `packages/sim-core/src/adapters/base.ts`
  - Update `packages/sim-core/src/adapters/index.ts` to export from `./base` (already does this, but file missing)
  - Make sure the interface is properly typed and exported
  - The interface should cover: connect, disconnect, onTelemetry, onSessionData, onConnectionState, destroy, name, displayName, isAvailable

  **Must NOT do**:
  - No cambiar la interfaz existente en desktop (por ahora ambas coexisten, o la de desktop importa de sim-core)
  - No implementar lógica de sim real

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Simple interface definition, one new file
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1 (with Tasks 1, 3, 4, 5)
  - Blocks: Task 6, 7, 8, 12, 13
  - Blocked By: None

  **References**:
  - `apps/desktop/src/main/sim/adapters/base.ts` — Existing interface to replicate
  - `packages/sim-core/src/adapters/index.ts` — Needs the file to export from

  **Acceptance Criteria**:
  - [ ] `packages/sim-core/src/adapters/base.ts` exists with SimAdapter interface
  - [ ] `pnpm build` passes in packages/sim-core
  - [ ] SimAdapter is exported from @vantare/sim-core

  **QA Scenarios**:
  ```
  Scenario: Verify SimAdapter exports correctly
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd packages/sim-core
      2. npx tsc --noEmit 2>&1
    Expected Result: Build passes with no errors
    Evidence: .sisyphus/evidence/task-2-adapter-build.txt

  Scenario: Verify SimAdapter can be imported
    Tool: Bash
    Preconditions: Build must pass
    Steps:
      1. cd packages/sim-core
      2. node -e "const m = require('./dist/index.js'); console.log(typeof m.SimAdapter)"
    Expected Result: Prints 'function' or 'object' (interface compiles to nothing but export exists)
    Evidence: .sisyphus/evidence/task-2-adapter-import.txt
  ```

  **Commit**: YES
  - Message: `feat(sim-core): add SimAdapter interface to shared types package`
  - Files: `packages/sim-core/src/adapters/base.ts`
  - Pre-commit: `cd packages/sim-core && npx tsc --noEmit`

---

- [ ] 3. Setup vitest configs + test infrastructure

  **What to do**:
  - Create `vitest.config.ts` in packages/sim-core, packages/ui-core, packages/auth
  - Create basic test setup file if needed
  - Verify that `pnpm test` works for each package
  - Create a simple smoke test (e.g., `describe('smoke', () => { it('works', () => {}) })`) to verify infra works

  **Must NOT do**:
  - No instalar dependencias extra sin verificar que sean necesarias
  - No modificar package.json scripts existentes

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Config file creation, straightforward setup
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1 (with Tasks 1, 2, 4, 5)
  - Blocks: All TDD tasks (6-11)
  - Blocked By: None

  **References**:
  - Check if vitest is already in devDependencies (should be)
  - See how other monorepo projects configure vitest with TypeScript
  - `packages/sim-core/package.json` — test script: `vitest run`

  **Acceptance Criteria**:
  - [ ] vitest.config.ts exists in packages/sim-core, ui-core, auth
  - [ ] `cd packages/sim-core && npx vitest run` passes (at least smoke test)
  - [ ] `cd packages/ui-core && npx vitest run` passes
  - [ ] `cd packages/auth && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: Verify test infra in sim-core
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd packages/sim-core
      2. npx vitest run 2>&1
    Expected Result: Tests run and pass
    Evidence: .sisyphus/evidence/task-3-test-infra-sim-core.txt
  ```

  **Commit**: YES
  - Message: `chore: setup vitest test infrastructure in packages`
  - Files: `packages/sim-core/vitest.config.ts`, `packages/ui-core/vitest.config.ts`, `packages/auth/vitest.config.ts`
  - Pre-commit: `cd packages/sim-core && npx vitest run`

---

- [ ] 4. Populate @vantare/types con tipos compartidos

  **What to do**:
  - Read `packages/types/src/index.ts` (currently `export {}`)
  - Re-exportar todos los tipos compartidos desde los otros packages y shared/types
  - Incluir: tipos de telemetría desde sim-core, tipos de shared (bridge, profile, settings, theme), tipos de auth
  - Crear la estructura de exportación limpia para @vantare/types

  **Must NOT do**:
  - No duplicar definiciones de tipos — todo debe re-exportarse
  - No modificar los tipos originales en sus packages de origen

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Barrel file creation, re-exports only
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1 (with Tasks 1, 2, 3, 5)
  - Blocks: Tasks 6-15 (indirectamente, depende de patrones de import)
  - Blocked By: None

  **References**:
  - `packages/types/src/index.ts` — File to populate
  - `packages/sim-core/src/types/index.ts` — Telemetry types
  - `shared/types/bridge.ts` — Bridge types
  - `shared/types/profile.ts` — Profile types
  - `shared/types/settings.ts` — Settings types
  - `shared/types/theme.ts` — Theme types
  - `packages/auth/src/index.ts` — Auth types
  - `tsconfig.base.json` — Path aliases (@vantare/types, @shared/*)

  **Acceptance Criteria**:
  - [ ] `pnpm build` passes in packages/types
  - [ ] All major types are re-exported (Telemetry, Settings, Profile, Theme, VantareBridge, AuthResult, etc.)
  - [ ] No circular dependency warnings

  **QA Scenarios**:
  ```
  Scenario: Verify types build and export
    Tool: Bash
    Preconditions: Dependencies built
    Steps:
      1. cd packages/types
      2. pnpm build 2>&1
    Expected Result: Build succeeds
    Evidence: .sisyphus/evidence/task-4-types-build.txt

  Scenario: Verify key types are exportable
    Tool: Bash
    Preconditions: Build passed
    Steps:
      1. node -e "const t = require('./packages/types'); console.log('types loaded')"
    Expected Result: No errors loading types
    Evidence: .sisyphus/evidence/task-4-types-import.txt
  ```

  **Commit**: YES
  - Message: `feat(types): populate @vantare/types with shared type re-exports`
  - Files: `packages/types/src/index.ts`
  - Pre-commit: `cd packages/types && pnpm build`

---

- [ ] 5. Create shared/types/index.ts barrel export

  **What to do**:
  - Crear `shared/types/index.ts` que re-exporte todos los tipos de shared/types/
  - bridge.ts, profile.ts, settings.ts, theme.ts
  - Actualizar tsconfig para que `@shared/types` funcione correctamente si es necesario

  **Must NOT do**:
  - No mover los archivos existentes
  - No cambiar las definiciones de tipos

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Simple barrel file
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1 (with Tasks 1, 2, 3, 4)
  - Blocks: Task 11 (renderer shared infra)
  - Blocked By: None

  **References**:
  - `shared/types/bridge.ts`, `profile.ts`, `settings.ts`, `theme.ts`
  - `tsconfig.base.json` — `@shared/*` path alias already exists

  **Acceptance Criteria**:
  - [ ] `shared/types/index.ts` exists with all exports
  - [ ] Can import from `@shared/types` in any package

  **QA Scenarios**:
  ```
  Scenario: Verify shared types barrel export
    Tool: Bash
    Preconditions: None
    Steps:
      1. node --loader ts-node/esm -e "import('./shared/types')" 2>&1 || echo "Only checking file existence"
      2. Test-Path "shared/types/index.ts"
    Expected Result: File exists and is valid TypeScript
    Evidence: .sisyphus/evidence/task-5-shared-barrel.txt
  ```

  **Commit**: YES
  - Message: `feat: add shared/types/index.ts barrel export`
  - Files: `shared/types/index.ts`
  - Pre-commit: None needed

---

- [ ] 6. Implement sim-core calculations (Fuel, Delta, Gap, Sector)

  **What to do**:
  - Implementar los siguientes cálculos en `packages/sim-core/src/calculations/`:
    - `fuel.ts`: Cálculos de combustible (consumo por vuelta, vueltas restantes, fuel to end, fuel save recomendado)
    - `delta.ts`: Cálculos de delta time (delta a mejor personal, delta a líder, delta al de adelante/atrás)
    - `gap.ts`: Cálculos de gap (gap en segundos, gap en vueltas, gap por clase)
    - `sector.ts`: Cálculos de sector (sector actual, tiempos de sector, mejor sector, delta por sector)
    - `index.ts`: Barrel export
  - TDD: Escribir tests primero (RED), luego implementar (GREEN), luego refactor
  - Cada función debe ser pura, tipada con los tipos existentes de sim-core

  **Must NOT do**:
  - No depender de ningún estado externo — funciones puras
  - No implementar lógica específica de sim (el normalizer se encarga de unificar)
  - No conectar con nada de IPC o Electron

  **Recommended Agent Profile**:
  > - Category: `deep`
  > - Reason: Lógica de cálculos de racing que requiere precisión matemática y comprensión de datos de telemetría
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 2
  - Blocks: Task 12, 13 (indirectamente)
  - Blocked By: Tasks 1, 3

  **References**:
  - `packages/sim-core/src/types/index.ts` — Telemetry types (VehicleData, LapData, etc.)
  - `packages/sim-core/package.json` — Test config
  - `docs/SIM-ADAPTER-GUIDE.md` — Contexto de datos de telemetría

  **Acceptance Criteria**:
  - [ ] fuel.ts implementado con: `calculateFuelPerLap`, `calculateLapsRemaining`, `calculateFuelToEnd`, `calculateRecommendedFuelSave`
  - [ ] delta.ts implementado con: `calculateDeltaToBest`, `calculateDeltaToLeader`, `calculateDeltaToCar`
  - [ ] gap.ts implementado con: `calculateGapSeconds`, `calculateGapLaps`, `calculateClassGap`
  - [ ] sector.ts implementado con: `getCurrentSector`, `calculateSectorDelta`, `calculateBestSectors`
  - [ ] Tests TDD: al menos 3 tests por módulo (~12 tests total)
  - [ ] `cd packages/sim-core && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run calculation tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd packages/sim-core
      2. npx vitest run --reporter=verbose 2>&1
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-6-calc-tests.txt

  Scenario: Verify calculations produce correct values
    Tool: Bash
    Preconditions: Build passes
    Steps:
      1. node -e "
        const { calculateFuelPerLap } = require('./packages/sim-core/dist/calculations/fuel');
        // Test with known values
        const result = calculateFuelPerLap(10, 5); // 10L used in 5 laps
        console.assert(result === 2.0, 'Expected 2.0 L/lap');
        console.log('Fuel calc OK:', result);
      "
    Expected Result: Calculations produce correct results
    Evidence: .sisyphus/evidence/task-6-calc-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(sim-core): implement telemetry calculations (fuel, delta, gap, sector)`
  - Files: `packages/sim-core/src/calculations/*.ts`
  - Pre-commit: `cd packages/sim-core && npx vitest run`

---

- [ ] 7. Implement SimNormalizer

  **What to do**:
  - Implementar `SimNormalizer` en `packages/sim-core/src/normalizer.ts`
  - Debe convertir datos crudos de cada sim (unknown) al formato unificado `Telemetry`
  - TDD: Escribir tests que pasen datos mock de cada sim y verifiquen el formato de salida
  - Manejar edge cases: datos incompletos, sim desconectado, valores inválidos
  - Los métodos a implementar:
    - `normalize(raw: unknown, sim: SimType): Telemetry` — Transforma datos crudos a Telemetry unificado
    - `normalizeVehicles(rawVehicles: unknown[], sim: SimType): VehicleData[]` — Normaliza array de vehículos
  - Usar Zod (ya está en dependencias) para validar datos de entrada

  **Must NOT do**:
  - No depender de implementaciones específicas de adaptadores de sim
  - No hacer I/O ni conexiones de red

  **Recommended Agent Profile**:
  > - Category: `deep`
  > - Reason: Lógica de transformación de datos entre distintos formatos de sim, con manejo de edge cases
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: NO (Wave 2, pero puede ejecutarse en paralelo con Task 8, 9, 10, 11)
  - Parallel Group: Wave 2 (with Tasks 8, 9, 10, 11)
  - Blocks: Tasks 12, 15
  - Blocked By: Tasks 1, 3

  **References**:
  - `packages/sim-core/src/normalizer.ts` — Archivo actual (stub)
  - `packages/sim-core/src/types/index.ts` — Telemetry, VehicleData, etc.
  - `packages/sim-core/src/types/sim-specific/index.ts` — Tipos específicos de sim (fix circular first)
  - `packages/sim-core/package.json` — Zod ya es dependencia

  **Acceptance Criteria**:
  - [ ] SimNormalizer.normalize() transforma datos mock de iRacing, LMU, AC a Telemetry
  - [ ] SimNormalizer.normalizeVehicles() transforma array de vehículos mock
  - [ ] Error handling: lanza error descriptivo para datos inválidos
  - [ ] Tests: al menos 5 tests cubriendo happy path + edge cases
  - [ ] `cd packages/sim-core && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run normalizer tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd packages/sim-core
      2. npx vitest run --reporter=verbose -t normalizer 2>&1
    Expected Result: All normalizer tests pass
    Evidence: .sisyphus/evidence/task-7-normalizer-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(sim-core): implement SimNormalizer with Zod validation`
  - Files: `packages/sim-core/src/normalizer.ts`
  - Pre-commit: `cd packages/sim-core && npx vitest run`

---

- [ ] 8. Implement Mock System (3 providers + scenarios)

  **What to do**:
  - Crear `packages/sim-core/src/mock/` con la siguiente estructura:
    - `mock-provider.ts` — Interfaz MockProvider (extiende o replica SimAdapter)
    - `iracing-mock.ts` — Mock para iRacing (genera datos realistas: velocidad 0-320 km/h, RPM 0-10000, fuel decreciente, vueltas incrementales)
    - `lmu-mock.ts` — Mock para LMU (similar pero con rangos específicos de LMU)
    - `ac-mock.ts` — Mock para Assetto Corsa
    - `scenarios.ts` — Escenarios predefinidos: practice, qualifying, race, pit stop, crash, formation-lap
    - `index.ts` — Barrel export que expone MockSimFactory
    - `mock-sim-factory.ts` — Fábrica que selecciona el mock según SimType y escenario
  - TDD: Tests para cada mock provider
  - Cada escenario debe generar datos coherentes:
    - Practice: velocidad media, sin presión, datos estables
    - Qualifying: pocas vueltas, tiempos rápidos, fuel bajo
    - Race: tráfico, gaps variables, pit stops, fuel decreciente
    - Pit Stop: velocidad 0, fuel incrementa, tiempo detenido
    - Crash: velocidad 0, daños, banderas amarillas

  **Must NOT do**:
  - No hacer state machine compleja — cada llamada genera datos basados en tiempo + escenario
  - No depender de ningún sim real
  - No conectar con IPC, Electron, ni red

  **Recommended Agent Profile**:
  > - Category: `deep`
  > - Reason: Lógica de generación de datos realistas para 3 sims con 6 escenarios, requiere conocimiento de telemetría de simracing
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 2 (with Tasks 6, 7, 9, 10, 11)
  - Blocks: Tasks 12, 15
  - Blocked By: Tasks 1, 2, 3

  **References**:
  - `docs/TECH-DECISIONS.md` — DEC-025 Mock System
  - `packages/sim-core/src/types/index.ts` — Telemetry types to generate
  - `docs/SIM-ADAPTER-GUIDE.md` — Detalles de telemetría por sim
  - `apps/desktop/src/main/sim/adapters/base.ts` — SimAdapter interface

  **Acceptance Criteria**:
  - [ ] MockProvider interface defined
  - [ ] 3 mock providers (iRacing, LMU, AC) generan datos Telemetry válidos
  - [ ] 6 escenarios: practice, qualifying, race, pit-stop, crash, formation-lap
  - [ ] MockSimFactory.create() returns correct mock por SimType
  - [ ] Tests: al menos 2 tests por provider + 1 test por escenario (~9 tests)
  - [ ] `cd packages/sim-core && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run mock system tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd packages/sim-core
      2. npx vitest run --reporter=verbose -t mock 2>&1
    Expected Result: All mock tests pass
    Evidence: .sisyphus/evidence/task-8-mock-tests.txt

  Scenario: Verify mock generates valid Telemetry
    Tool: Bash
    Preconditions: Build passes
    Steps:
      1. node -e "
        const { MockSimFactory } = require('./packages/sim-core/dist/mock');
        const mock = MockSimFactory.create('iracing', 'race');
        const data = mock.getData();
        console.assert(data.sim === 'iracing', 'Wrong sim type');
        console.assert(data.player.speed >= 0, 'Speed must be >= 0');
        console.assert(data.vehicles.length > 0, 'Must have vehicles');
        console.log('Mock data valid:', JSON.stringify(data).length, 'bytes');
      "
    Expected Result: Mock data generates valid Telemetry
    Evidence: .sisyphus/evidence/task-8-mock-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(sim-core): implement Mock System with 3 sim providers and 6 scenarios`
  - Files: `packages/sim-core/src/mock/*.ts`
  - Pre-commit: `cd packages/sim-core && npx vitest run`

---

- [ ] 9. Implement built-in themes (Dark, Blood, Midnight)

  **What to do**:
  - Crear `apps/desktop/src/renderer/themes/` con los 3 temas:
    - `dark.json` — Tema oscuro default: fondos negros/gris oscuro, texto blanco, acentos azules
    - `blood.json` — Tema sangre: fondos oscuros con tintes rojos, acentos rojo sangre (#8B0000, #DC143C)
    - `midnight.json` — Tema midnight: azul profundo (#0a0a2e), acentos azul eléctrico (#4169E1)
  - Cada tema debe tener TODOS los tokens definidos en THEME-SYSTEM.md:
    - Surface tokens (bg-primary, bg-secondary, bg-surface)
    - Text tokens (text-primary, text-secondary, text-muted)
    - Accent tokens (accent-primary, accent-secondary, accent-success, accent-warning, accent-danger)
    - Border tokens (border-default, border-hover)
    - Overlay-specific tokens (standings-header, delta-positive, delta-negative, etc.)
  - Formato JSON según `shared/types/theme.ts`
  - Crear `apps/desktop/src/renderer/themes/index.ts` que exporte los 3 temas
  - TDD: Tests que verifiquen que cada tema tiene todos los tokens requeridos

  **Must NOT do**:
  - No implementar ThemeProvider o ThemeContext (ya existe useTheme hook, pero el provider se hará cuando se integren los temas)
  - No crear temas adicionales más allá de los 3

  **Recommended Agent Profile**:
  > - Category: `deep`
  > - Reason: Requiere diseño visual consistente (color theory, contraste, accesibilidad) además de datos
  > - Skills: [`Frontend Responsive Design Standards`]
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 2 (with Tasks 6, 7, 8, 10, 11)
  - Blocks: Tasks 15 (demo mode)
  - Blocked By: Tasks 3 (test infra), 5 (shared types)

  **References**:
  - `docs/THEME-SYSTEM.md` — Token reference completa
  - `shared/types/theme.ts` — Theme type definition
  - `apps/desktop/src/renderer/themes/` — Directorio target

  **Acceptance Criteria**:
  - [ ] 3 archivos JSON: dark.json, blood.json, midnight.json
  - [ ] Cada tema tiene todos los tokens del Theme Token Reference
  - [ ] Temas siguen el formato Theme interface
  - [ ] Tests: verifica que cada tema tenga al menos 30 tokens definidos
  - [ ] `cd apps/desktop && npx vitest run` — ALL PASS (temas)

  **QA Scenarios**:
  ```
  Scenario: Verify themes have all required tokens
    Tool: Bash
    Preconditions: Theme files exist
    Steps:
      1. node -e "
        const dark = require('./apps/desktop/src/renderer/themes/dark.json');
        const requiredTokens = ['bg-primary','bg-secondary','bg-surface','text-primary','accent-primary'];
        const missing = requiredTokens.filter(t => !dark.tokens[t]);
        console.assert(missing.length === 0, 'Missing tokens: ' + missing.join(', '));
        console.log('Dark theme: ' + Object.keys(dark.tokens).length + ' tokens');
      "
    Expected Result: All required tokens present
    Evidence: .sisyphus/evidence/task-9-themes-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(themes): add 3 built-in themes (Dark, Blood, Midnight)`
  - Files: `apps/desktop/src/renderer/themes/*`
  - Pre-commit: `cd apps/desktop && npx tsc --noEmit`

---

- [ ] 10. Enhance AuthService stub

  **What to do**:
  - Mejorar `packages/auth/src/index.ts`:
    - AuthService con métodos login, register, logout, getSession, getLicenseStatus
    - Implementación local (sin Supabase) usando un store en memoria
    - Estructura de datos preparada para futura migración a Supabase
    - Feature gating simple: `canAccess(feature: string): boolean` basado en tier
  - TDD: Tests para login local, license status, feature gating

  **Must NOT do**:
  - No hacer llamadas de red
  - No configurar Supabase SDK
  - No implementar HWID binding ni validación online

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Stub mejorado pero sin lógica compleja ni conexiones externas
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 2 (with Tasks 6, 7, 8, 9, 11)
  - Blocks: Tasks 14 (IPC handlers for auth)
  - Blocked By: Tasks 3 (test infra)

  **References**:
  - `packages/auth/src/index.ts` — Current stub
  - `shared/types/bridge.ts` — VantareBridge.auth methods
  - `docs/AUTH-GUIDE.md` — Auth architecture reference

  **Acceptance Criteria**:
  - [ ] AuthService.login() funciona localmente (guarda en sesión)
  - [ ] AuthService.register() crea usuario local
  - [ ] AuthService.logout() limpia sesión
  - [ ] AuthService.getLicenseStatus() devuelve tier correcto
  - [ ] AuthService.canAccess() filtra por tier
  - [ ] Tests: login, register, license check, feature gating (~6 tests)
  - [ ] `cd packages/auth && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run auth tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd packages/auth
      2. npx vitest run --reporter=verbose 2>&1
    Expected Result: All auth tests pass
    Evidence: .sisyphus/evidence/task-10-auth-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): enhance AuthService stub with local implementation`
  - Files: `packages/auth/src/index.ts`
  - Pre-commit: `cd packages/auth && npx vitest run`

---

- [ ] 11. Create renderer shared infrastructure

  **What to do**:
  - Poblar los directorios vacíos en `apps/desktop/src/renderer/shared/`:
    - `components/`:
      - `OverlayContainer.tsx` — Layout wrapper para overlays (fondo transparente, posicionamiento)
      - `LoadingSpinner.tsx` — Indicador de carga
      - `ErrorMessage.tsx` — Mensaje de error con retry
      - `StatusIndicator.tsx` — Indicador de conexión (verde/rojo)
      - `index.ts` — Barrel export
    - `hooks/`:
      - `useConnectionStatus.ts` — Hook para estado de conexión del sim
      - `useOverlayConfig.ts` — Hook para configuración del overlay activo
      - `index.ts` — Barrel export
    - `stores/`:
      - `app-store.ts` — Store global de la app (view activo, settings, etc.)
      - `index.ts` — Barrel export
  - TDD: Tests para componentes y hooks

  **Must NOT do**:
  - No implementar overlays específicos (Standings, Relative) — Sprint 3
  - No implementar Hub UI pages — Sprint 4

  **Recommended Agent Profile**:
  > - Category: `unspecified-high`
  > - Reason: Múltiples componentes y hooks con lógica de React + Electron IPC
  > - Skills: [`Frontend Responsive Design Standards`]
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 2 (with Tasks 6, 7, 8, 9, 10)
  - Blocks: Tasks 12, 14, 15
  - Blocked By: Tasks 3, 5

  **References**:
  - `shared/types/bridge.ts` — VantareBridge types
  - `apps/desktop/src/preload/index.ts` — contextBridge API
  - `packages/ui-core/src/hooks/useTelemetry.ts` — Existing hook pattern
  - `packages/ui-core/src/components/GlassPanel.tsx` — Component pattern
  - `apps/desktop/src/renderer/styles/globals.css` — Global styles

  **Acceptance Criteria**:
  - [ ] OverlayContainer renderiza children con fondo transparente
  - [ ] LoadingSpinner muestra indicador animado
  - [ ] ErrorMessage muestra error con botón retry
  - [ ] StatusIndicator cambia color según estado
  - [ ] useConnectionStatus escucha eventos IPC sim-state
  - [ ] useOverlayConfig obtiene configuración del overlay activo
  - [ ] app-store maneja view, settings global
  - [ ] Tests: al menos 2 tests por componente (~8 tests)
  - [ ] `cd apps/desktop && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run shared renderer tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd apps/desktop
      2. npx vitest run --reporter=verbose -t shared 2>&1
    Expected Result: All shared component tests pass
    Evidence: .sisyphus/evidence/task-11-shared-tests.txt
  ```

  **Commit**: YES (groups with 12)
  - Message: `feat(renderer): create shared components, hooks, and stores`
  - Files: `apps/desktop/src/renderer/shared/**/*`
  - Pre-commit: `cd apps/desktop && npx vitest run`

---

- [ ] 12. Enhance SimManager with auto-detect + mock fallback

  **What to do**:
  - Mejorar `apps/desktop/src/main/sim/sim-manager.ts`:
    - Implementar detección básica de sims (verificar procesos en ejecución: iRacing.exe, LMU.exe, acs.exe)
    - Si no hay sim detectado → activar MockSimFactory automáticamente
    - Si hay sim detectado → preparar para conectar (la conexión real se hará en Sprint 2)
    - Emitir eventos `sim-state` via IPC con el estado actual
    - Integrar con el Mock System desde @vantare/sim-core
  - TDD: Tests para detección (mockeando procesos), auto-fallback, state emission

  **Must NOT do**:
  - No implementar conexión real a sims (shared memory, SDK) — Sprint 2
  - No modificar el preload bridge ni los IPC handlers existentes
  - No cambiar la interfaz SimAdapter

  **Recommended Agent Profile**:
  > - Category: `deep`
  > - Reason: Integración entre Electron main process y sim-core mock system, con lógica de auto-detección
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 3
  - Blocks: Tasks 14, 15
  - Blocked By: Tasks 2, 6, 7, 8, 11

  **References**:
  - `apps/desktop/src/main/sim/sim-manager.ts` — Current stub
  - `apps/desktop/src/main/sim/adapters/base.ts` — SimAdapter interface
  - `packages/sim-core/src/mock/` — Mock system
  - `apps/desktop/src/preload/index.ts` — sim-state IPC events
  - `shared/types/bridge.ts` — SimState types

  **Acceptance Criteria**:
  - [ ] SimManager detecta ausencia de sims y activa mock automáticamente
  - [ ] SimManager emite `sim-state` via main window webContents
  - [ ] Fallback a mock ocurre en < 1 segundo
  - [ ] Tests: auto-detect, mock fallback, state emission
  - [ ] `cd apps/desktop && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run SimManager tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd apps/desktop
      2. npx vitest run --reporter=verbose -t sim-manager 2>&1
    Expected Result: All SimManager tests pass
    Evidence: .sisyphus/evidence/task-12-sim-manager-tests.txt

  Scenario: Verify mock fallback starts without sim
    Tool: Bash
    Preconditions: No sim running
    Steps:
      1. cd apps/desktop
      2. node -e "
        const { SimManager } = require('./src/main/sim/sim-manager');
        const mgr = new SimManager();
        mgr.start();
        setTimeout(() => {
          console.assert(mgr.isMockActive === true, 'Mock should be active');
          mgr.stop();
          console.log('Mock fallback OK');
        }, 1500);
      "
    Expected Result: Mock activates when no sim detected
    Evidence: .sisyphus/evidence/task-12-mock-fallback.txt
  ```

  **Commit**: YES (groups with 11)
  - Message: `feat(desktop): enhance SimManager with auto-detect and mock fallback`
  - Files: `apps/desktop/src/main/sim/sim-manager.ts`
  - Pre-commit: `cd apps/desktop && npx vitest run`

---

- [ ] 13. Fix desktop imports (adapters from sim-core)

  **What to do**:
  - Actualizar `apps/desktop/src/main/sim/adapters/` para importar SimAdapter desde @vantare/sim-core
  - El archivo `base.ts` en desktop actualmente define su propia interfaz — ahora debe importarla del package compartido
  - Verificar que todos los archivos que usan SimAdapter en desktop funcionen con la nueva importación
  - Limpiar la definición duplicada si existe

  **Must NOT do**:
  - No cambiar la funcionalidad de los adapters desktop
  - No modificar la interfaz SimAdapter en sim-core

  **Recommended Agent Profile**:
  > - Category: `quick`
  > - Reason: Refactor de imports, cambio mecánico
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 3 (with Task 14)
  - Blocks: Task 15
  - Blocked By: Tasks 2, 3

  **References**:
  - `apps/desktop/src/main/sim/adapters/base.ts` — Current file to update
  - `packages/sim-core/src/adapters/base.ts` — New shared interface
  - `apps/desktop/src/main/sim/sim-manager.ts` — Consumer
  - `apps/desktop/src/main/index.ts` — Bootstrap consumer
  - `packages/sim-core/src/adapters/index.ts` — Exports

  **Acceptance Criteria**:
  - [ ] `apps/desktop/src/main/sim/adapters/base.ts` importa desde `@vantare/sim-core`
  - [ ] `cd apps/desktop && npx tsc --noEmit` pasa sin errores
  - [ ] No hay definiciones duplicadas de SimAdapter

  **QA Scenarios**:
  ```
  Scenario: Verify desktop compiles with sim-core adapter import
    Tool: Bash
    Preconditions: Build dependencies in sim-core
    Steps:
      1. cd packages/sim-core && pnpm build
      2. cd apps/desktop
      3. npx tsc --noEmit 2>&1
    Expected Result: Build passes
    Evidence: .sisyphus/evidence/task-13-desktop-imports.txt
  ```

  **Commit**: YES
  - Message: `refactor(desktop): import SimAdapter from @vantare/sim-core`
  - Files: `apps/desktop/src/main/sim/adapters/base.ts`
  - Pre-commit: `cd apps/desktop && npx tsc --noEmit`

---

- [ ] 14. Enhance IPC handlers for mock/demo mode

  **What to do**:
  - Mejorar `apps/desktop/src/main/ipc/handlers.ts`:
    - Añadir handler `sim:get-mock-status` para consultar si mock está activo
    - Añadir handler `sim:override-mock` para forzar un escenario específico
    - Mejorar handlers de auth (connect to enhanced AuthService)
    - Asegurar que todos los handlers existentes funcionan con los tipos actualizados
  - TDD: Tests para nuevos handlers

  **Must NOT do**:
  - No modificar handlers existentes que ya funcionan
  - No añadir handlers de overlays (Sprint 3-4)

  **Recommended Agent Profile**:
  > - Category: `unspecified-high`
  > - Reason: Integración con el sistema IPC existente, varios handlers nuevos
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 3 (with Task 13)
  - Blocks: Task 15
  - Blocked By: Tasks 10, 12

  **References**:
  - `apps/desktop/src/main/ipc/handlers.ts` — Current handlers
  - `apps/desktop/src/main/auth/license.ts` — AuthService
  - `apps/desktop/src/main/sim/sim-manager.ts` — SimManager
  - `apps/desktop/src/preload/index.ts` — Bridge API (must match)

  **Acceptance Criteria**:
  - [ ] Handler `sim:get-mock-status` returns mock active state
  - [ ] Handler `sim:override-mock` sets mock scenario
  - [ ] Auth handlers connected to enhanced AuthService
  - [ ] Todos los handlers existentes siguen funcionando
  - [ ] `cd apps/desktop && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Run IPC handler tests
    Tool: Bash
    Preconditions: vitest config exists
    Steps:
      1. cd apps/desktop
      2. npx vitest run --reporter=verbose -t ipc 2>&1
    Expected Result: All IPC handler tests pass
    Evidence: .sisyphus/evidence/task-14-ipc-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(desktop): enhance IPC handlers for mock mode and auth`
  - Files: `apps/desktop/src/main/ipc/handlers.ts`
  - Pre-commit: `cd apps/desktop && npx vitest run`

---

- [ ] 15. Wire demo data flow (mock -> IPC -> SSE -> renderer)

  **What to do**:
  - Conectar el flujo completo de datos demo:
    1. SimManager detecta que no hay sim -> activa MockSimFactory
    2. MockSimFactory genera datos Telemetry periódicamente (~16Hz)
    3. SimManager envía datos al main window via IPC `telemetry`
    4. HTTP Server también recibe datos y los transmite via SSE a clientes web
    5. Renderer recibe datos via preload bridge y los muestra
    6. App.tsx en el renderer muestra un indicador "Demo Mode" cuando está activo
  - Actualizar `App.tsx` para que muestre el estado de demo mode
  - Verificar que el flujo completo funciona: `pnpm dev:desktop`
  - NO construir overlays completos

  **Must NOT do**:
  - No construir UI compleja para el demo mode (solo indicador básico)
  - No implementar overlays (Standings, Relative, etc.)
  - No tocar HTTP Server existente (ya funciona con SSE)

  **Recommended Agent Profile**:
  > - Category: `deep`
  > - Reason: Integración de múltiples capas (main -> preload -> renderer), debugging de flujo completo
  > - Skills: []
  > - Skills Evaluated but Omitted: none needed

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 3 (sequential after 12, 13, 14)
  - Blocks: F1-F4 (Final verification)
  - Blocked By: Tasks 12, 13, 14

  **References**:
  - `apps/desktop/src/main/index.ts` — Bootstrap
  - `apps/desktop/src/main/sim/sim-manager.ts` — Enhanced
  - `apps/desktop/src/main/server/http-server.ts` — SSE server
  - `apps/desktop/src/preload/index.ts` — Bridge
  - `apps/desktop/src/renderer/App.tsx` — Renderer entry
  - `packages/ui-core/src/hooks/useTelemetry.ts` — Telemetry hook
  - `packages/sim-core/src/mock/` — Mock system

  **Acceptance Criteria**:
  - [ ] Sin sim detectado -> mock se activa automáticamente
  - [ ] Renderer recibe datos de telemetría mock via IPC
  - [ ] HTTP Server transmite datos SSE
  - [ ] App.tsx muestra "Demo Mode" cuando mock está activo
  - [ ] `cd apps/desktop && npx tsc --noEmit` pasa
  - [ ] `cd apps/desktop && npx vitest run` — ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Verify full build compiles
    Tool: Bash
    Preconditions: All tasks 1-14 complete
    Steps:
      1. pnpm build 2>&1
    Expected Result: All packages build successfully
    Evidence: .sisyphus/evidence/task-15-full-build.txt

  Scenario: Verify demo data flow passes typecheck
    Tool: Bash
    Preconditions: Build dependencies
    Steps:
      1. cd apps/desktop
      2. npx tsc --noEmit 2>&1
    Expected Result: TypeScript compiles without errors
    Evidence: .sisyphus/evidence/task-15-typecheck.txt
  ```

  **Commit**: YES (groups with 12, 13, 14)
  - Message: `feat: wire demo data flow from mock system to renderer`
  - Files: `apps/desktop/src/main/index.ts`, `apps/desktop/src/renderer/App.tsx`
  - Pre-commit: `cd apps/desktop && npx vitest run && npx tsc --noEmit`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify every "Must Have" is implemented. Check no "Must NOT Have" is present. Verify evidence files exist in .sisyphus/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm build` + `pnpm test` across all packages. Review for `as any`, `@ts-ignore`, empty catches, console.log in prod. Check AI slop.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Manual QA** — `unspecified-high`
  Execute key QA scenarios from tasks 6, 7, 8, 15. Verify demo data flow works. Save evidence to .sisyphus/evidence/final-qa/.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 implementation. Detect scope creep beyond Foundation Sprint.
  Output: `Tasks [N/N compliant] | Scope creep [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Task | Message | Files | Pre-commit |
|------|---------|-------|------------|
| 1 | `fix(sim-core): resolve circular self-import` | `packages/sim-core/src/types/sim-specific/index.ts` | `cd packages/sim-core && npx tsc --noEmit` |
| 2 | `feat(sim-core): add SimAdapter interface to shared types package` | `packages/sim-core/src/adapters/base.ts` | `cd packages/sim-core && npx tsc --noEmit` |
| 3 | `chore: setup vitest test infrastructure in packages` | `packages/*/vitest.config.ts` | `cd packages/sim-core && npx vitest run` |
| 4 | `feat(types): populate @vantare/types with shared type re-exports` | `packages/types/src/index.ts` | `cd packages/types && pnpm build` |
| 5 | `feat: add shared/types/index.ts barrel export` | `shared/types/index.ts` | None needed |
| 6 | `feat(sim-core): implement telemetry calculations` | `packages/sim-core/src/calculations/*.ts` | `cd packages/sim-core && npx vitest run` |
| 7 | `feat(sim-core): implement SimNormalizer with Zod validation` | `packages/sim-core/src/normalizer.ts` | `cd packages/sim-core && npx vitest run` |
| 8 | `feat(sim-core): implement Mock System (3 providers, 6 scenarios)` | `packages/sim-core/src/mock/*.ts` | `cd packages/sim-core && npx vitest run` |
| 9 | `feat(themes): add 3 built-in themes (Dark, Blood, Midnight)` | `apps/desktop/src/renderer/themes/*` | `cd apps/desktop && npx tsc --noEmit` |
| 10 | `feat(auth): enhance AuthService stub with local implementation` | `packages/auth/src/index.ts` | `cd packages/auth && npx vitest run` |
| 11-12 | `feat(renderer): create shared components, hooks, and stores` + `feat(desktop): enhance SimManager` | `apps/desktop/src/renderer/shared/**/*`, `apps/desktop/src/main/sim/sim-manager.ts` | `cd apps/desktop && npx vitest run` |
| 13 | `refactor(desktop): import SimAdapter from @vantare/sim-core` | `apps/desktop/src/main/sim/adapters/base.ts` | `cd apps/desktop && npx tsc --noEmit` |
| 14 | `feat(desktop): enhance IPC handlers for mock mode and auth` | `apps/desktop/src/main/ipc/handlers.ts` | `cd apps/desktop && npx vitest run` |
| 15 | `feat: wire demo data flow from mock system to renderer` | `apps/desktop/src/main/index.ts`, `apps/desktop/src/renderer/App.tsx` | `cd apps/desktop && npx vitest run && npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
pnpm build        # All packages compile without errors
pnpm test         # All tests pass across all packages
cd apps/desktop && npx tsc --noEmit   # Desktop app typechecks
```

### Final Checklist
- [ ] All "Must Have" items verified present
- [ ] All "Must NOT Have" items verified absent
- [ ] All tests pass (sim-core, ui-core, auth, desktop)
- [ ] Build compiles without errors
- [ ] Demo mode shows "Demo Mode" indicator when no sim detected
- [ ] Evidence files exist for all completed tasks
