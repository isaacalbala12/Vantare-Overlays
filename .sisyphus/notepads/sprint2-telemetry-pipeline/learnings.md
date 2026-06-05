## sprint2-telemetry-pipeline — Learnings

### Telemetry Store Enhancement (2026-06-02)

**What was done:**
- Converted `createTelemetryStore` factory into a named singleton `useTelemetryStore` while keeping factory export
- Added 9 raw data selectors: `selectPlayer`, `selectEngine`, `selectTyres`, `selectLap`, `selectSession`, `selectVehicles`, `selectTrack`, `selectInputs`, `selectWeather`
- Added `error` state field (string | null) and `setError` action
- Added `isMock` state field and `setIsMock` action
- Added `selectConnected` and `selectIsMock` meta selectors
- Added 3 calculated selectors: `selectFuelCalculations`, `selectGapCalculations`, `selectDeltaCalculations`
- Updated exports in `index.ts` to export both `useTelemetryStore` and `createTelemetryStore`

**Test results:** 36 new tests + 1 existing smoke = 37 passing

**Key decisions:**
- Calculated selectors return `null` when telemetry is null (safe guards)
- `fuelUsed` is derived as `fuelCapacity - fuelLevel`, `lapsCompleted` as `max(1, currentLap - 1)`
- `gapToCarAhead` uses the next vehicle ahead by position (sorted descending)
- `estimatedLaptime` uses completed sector times based on current `sector` value
- All selectors are pure functions: `(state: TelemetryState) => T | null`
- Types import from `@vantare/sim-core`, calculation functions from `@vantare/sim-core/calculations`

**Patterns established:**
- Zustand store: factory pattern (`createTelemetryStore`) for test isolation + singleton (`useTelemetryStore`) for app usage
- Selector pattern: pure functions exported alongside store, usable with `useTelemetryStore(selector)` or `store.getState()` access

### Mock Telemetry Seeder (2026-06-03)

**What was done:**
- Created `apps/desktop/src/main/sim/mock-telemetry-seeder.ts` exporting `SeedData`
- Added 5 fixture methods: `emptyState`, `midRaceState`, `endRaceState`, `playerAtFront`, `playerAtBack`
- Each fixture returns a complete `Telemetry` object matching the interface from `@vantare/sim-core`
- Added `apps/desktop/src/main/sim/__tests__/mock-telemetry-seeder.test.ts` with 5 passing tests

**Key implementation details:**
- `emptyState()` returns zero vehicles and player position 1 (matching the actual `PlayerData.position` type of `number`, not nullable)
- `midRaceState()` returns 20 vehicles split across GT3 and GTE classes, player at position 10, cumulative gaps
- `endRaceState()` uses fixed P19->P20 gap of 5s for deterministic assertion
- `playerAtFront()` sets P2 gap to ~2.5s
- `playerAtBack()` sets P19 gap to exactly 5s
- Shared `buildBase()` helper centralizes default session/weather/track/inputs/engine/tyres/lap/player fields
- Vehicles use `@vantare/sim-core` `VehicleData` shape with fields: `id`, `driverName`, `carNumber`, `teamName`, `position`, `classPosition`, `gap`, `gapType`, `lastLaptime`, `bestLaptime`, `sectorTimes`, `speed`, `isPlayer`, `isPitting`, `tyreCompound`, `fuelRemaining`, `color`

**Test results:** `pnpm vitest run src/main/sim/__tests__/mock-telemetry-seeder.test.ts` = 5 tests passed

