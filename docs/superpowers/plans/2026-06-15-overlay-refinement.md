# Vantare Overlay Refinement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refine the racing overlays based on live feedback:
1. Make the Relative gap stable (not coupled to instantaneous player speed).
2. Keep the Standings pit indicator only on the driver number, not in the gap column.
3. Improve overall rendering/telemetry performance.

**Architecture:** Keep backend gap computation in Go, but switch the reference speed from player instantaneous speed to track-average speed derived from the player's estimated/best lap time. Frontend widgets cache appearance/session mode and avoid rebuilding strings when data hasn't changed.

---

## Background

### Current gap algorithm (`internal/telemetry/gap/gap.go`)

```go
if useSpeed {
    v.TimeGapToPlayer = delta / playerSpeed
}
```

`playerSpeed` is instantaneous (m/s). When the player brakes, the denominator shrinks and the gap explodes; when accelerating, the gap shrinks. This feels wrong in the overlay.

### What simulators do

Most relative boxes (iRacing, rFactor, LMU native) express gap as **"time at current lap pace"**. They convert track-distance delta to seconds using a reference lap time, not instantaneous velocity.

Formula:

```
gapSeconds = deltaDistance / (trackLength / referenceLapTime)
```

This stays stable unless the lap-pace estimate itself changes.

### Current Standings pit rendering (`frontend/src/overlay/widgets/StandingsWidget.tsx`)

```ts
const pitLabel = formatStandingsPit(v);
const gapText = pitLabel || (mode === "race" && v.fastestLap ? "FASTEST" : formatStandingsGapForMode(mode, v));
```

When a car is in pits, `gapText` becomes "PIT" in the right-hand gap column. The user wants the gap/time to remain visible there, with the pit state shown only on the number badge.

### Current performance hotspots

- `vehiclesChanged` in `internal/telemetry/diff/diff.go` rebroadcasts the entire vehicle array whenever any dynamic field crosses its threshold.
- Widgets rebuild full HTML strings every frame via `startFrameBudgetLoop`.
- `resolveWidgetAppearance` and `resolveSessionMode` run on every frame.

---

## Task 1: Stabilize Relative gap with lap-pace reference

**Files:**
- Modify: `vantare-v2/internal/telemetry/gap/gap.go`
- Modify: `vantare-v2/internal/telemetry/gap/gap_test.go`
- Modify: `vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts` (update timeGapToPlayer values if they were tuned for the old speed-based math)

- [ ] **Step 1: Change algorithm to track-average speed**

Replace the `useSpeed` branch with:

```go
playerRefLap := estimateLapTime(t.Vehicles[playerIdx])
if playerRefLap <= 0 {
    playerRefLap = estimateLapTime(*v) // fallback to target car's lap time
}
if playerRefLap <= 0 {
    // ultimate fallback: instant speed, only when no lap time data exists
    if playerSpeed > 1.0 {
        v.TimeGapToPlayer = delta / playerSpeed
        continue
    }
}
if playerRefLap > 0 {
    avgSpeed := trackLength / playerRefLap
    v.TimeGapToPlayer = delta / avgSpeed
}
```

Remove the old `useSpeed` variable or keep it only as last-resort fallback.

- [ ] **Step 2: Update tests**

In `gap_test.go`, add/update tests:

```go
func TestComputeTimeGaps_UsesEstimatedLapTimeNotInstantSpeed(t *testing.T) {
    tm := &models.Telemetry{
        Player: &models.PlayerTelemetry{Speed: 1}, // very slow, would blow up old algorithm
        Vehicles: []models.VehicleScoring{
            {ID: 1, IsPlayer: true, LapDistance: 1000, EstimatedLapTime: 120, TotalLaps: 5},
            {ID: 2, IsPlayer: false, LapDistance: 1100, EstimatedLapTime: 120, TotalLaps: 5},
        },
    }
    ComputeTimeGaps(tm)
    // trackLength=1000, avgSpeed=1000/120=8.33, delta=100 => gap ~12s
    if tm.Vehicles[1].TimeGapToPlayer < 10 || tm.Vehicles[1].TimeGapToPlayer > 15 {
        t.Fatalf("expected stable gap ~12s, got %v", tm.Vehicles[1].TimeGapToPlayer)
    }
}
```

