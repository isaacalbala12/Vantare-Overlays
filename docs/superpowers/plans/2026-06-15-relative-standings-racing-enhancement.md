# Relative + Standings Racing Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the racing overlay widgets so the Relative widget shows class-aware, physically-accurate time gaps to the 3 nearest cars ahead and 3 behind, and the Standings widget adapts its gap column to Practice, Qualifying, and Race sessions.

**Architecture:** Add a backend Go enrichment step that computes a signed `timeGapToPlayer` for every vehicle using track distance, lap count, and player speed. The frontend consumes this field directly for the Relative widget. Presentation helpers handle class colors, session-mode detection, and session-aware gap formatting. All changes are covered by unit tests.

**Tech Stack:** Go 1.26, Wails v3, React 19 + TypeScript, Tailwind v4, vitest/happy-dom.

**Decisions locked before implementation:**

1. Relative gaps are computed in the backend (Option C) for maximum accuracy.
2. Gap sign convention follows iRacing/rFactor: **positive = car is ahead of player**, **negative = car is behind player**.
3. In Practice and Qualifying, the Standings gap column shows each driver's best lap time. The leader (P1) also shows their best lap time.
4. Class colors: HYPERCAR `#c1121f`, LMP2 `#0055A4`, LMP3 `#f59e0b`, GT3/LMGT3 `#2ecc71`.
5. The LMP3 class string is exactly `LMP3`.

---

## Background for the Implementer

### Current Code Locations

- Relative widget: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Standings widget: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Telemetry ref + types: `vantare-v2/frontend/src/lib/telemetry-ref.ts`
- Profile/appearance types: `vantare-v2/frontend/src/lib/profile.ts`
- Style catalog: `vantare-v2/frontend/src/hub/state/style-catalog.ts`
- Mock telemetry: `vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts`
- Widget tests: `*.test.tsx` next to each widget
- Go telemetry types: `vantare-v2/pkg/models/telemetry.go`
- Go telemetry service: `vantare-v2/internal/telemetry/service/service.go`
- Go telemetry normalizer: `vantare-v2/internal/telemetry/normalizer/normalizer.go`
- Go telemetry diff: `vantare-v2/internal/telemetry/diff/diff.go`
- Go synthetic fixture: `vantare-v2/internal/telemetry/lmu/synthetic.go`

### Data Already Available in `VehicleScoring`

```ts
vehicleClass?: string;       // e.g. "HYPERCAR", "LMP2", "LMP3", "LMGT3"
timeBehindNext?: number;     // gap in seconds to car ahead in classification
timeBehindLeader?: number;   // gap in seconds to leader
bestLapTime?: number;        // best lap time in seconds
lapDistance?: number;        // distance around track in meters
estimatedLapTime?: number;   // estimated lap time in seconds
totalLaps?: number;          // completed laps
```

### Data Already Available in `PlayerTelemetry`

```ts
speed: number;               // player speed in m/s
```

### Session Data

```ts
sessionType?: number;        // LMU numeric session type
sessionName?: string;        // e.g. "PRACTICE1", "QUALIFY1", "RACE"
```

### Known LMU `SessionType` Values

- `0` — Test Day / undefined
- `1` — Practice
- `2` — Qualifying
- `3` — Race
- `4` — Warmup
- `10` / `11` are also observed for Practice/Race in some LMU builds.

Primary detection is name-based (`sessionName`); `sessionType` is the fallback.

---

## File Structure

### Go Backend (modified)

1. `vantare-v2/pkg/models/telemetry.go`
   - Add `TimeGapToPlayer float64` to `VehicleScoring`.
2. `vantare-v2/internal/telemetry/gap/gap.go` (new package)
   - `ComputeTimeGaps(t *models.Telemetry)` enriches every vehicle with `TimeGapToPlayer`.
3. `vantare-v2/internal/telemetry/service/service.go`
   - Call `gap.ComputeTimeGaps` on every telemetry snapshot after it is produced.
4. `vantare-v2/internal/telemetry/diff/diff.go`
   - Include `TimeGapToPlayer` in `vehiclesChanged` comparison with threshold `core.ThresholdGap`.
5. `vantare-v2/internal/telemetry/lmu/synthetic.go`
   - Add at least two extra vehicles with realistic `LapDistance` values so `gap.ComputeTimeGaps` is exercised.
6. `vantare-v2/internal/telemetry/gap/gap_test.go` (new)
   - Unit tests for gap computation.
