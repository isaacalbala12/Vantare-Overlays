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
