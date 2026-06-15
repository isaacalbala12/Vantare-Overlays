# Vantare v2 LMU review bugfixes

Date: 2026-06-15

## Goal
Fix the review findings from the LMU REST + shared-memory fusion implementation without touching v1 Electron (`apps/desktop/`).

## Scope
- Active code only: `vantare-v2/` plus project `.omo/evidence/`.
- No commit or push.
- Keep REST LMU in Go; React remains renderer-only.
- Keep shared memory as the fast path.

## Bugs to fix
1. LMU shared-memory parser reads several primitive fields with wrong widths/types.
2. REST polling is inline in the 60 Hz telemetry read loop and can block fast inputs.
3. Session filtering/diffing misses REST session fields, so session changes can be dropped.
4. `Service.seq` has a potential data race between emit and subscribe.
5. Frontend drops `clutch` from snapshot/diff merge.
6. Relative widget uses classification gap for relative rows and has ahead/behind colors inverted.
7. Tests do not cover the parser extended fields or REST cache behavior.

## Implementation plan
1. Add regression tests first:
   - Parser field-width/type decoding for clutch, float32 gaps, byte pit/flag/fuel, int16 pitstops/penalties.
   - Pipeline session field changes.
   - Service seq replay stability.
   - Enriched LMU source non-blocking cache behavior if practical through a testable cache type.
   - Frontend clutch merge and Relative gap/color behavior.
2. Fix backend:
   - Add byte/float32 readers and enum/string mapping for LMU byte fields.
   - Move REST polling into a cache with mutex-protected snapshot and a background goroutine.
   - Make `ReadTelemetry()` read cache only, never HTTP.
   - Expand session filter/diff/session key for REST session fields.
   - Protect `seq` under `latestMu` or equivalent.
3. Fix frontend:
   - Add `clutch` to payload/diff typing and merge.
   - Make Relative display lap-distance delta for relative ordering and use correct ahead/behind colors.
   - Remove or neutralize live-dead mock-only fields if needed.
4. Verify:
   - `go test ./...`
   - `pnpm --dir frontend test`
   - `pnpm --dir frontend build`
   - If possible, targeted tests for changed packages.
5. Save evidence in `.omo/evidence/`.