7. `vantare-v2/internal/telemetry/diff/diff_test.go`
   - Add test that a `TimeGapToPlayer` change triggers emission.

### Frontend (modified)

8. `vantare-v2/frontend/src/lib/profile.ts`
   - Add optional class-color keys to `WidgetAppearance`.
9. `vantare-v2/frontend/src/hub/state/style-catalog.ts`
   - Add defaults for class colors in the `relative` style entry.
10. `vantare-v2/frontend/src/lib/telemetry-ref.ts`
    - Add `timeGapToPlayer?: number` to `VehicleScoring`.
    - Add `SessionMode` type and `resolveSessionMode` helper.
    - Surface `sessionType` and `sessionName` in `TelemetryRefState`.
    - Add `sessionType`/`sessionName` to `SessionDiff`.
11. `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
    - Use `resolveClassColor` for the class bar.
    - Use `timeGapToPlayer` for selection and display.
    - Format with sign: ahead positive, behind negative.
12. `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
    - Add session-aware gap formatting.
    - Show best lap times in Practice/Qualifying.
13. `vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts`
    - Add multi-class vehicles and `timeGapToPlayer` values.
14. Widget tests updated for new behavior.

---

## Task 1: Add `TimeGapToPlayer` to Go model

**Files:**
- Modify: `vantare-v2/pkg/models/telemetry.go`
- Test: `vantare-v2/pkg/models/telemetry_test.go`

- [ ] **Step 1: Write the failing test**

Create `vantare-v2/pkg/models/telemetry_test.go`:

```go
package models

import "testing"

func TestVehicleScoringHasTimeGapToPlayer(t *testing.T) {
	v := VehicleScoring{ID: 1, TimeGapToPlayer: 1.25}
	if v.TimeGapToPlayer != 1.25 {
		t.Fatalf("expected TimeGapToPlayer field")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd vantare-v2
go test ./pkg/models/... -run TestVehicleScoringHasTimeGapToPlayer
```

Expected: FAIL — `TimeGapToPlayer` undefined.

- [ ] **Step 3: Add field to VehicleScoring**

In `vantare-v2/pkg/models/telemetry.go`, add inside `VehicleScoring`:

```go
TimeGapToPlayer    float64 `json:"timeGapToPlayer,omitempty"`
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd vantare-v2
go test ./pkg/models/... -run TestVehicleScoringHasTimeGapToPlayer
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd vantare-v2
git add pkg/models/telemetry.go pkg/models/telemetry_test.go
git commit -m "feat(models): add TimeGapToPlayer to VehicleScoring"
```

---

## Task 2: Create backend gap computation package

**Files:**
- Create: `vantare-v2/internal/telemetry/gap/gap.go`
- Create: `vantare-v2/internal/telemetry/gap/gap_test.go`

### Algorithm

For each non-player vehicle:

1. Find the player vehicle and player speed.
2. Estimate track length as the maximum `LapDistance` observed across vehicles.
3. Compute signed track-distance delta, accounting for completed laps and wrap-around:
   `delta = (v.LapDistance - playerLapDistance) + (v.TotalLaps - player.TotalLaps) * trackLength`
4. Apply wrap-around correction if `|delta| > trackLength/2`.
5. If player speed is meaningful (> 1 m/s), `TimeGapToPlayer = deltaDistance / playerSpeed`.
6. If player is too slow, fall back to `deltaDistance * (estimatedLapTime / trackLength)` using the vehicle's or player's estimated lap time.
7. Sign convention: positive = vehicle is ahead of player, negative = behind.

- [ ] **Step 1: Write failing tests**

Create `vantare-v2/internal/telemetry/gap/gap_test.go`:

```go
package gap

import (
	"math"
	"testing"

	"github.com/vantare/overlays/v2/pkg/models"
)

func TestComputeTimeGaps_SameLapAhead(t *testing.T) {
	tm := &models.Telemetry{
		Connected: true,
		Player:    &models.PlayerTelemetry{Speed: 50},
		Vehicles: []models.VehicleScoring{
			{ID: 1, IsPlayer: true, LapDistance: 1000, EstimatedLapTime: 120},
			{ID: 2, IsPlayer: false, LapDistance: 1100, EstimatedLapTime: 120},
		},
	}
	ComputeTimeGaps(tm)
	if math.Abs(tm.Vehicles[1].TimeGapToPlayer-2.0) > 0.1 {
		t.Fatalf("expected gap ~2.0s ahead, got %v", tm.Vehicles[1].TimeGapToPlayer)
	}
}

func TestComputeTimeGaps_SameLapBehind(t *testing.T) {
	tm := &models.Telemetry{
		Player: &models.PlayerTelemetry{Speed: 50},
		Vehicles: []models.VehicleScoring{
			{ID: 1, IsPlayer: true, LapDistance: 1000},
			{ID: 2, IsPlayer: false, LapDistance: 900},
		},
	}
	ComputeTimeGaps(tm)
	if math.Abs(tm.Vehicles[1].TimeGapToPlayer+2.0) > 0.1 {
		t.Fatalf("expected gap ~-2.0s behind, got %v", tm.Vehicles[1].TimeGapToPlayer)
	}
}

func TestComputeTimeGaps_LappedCar(t *testing.T) {
	// A car one lap ahead but physically just behind the player.
	// Raw distance delta would be negative, but totalLaps adjusts it to ~trackLength.
	tm := &models.Telemetry{
		Player: &models.PlayerTelemetry{Speed: 50},
		Vehicles: []models.VehicleScoring{
			{ID: 1, IsPlayer: true, LapDistance: 1000, TotalLaps: 5, EstimatedLapTime: 120},
			{ID: 2, IsPlayer: false, LapDistance: 900, TotalLaps: 6, EstimatedLapTime: 120},
		},
	}
	ComputeTimeGaps(tm)
	if tm.Vehicles[1].TimeGapToPlayer <= 0 {
		t.Fatalf("expected positive gap for lapped car ahead, got %v", tm.Vehicles[1].TimeGapToPlayer)
	}
}

func TestComputeTimeGaps_PlayerRowIsZero(t *testing.T) {
	tm := &models.Telemetry{
		Player: &models.PlayerTelemetry{Speed: 50},
		Vehicles: []models.VehicleScoring{
			{ID: 1, IsPlayer: true, LapDistance: 1000},
		},
	}
	ComputeTimeGaps(tm)
	if tm.Vehicles[0].TimeGapToPlayer != 0 {
		t.Fatalf("player gap must be 0, got %v", tm.Vehicles[0].TimeGapToPlayer)
	}
}

func TestComputeTimeGaps_NoPlayer(t *testing.T) {
	tm := &models.Telemetry{
		Player: &models.PlayerTelemetry{Speed: 50},
		Vehicles: []models.VehicleScoring{
			{ID: 1, IsPlayer: false, LapDistance: 1000},
		},
	}
	ComputeTimeGaps(tm)
	if tm.Vehicles[0].TimeGapToPlayer != 0 {
		t.Fatalf("expected 0 when player missing, got %v", tm.Vehicles[0].TimeGapToPlayer)
	}
}
```

- [ ] **Step 2: Implement gap.go**

Create `vantare-v2/internal/telemetry/gap/gap.go`:

```go
package gap

import "github.com/vantare/overlays/v2/pkg/models"

// ComputeTimeGaps fills TimeGapToPlayer for every vehicle relative to the player.
// Positive value means the vehicle is ahead on track; negative means behind.
func ComputeTimeGaps(t *models.Telemetry) {
	if t == nil || t.Player == nil || len(t.Vehicles) == 0 {
		return
	}

	playerIdx := -1
	playerLapDistance := 0.0
	playerTotalLaps := int16(0)
	for i, v := range t.Vehicles {
		if v.IsPlayer {
			playerIdx = i
			playerLapDistance = v.LapDistance
			playerTotalLaps = v.TotalLaps
			break
		}
	}
	if playerIdx < 0 {
		return
	}

	trackLength := estimateTrackLength(t.Vehicles)
	if trackLength <= 0 {
		return
	}

	playerSpeed := t.Player.Speed
	useSpeed := playerSpeed > 1.0
	playerEstimatedLap := estimateLapTime(t.Vehicles[playerIdx])

	for i := range t.Vehicles {
		v := &t.Vehicles[i]
		if v.IsPlayer {
			v.TimeGapToPlayer = 0
			continue
		}
		if v.LapDistance <= 0 {
			continue
		}

		delta := (v.LapDistance - playerLapDistance) +
			float64(v.TotalLaps-playerTotalLaps)*trackLength

		if delta > trackLength/2 {
			delta -= trackLength
		} else if delta < -trackLength/2 {
			delta += trackLength
		}

		if useSpeed {
			v.TimeGapToPlayer = delta / playerSpeed
		} else {
			refLap := estimateLapTime(*v)
			if refLap <= 0 {
				refLap = playerEstimatedLap
			}
			if refLap > 0 {
				v.TimeGapToPlayer = delta * (refLap / trackLength)
			}
		}
	}
}

func estimateTrackLength(vehicles []models.VehicleScoring) float64 {
	max := 0.0
	for _, v := range vehicles {
		if v.LapDistance > max {
			max = v.LapDistance
		}
	}
	return max
}

func estimateLapTime(v models.VehicleScoring) float64 {
	if v.EstimatedLapTime > 0 {
		return v.EstimatedLapTime
	}
	if v.BestLapTime > 0 {
		return v.BestLapTime
	}
	return 0
}
```