Also ensure existing tests still pass after the change.

- [ ] **Step 3: Run Go tests**

```bash
cd vantare-v2
go test ./internal/telemetry/gap/... ./internal/telemetry/... -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd vantare-v2
git add internal/telemetry/gap/
git commit -m "feat(gap): stable relative gap from lap-pace reference"
```

---

## Task 2: Move Standings pit indicator out of the gap column

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.test.tsx`

- [ ] **Step 1: Always show gap/time in the right column**

Change:

```ts
const pitLabel = formatStandingsPit(v);
const gapText = pitLabel || (mode === "race" && v.fastestLap ? "FASTEST" : formatStandingsGapForMode(mode, v));
const gapColor = pitLabel ? a.pitColor : (isLeader ? a.posLeaderColor : "");
```

To:

```ts
const pitLabel = formatStandingsPit(v);
const gapText = mode === "race" && v.fastestLap ? "FASTEST" : formatStandingsGapForMode(mode, v);
const gapColor = isLeader ? a.posLeaderColor : "";
```

- [ ] **Step 2: Keep pit styling only on the number badge**

Keep `numTc` and `numBg` pit logic, and keep the border on the number cell:

```ts
const numTc = pitLabel ? a.pitColor : (hasBrand ? brandTextColor(v.teamBrandColor!) : "#9CA3AF");
const numBg = pitLabel ? "#000" : (v.teamBrandColor || "transparent");
```

And in `numberCell`:

```html
<div ... style="background:${numBg};${pitLabel ? `border:1px solid ${a.pitColor}` : ""}">
```

Optionally, to make the pit indicator more visible, add a small "PIT" label inside or above the number cell instead of relying only on the border. The user's request is "recuadro amarillo encima de su numero" — the existing yellow border satisfies this. If desired, add a tiny overlay badge:

```html
${pitLabel ? `<div class="absolute -top-1 -left-1 text-[7px] px-1 rounded" style="background:${a.pitColor};color:#000">PIT</div>` : ""}
```

(Requires `relative` positioning on the number cell wrapper.)

- [ ] **Step 3: Update tests**

In `StandingsWidget.test.tsx`, add:

```ts
it("does not replace gap text with PIT label", () => {
  const v = { place: 5, inPits: true, bestLapTime: 95.5 };
  expect(formatStandingsGapForMode("practice", v)).toBe("1:35.500");
});

