# Visual Widget Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current minimal widget components with pixel-faithful React versions derived from Isaac's 6 HTML mockups ("Vantare Racing" style), add a style field to the widget schema, render real widgets in Preview with mock data, add drag-to-reposition in Preview, and add solid-color editing per widget in the Inspector.

**Architecture:**
- Each widget type (`telemetry`, `telemetry-vertical`, `standings`, `relative`, `delta`, `pedals`) is a React component that replicates the visual design from its HTML reference file.
- Widgets use the existing `frame-budget` + `dom-write` + `telemetry-ref` pipeline for efficient runtime updates.
- `WidgetConfig` gains a `style` field (default `"vantare-racing"`) and an expanded `appearance` with solid-color properties.
- In v1, gradients are baked into the style and not editable. Only solid color properties are exposed in the Inspector (accentColor, textColor, backgroundColor, borderColor, etc.).
- Preview renders the real widget component (not a skeleton box) with mock telemetry data.
- Preview supports drag-to-reposition on the canvas.
- Runtime continues to render only `enabled` widgets using `telemetry-ref` for live data.

**Tech Stack:** Go 1.25+, Wails v3, React 19, TypeScript, Vite, Tailwind CSS v4, existing pipeline libs.

---

## Critical Context

Active code is only:

```text
C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
```

Do not touch:

```text
C:\Users\isaac\Desktop\Vantare-Overlays\apps\desktop
```

Do not commit or push unless Isaac explicitly asks.

Required verification after implementation:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Current working behavior that must not regress:

- Hub opens alone.
- Desktop overlay starts only from `Iniciar`.
- Desktop overlay is fullscreen transparent and click-through.
- LMU live works with `go run ./cmd/vantare -live -profile configs/example-racing.json`.
- `CompositeApp` listens to `telemetry:update`.
- Runtime filters `w.enabled` widgets.
- OBS HTTP/SSE endpoints continue to work.
- Preview save semantics (only confirms on `layout:saved`).
- Preview blocks editing when overlay is running.
- Widget list shows enabled/disabled widgets.
- No React state for hot telemetry data.

Product decisions (from Isaac):

- Telemetry horizontal and vertical are **two distinct widget types** (`telemetry` and `telemetry-vertical`), not style variants of the same type.
- **Only solid colors are editable in v1.** Gradients are baked into the style. The Inspector exposes accentColor, textColor, backgroundColor, borderColor, and widget-specific solid colors.
- **Preview renders the real widget with mock data** (not a skeleton box, not empty).
- **Delta** has its own HTML reference: `vantare_delta.html`.

---

## HTML Reference Analysis

Each HTML defines the "Vantare Racing" style. Key visual elements and solid-color properties that should be editable in v1:

### `vantare_telemetry.html` → type `telemetry`

- **Layout:** Header bar, 20 RPM LEDs, Gear box (large), Speed box, THR/BRK horizontal bars
- **Width:** ~400px, **Height:** ~250px
- **Solid colors to expose:**
  - `accentColor` → border color (`#9b2226`), header bottom border
  - `textColor` → main text (`#FFFFFF`)
  - `backgroundColor` → panel bg fallback (gradient is baked)
  - `rpmGreen`, `rpmYellow`, `rpmRed`, `rpmBlue` → LED zone colors
  - `pedalThrottleColor` → throttle bar (`#2ecc71`)
  - `pedalBrakeColor` → brake bar (`#e74c3c`)
- **Baked gradients (not editable in v1):**
  - Panel: `linear-gradient(180deg, #1a0104, #0d0102)`
  - Header: `linear-gradient(180deg, #9b2226, #3a050a)`
  - Gear box: `linear-gradient(135deg, rgba(230,57,70,0.1), rgba(155,34,38,0.2))`

### `vantare_telemetry_vertical.html` → type `telemetry-vertical`

- **Layout:** Header bar, RPM thin bar, Gear box, Speed + RPM text, Vertical pedal bars THR/BRK/CLU
- **Width:** ~140px, **Height:** ~400px
- **Solid colors to expose:** Same as `telemetry` plus `pedalClutchColor` (`#3498db`)
- **Baked gradients:** Same family as `telemetry`

### `vantare_standings.html` → type `standings`

- **Layout:** Header "VANTARE" + session timer, Class band "HYPERCAR", 20 driver rows, Footer
- **Width:** ~320px, **Height:** ~550px (depends on row count)
- **Solid colors to expose:**
  - `accentColor` → panel border + header elements (`#9b2226`)
  - `textColor` → main text (`#FFFFFF`)
  - `backgroundColor` → panel bg fallback
  - `posLeaderColor` → position 1 text (`#f1c40f` yellow)
  - `pitColor` → pit indicator (`#f1c40f`)
  - `tireSoftColor` → Soft tire badge (`#E63946`)
  - `tireMediumColor` → Medium tire badge (`#f1c40f`)
  - `tireHardColor` → Hard tire badge (`#ffffff`)
- **Baked gradients:**
  - Panel: `linear-gradient(180deg, #3a050a, #0d0102)`
  - Header: `linear-gradient(180deg, #9b2226, #3a050a)`
  - Class band: `linear-gradient(90deg, #9b2226, #e63946, #9b2226)`

### `vantare_relative.html` → type `relative`

- **Layout:** Header "VANTARE", "RELATIVE" band, 7 rows (3 ahead, player center, 3 behind), class indicator sidebar
- **Width:** ~300px, **Height:** ~250px
- **Solid colors to expose:**
  - `accentColor` → border + player row border (`#E63946`)
  - `textColor` → main text (`#FFFFFF`)
  - `backgroundColor` → panel bg fallback
  - `gapAheadColor` → positive gap text (`text-red-400`)
  - `gapBehindColor` → negative gap text (`text-green-400`)
- **Baked gradients:** Same as standings + player row

### `vantare_delta.html` → type `delta`

- **Layout:** Top info row (Target + Lap), giant delta text with glow, ultra-wide bar with center marker
- **Width:** ~700px, **Height:** ~120px
- **Solid colors to expose:**
  - `positiveColor` → bar fill when slower (`#e74c3c`)
  - `negativeColor` → bar fill when faster (`#2ecc71`)
  - `textColor` → info text (`#FFFFFF`)
  - `backgroundColor` → bar background fallback
- **Baked gradients:** None (uses solid colors + glow shadows)

### `vantare_pedals.html` → type `pedals`

- **Layout:** Gear block with clip-path, 3 skew pedal bars, canvas trace graph, SVG steering wheel
- **Width:** ~530px, **Height:** ~80px
- **Solid colors to expose:**
  - `accentColor` → gear block bg (`#9b2226`)
  - `pedalThrottleColor` → throttle bar (`#2ecc71`)
  - `pedalBrakeColor` → brake bar (`#e74c3c`)
  - `pedalClutchColor` → clutch bar (`#3498db`)
  - `textColor` → gear text (`#FFFFFF`)
- **Baked gradients:**
  - Panel: `linear-gradient(180deg, #1a0104, #0d0102)`

---

## File Map

Create:

```text
vantare-v2/frontend/src/overlay/widgets/TelemetryWidget.tsx
vantare-v2/frontend/src/overlay/widgets/TelemetryWidget.test.tsx
vantare-v2/frontend/src/overlay/widgets/TelemetryVerticalWidget.tsx
vantare-v2/frontend/src/overlay/widgets/TelemetryVerticalWidget.test.tsx
vantare-v2/frontend/src/overlay/widgets/PedalsWidget.tsx
vantare-v2/frontend/src/overlay/widgets/PedalsWidget.test.tsx
vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts
vantare-v2/frontend/src/overlay/widgets/widget-appearance.ts
vantare-v2/frontend/src/overlay/widgets/widget-appearance.test.ts
vantare-v2/frontend/src/overlay/widgets/use-widget-telemetry.ts
vantare-v2/frontend/src/hub/preview/AppearanceEditor.tsx
vantare-v2/frontend/src/hub/preview/AppearanceEditor.test.tsx
vantare-v2/frontend/src/hub/preview/StyleSelector.tsx
vantare-v2/frontend/src/hub/preview/StyleSelector.test.tsx
vantare-v2/frontend/src/hub/state/style-catalog.ts
vantare-v2/frontend/src/hub/state/style-catalog.test.ts
.omo/evidence/v2-visual-widget-design-system.txt
```

Modify:

```text
vantare-v2/frontend/src/lib/profile.ts
vantare-v2/frontend/src/lib/telemetry-ref.ts
vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx
vantare-v2/frontend/src/overlay/widgets/DeltaWidget.test.tsx
vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx
vantare-v2/frontend/src/overlay/widgets/StandingsWidget.test.tsx
vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx
vantare-v2/frontend/src/overlay/widgets/RelativeWidget.test.tsx
vantare-v2/frontend/src/overlay/CompositeApp.tsx
vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx
vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx
vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx
vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx
vantare-v2/frontend/src/hub/preview/profile-editor.ts
vantare-v2/frontend/src/hub/preview/profile-editor.test.ts
vantare-v2/frontend/src/hub/preview/WidgetList.tsx
vantare-v2/configs/example-racing.json
docs/proyecto/04-ESTADO-ACTUAL.md
docs/proyecto/08-PERFILES-Y-LAYOUT.md
```

Do not modify any Go backend code. The `style` field lives in `WidgetConfig.Props` which is `map[string]any` — already opaque to Go. The required events already exist.

---

# Miniplan A: Schema — Style Field and Extended Appearance

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `style` to `WidgetConfig` (Go + TS) and extend `WidgetAppearance` with widget-specific solid-color properties. Keep gradients as CSS constants inside components, not in the schema.

**Architecture:** `style` is a string stored inside `WidgetConfig.Props["style"]` to avoid a schema migration in Go. The TS type `WidgetConfig` gains an explicit `style?: string` field for convenience. Extended appearance colors are stored in `WidgetAppearance` as optional typed fields.

**Tech Stack:** Go, TypeScript.

---

## Task A0: Extend VehicleScoring For Standings/Relative Visual Data

**Files:**

- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.ts`

- [ ] **Step 1: Add missing fields to VehicleScoring**

The HTML references (standings, relative) display driver number, team brand color, and tire compound. The current `VehicleScoring` type lacks these fields. Add them:

```ts
export type VehicleScoring = {
  id: number;
  driverName?: string;
  driverNumber?: string;
  place?: number;
  totalLaps?: number;
  vehicleClass?: string;
  isPlayer?: boolean;
  inPits?: boolean;
  timeBehindLeader?: number;
  teamBrandColor?: string;
  tireCompound?: string;
  fastestLap?: boolean;
};
```

These are optional fields. The LMU parser does not send them yet, so they will be `undefined` in live mode. Widgets must handle `undefined` gracefully (show fallback). The mock telemetry helper will populate them for editMode.

- [ ] **Step 2: Verify TypeScript compiles**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
```

Expected: Build succeeds.

---

## Task A0b: Extend TelemetryRefState For Pedal/Throttle Inputs

**Files:**

- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.ts`

The HTML telemetry and pedals widgets display throttle, brake, and clutch input bars. The current `TelemetryRefState` does not include these values. Add them:

```ts
export type TelemetryRefState = {
  seq: number;
  connected: boolean;
  speed?: number;
  gear?: number;
  rpm?: number;
  fuel?: number;
  deltaBest?: number;
  trackName?: string;
  throttle?: number; // 0..100
  brake?: number;
  clutch?: number;
  vehicles?: VehicleScoring[];
};
```

Keep the existing fields. Use `0..100` in the state so widgets can use percentages directly. The Go parser must convert if the source provides `0..1` (Task A0d).

- [ ] **Step 1: Add the three fields**

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
pnpm --dir frontend build
```

Expected: Build succeeds.

---

## Task A0c: Update Mock Telemetry With Input Values

**Files:**

- Modify: `vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts`

Add realistic input values so Preview shows the pedal bars:

```ts
export function getMockTelemetry(): TelemetryRefState {
  return {
    seq: 1,
    connected: true,
    speed: 245,
    gear: 4,
    rpm: 8750,
    fuel: 68,
    deltaBest: -0.150,
    trackName: "Circuit de Barcelona",
    throttle: 78,
    brake: 12,
    clutch: 0,
    // ...vehicles
  };
}
```

- [ ] **Step 1: Add throttle/brake/clutch to mock**

- [ ] **Step 2: Verify build**

```powershell
pnpm --dir frontend build
```

---

## Task A0d: Extend LMU Telemetry Parser To Emit Throttle/Brake/Clutch (Minimal Go Change)

**Files:**

- Modify: the Go file that builds the `TelemetryRefState` payload and emits the `telemetry:update` event.

This is the only Go backend change required for this plan. The LMU shared memory map already exposes throttle, brake, and clutch inputs. Locate the code that constructs the telemetry payload and add:

```go
Throttle: vehicleInfo.Throttle * 100, // convert 0..1 to 0..100
Brake:    vehicleInfo.Brake * 100,
Clutch:   vehicleInfo.Clutch * 100,
```

If the source already provides `0..100`, omit the multiplication.

- [ ] **Step 1: Add throttle/brake/clutch to the Go telemetry payload**

- [ ] **Step 2: Verify Go tests still pass**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected: PASS.

---

## Task A1: Extend WidgetAppearance TypeScript Type

**Files:**

- Modify: `vantare-v2/frontend/src/lib/profile.ts`

- [ ] **Step 1: Add style to WidgetConfig and extend WidgetAppearance**

Replace `WidgetAppearance` and add `style` to `WidgetConfig`:

```ts
export type WidgetAppearance = {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
  // Widget-specific solid colors (v1: only exposed if the widget type uses them)
  positiveColor?: string;
  negativeColor?: string;
  rpmGreen?: string;
  rpmYellow?: string;
  rpmRed?: string;
  rpmBlue?: string;
  pedalThrottleColor?: string;
  pedalBrakeColor?: string;
  pedalClutchColor?: string;
  posLeaderColor?: string;
  pitColor?: string;
  tireSoftColor?: string;
  tireMediumColor?: string;
  tireHardColor?: string;
  gapAheadColor?: string;
  gapBehindColor?: string;
};
```

Add `style` to `WidgetConfig`:

```ts
export type WidgetConfig = {
  id: string;
  type: string;
  style?: string;
  enabled: boolean;
  updateHz?: number;
  position: Rect;
  props?: WidgetPropsMap;
};
```

Update `WidgetPropsMap` to include `style`:

```ts
export type WidgetPropsMap = Record<string, unknown> & {
  appearance?: WidgetAppearance;
  style?: string;
};
```

Note: `style` is stored both as a top-level field (TS convenience) and in `props.style` (Go round-trip). Go only sees `props`; the top-level `style` field is stripped by JSON because Go's struct does not have it.

- [ ] **Step 2: Add style round-trip helpers**

In `profile.ts`, add:

```ts
export function getWidgetStyle(widget: WidgetConfig): string {
  return widget.style ?? widget.props?.style ?? "vantare-racing";
}
```

For components that only have `props` (not the full `WidgetConfig`), add a second helper:

```ts
export function getWidgetStyleFromProps(
  type: string,
  props?: Record<string, unknown>,
): string {
  return (props?.style as string | undefined) ?? "vantare-racing";
}
```

Note: `setWidgetStyle` is defined in `profile-editor.ts` (Task D3) alongside other profile mutation helpers. Do NOT duplicate it here.

- [ ] **Step 3: Add appearance parser helper**

Add a helper so widgets can safely read `props.appearance`:

```ts
export function getWidgetAppearance(props?: Record<string, unknown>): WidgetAppearance {
  if (!props?.appearance) return {};
  if (typeof props.appearance !== "object") return {};
  return props.appearance as WidgetAppearance;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
```

Expected: Build succeeds (type errors would surface here).

---

## Task A2: Go Round-Trip — No Changes Needed

**Files:**

- No Go changes needed. `WidgetConfig.Props` is `map[string]any` which already carries `style` as `props.style`. The Go side treats it as opaque data.

- [ ] **Step 1: Verify Go tests still pass**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected: All pass.

---

## Task A3: Create Style Catalog

**Files:**

- Create: `vantare-v2/frontend/src/hub/state/style-catalog.ts`
- Create: `vantare-v2/frontend/src/hub/state/style-catalog.test.ts`

- [ ] **Step 1: Write failing tests**

Create `style-catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getStylesForType,
  getDefaultAppearance,
  type StyleEntry,
} from "./style-catalog";

describe("style-catalog", () => {
  it("lists at least one style for each known widget type", () => {
    const types = ["telemetry", "telemetry-vertical", "standings", "relative", "delta", "pedals"];
    for (const type of types) {
      const styles = getStylesForType(type);
      expect(styles.length).toBeGreaterThan(0);
    }
  });

  it("returns vantare-racing as the default style for standings", () => {
    const styles = getStylesForType("standings");
    const vr = styles.find((s) => s.id === "vantare-racing");
    expect(vr).toBeTruthy();
    expect(vr!.name).toBe("Vantare Racing");
  });

  it("returns default appearance for a style", () => {
    const appearance = getDefaultAppearance("standings", "vantare-racing");
    expect(appearance.accentColor).toBe("#9b2226");
    expect(appearance.textColor).toBe("#FFFFFF");
  });

  it("returns fallback appearance for unknown style", () => {
    const appearance = getDefaultAppearance("standings", "unknown-style");
    expect(appearance.accentColor).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

```powershell
pnpm --dir frontend test style-catalog
```

- [ ] **Step 3: Implement style catalog**

Create `style-catalog.ts`:

```ts
import type { WidgetAppearance } from "../../lib/profile";

export type StyleEntry = {
  id: string;
  name: string;
  defaults: WidgetAppearance;
};

const CATALOG: Record<string, StyleEntry[]> = {
  telemetry: [
    {
      id: "vantare-racing",
      name: "Vantare Racing",
      defaults: {
        accentColor: "#9b2226",
        textColor: "#FFFFFF",
        backgroundColor: "#1a0104",
        borderColor: "#9b2226",
        rpmGreen: "#2ecc71",
        rpmYellow: "#f1c40f",
        rpmRed: "#e74c3c",
        rpmBlue: "#3498db",
        pedalThrottleColor: "#2ecc71",
        pedalBrakeColor: "#e74c3c",
      },
    },
  ],
  "telemetry-vertical": [
    {
      id: "vantare-racing",
      name: "Vantare Racing",
      defaults: {
        accentColor: "#9b2226",
        textColor: "#FFFFFF",
        backgroundColor: "#1a0104",
        borderColor: "#9b2226",
        rpmGreen: "#2ecc71",
        rpmYellow: "#f1c40f",
        rpmRed: "#e74c3c",
        rpmBlue: "#3498db",
        pedalThrottleColor: "#2ecc71",
        pedalBrakeColor: "#e74c3c",
        pedalClutchColor: "#3498db",
      },
    },
  ],
  standings: [
    {
      id: "vantare-racing",
      name: "Vantare Racing",
      defaults: {
        accentColor: "#9b2226",
        textColor: "#FFFFFF",
        backgroundColor: "#3a050a",
        borderColor: "#9b2226",
        posLeaderColor: "#f1c40f",
        pitColor: "#f1c40f",
        tireSoftColor: "#E63946",
        tireMediumColor: "#f1c40f",
        tireHardColor: "#ffffff",
      },
    },
  ],
  relative: [
    {
      id: "vantare-racing",
      name: "Vantare Racing",
      defaults: {
        accentColor: "#E63946",
        textColor: "#FFFFFF",
        backgroundColor: "#3a050a",
        borderColor: "#9b2226",
        gapAheadColor: "#f87171",
        gapBehindColor: "#4ade80",
      },
    },
  ],
  delta: [
    {
      id: "vantare-racing",
      name: "Vantare Racing",
      defaults: {
        positiveColor: "#e74c3c",
        negativeColor: "#2ecc71",
        textColor: "#FFFFFF",
        backgroundColor: "#000000",
      },
    },
  ],
  pedals: [
    {
      id: "vantare-racing",
      name: "Vantare Racing",
      defaults: {
        accentColor: "#9b2226",
        textColor: "#FFFFFF",
        backgroundColor: "#1a0104",
        pedalThrottleColor: "#2ecc71",
        pedalBrakeColor: "#e74c3c",
        pedalClutchColor: "#3498db",
      },
    },
  ],
};