- [ ] **Step 3: Run tests until green**

```bash
cd vantare-v2
go test ./internal/telemetry/gap/... -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd vantare-v2
git add internal/telemetry/gap/
git commit -m "feat(gap): compute signed TimeGapToPlayer per vehicle"
```

---

## Task 3: Wire gap computation into telemetry pipeline

**Files:**
- Modify: `vantare-v2/internal/telemetry/service/service.go`
- Modify: `vantare-v2/internal/telemetry/diff/diff.go`
- Test: existing tests in those packages

- [ ] **Step 1: Call ComputeTimeGaps in service.processRead**

Import `github.com/vantare/overlays/v2/internal/telemetry/gap` in `service.go`.

In `processRead`, after obtaining `raw` and before `filter.ShouldPublish`:

```go
gap.ComputeTimeGaps(raw)
```

This ensures every telemetry snapshot is enriched, whether it came from the normalizer or from a direct `TelemetrySource`.

- [ ] **Step 2: Include TimeGapToPlayer in diff comparison**

In `diff.go`, in `vehiclesChanged`, add:

```go
if core.ShouldEmit(old.TimeGapToPlayer, v.TimeGapToPlayer, core.ThresholdGap) {
    return true
}
```

- [ ] **Step 3: Add diff test**

In `diff_test.go`, add a test where only `TimeGapToPlayer` changes between two snapshots and assert `Compute` returns a non-nil diff with `vehicles`:

```go
func TestDiff_Vehicles_TimeGapToPlayerChange(t *testing.T) {
	prev := &models.Telemetry{
		Connected: true,
		Vehicles:  []models.VehicleScoring{{ID: 1, TimeGapToPlayer: 1.0}},
	}
	next := &models.Telemetry{
		Connected: true,
		Vehicles:  []models.VehicleScoring{{ID: 1, TimeGapToPlayer: 1.5}},
	}
	d := Compute(prev, next)
	if d == nil {
		t.Fatal("expected diff")
	}
	if _, ok := d.D["vehicles"]; !ok {
		t.Fatal("expected vehicles in diff")
	}
}
```

- [ ] **Step 4: Run backend tests**

```bash
cd vantare-v2
go test ./internal/telemetry/... -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd vantare-v2
git add internal/telemetry/service/service.go internal/telemetry/diff/diff.go internal/telemetry/diff/diff_test.go
git commit -m "feat(telemetry): wire TimeGapToPlayer through service and diff"
```

---

## Task 4: Update synthetic fixture with multi-vehicle data

**Files:**
- Modify: `vantare-v2/internal/telemetry/lmu/synthetic.go`
- Test: `vantare-v2/internal/telemetry/lmu/*_test.go`

- [ ] **Step 1: Add two extra vehicles with LapDistance**

In `BuildSyntheticBuffer`, after writing vehicle 0, add vehicles at offsets 1 and 2 with:
- Unique IDs and driver names.
- `Place`: 2 and 3.
- `IsPlayer`: 0.
- `LapDistance`: e.g. 950 and 1050 (track length estimate becomes ~1050).
- `EstimatedLapTime`: e.g. 120.
- Update `scoringNumVehicles` to 3.

- [ ] **Step 2: Run LMU tests**

```bash
cd vantare-v2
go test ./internal/telemetry/lmu/... -v
```

Expected: PASS. Existing tests that assert vehicle count must be updated from 1 to 3.

- [ ] **Step 3: Commit**

```bash
cd vantare-v2
git add internal/telemetry/lmu/synthetic.go
git commit -m "test(lmu): multi-vehicle synthetic fixture for gap tests"
```