it("formatStandingsPit still detects pit state", () => {
  expect(formatStandingsPit({ inPits: true })).toBe("PIT");
  expect(formatStandingsPit({ inPits: false })).toBe("");
});
```

- [ ] **Step 4: Run frontend tests**

```bash
cd vantare-v2/frontend
pnpm test src/overlay/widgets/StandingsWidget.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd vantare-v2
git add frontend/src/overlay/widgets/StandingsWidget.tsx frontend/src/overlay/widgets/StandingsWidget.test.tsx
git commit -m "feat(standings): keep pit indicator on number badge, gap column always shows time"
```

---

## Task 3: Performance improvements

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Modify: `vantare-v2/internal/telemetry/diff/diff.go`
- Modify: `vantare-v2/internal/telemetry/service/service.go` (optional)
- Modify: `vantare-v2/frontend/src/lib/frame-budget.ts` (optional)

### 3a. Frontend: cache appearance and session mode outside the frame loop

- [ ] **Step 1: Cache resolved appearance**

In both widgets, move `resolveWidgetAppearance` out of the loop callback. The existing `const { appearance: a } = resolveWidgetAppearance(...)` at component scope is already fine, but the loop re-resolves it every frame. Change the loop to use the outer `a`.

For Standings:

```ts
const { appearance: a } = resolveWidgetAppearance("standings", props);
// ...
useEffect(() => {
  return startFrameBudgetLoop(updateHz, () => {
    // do NOT call resolveWidgetAppearance here again
  });
}, [maxRows, updateHz, editMode, telemetryMode, props]);
```

Do the same for Relative.

- [ ] **Step 2: Avoid rebuilding strings when unchanged**

Both widgets already use `setHTMLIfChanged`, which prevents DOM writes but still builds the full HTML string. To reduce work:

1. Compare a lightweight fingerprint before building the string.
2. Fingerprint = hash of the fields that affect rendering.

Example in Relative:

```ts
const fingerprint = visible.map(v => `${v.id}:${v.place}:${v.timeGapToPlayer?.toFixed(2)}:${v.inPits}:${v.vehicleClass}`).join("|");
if (fingerprint === lastFingerprintRef.current) return;
lastFingerprintRef.current = fingerprint;
```

Add `const lastFingerprintRef = useRef("");`.

Do the same for Standings with an appropriate fingerprint.

### 3b. Go: reduce vehicle diff noise

- [ ] **Step 3: Increase thresholds for volatile fields**

In `diff.go`, change:

```go
if core.ShouldEmit(old.TimeGapToPlayer, v.TimeGapToPlayer, core.ThresholdGap) {
```

To use a larger, dedicated threshold (e.g. 0.05s or 0.1s):

```go
const thresholdTimeGapToPlayer = 0.05
if core.ShouldEmit(old.TimeGapToPlayer, v.TimeGapToPlayer, thresholdTimeGapToPlayer) {
```

Similarly for `LapDistance` threshold (currently 1.0 meter) — this is fine, but `TimeBehindNext`/`TimeBehindLeader` use `core.ThresholdGap` (0.001) which is very tight. Consider `0.01` for those too.

- [ ] **Step 4: Add benchmark / smoke test for diff**

Create `internal/telemetry/diff/diff_bench_test.go`:

```go
func BenchmarkVehiclesChanged(b *testing.B) {
    prev := &models.Telemetry{
        Vehicles: make([]models.VehicleScoring, 40),
    }
    next := &models.Telemetry{
        Vehicles: make([]models.VehicleScoring, 40),
    }
    for i := 0; i < 40; i++ {
        prev.Vehicles[i] = models.VehicleScoring{ID: int32(i), Place: byte(i), LapDistance: float64(i * 100)}
        next.Vehicles[i] = models.VehicleScoring{ID: int32(i), Place: byte(i), LapDistance: float64(i*100) + 0.5}
    }
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        vehiclesChanged(prev, next)
    }
}
```

Run:

```bash
cd vantare-v2
go test ./internal/telemetry/diff/ -bench=BenchmarkVehiclesChanged -benchmem
```

- [ ] **Step 5: Run full test suites**

```bash
cd vantare-v2/frontend
pnpm test
pnpm build

cd vantare-v2
go test ./...
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
cd vantare-v2
git add frontend/src/overlay/widgets/RelativeWidget.tsx frontend/src/overlay/widgets/StandingsWidget.tsx internal/telemetry/diff/diff.go internal/telemetry/diff/diff_bench_test.go
git commit -m "perf(widgets,diff): cache appearance, skip unchanged frames, tighten diff thresholds"
```

---

## Task 4: Manual live verification

- [ ] **Step 1: Build and launch live**

```bash
cd vantare-v2/frontend
pnpm build
cd ..
go run ./cmd/vantare -live -profile configs/example-racing.json
```

- [ ] **Step 2: Verify Relative gap stability**

Accelerate and brake in LMU. The gaps in the Relative box should change smoothly and should not explode when braking. They should reflect distance-at-current-pace.

- [ ] **Step 3: Verify Standings pit behavior**

Send a car to pits. The right-hand gap column must still show best lap time (practice/qualifying) or race gap. The driver number cell should show the yellow pit border/indicator.

- [ ] **Step 4: Verify performance**

Open Task Manager or the browser's performance tools. CPU usage of the Vantare overlay process should be lower than before, especially with many cars on track.

---

## Self-Review Checklist

- [x] Relative gap uses lap-pace reference, not instant speed.
- [x] Standings gap column never shows "PIT".
- [x] Standings number badge still shows pit state.
- [x] Appearance/session mode cached outside frame loop.
- [x] Unchanged frames skipped via fingerprint.
- [x] Diff thresholds tuned for volatile fields.
- [x] Tests and benchmarks added/updated.

---

## Execution Options

**Plan saved to `docs/superpowers/plans/2026-06-15-overlay-refinement.md`.**

1. **Subagent-Driven** — one subagent per task.
2. **Inline Execution** — implement directly in this session.

Which do you prefer?