const FALLBACK: WidgetAppearance = {
  accentColor: "#9b2226",
  textColor: "#FFFFFF",
  backgroundColor: "#000000",
};

export function getStylesForType(widgetType: string): StyleEntry[] {
  return CATALOG[widgetType] ?? [];
}

export function getDefaultAppearance(widgetType: string, styleId: string): WidgetAppearance {
  const styles = CATALOG[widgetType] ?? [];
  const entry = styles.find((s) => s.id === styleId);
  return entry?.defaults ?? FALLBACK;
}
```

- [ ] **Step 4: Verify catalog tests pass**

```powershell
pnpm --dir frontend test style-catalog
```

---

# Miniplan B: Rewrite Widgets From HTML References

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Create pixel-faithful React components for each widget type, using `frame-budget`, `dom-write`, and `telemetry-ref`. Each component must accept `editMode` to render mock data instead of live telemetry.

**Architecture:** Each widget is a self-contained React component. It uses `startFrameBudgetLoop` for its update frequency and `setHTMLIfChanged` / `setTextIfChanged` / `setStylePropertyIfChanged` for DOM writes. In `editMode`, it reads from `getMockTelemetry()` instead of `getTelemetryRef()`. Appearance colors are read from `props.appearance` with fallbacks from the style catalog defaults. Baked gradients are CSS constants inside the component file, not in the schema.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

## Task B0: Create Mock Telemetry Helper

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts`

- [ ] **Step 1: Create mock telemetry data**

Create `mock-telemetry.ts`:

```ts
import type { TelemetryRefState } from "../../lib/telemetry-ref";

export function getMockTelemetry(): TelemetryRefState {
  return {
    seq: 1,
    connected: true,
    speed: 245,
    gear: 4,
    rpm: 8750,        // High RPM so shift-point flash is visible
    fuel: 68,
    deltaBest: -0.150,
    trackName: "Circuit de Barcelona",
    vehicles: [
      { id: 0, driverName: "ALPINE", driverNumber: "36", place: 1, isPlayer: false, inPits: false, timeBehindLeader: 0, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#0055A4", tireCompound: "M", fastestLap: false },
      { id: 1, driverName: "PORSCHE PENSKE", driverNumber: "5", place: 2, isPlayer: false, inPits: false, timeBehindLeader: 1.43, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false },
      { id: 2, driverName: "FERRARI AF", driverNumber: "51", place: 3, isPlayer: false, inPits: false, timeBehindLeader: 2.152, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#E32636", tireCompound: "S", fastestLap: true },
      { id: 3, driverName: "CADILLAC RACING", driverNumber: "2", place: 4, isPlayer: false, inPits: false, timeBehindLeader: 3.88, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#F2A900", tireCompound: "M", fastestLap: false },
      { id: 4, driverName: "TOYOTA GAZOO", driverNumber: "8", place: 5, isPlayer: true, inPits: false, timeBehindLeader: 4.55, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false },
      { id: 5, driverName: "PEUGEOT", driverNumber: "94", place: 6, isPlayer: false, inPits: false, timeBehindLeader: 5.55, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#00A3E0", tireCompound: "S", fastestLap: false },
      { id: 6, driverName: "AF CORSE", driverNumber: "83", place: 7, isPlayer: false, inPits: false, timeBehindLeader: 6.12, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFD700", tireCompound: "H", fastestLap: false },
      { id: 7, driverName: "HERTZ TEAM JOTA", driverNumber: "12", place: 8, isPlayer: false, inPits: false, timeBehindLeader: 7.4, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#C9B074", tireCompound: "M", fastestLap: false },
      { id: 8, driverName: "BMW M TEAM", driverNumber: "20", place: 9, isPlayer: false, inPits: false, timeBehindLeader: 8.9, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#000000", tireCompound: "M", fastestLap: false },
      { id: 9, driverName: "LAMBORGHINI", driverNumber: "63", place: 10, isPlayer: false, inPits: true, timeBehindLeader: 9.25, totalLaps: 33, vehicleClass: "HYPERCAR", teamBrandColor: "#78B833", tireCompound: "", fastestLap: false },
      { id: 10, driverName: "ISOTTA FRASCHINI", driverNumber: "11", place: 11, isPlayer: false, inPits: false, timeBehindLeader: 11.1, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FF0000", tireCompound: "H", fastestLap: false },
      { id: 11, driverName: "PROTON COMP", driverNumber: "99", place: 12, isPlayer: false, inPits: false, timeBehindLeader: 12.45, totalLaps: 34, vehicleClass: "HYPERCAR", teamBrandColor: "#FFFFFF", tireCompound: "M", fastestLap: false },
    ],
  };
}
```

**Key:** `rpm: 8750` is above the 8500 shift-point threshold so the blue/white LED flash is visible in Preview.

- [ ] **Step 2: Verify it compiles**

```powershell
pnpm --dir frontend build
```

---

## Task B0b: Create Appearance Resolution Helper

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/widget-appearance.ts`

- [ ] **Step 1: Create a reusable helper for resolving appearance with style defaults**

```ts
import type { WidgetAppearance } from "../../lib/profile";
import { getWidgetStyleFromProps, getWidgetAppearance } from "../../lib/profile";
import { getDefaultAppearance } from "../../hub/state/style-catalog";

export function resolveWidgetAppearance(
  type: string,
  props?: Record<string, unknown>,
): { style: string; appearance: Required<WidgetAppearance> } {
  const style = getWidgetStyleFromProps(type, props);
  const defaults = getDefaultAppearance(type, style);
  const overrides = getWidgetAppearance(props);

  return {
    style,
    appearance: {
      accentColor: overrides.accentColor ?? defaults.accentColor ?? "#9b2226",
      backgroundColor: overrides.backgroundColor ?? defaults.backgroundColor ?? "#000000",
      textColor: overrides.textColor ?? defaults.textColor ?? "#FFFFFF",
      borderColor: overrides.borderColor ?? defaults.borderColor ?? "#9b2226",
      opacity: overrides.opacity ?? defaults.opacity ?? 1,
      positiveColor: overrides.positiveColor ?? defaults.positiveColor ?? "#e74c3c",
      negativeColor: overrides.negativeColor ?? defaults.negativeColor ?? "#2ecc71",
      rpmGreen: overrides.rpmGreen ?? defaults.rpmGreen ?? "#2ecc71",
      rpmYellow: overrides.rpmYellow ?? defaults.rpmYellow ?? "#f1c40f",
      rpmRed: overrides.rpmRed ?? defaults.rpmRed ?? "#e74c3c",
      rpmBlue: overrides.rpmBlue ?? defaults.rpmBlue ?? "#3498db",
      pedalThrottleColor: overrides.pedalThrottleColor ?? defaults.pedalThrottleColor ?? "#2ecc71",
      pedalBrakeColor: overrides.pedalBrakeColor ?? defaults.pedalBrakeColor ?? "#e74c3c",
      pedalClutchColor: overrides.pedalClutchColor ?? defaults.pedalClutchColor ?? "#3498db",
      posLeaderColor: overrides.posLeaderColor ?? defaults.posLeaderColor ?? "#f1c40f",
      pitColor: overrides.pitColor ?? defaults.pitColor ?? "#f1c40f",
      tireSoftColor: overrides.tireSoftColor ?? defaults.tireSoftColor ?? "#E63946",
      tireMediumColor: overrides.tireMediumColor ?? defaults.tireMediumColor ?? "#f1c40f",
      tireHardColor: overrides.tireHardColor ?? defaults.tireHardColor ?? "#ffffff",
      gapAheadColor: overrides.gapAheadColor ?? defaults.gapAheadColor ?? "#f87171",
      gapBehindColor: overrides.gapBehindColor ?? defaults.gapBehindColor ?? "#4ade80",
    },
  };
}
```

- [ ] **Step 2: Verify it compiles**

```powershell
pnpm --dir frontend build
```

---

## Task B0c: Create Telemetry Source Hook Helper

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/use-widget-telemetry.ts`

- [ ] **Step 1: Create a helper that chooses mock or live telemetry**

All widgets will use the same pattern: in `editMode` read from `getMockTelemetry()`, otherwise from `getTelemetryRef()`. Centralize this:

```ts
import { getTelemetryRef, type TelemetryRefState } from "../../lib/telemetry-ref";
import { getMockTelemetry } from "./mock-telemetry";

export function useWidgetTelemetrySource(editMode: boolean): TelemetryRefState {
  return editMode ? getMockTelemetry() : getTelemetryRef();
}
```

This is a plain function, not a React hook (no state), but named for discoverability. Widgets call it inside `startFrameBudgetLoop` each frame.

- [ ] **Step 2: Verify it compiles**

```powershell
pnpm --dir frontend build
```

---

## Task B0d: Add Tests For Appearance Resolution Helper

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/widget-appearance.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, expect, it } from "vitest";
import { resolveWidgetAppearance } from "./widget-appearance";

describe("resolveWidgetAppearance", () => {
  it("returns style defaults when no overrides", () => {
    const { style, appearance } = resolveWidgetAppearance("standings");
    expect(style).toBe("vantare-racing");
    expect(appearance.accentColor).toBe("#9b2226");
    expect(appearance.posLeaderColor).toBe("#f1c40f");
  });

  it("reads style from props.style", () => {
    const { style } = resolveWidgetAppearance("standings", { style: "custom" });
    expect(style).toBe("custom");
  });

  it("overrides defaults with props.appearance", () => {
    const { appearance } = resolveWidgetAppearance("standings", {
      appearance: { accentColor: "#000000" },
    });
    expect(appearance.accentColor).toBe("#000000");
    // Unaffected fields keep defaults
    expect(appearance.textColor).toBe("#FFFFFF");
  });
});
```

- [ ] **Step 2: Run tests**

```powershell
pnpm --dir frontend test widget-appearance
```

---

## Task B1: Rewrite StandingsWidget (Vantare Racing Style)

**Files:**

- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Modify/verify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.test.tsx` (create if missing)