---

## Task 5: Add session-mode detection to telemetry-ref

**Files:**
- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.ts`
- Test: `vantare-v2/frontend/src/lib/telemetry-ref.test.ts`

- [ ] **Step 1: Write the failing test**

Create `vantare-v2/frontend/src/lib/telemetry-ref.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveSessionMode } from "./telemetry-ref";

describe("resolveSessionMode", () => {
  it("detects practice from sessionName", () => {
    expect(resolveSessionMode(10, "PRACTICE1")).toBe("practice");
    expect(resolveSessionMode(1, "PRACTICE2")).toBe("practice");
  });
  it("detects qualifying from sessionName", () => {
    expect(resolveSessionMode(2, "QUALIFY1")).toBe("qualifying");
  });
  it("detects race from sessionName", () => {
    expect(resolveSessionMode(11, "RACE")).toBe("race");
    expect(resolveSessionMode(3, "RACE1")).toBe("race");
  });
  it("falls back to sessionType", () => {
    expect(resolveSessionMode(1, "")).toBe("practice");
    expect(resolveSessionMode(2, "")).toBe("qualifying");
    expect(resolveSessionMode(3, "")).toBe("race");
  });
  it("defaults to race for unknown values", () => {
    expect(resolveSessionMode(99, "UNKNOWN")).toBe("race");
  });
});
```

- [ ] **Step 2: Add helper and surface session fields**

Add near top of `telemetry-ref.ts`:

```ts
export type SessionMode = "practice" | "qualifying" | "race";

export function resolveSessionMode(sessionType?: number, sessionName?: string): SessionMode {
  const name = (sessionName ?? "").toUpperCase();
  if (name.startsWith("PRACTICE") || name.startsWith("TEST")) return "practice";
  if (name.startsWith("QUALIFY")) return "qualifying";
  if (name.startsWith("RACE") || name.startsWith("WARMUP")) return "race";

  switch (sessionType) {
    case 1:
    case 10:
      return "practice";
    case 2:
      return "qualifying";
    case 3:
    case 11:
      return "race";
    case 4:
      return "race";
    default:
      return "race";
  }
}
```

Add to `VehicleScoring`:

```ts
timeGapToPlayer?: number;
```

Add to `TelemetryRefState`:

```ts
sessionType?: number;
sessionName?: string;
```

In default `state` add:

```ts
sessionType: undefined,
sessionName: "",
```

Add `sessionType`/`sessionName` to `SessionDiff`:

```ts
export type SessionDiff = {
  trackName?: string;
  sessionType?: number;
  sessionName?: string;
  sessionTime?: number;
};
```

In `applyTelemetryUpdate`, under session handling:

```ts
if (s.sessionType != null) state.sessionType = s.sessionType;
if (s.sessionName != null) state.sessionName = s.sessionName;
```

And in diff session handling:

```ts
if (sd.sessionType != null) state.sessionType = sd.sessionType;
if (sd.sessionName != null) state.sessionName = sd.sessionName;
```

- [ ] **Step 3: Run test**

```bash
cd vantare-v2/frontend
pnpm test src/lib/telemetry-ref.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd vantare-v2
git add frontend/src/lib/telemetry-ref.ts frontend/src/lib/telemetry-ref.test.ts
git commit -m "feat(telemetry): expose sessionType/sessionName and add resolveSessionMode"
```

---

## Task 6: Add class-color tokens

**Files:**
- Modify: `vantare-v2/frontend/src/lib/profile.ts`
- Modify: `vantare-v2/frontend/src/hub/state/style-catalog.ts`
- Test: `vantare-v2/frontend/src/overlay/widgets/widget-appearance.test.ts`

- [ ] **Step 1: Extend WidgetAppearance type**

In `profile.ts`, add to `WidgetAppearance`:

```ts
classHypercarColor?: string;
classLmp2Color?: string;
classLmp3Color?: string;
classGt3Color?: string;
classUnknownColor?: string;
```

- [ ] **Step 2: Add defaults to style catalog**

In `style-catalog.ts`, under `relative` style defaults, add:

```ts
classHypercarColor: "#c1121f",
classLmp2Color: "#0055A4",
classLmp3Color: "#f59e0b",
classGt3Color: "#2ecc71",
classUnknownColor: "#6b7280",
```

- [ ] **Step 3: Add test**

```ts
it("provides class colors for relative widget", () => {
  const { appearance } = resolveWidgetAppearance("relative", {});
  expect(appearance.classHypercarColor).toBe("#c1121f");
  expect(appearance.classLmp2Color).toBe("#0055A4");
  expect(appearance.classLmp3Color).toBe("#f59e0b");
  expect(appearance.classGt3Color).toBe("#2ecc71");
});
```

- [ ] **Step 4: Run test until green**

```bash
cd vantare-v2/frontend
pnpm test src/overlay/widgets/widget-appearance.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd vantare-v2
git add frontend/src/lib/profile.ts frontend/src/hub/state/style-catalog.ts frontend/src/overlay/widgets/widget-appearance.test.ts
git commit -m "feat(relative): add class-color tokens to appearance"
```

---

## Task 7: Rewrite RelativeWidget for class colors and time gaps

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Test: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.test.tsx`

### New helpers

Add to `RelativeWidget.tsx`:

```ts
export function resolveClassColor(
  vehicleClass: string | undefined,
  a: Record<string, string>
): string {
  const cls = (vehicleClass ?? "").toUpperCase();
  if (cls === "HYPERCAR") return a.classHypercarColor;
  if (cls === "LMP2") return a.classLmp2Color;
  if (cls === "LMP3") return a.classLmp3Color;
  if (cls === "GT3" || cls === "LMGT3") return a.classGt3Color;
  return a.classUnknownColor;
}

export function formatSignedGap(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds === 0) return "—";
  const sign = seconds > 0 ? "+" : "";
  return `${sign}${seconds.toFixed(1)}`;
}

export function selectRelativeRowsByGap(
  vehicles: Partial<VehicleScoring>[],
  rangeAhead: number,
  rangeBehind: number
): Partial<VehicleScoring>[] {
  const player = vehicles.find((v) => v.isPlayer);
  if (!player) return [];

  const withGap = vehicles
    .filter((v) => !v.isPlayer && v.timeGapToPlayer != null && Number.isFinite(v.timeGapToPlayer))
    .map((v) => ({ vehicle: v, gap: v.timeGapToPlayer! }));

  const ahead = withGap
    .filter((x) => x.gap > 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, rangeAhead)
    .map((x) => x.vehicle)
    .reverse();

  const behind = withGap
    .filter((x) => x.gap < 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, rangeBehind)
    .map((x) => x.vehicle);

  return [...ahead, player, ...behind];
}
```

### Update effect rendering

Replace `classBarColor` usage with `resolveClassColor(v.vehicleClass, a)`.

Replace gap display with:

```ts
const gapDisplay = formatSignedGap(v.timeGapToPlayer);
const gapColor = v.isPlayer ? a.textColor : (v.timeGapToPlayer ?? 0) > 0 ? a.gapAheadColor : a.gapBehindColor;
```

Use `selectRelativeRowsByGap` when `timeGapToPlayer` is available; otherwise fall back to existing `selectRelativeRows` for legacy/mock data.

- [ ] **Step 1: Update tests**

Replace/extend `RelativeWidget.test.tsx`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  RelativeWidget,
  resolveClassColor,
  formatSignedGap,
  selectRelativeRowsByGap,
} from "./RelativeWidget";