- [ ] **Step 1: Rewrite StandingsWidget to match vantare_standings.html**

The component must replicate the visual structure from `vantare_standings.html`:
- Outer panel with baked gradient background and border
- Header with "VANTARE" title and session timer
- Class band with "HYPERCAR" text
- Driver rows: position, brand initial, number with brand bg, team name, tire badge, gap
- Footer with event name
- Row alternating backgrounds
- Player highlight for leader (pos 1 = yellow)
- Pit indicator

Use `startFrameBudgetLoop` + `setHTMLIfChanged` for the row list container.

For `editMode`, use `useWidgetTelemetrySource(editMode)` instead of `getTelemetryRef()`:

```tsx
import { useWidgetTelemetrySource } from "./use-widget-telemetry";

const telemetry = useWidgetTelemetrySource(editMode);
```

Read appearance from `props.appearance` with defaults from the style catalog using the helper from B0b:

```tsx
import { resolveWidgetAppearance } from "./widget-appearance";

// Inside the component:
const { appearance: a } = resolveWidgetAppearance("standings", props);
const accent = a.accentColor;
const text = a.textColor;
const leaderColor = a.posLeaderColor;
const pitColor = a.pitColor;
const tireSoft = a.tireSoftColor;
const tireMedium = a.tireMediumColor;
const tireHard = a.tireHardColor;
const borderColor = a.borderColor;
```

The baked gradients are CSS in the component:

```tsx
const BAKED_PANEL_BG = "linear-gradient(180deg, #3a050a 0%, #0d0102 100%)";
const BAKED_HEADER_BG = "linear-gradient(180deg, #9b2226 0%, #3a050a 100%)";
const BAKED_CLASS_BG = "linear-gradient(90deg, #9b2226 0%, #e63946 50%, #9b2226 100%)";
```

These use the style's accent color family. In v1 they are not editable.

- [ ] **Step 2: Add/verify tests**
Create or update `StandingsWidget.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StandingsWidget } from "./StandingsWidget";

describe("StandingsWidget", () => {
  it("renders header and driver rows with mock data in edit mode", () => {
    render(
      <StandingsWidget editMode={true} updateHz={15} props={{ appearance: { accentColor: "#9b2226" } }} />,
    );
    expect(screen.getByText("VANTARE")).toBeTruthy();
    expect(screen.getByText("ALPINE")).toBeTruthy();
  });

  it("applies custom accent color from appearance to the panel border", () => {
    const { container } = render(
      <StandingsWidget editMode={true} updateHz={15} props={{ appearance: { accentColor: "#ff0000" } }} />,
    );
    const panel = container.querySelector("[data-testid='standings-panel']") as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.style.borderColor).toBe("#ff0000");
  });

  it("renders tire compound badges for soft tires", () => {
    render(
      <StandingsWidget editMode={true} updateHz={15} props={{ appearance: { tireSoftColor: "#E63946" } }} />,
    );
    const badge = screen.getByText("S");
    expect(badge).toBeTruthy();
  });

  it("shows pit indicator for cars in pits", () => {
    render(
      <StandingsWidget editMode={true} updateHz={15} />,
    );
    expect(screen.getByText(/PIT/)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm --dir frontend test StandingsWidget
```

---

## Task B2: Rewrite RelativeWidget (Vantare Racing Style)

**Files:**

- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Create/modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.test.tsx`

- [ ] **Step 1: Rewrite RelativeWidget to match vantare_relative.html**

Replicate:
- Panel with gradient bg and border
- Header "VANTARE"
- "RELATIVE" class band
- 7 rows: 3 ahead, player (highlighted with accent border + gradient bg), 3 behind
- Class color indicator sidebar per row
- Gap color: red for ahead (+), green for behind (-)
- Player row: accent left border + gradient bg

Use `editMode` + mock telemetry via `useWidgetTelemetrySource(editMode)`. Read appearance colors from props with defaults using `resolveWidgetAppearance`:

```tsx
import { useWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";

const telemetry = useWidgetTelemetrySource(editMode);
const { appearance: a } = resolveWidgetAppearance("relative", props);
```

- [ ] **Step 2: Add/verify tests**

```tsx
describe("RelativeWidget", () => {
  it("renders player and surrounding drivers in edit mode", () => {
    render(
      <RelativeWidget editMode={true} updateHz={15} />,
    );
    expect(screen.getByText("VANTARE")).toBeTruthy();
    expect(screen.getByText("TOYOTA GAZOO")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm --dir frontend test RelativeWidget
```

---

## Task B3: Rewrite DeltaWidget (Vantare Racing Style)

**Files:**

- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
- Create/modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.test.tsx`

- [ ] **Step 1: Rewrite DeltaWidget to match vantare_delta.html**

Replicate:
- Top info row: "Target 1:24.350" + "Lap 34"
- Giant delta text with glow/text-shadow
- Ultra-wide bar (14px height) with center marker (4px white line)
- Bar fills from center: left for negative (faster, green), right for positive (slower, red)
- Colors from appearance: `positiveColor`, `negativeColor`, `textColor`

In editMode, show mock delta value (-0.150).

Read appearance using `resolveWidgetAppearance`. Use `useWidgetTelemetrySource(editMode)` for telemetry data:

```tsx
import { useWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";

const telemetry = useWidgetTelemetrySource(editMode);
const { appearance: a } = resolveWidgetAppearance("delta", props);
```

- [ ] **Step 2: Add/verify tests**

```tsx
describe("DeltaWidget", () => {
  it("renders delta value and target info in edit mode", () => {
    render(
      <DeltaWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText(/Target/)).toBeTruthy();
    expect(screen.getByText(/Lap/)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm --dir frontend test DeltaWidget
```

---

## Task B4: Create TelemetryWidget (Horizontal, Vantare Racing Style)

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/TelemetryWidget.tsx`
- Create: `vantare-v2/frontend/src/overlay/widgets/TelemetryWidget.test.tsx`

- [ ] **Step 1: Create TelemetryWidget matching vantare_telemetry.html**

Replicate:
- Header "VANTARE TELEMETRY" + "LIVE"
- RPM label + numeric RPM + 20 LED bars (green/yellow/red/blue zones)
- Gear box (large, gradient bg) + Speed box
- Horizontal THR/BRK bars with labels and percentages

Use `startFrameBudgetLoop` + `setHTMLIfChanged` for the dynamic parts (RPM LEDs, gear, speed, pedal bars).

In editMode: mock values for all fields via `useWidgetTelemetrySource(editMode)`.

LED zone thresholds: 0-9 green, 10-14 yellow, 15-17 red, 18-19 blue (shift point). Flash white when at shift point.

Appearance colors: `accentColor`, `rpmGreen/Yellow/Red/Blue`, `pedalThrottleColor`, `pedalBrakeColor`, `textColor`.

Read appearance using `resolveWidgetAppearance`. Use `useWidgetTelemetrySource(editMode)`:

```tsx
import { useWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";

const telemetry = useWidgetTelemetrySource(editMode);
const { appearance: a } = resolveWidgetAppearance("telemetry", props);
```

- [ ] **Step 2: Add tests**

```tsx
describe("TelemetryWidget", () => {
  it("renders telemetry header and gear in edit mode", () => {
    render(
      <TelemetryWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText(/VANTARE TELEMETRY/)).toBeTruthy();
  });

  it("applies custom rpm zone colors", () => {
    const { container } = render(
      <TelemetryWidget editMode={true} updateHz={30} props={{ appearance: { rpmGreen: "#00ff00" } }} />,
    );
    const leds = container.querySelectorAll("[data-testid='rpm-led']");
    expect(leds.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm --dir frontend test TelemetryWidget
```

---

## Task B5: Create TelemetryVerticalWidget (Vantare Racing Style)

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/TelemetryVerticalWidget.tsx`
- Create: `vantare-v2/frontend/src/overlay/widgets/TelemetryVerticalWidget.test.tsx`

- [ ] **Step 1: Create TelemetryVerticalWidget matching vantare_telemetry_vertical.html**

Replicate:
- Header "VANTARE TEL"
- Thin horizontal RPM bar (green fill, color changes at thresholds)
- Gear box (large)
- Speed + RPM numeric display with "KM/H" label
- Vertical pedal bars THR/BRK/CLU

In editMode: mock values via `useWidgetTelemetrySource(editMode)`.

Read appearance using `resolveWidgetAppearance`:

```tsx
import { useWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";

const telemetry = useWidgetTelemetrySource(editMode);
const { appearance: a } = resolveWidgetAppearance("telemetry-vertical", props);
```

- [ ] **Step 2: Add tests**

```tsx
describe("TelemetryVerticalWidget", () => {
  it("renders vertical layout with gear and pedals in edit mode", () => {
    render(
      <TelemetryVerticalWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText("VANTARE TEL")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm --dir frontend test TelemetryVerticalWidget
```

---

## Task B6: Create PedalsWidget (Vantare Racing Style)

**Files:**

- Create: `vantare-v2/frontend/src/overlay/widgets/PedalsWidget.tsx`
- Create: `vantare-v2/frontend/src/overlay/widgets/PedalsWidget.test.tsx`

- [ ] **Step 1: Create PedalsWidget matching vantare_pedals.html**

Replicate:
- Gear block with red background and clip-path diagonal cut
- 3 skew pedal bars (CLU/BRK/THR) with glow
- Canvas trace graph (throttle green line + brake red line)
- SVG steering wheel with rotation animation

The canvas graph uses a history buffer (100 samples) and `canvas.getContext('2d')` for drawing. In editMode, animate with mock data so the graph looks alive in Preview.

Use `useWidgetTelemetrySource(editMode)` for telemetry values. For the canvas, measure the real CSS size each frame:

```tsx
import { useWidgetTelemetrySource } from "./use-widget-telemetry";
import { resolveWidgetAppearance } from "./widget-appearance";

const telemetry = useWidgetTelemetrySource(editMode);
const { appearance: a } = resolveWidgetAppearance("pedals", props);

// Inside startFrameBudgetLoop:
const canvas = canvasRef.current;
if (!canvas) return;
const width = canvas.clientWidth;
const height = canvas.clientHeight;
// Ensure drawing buffer matches CSS size for sharp output
if (canvas.width !== width) canvas.width = width;
if (canvas.height !== height) canvas.height = height;
const ctx = canvas.getContext("2d");
if (!ctx) return;
ctx.clearRect(0, 0, width, height);
// draw history buffers...
```

Maintain a ring buffer of recent throttle/brake values inside the component (e.g., via a ref). Append current values each frame, draw the two traces using appearance colors.

Appearance colors: `accentColor` (gear block), `pedalThrottleColor/BrakeColor/ClutchColor`, `textColor`.

- [ ] **Step 2: Add tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PedalsWidget } from "./PedalsWidget";

describe("PedalsWidget", () => {
  it("renders gear block and pedal labels in edit mode", () => {
    render(
      <PedalsWidget editMode={true} updateHz={30} />,
    );
    expect(screen.getByText("THR")).toBeTruthy();
    expect(screen.getByText("BRK")).toBeTruthy();
    expect(screen.getByText("CLU")).toBeTruthy();
  });

  it("renders with custom accent color", () => {
    const { container } = render(
      <PedalsWidget editMode={true} updateHz={30} props={{ appearance: { accentColor: "#ff0000" } }} />,
    );
    const gearBlock = container.querySelector("[data-testid='pedals-gear']") as HTMLElement;
    expect(gearBlock).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm --dir frontend test PedalsWidget
```

---

## Task B7: Register All Widget Types In Runtime

**Files:**

- Modify: `vantare-v2/frontend/src/overlay/CompositeApp.tsx`
- Modify: `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx`

- [ ] **Step 1: Add new widget types to WIDGETS registry**

In both `CompositeApp.tsx` and `ObsOverlayApp.tsx`, update the `WIDGETS` map:

```ts
import { TelemetryWidget } from "./widgets/TelemetryWidget";
import { TelemetryVerticalWidget } from "./widgets/TelemetryVerticalWidget";
import { PedalsWidget } from "./widgets/PedalsWidget";

const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  delta: DeltaWidget,
  relative: RelativeWidget,
  standings: StandingsWidget,
  telemetry: TelemetryWidget,
  "telemetry-vertical": TelemetryVerticalWidget,
  pedals: PedalsWidget,
};
```

- [ ] **Step 2: Pass `style` through to widget props**

Update widget rendering to pass `style` from `WidgetConfig`:

```tsx
<Component editMode={false} updateHz={w.updateHz} props={{ ...w.props, style: w.style ?? w.props?.style }} />
```

- [ ] **Step 3: Refresh profile when layout is saved**

Currently, both `CompositeApp` and `ObsOverlayApp` load the profile once on mount. With the new workbench, Isaac can enable/disable widgets or change their appearance from Preview and save the profile. The runtime must re-fetch the profile after a save so it reflects the latest `enabled` set and `appearance` colors.

In `CompositeApp.tsx`, add a `layout:saved` listener that re-emits `profile:request`:

```tsx
useEffect(() => {
  const unsub = Events.On("layout:saved", () => {
    Events.Emit("profile:request");
  });
  return () => unsub?.();
}, []);
```

In `ObsOverlayApp.tsx`, the OBS Browser Source does not receive Wails events. For now, OBS will continue to load the profile once at startup and reflect saved changes only on next Browser Source refresh. Document this as a known limitation in the evidence notes.

- [ ] **Step 4: Verify build**

```powershell
pnpm --dir frontend build
```

---

# Miniplan C: Preview Renders Real Widgets

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Replace the skeleton `PreviewWidgetFrame` with rendering the real widget component inside Preview, using mock telemetry data so Isaac sees what the overlay will look like.

**Architecture:** `PreviewCanvas` renders a wrapper for each widget. The wrapper positions the widget at scaled coordinates and handles selection. Inside the wrapper, the real widget component is rendered with `editMode={true}`. The wrapper captures drag events for repositioning. Disabled widgets render with a muted overlay (dashed border + reduced opacity) but the widget is still visible.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## Task C1: Replace PreviewWidgetFrame With Real Widget Rendering

**Files:**

- Modify: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx`

- [ ] **Step 1: Rewrite PreviewWidgetFrame to render the real widget**

Replace the current skeleton implementation with:

```tsx
import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { DeltaWidget } from "../../overlay/widgets/DeltaWidget";
import { RelativeWidget } from "../../overlay/widgets/RelativeWidget";
import { StandingsWidget } from "../../overlay/widgets/StandingsWidget";
import { TelemetryWidget } from "../../overlay/widgets/TelemetryWidget";
import { TelemetryVerticalWidget } from "../../overlay/widgets/TelemetryVerticalWidget";
import { PedalsWidget } from "../../overlay/widgets/PedalsWidget";
import type { ComponentType } from "react";

type WidgetProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};

const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  delta: DeltaWidget,
  relative: RelativeWidget,
  standings: StandingsWidget,
  telemetry: TelemetryWidget,
  "telemetry-vertical": TelemetryVerticalWidget,
  pedals: PedalsWidget,
};

type PreviewWidgetFrameProps = {
  widget: WidgetConfig;
  scale: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart?: (event: React.MouseEvent, widgetId: string) => void;
  disabled?: boolean;
};

export function PreviewWidgetFrame({ widget, scale, selected, onSelect, onDragStart, disabled = false }: PreviewWidgetFrameProps) {
  const style = getWidgetStyle(widget);
  const Component = WIDGETS[widget.type];

  return (
    <div
      onMouseDown={(e) => {
        onSelect(widget.id);
        onDragStart?.(e, widget.id);
      }}
      className={`absolute text-left border transition-colors cursor-pointer ${
        selected ? "border-vantare-red-400" : "border-white/15 hover:border-white/30"
      } ${widget.enabled ? "" : "border-dashed"} ${
        disabled ? "pointer-events-none" : ""
      }`}
      style={{
        left: widget.position.x * scale,
        top: widget.position.y * scale,
        width: widget.position.w * scale,
        height: widget.position.h * scale,
      }}
    >
      {Component ? (
        <div
          className={`w-full h-full overflow-hidden ${widget.enabled ? "" : "opacity-45 grayscale"}`}
          style={{ pointerEvents: "none" }}
        >
          <Component editMode={true} updateHz={widget.updateHz} props={{ ...widget.props, style }} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
          {widget.type}
        </div>
      )}
      {!widget.enabled && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      )}
    </div>
  );
}

Key decisions:
- The widget renders at the full size of the frame. CSS `overflow: hidden` clips it.
- `pointerEvents: "none"` on the widget content prevents clicks from being swallowed by the widget.
- The outer `div` handles click (selection) and can later handle drag.
- Unknown widget types show a fallback label.
- Disabled widgets get a dark overlay + dashed border + grayscale on the **content only**, so the selection border and dashed outline remain visible.

- [ ] **Step 2: Verify existing PreviewPage tests still pass**

```powershell
pnpm --dir frontend test PreviewPage
```

Note: If tests use `PreviewWidgetFrame` directly, they may need updating because the props changed (removed `onSelect` → still present; `scale` still present). The existing test in `PreviewPage.test.tsx` renders the full page, so it should be fine.

---

## Task C2: Add Drag Support To PreviewCanvas

**Files:**

- Modify: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx`

**Problem:** The existing `updateWidgetPosition` helper in `profile-editor.ts` already clamps positions via `normalizeRect`. Adding extra clamping in `PreviewCanvas` duplicates logic and may produce invalid negative coordinates if a widget is wider/taller than the canvas. The right fix is to use the canvas's bounding box for coordinate conversion, then let `updateWidgetPosition` / `normalizeRect` enforce the final bounds and minimum size.

- [ ] **Step 1: Refactor drag handlers to use canvas-relative coordinates**

Add a ref for the canvas container:

```tsx
const canvasRef = useRef<HTMLDivElement>(null);
```

Add drag state:

```ts
const [dragState, setDragState] = useState<{
  widgetId: string;
  startX: number;
  startY: number;
  startPos: { x: number; y: number };
  moved: boolean;
} | null>(null);
```

Helper to convert screen coordinates to canvas coordinates:

```ts
function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}
```

Drag handlers:

```ts
function onMouseDown(event: React.MouseEvent, widgetId: string) {
  if (disabled) return;
  event.preventDefault();
  const widget = profile.widgets.find((w) => w.id === widgetId);
  if (!widget) return;
  onSelectWidget(widgetId);
  const point = toCanvasPoint(event.clientX, event.clientY);
  setDragState({
    widgetId,
    startX: point.x,
    startY: point.y,
    startPos: { x: widget.position.x, y: widget.position.y },
    moved: false,
  });
}

function onMouseMove(event: React.MouseEvent) {
  if (!dragState) return;
  const point = toCanvasPoint(event.clientX, event.clientY);
  const dxRaw = (point.x - dragState.startX) / scale;
  const dyRaw = (point.y - dragState.startY) / scale;
  if (Math.abs(dxRaw) < 1 && Math.abs(dyRaw) < 1 && !dragState.moved) {
    // Ignore sub-pixel jitter to distinguish click from drag
    return;
  }
  const widget = profile.widgets.find((w) => w.id === dragState.widgetId);
  if (!widget) return;

  const nextPos = {
    ...widget.position,
    x: Math.round(dragState.startPos.x + dxRaw),
    y: Math.round(dragState.startPos.y + dyRaw),
  };

  // Let updateWidgetPosition / normalizeRect enforce bounds and minimum size.
  onChangeProfile(updateWidgetPosition(profile, widget.id, nextPos));
  setDragState((prev) => (prev ? { ...prev, moved: true } : null));
}

function onMouseUp() {
  setDragState(null);
}
```

Attach `ref={canvasRef}` to the outer canvas `div`, attach `onMouseMove` and `onMouseUp` there, and pass `onMouseDown` as `onDragStart` to each `PreviewWidgetFrame`.

- [ ] **Step 2: Verify the import of updateWidgetPosition**

Ensure `PreviewCanvas` imports `updateWidgetPosition` from `./profile-editor`.

- [ ] **Step 3: Add drag test**

Append to `PreviewCanvas.test.tsx`:

```tsx
it("drags a widget to a new position", () => {
  const onChangeProfile = vi.fn();
  render(
    <PreviewCanvas
      profile={profile}
      selectedWidgetId={profile.widgets[0].id}
      onSelectWidget={vi.fn()}
      onChangeProfile={onChangeProfile}
      scale={0.5}
      disabled={false}
    />,
  );
  const widget = screen.getByText(/standings widget/i).closest("[class*='absolute']") as HTMLElement;
  fireEvent.mouseDown(widget, { clientX: 50, clientY: 50 });
  fireEvent.mouseMove(widget, { clientX: 150, clientY: 80 });
  fireEvent.mouseUp(widget);

  expect(onChangeProfile).toHaveBeenCalled();
  const lastCall = onChangeProfile.mock.calls[onChangeProfile.mock.calls.length - 1][0];
  const moved = lastCall.widgets.find((w: WidgetConfig) => w.id === profile.widgets[0].id);
  expect(moved.position.x).toBeGreaterThan(profile.widgets[0].position.x);
});
```

If the test text in `PreviewCanvas.test.tsx` does not currently include "standings widget", adjust the selector to match the actual widget rendering (e.g., `screen.getByText(/ALPINE/)` after the widget rewrite).

- [ ] **Step 4: Verify tests pass**

```powershell
pnpm --dir frontend test PreviewCanvas PreviewPage
```

---

# Miniplan D: Style Selector and Appearance Editor in Inspector

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add a style selector dropdown and solid-color editing to the Preview Inspector panel, so Isaac can choose the widget style and customize its solid colors.

**Architecture:** `PreviewInspector` gains two new sections: a `StyleSelector` at the top (below the widget name) and an `AppearanceEditor` below the position/size controls. `StyleSelector` reads from `style-catalog.ts`. Changing style resets appearance to the style defaults. `AppearanceEditor` shows color inputs for the solid colors relevant to the current widget type.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## Task D1: Create StyleSelector Component

**Files:**

- Create: `vantare-v2/frontend/src/hub/preview/StyleSelector.tsx`
- Create: `vantare-v2/frontend/src/hub/preview/StyleSelector.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StyleSelector } from "./StyleSelector";

describe("StyleSelector", () => {
  it("renders style name as text when only one style exists", () => {
    render(
      <StyleSelector widgetType="standings" currentStyle="vantare-racing" onStyleChange={vi.fn()} />,
    );
    expect(screen.getByText(/Vantare Racing/)).toBeTruthy();
  });

  it("disables buttons when disabled prop is true", () => {
    render(
      <StyleSelector widgetType="standings" currentStyle="vantare-racing" disabled={true} onStyleChange={vi.fn()} />,
    );
    // With only one style there are no buttons; just verify it renders
    expect(screen.getByText(/Vantare Racing/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement StyleSelector**

```tsx
import { getStylesForType } from "../state/style-catalog";

type StyleSelectorProps = {
  widgetType: string;
  currentStyle: string;
  disabled?: boolean;
  onStyleChange: (styleId: string) => void;
};

export function StyleSelector({ widgetType, currentStyle, disabled = false, onStyleChange }: StyleSelectorProps) {
  const styles = getStylesForType(widgetType);
  if (styles.length <= 1) {
    return (
      <div className="text-xs text-vantare-textMuted font-mono">
        Estilo: {styles[0]?.name ?? "Default"}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 ${disabled ? "opacity-40" : ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-vantare-textDim">Estilo</span>
      <div className="flex gap-2">
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onStyleChange(s.id)}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              currentStyle === s.id
                ? "bg-vantare-red-950/30 border border-vantare-red-500 text-white"
                : "bg-black/30 border border-white/10 text-vantare-textMuted hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify tests**

```powershell
pnpm --dir frontend test StyleSelector
```

---

## Task D2: Create AppearanceEditor Component

**Files:**

- Create: `vantare-v2/frontend/src/hub/preview/AppearanceEditor.tsx`
- Create: `vantare-v2/frontend/src/hub/preview/AppearanceEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppearanceEditor } from "./AppearanceEditor";
import type { WidgetAppearance } from "../../lib/profile";

describe("AppearanceEditor", () => {
  it("renders color inputs for standings-specific properties", () => {
    const onChange = vi.fn();
    render(
      <AppearanceEditor
        widgetType="standings"
        appearance={{ accentColor: "#9b2226" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Accent")).toBeTruthy();
  });

  it("does not render pedal colors for delta widget", () => {
    const onChange = vi.fn();
    render(
      <AppearanceEditor
        widgetType="delta"
        appearance={{ positiveColor: "#e74c3c" }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByLabelText("Throttle")).toBeNull();
  });

  it("calls onChange when a color value is changed", () => {
    const onChange = vi.fn();
    render(
      <AppearanceEditor
        widgetType="delta"
        appearance={{ positiveColor: "#e74c3c" }}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Positivo") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#ff0000" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ positiveColor: "#ff0000" }),
    );
  });
});
```

- [ ] **Step 2: Implement AppearanceEditor**

The component maps widget types to the relevant color properties:

```ts
const COLOR_FIELDS: Record<string, { key: keyof WidgetAppearance; label: string }[]> = {
  _common: [
    { key: "accentColor", label: "Accent" },
    { key: "textColor", label: "Texto" },
    { key: "backgroundColor", label: "Fondo" },
    { key: "borderColor", label: "Borde" },
  ],
  telemetry: [
    { key: "rpmGreen", label: "RPM Verde" },
    { key: "rpmYellow", label: "RPM Amarillo" },
    { key: "rpmRed", label: "RPM Rojo" },
    { key: "rpmBlue", label: "RPM Azul" },
    { key: "pedalThrottleColor", label: "Throttle" },
    { key: "pedalBrakeColor", label: "Brake" },
  ],
  "telemetry-vertical": [
    { key: "rpmGreen", label: "RPM Verde" },
    { key: "rpmYellow", label: "RPM Amarillo" },
    { key: "rpmRed", label: "RPM Rojo" },
    { key: "rpmBlue", label: "RPM Azul" },
    { key: "pedalThrottleColor", label: "Throttle" },
    { key: "pedalBrakeColor", label: "Brake" },
    { key: "pedalClutchColor", label: "Clutch" },
  ],
  standings: [
    { key: "posLeaderColor", label: "Líder" },
    { key: "pitColor", label: "Pit" },
    { key: "tireSoftColor", label: "Neum. Blando" },
    { key: "tireMediumColor", label: "Neum. Medio" },
    { key: "tireHardColor", label: "Neum. Duro" },
  ],
  relative: [
    { key: "gapAheadColor", label: "Gap Delante" },
    { key: "gapBehindColor", label: "Gap Detrás" },
  ],
  delta: [
    { key: "positiveColor", label: "Positivo" },
    { key: "negativeColor", label: "Negativo" },
  ],
  pedals: [
    { key: "pedalThrottleColor", label: "Throttle" },
    { key: "pedalBrakeColor", label: "Brake" },
    { key: "pedalClutchColor", label: "Clutch" },
  ],
};
```

Render common fields first, then type-specific fields, each as a label + color input. Use stable `id` attributes so `getByLabelText` works. The component must also accept `disabled` and apply it to every color input:

```tsx
type AppearanceEditorProps = {
  widgetType: string;
  appearance: WidgetAppearance;
  disabled?: boolean;
  onChange: (appearance: WidgetAppearance) => void;
};

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block text-xs text-vantare-textMuted">
      {label}
      <input
        id={id}
        type="color"
        value={value ?? "#FFFFFF"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full bg-black/40 border border-white/10 rounded disabled:opacity-40"
      />
    </label>
  );
}

export function AppearanceEditor({ widgetType, appearance, disabled = false, onChange }: AppearanceEditorProps) {
  const common = COLOR_FIELDS._common;
  const specific = COLOR_FIELDS[widgetType] ?? [];

  // Resolve defaults so color inputs always show the effective color, even when
  // the saved appearance does not yet contain the field. Only emit overrides.
  const { appearance: effective } = resolveWidgetAppearance(widgetType, { appearance });

  function update(key: keyof Omit<WidgetAppearance, "opacity">, value: string) {
    onChange({ ...appearance, [key]: value });
  }

  return (
    <div className={`space-y-3 ${disabled ? "opacity-40" : ""}`}>
      <div className="grid grid-cols-2 gap-3">
        {common.map((field) => (
          <ColorField
            key={field.key}
            id={`color-${String(field.key)}`}
            label={field.label}
            value={effective[field.key] as string | undefined}
            disabled={disabled}
            onChange={(value) => update(field.key, value)}
          />
        ))}
      </div>
      {specific.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-vantare-textDim mb-2 block">Widget</span>
          <div className="grid grid-cols-2 gap-3">
            {specific.map((field) => (
              <ColorField
                key={field.key}
                id={`color-${String(field.key)}`}
                label={field.label}
                value={effective[field.key] as string | undefined}
                disabled={disabled}
                onChange={(value) => update(field.key, value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

When a color changes, call `onChange({ ...appearance, [key]: value })` with only the saved overrides. The `id` uses the stable field key, not the translated label, to keep HTML valid.

- [ ] **Step 3: Verify tests**

```powershell
pnpm --dir frontend test AppearanceEditor
```

---

## Task D3: Integrate StyleSelector and AppearanceEditor Into PreviewInspector

**Files:**

- Modify: `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx`
- Modify: `vantare-v2/frontend/src/hub/preview/profile-editor.ts`
- Modify: `vantare-v2/frontend/src/hub/preview/profile-editor.test.ts`

- [ ] **Step 1: Add setWidgetStyle to profile-editor.ts**

Add to the existing `profile-editor.ts` (which already contains `setWidgetEnabled`, `updateWidgetPosition`, `updateWidgetAppearance`):

```ts
export function setWidgetStyle(profile: ProfileConfig, widgetId: string, style: string): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((w) =>
      w.id === widgetId ? { ...w, style, props: { ...w.props, style } } : w,
    ),
  };
}
```

- [ ] **Step 2: Add test for setWidgetStyle**

In `profile-editor.test.ts`, add:

```ts
describe("setWidgetStyle", () => {
  it("updates style in both top-level and props", () => {
    const result = setWidgetStyle(profile, "delta", "custom-style");
    const widget = result.widgets.find((w) => w.id === "delta")!;
    expect(widget.style).toBe("custom-style");
    expect(widget.props?.style).toBe("custom-style");
  });
});
```

- [ ] **Step 3: Import and render StyleSelector and AppearanceEditor in PreviewInspector**

After the widget name/type section and the Visible checkbox, add the following imports **at the top of `PreviewInspector.tsx`** and the JSX below inside the component:

```tsx
// Top of file
import { StyleSelector } from "./StyleSelector";
import { AppearanceEditor } from "./AppearanceEditor";
import { setWidgetStyle } from "./profile-editor";
import { getDefaultAppearance } from "../state/style-catalog";
import { getWidgetStyle } from "../../lib/profile";
```

```tsx
// Inside the component, after the "Visible" checkbox:
const currentStyle = getWidgetStyle(widget);

<div className="mb-4">
  <StyleSelector
    widgetType={widget.type}
    currentStyle={currentStyle}
    disabled={disabled}
    onStyleChange={(styleId) => {
      // IMPORTANT: set style first, then apply defaults.
      // updateWidgetAppearance writes into props.appearance; setWidgetStyle
      // must not clobber the new appearance by re-copying the old props.
      const withStyle = setWidgetStyle(profile, widget.id, styleId);
      const defaults = getDefaultAppearance(widget.type, styleId);
      onChangeProfile(updateWidgetAppearance(withStyle, widget.id, defaults));
    }}
  />
</div>

<div className="mb-4">
  <AppearanceEditor
    widgetType={widget.type}
    appearance={appearance}
    disabled={disabled}
    onChange={(next) => onChangeProfile(updateWidgetAppearance(profile, widget.id, next))}
  />
</div>
```

The `appearance` variable passed to `AppearanceEditor` is the saved overrides from `widget.props?.appearance ?? {}`. `AppearanceEditor` resolves defaults internally so pickers show the effective colors and only emit changed fields.

Keep the existing opacity slider from the original `PreviewInspector` after the AppearanceEditor. The opacity is part of `WidgetAppearance` and must remain editable.

- [ ] **Step 3: Add tests for disabled state in PreviewPage**

Append to `PreviewPage.test.tsx`:

```tsx
it("disables style and color editing while overlay is running", () => {
  render(<PreviewPage />);
  dispatch("profile:loaded", { profile });
  dispatch("overlay:status", { running: true, profileId: "default-racing" });

  const styleText = screen.getByText(/Vantare Racing/);
  expect(styleText).toBeTruthy();
  // Color inputs must be disabled
  const colorInputs = document.querySelectorAll('input[type="color"]');
  expect(colorInputs.length).toBeGreaterThan(0);
  colorInputs.forEach((input) => {
    expect((input as HTMLInputElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 4: Verify PreviewPage tests**

```powershell
pnpm --dir frontend test PreviewPage
```

---

## Task D4: Update WidgetList To Show Style

**Files:**

- Modify: `vantare-v2/frontend/src/hub/preview/WidgetList.tsx`

- [ ] **Step 1: Show style name in WidgetList items**

In `WidgetList.tsx`, import `getStylesForType` and `getWidgetStyle` and show the style name:

```tsx
import { getStylesForType } from "../state/style-catalog";
import { getWidgetStyle } from "../../lib/profile";

// Inside each widget button, after the type/size line:
const currentStyle = getWidgetStyle(widget);
const styles = getStylesForType(widget.type);
const styleName = styles.find((s) => s.id === currentStyle)?.name ?? currentStyle;

<span className="mt-1 block font-mono text-[10px] text-vantare-textDim">
  {widget.type} · {styleName} · {widget.position.w}×{widget.position.h}
</span>
```

- [ ] **Step 2: Verify tests**

```powershell
pnpm --dir frontend test WidgetList
```

---

# Miniplan E: Profile Config Updates and Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Update the example racing profile to include new widget types with correct positions and appearances, and ensure the full pipeline works.

**Architecture:** The example profile gains widgets for all 6 types. Positions are set to match the HTML reference layouts. The `style` and `appearance` fields are populated with Vantare Racing defaults.

**Tech Stack:** JSON, Go tests, Vitest.

---

## Task E1: Update Example Racing Profile

**Files:**

- Modify: `vantare-v2/configs/example-racing.json`

- [ ] **Step 1: Add all 6 widget types to the example profile**

```json
{
  "id": "default-racing",
  "name": "Default Racing",
  "displayMode": "racing",
  "monitorIndex": 0,
  "widgets": [
    {
      "id": "delta",
      "type": "delta",
      "style": "vantare-racing",
      "enabled": true,
      "updateHz": 30,
      "position": { "x": 610, "y": 940, "w": 700, "h": 120 },
      "props": {
        "style": "vantare-racing",
        "appearance": {
          "positiveColor": "#e74c3c",
          "negativeColor": "#2ecc71",
          "textColor": "#FFFFFF",
          "backgroundColor": "#000000"
        }
      }
    },
    {
      "id": "relative",
      "type": "relative",
      "style": "vantare-racing",
      "enabled": true,
      "updateHz": 15,
      "position": { "x": 40, "y": 40, "w": 300, "h": 250 },
      "props": {
        "style": "vantare-racing",
        "rangeAhead": 3,
        "rangeBehind": 3,
        "appearance": {
          "accentColor": "#E63946",
          "textColor": "#FFFFFF",
          "backgroundColor": "#3a050a",
          "borderColor": "#9b2226",
          "gapAheadColor": "#f87171",
          "gapBehindColor": "#4ade80"
        }
      }
    },
    {
      "id": "standings",
      "type": "standings",
      "style": "vantare-racing",
      "enabled": true,
      "updateHz": 15,
      "position": { "x": 1560, "y": 40, "w": 320, "h": 550 },
      "props": {
        "style": "vantare-racing",
        "maxRows": 12,
        "appearance": {
          "accentColor": "#9b2226",
          "textColor": "#FFFFFF",
          "backgroundColor": "#3a050a",
          "borderColor": "#9b2226",
          "posLeaderColor": "#f1c40f",
          "pitColor": "#f1c40f",
          "tireSoftColor": "#E63946",
          "tireMediumColor": "#f1c40f",
          "tireHardColor": "#ffffff"
        }
      }
    },
    {
      "id": "telemetry",
      "type": "telemetry",
      "style": "vantare-racing",
      "enabled": false,
      "updateHz": 30,
      "position": { "x": 40, "y": 800, "w": 400, "h": 250 },
      "props": {
        "style": "vantare-racing",
        "appearance": {
          "accentColor": "#9b2226",
          "textColor": "#FFFFFF",
          "backgroundColor": "#1a0104",
          "borderColor": "#9b2226",
          "rpmGreen": "#2ecc71",
          "rpmYellow": "#f1c40f",
          "rpmRed": "#e74c3c",
          "rpmBlue": "#3498db",
          "pedalThrottleColor": "#2ecc71",
          "pedalBrakeColor": "#e74c3c"
        }
      }
    },
    {
      "id": "telemetry-vertical",
      "type": "telemetry-vertical",
      "style": "vantare-racing",
      "enabled": false,
      "updateHz": 30,
      "position": { "x": 1780, "y": 40, "w": 140, "h": 400 },
      "props": {
        "style": "vantare-racing",
        "appearance": {
          "accentColor": "#9b2226",
          "textColor": "#FFFFFF",
          "backgroundColor": "#1a0104",
          "borderColor": "#9b2226",
          "rpmGreen": "#2ecc71",
          "rpmYellow": "#f1c40f",
          "rpmRed": "#e74c3c",
          "rpmBlue": "#3498db",
          "pedalThrottleColor": "#2ecc71",
          "pedalBrakeColor": "#e74c3c",
          "pedalClutchColor": "#3498db"
        }
      }
    },
    {
      "id": "pedals",
      "type": "pedals",
      "style": "vantare-racing",
      "enabled": false,
      "updateHz": 30,
      "position": { "x": 690, "y": 980, "w": 530, "h": 80 },
      "props": {
        "style": "vantare-racing",
        "appearance": {
          "accentColor": "#9b2226",
          "textColor": "#FFFFFF",
          "backgroundColor": "#1a0104",
          "pedalThrottleColor": "#2ecc71",
          "pedalBrakeColor": "#e74c3c",
          "pedalClutchColor": "#3498db"
        }
      }
    }
  ]
}
```

Note: `telemetry`, `telemetry-vertical`, and `pedals` are `enabled: false` by default so existing users don't see unexpected widgets. Isaac can enable them from Preview.

- [ ] **Step 2: Verify Go profile loading**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./pkg/config/...
```

---

# Miniplan F: Documentation, Evidence, and Final Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Document the new widget design system, create evidence, and validate the full pipeline.

**Architecture:** No new product code unless validation fails. Update docs to reflect the new model: widgets have styles, solid colors are editable, Preview shows real widgets with mock data.

**Tech Stack:** Markdown, Go tests, Vitest, PowerShell.

---

## Task F1: Update Documentation

**Files:**

- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/08-PERFILES-Y-LAYOUT.md`

- [ ] **Step 1: Document widget design system in perfiles doc**

In `docs/proyecto/08-PERFILES-Y-LAYOUT.md`, add:

```md
## Sistema de Diseño Visual de Widgets

En v2, cada widget tiene:
- **type**: categoría general (`telemetry`, `telemetry-vertical`, `standings`, `relative`, `delta`, `pedals`).
- **style**: variante visual (por ahora solo `vantare-racing`).
- **appearance**: colores sólidos editables por widget (accentColor, textColor, backgroundColor, etc.).
- Los degradados están fijos por estilo (no editables en v1).
- Preview muestra el widget real con datos mock.
- El Inspector permite cambiar estilo y colores sólidos.
- Los widgets usan `frame-budget` + `dom-write` para updates eficientes.

Colores por tipo:
- Telemetry: accentColor, rpmGreen/Yellow/Red/Blue, pedalThrottleColor, pedalBrakeColor
- Telemetry Vertical: + pedalClutchColor
- Standings: accentColor, posLeaderColor, pitColor, tireSoft/Medium/HardColor
- Relative: accentColor, gapAheadColor, gapBehindColor
- Delta: positiveColor, negativeColor
- Pedals: accentColor, pedalThrottle/Brake/ClutchColor
```

- [ ] **Step 2: Update current state**

In `docs/proyecto/04-ESTADO-ACTUAL.md`, add a dated note:

```md
### Visual Widget Design System

Estado: widgets rediseñados desde HTMLs de Isaac. Estilo "Vantare Racing" implementado para los 6 tipos. Preview muestra widgets reales. Edición de colores sólidos en Inspector.
```

---

## Task F2: Create Evidence File

**Files:**

- Create: `.omo/evidence/v2-visual-widget-design-system.txt`

- [ ] **Step 1: Add evidence template**

```text
Vantare v2 — Visual Widget Design System Evidence

Date: 2026-06-13
Scope:
- 6 widget types with Vantare Racing style.
- Style field in WidgetConfig.
- Solid-color editing per widget in Inspector.
- Real widget rendering in Preview with mock data.
- Drag-to-reposition in Preview.

Commands:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build

Manual checklist:
- Preview shows real Standings widget with mock data:
- Preview shows real Relative widget with mock data:
- Preview shows real Delta widget with mock data:
- Preview shows real Telemetry widget with mock data (when enabled):
- Inspector changes accentColor and widget updates:
- Style selector shows available styles:
- Drag moves widget position in Preview:
- LMU live updates Standings/Relative/Delta with real data:
- OBS endpoints still work:

Notes:
- Gradients are baked into style, not editable in v1.
- OBS Browser Source loads profile once at startup; saved changes require a Browser Source refresh to reflect.
- Throttle/brake/clutch inputs added to TelemetryRefState and the Go LMU parser (the only Go change in this plan).
- No commit/push performed.
- apps/desktop was not touched.
```

- [ ] **Step 2: Fill command results after verification**

---

## Task F3: Final Verification

- [ ] **Step 1: Run Go tests**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected: PASS in all packages.

- [ ] **Step 2: Run frontend tests**

```powershell
pnpm --dir frontend test
```

Expected: All pass.

- [ ] **Step 3: Build frontend**

```powershell
pnpm --dir frontend build
```

Expected: Build succeeds.

- [ ] **Step 4: Mock manual smoke**

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:
- Hub opens.
- Preview shows real widgets with mock data.
- Inspector shows style selector and color editors.
- Drag repositions widgets.
- Enabling telemetry/pedals shows them in Preview.

- [ ] **Step 5: LMU live manual smoke**

With Le Mans Ultimate open:

```powershell
go run ./cmd/vantare -live -profile configs/example-racing.json
```

Expected:
- Standings/Relative/Delta show live LMU data.
- Custom colors from appearance are applied.

- [ ] **Step 6: OBS endpoint smoke**

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream
```

Expected: Health OK, SSE emits telemetry events.

---

## Acceptance Criteria

- 6 widget types exist: `telemetry`, `telemetry-vertical`, `standings`, `relative`, `delta`, `pedals`.
- Each widget visually matches its HTML reference file ("Vantare Racing" style).
- `WidgetConfig` has a `style` field.
- `WidgetAppearance` has type-specific solid-color fields.
- Style catalog exists and `getStylesForType` / `getDefaultAppearance` work.
- Preview renders the real widget component (not a skeleton) with mock data.
- Preview supports drag-to-reposition.
- Preview Inspector shows StyleSelector and AppearanceEditor.
- Changing style resets appearance to the style defaults.
- Changing solid colors updates the widget immediately in Preview.
- Runtime renders only enabled widgets with live telemetry.
- Runtime overlay remains fullscreen transparent and click-through.
- LMU live still updates widgets.
- OBS HTTP/SSE still works.
- Required test/build commands pass.
- No changes to `apps/desktop`.
- No commit/push.

---

## Known Edge Cases And Decisions

1. **Live data missing brand/color/tire:** The LMU parser currently does not emit `driverNumber`, `teamBrandColor`, `tireCompound`, or `fastestLap`. In live mode these fields are `undefined`. Standings/Relative widgets must fall back to: name-based initial, white/transparent brand block, no tire badge, no fastest-lap animation. Tests in B1/B2 must cover fallback behavior.

2. **Widget size clipping in Preview:** `PreviewWidgetFrame` uses `overflow-hidden`. If a widget's natural content is larger than its `position.w/h`, it is clipped. This matches the runtime behavior where `WidgetHost` positions the widget inside a fixed-size container.

3. **Drag threshold and bounds:** A 1-pixel threshold prevents accidental profile mutations during normal clicks. Coordinate conversion uses the canvas bounding box so drag deltas are correct regardless of page layout. Final bounds enforcement is handled by `updateWidgetPosition` / `normalizeRect` in `profile-editor.ts` (logical 3840×2160 canvas).

4. **Style reset on change:** Changing the style resets the appearance palette to the style defaults. This is intentional so Isaac sees the new style cleanly. Custom colors will be lost.

5. **PedalsWidget canvas animation:** The canvas trace is updated inside `startFrameBudgetLoop(updateHz, ...)` using `canvas.getContext("2d")`. It does not run a separate `requestAnimationFrame` loop.

6. **Telemetry shift-point flash:** Mock RPM is set to 8750 so the blue/white LED flash is visible in Preview. In live mode it depends on real RPM.

---

## Self-Review

Spec coverage:

- Widget types from HTML references: covered by Miniplan B.
- Style field + appearance: covered by Miniplan A.
- VehicleScoring extended fields: covered by Task A0.
- Real widget rendering in Preview: covered by Miniplan C.
- Drag-to-reposition in Preview: covered by Task C2.
- Style selector + color editor: covered by Miniplan D.
- Profile integration: covered by Miniplan E.
- Documentation + validation: covered by Miniplan F.

Placeholder scan:

- No `TBD`.
- No "implement later" beyond the explicit v1/v2 boundary.
- No unspecified "add tests" — all test code blocks contain real assertions.
- No `GradientSwatch.tsx` (removed from file map).
- No placeholder comments like "// Verify the structure exists".

Type consistency:

- `WidgetConfig.style` matches `props.style` for Go round-trip.
- `WidgetPropsMap` updated with `style?: string`.
- `WidgetAppearance` extended fields are all optional strings (plus opacity number).
- Style catalog defaults align with HTML reference colors.
- `setWidgetStyle` defined only in `profile-editor.ts`.
- `getWidgetStyle` and `getWidgetStyleFromProps` defined in `profile.ts`.
- `resolveWidgetAppearance` helper used by all widgets.
- `TelemetryRefState` extended with `throttle`, `brake`, `clutch` (Task A0b) and the Go LMU parser emits them (Task A0d).
- Mock telemetry populates all VehicleScoring fields and uses rpm 8750 for shift flash.

Bug fixes captured in this plan:

- Style change now applies style first, then appearance defaults, avoiding the props-clobber bug.
- Drag uses canvas-relative coordinates (fixes offset when canvas is not at screen origin) and delegates final clamping to `normalizeRect`.
- Drag threshold prevents click-vs-drag ambiguity.
- WidgetList uses `getWidgetStyle(widget)` instead of unsafe cast.
- AppearanceEditor uses stable field-key `id`s (HTML-valid) and `htmlFor` for accessible labels.
- Disabled widgets keep selection/dashed border visible; grayscale is applied only to content.
- Widget tests verify real color application, not just existence.
- Telemetry/pedals widgets get real throttle/brake/clutch inputs via `TelemetryRefState` extension.

Risk review:

- `CompositeApp` telemetry subscription must not break (verified in Task B7).
- No React state for hot telemetry.
- Preview `editMode` uses static mock data.
- Drag state is local to `PreviewCanvas`.
- `apps/desktop` not touched.
- No Go backend changes.
- `PreviewWidgetFrame` drag/click wiring is consistent.
- Live-data fallbacks documented in "Known Edge Cases".

Known v1 limitation (Isaac confirmed):

- Gradients are baked into the style and not editable in v1. Only solid colors are editable.

---

## Executor Notes

This plan should be implemented in order:

1. Miniplan A (Schema + types)
2. Miniplan B (Rewrite widgets)
3. Miniplan C (Preview real widgets + drag)
4. Miniplan D (Style selector + appearance editor)
5. Miniplan E (Profile config + integration)
6. Miniplan F (Docs + validation)

Each miniplan builds on the previous one. Do not start Miniplan C until B is complete and tests pass. Do not skip the mock-telemetry helper (Task B0) — all widgets depend on it for editMode.

When implementing Miniplan B, the HTML reference files are at:
- `C:\Users\isaac\Desktop\Vantare-Overlays\vantare_telemetry.html`
- `C:\Users\isaac\Desktop\Vantare-Overlays\vantare_telemetry_vertical.html`
- `C:\Users\isaac\Desktop\Vantare-Overlays\vantare_standings.html`
- `C:\Users\isaac\Desktop\Vantare-Overlays\vantare_relative.html`
- `C:\Users\isaac\Desktop\Vantare-Overlays\vantare_delta.html`
- `C:\Users\isaac\Desktop\Vantare-Overlays\vantare_pedals.html`

Read each HTML file carefully before implementing its React component. The goal is pixel-faithful reproduction of the visual design, translated to React + `frame-budget` + `dom-write` architecture.

Fonts used in HTMLs: Inter (sans), Rajdhani (display), Space Grotesk (tech). These are already imported in the Vantare theme system. Use the CSS variable references (`--v-font-display`, etc.) where possible instead of raw font names.

The chroma key green background (`#00ff00`) from the HTMLs is NOT used in the React components. The runtime overlay is transparent. The green background was for standalone OBS testing only.

Do NOT add any new Go backend code. The `style` field lives in `WidgetConfig.Props` which is `map[string]any` — already opaque to Go.