describe("RelativeWidget helpers", () => {
  it("resolves class colors", () => {
    const a = {
      classHypercarColor: "#c1121f",
      classLmp2Color: "#0055A4",
      classLmp3Color: "#f59e0b",
      classGt3Color: "#2ecc71",
      classUnknownColor: "#6b7280",
    };
    expect(resolveClassColor("HYPERCAR", a)).toBe("#c1121f");
    expect(resolveClassColor("LMP2", a)).toBe("#0055A4");
    expect(resolveClassColor("LMP3", a)).toBe("#f59e0b");
    expect(resolveClassColor("LMGT3", a)).toBe("#2ecc71");
    expect(resolveClassColor("UNKNOWN", a)).toBe("#6b7280");
  });

  it("formats signed gaps", () => {
    expect(formatSignedGap(0.5)).toBe("+0.5");
    expect(formatSignedGap(-1.2)).toBe("-1.2");
    expect(formatSignedGap(0)).toBe("—");
    expect(formatSignedGap(undefined)).toBe("—");
  });

  it("selects 3 ahead and 3 behind by time gap", () => {
    const player = { id: 0, driverName: "Player", place: 4, isPlayer: true, timeGapToPlayer: 0 };
    const vehicles = [
      { id: 1, driverName: "FarAhead", place: 1, timeGapToPlayer: 8.0 },
      { id: 2, driverName: "Ahead2", place: 2, timeGapToPlayer: 3.0 },
      { id: 3, driverName: "Ahead1", place: 3, timeGapToPlayer: 1.5 },
      player,
      { id: 5, driverName: "Behind1", place: 5, timeGapToPlayer: -2.0 },
      { id: 6, driverName: "Behind2", place: 6, timeGapToPlayer: -5.0 },
      { id: 7, driverName: "FarBehind", place: 7, timeGapToPlayer: -12.0 },
    ];
    const rows = selectRelativeRowsByGap(vehicles, 3, 3);
    expect(rows.map((v) => v.driverName)).toEqual([
      "Ahead1", "Ahead2", "FarAhead", "Player", "Behind1", "Behind2", "FarBehind",
    ]);
  });
});
```

- [ ] **Step 2: Run tests until green**

```bash
cd vantare-v2/frontend
pnpm test src/overlay/widgets/RelativeWidget.test.tsx
```

- [ ] **Step 3: Commit**

```bash
cd vantare-v2
git add frontend/src/overlay/widgets/RelativeWidget.tsx frontend/src/overlay/widgets/RelativeWidget.test.tsx
git commit -m "feat(relative): class-colored bars and signed time gaps"
```

---

## Task 8: Make StandingsWidget session-aware

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Test: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.test.tsx`

### New helpers

Add to `StandingsWidget.tsx`:

```ts
import { resolveSessionMode, type SessionMode } from "../../lib/telemetry-ref";

function formatLapTime(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}:${rem.toFixed(3).padStart(6, "0")}`;
}

export function formatStandingsGapForMode(
  mode: SessionMode,
  v: Partial<VehicleScoring>
): string {
  if (mode === "practice" || mode === "qualifying") {
    return formatLapTime(v.bestLapTime);
  }
  // Race mode
  if (v.place === 1) return "Leader";
  if ((v.lapsBehindLeader ?? 0) > 0) return `+${v.lapsBehindLeader}L`;
  if ((v.timeBehindLeader ?? 0) > 0) return `+${v.timeBehindLeader!.toFixed(3)}s`;
  return "—";
}
```

### Update effect

Inside the loop:

```ts
const mode = resolveSessionMode(t.sessionType, t.sessionName);
const gapText = pitLabel || (mode === "race" && v.fastestLap ? "FASTEST" : formatStandingsGapForMode(mode, v));
```

Optional: replace the hard-coded "HYPERCAR" subtitle with the resolved session mode label.

- [ ] **Step 1: Update tests**

Add to `StandingsWidget.test.tsx`:

```ts
it("formatStandingsGapForMode shows best lap in practice and qualifying", () => {
  expect(formatStandingsGapForMode("practice", { bestLapTime: 83.456 })).toBe("1:23.456");
  expect(formatStandingsGapForMode("qualifying", { bestLapTime: 90.123 })).toBe("1:30.123");
  expect(formatStandingsGapForMode("practice", { bestLapTime: 0 })).toBe("—");
});

it("formatStandingsGapForMode keeps race gaps unchanged", () => {
  expect(formatStandingsGapForMode("race", { place: 1 })).toBe("Leader");
  expect(formatStandingsGapForMode("race", { place: 5, lapsBehindLeader: 2 })).toBe("+2L");
  expect(formatStandingsGapForMode("race", { place: 6, timeBehindLeader: 14.028 })).toBe("+14.028s");
});
```

- [ ] **Step 2: Run tests until green**

```bash
cd vantare-v2/frontend
pnpm test src/overlay/widgets/StandingsWidget.test.tsx
```

- [ ] **Step 3: Commit**

```bash
cd vantare-v2
git add frontend/src/overlay/widgets/StandingsWidget.tsx frontend/src/overlay/widgets/StandingsWidget.test.tsx
git commit -m "feat(standings): session-aware gap column for practice, qualifying, race"
```

---

## Task 9: Update mock telemetry for multi-class and realistic gaps

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts`

- [ ] **Step 1: Frontend mock**

Update `getMockTelemetry()`:

- Set `sessionName: "PRACTICE1"` and `sessionType: 10`.
- Include vehicles from multiple classes: HYPERCAR, LMP2, LMP3, LMGT3.
- Provide `timeGapToPlayer` values for non-player vehicles so the relative widget shows signed gaps.
- Provide `bestLapTime` values for standings widget.
- Add `timeGapToPlayer: 0` to the player vehicle.

Example vehicle additions:

```ts
{ id: 12, driverName: "UNITED AUTOSPORTS", driverNumber: "22", place: 13, isPlayer: false, inPits: false, timeBehindLeader: 45.5, totalLaps: 34, vehicleClass: "LMP2", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false, bestLapTime: 95.123, timeGapToPlayer: -8.5 },
{ id: 13, driverName: "INTER EUROPOL", driverNumber: "34", place: 14, isPlayer: false, inPits: false, timeBehindLeader: 52.0, totalLaps: 34, vehicleClass: "LMP2", teamBrandColor: "#E63946", tireCompound: "M", fastestLap: false, bestLapTime: 96.456, timeGapToPlayer: -12.3 },
{ id: 14, driverName: "LIGIER JSP320", driverNumber: "7", place: 15, isPlayer: false, inPits: false, timeBehindLeader: 62.0, totalLaps: 33, vehicleClass: "LMP3", teamBrandColor: "#f59e0b", tireCompound: "H", fastestLap: false, bestLapTime: 102.5, timeGapToPlayer: -18.7 },
{ id: 15, driverName: "GR RACING", driverNumber: "86", place: 16, isPlayer: false, inPits: false, timeBehindLeader: 75.0, totalLaps: 33, vehicleClass: "LMGT3", teamBrandColor: "#2ecc71", tireCompound: "S", fastestLap: false, bestLapTime: 108.2, timeGapToPlayer: -25.4 },
```

Also add realistic `timeGapToPlayer` for nearby Hypercars (e.g. +1.5, -2.3).

- [ ] **Step 2: Run all widget tests**

```bash
cd vantare-v2/frontend
pnpm test src/overlay/widgets
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd vantare-v2
git add frontend/src/overlay/widgets/mock-telemetry.ts
git commit -m "chore(mock): multi-class vehicles and realistic gaps"
```

---

## Task 10: Run full frontend and backend verification

- [ ] **Step 1: Frontend tests + type-check + build**

```bash
cd vantare-v2/frontend
pnpm test
pnpm build
```

Expected: all PASS, no TS errors.

- [ ] **Step 2: Go tests**

```bash
cd vantare-v2
go test ./...
```

Expected: all PASS.

- [ ] **Step 3: Commit dist if changed**

```bash
cd vantare-v2
git add frontend/dist
git commit -m "build(frontend): dist for relative and standings enhancement"
```

---

## Task 11: Manual verification

- [ ] **Step 1: Mock mode**

```bash
cd vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Open Hub → Preview → example-racing overlay. Confirm:
- Relative shows signed seconds (e.g. `+1.5`, `-2.3`) and class-colored bars.
- Standings shows best lap times because mock session is PRACTICE1.

- [ ] **Step 2: Live mode**

```bash
cd vantare-v2
go run ./cmd/vantare -live -profile configs/example-racing.json
```

Verify per session type:
- Practice/Qualifying → Standings gap column = best lap times.
- Race → Standings gap column = gap to leader / laps behind.

Verify the relative overlay shows seconds, not meters. To inspect the raw value:

```bash
curl -s http://127.0.0.1:39261/telemetry/stream | head -5
```

Look for `timeGapToPlayer` in vehicle rows.

- [ ] **Step 3: Document any follow-up**

If live accuracy is insufficient, create a follow-up task to refine `gap.ComputeTimeGaps` (e.g., per-vehicle velocity from lmuapi, track-length learning, or sector-based interpolation).

---

## Self-Review Checklist

- [x] Backend computes `TimeGapToPlayer` with signed seconds and lap adjustment.
- [x] Service enriches every snapshot regardless of source.
- [x] Diff includes `TimeGapToPlayer` so changes are emitted.
- [x] Relative widget uses `timeGapToPlayer` and class colors.
- [x] Sign convention: ahead positive, behind negative.
- [x] Standings widget adapts to practice/qualifying/race.
- [x] Practice/qualifying leader shows best lap time.
- [x] Class colors live in style catalog and WidgetAppearance type.
- [x] Unit tests cover Go gap package, diff, frontend helpers, and widgets.
- [x] Mock data includes multi-class vehicles.

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-15-relative-standings-racing-enhancement.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach do you want?
