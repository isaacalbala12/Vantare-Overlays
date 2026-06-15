# Preview Profile Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Hub Preview into the main workbench for choosing a profile, enabling/disabling widgets, editing layout/appearance, saving, and starting/stopping the desktop overlay.

**Architecture:** The Hub owns profile selection and overlay lifecycle state through one small shared state layer. `Preview` becomes the primary editing/control surface: profiles are selectable there, widgets can be toggled without disappearing from the editing list, and `Iniciar/Detener/Guardar` live next to the canvas. The runtime overlay remains simple: it renders only enabled widgets from the saved active profile and listens to live telemetry through `telemetry-ref`.

**Tech Stack:** Go 1.25+, Wails v3, React 19, TypeScript, Vite, Tailwind CSS v4, existing profile JSON schema in `vantare-v2/pkg/config`.

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
- `Relative` and `Standings` can receive live LMU vehicles.
- `Delta` may remain `—` until `deltaBest` exists in the parser/model; do not fake it.
- OBS HTTP/SSE endpoints continue to work.

Product decision:

- An “overlay” in the Hub should be understood as a saved **profile/layout**.
- Preview should sit with the profile/overlay workflow, not as an isolated technical tab.
- Preview is where Isaac selects a profile, toggles widgets, edits layout/colors, saves, then starts the overlay.
- Disabled widgets should remain available in the Preview editor so Isaac can re-enable them later.
- Runtime overlay should render only `enabled: true` widgets.

---

## File Map

Create:

```text
vantare-v2/frontend/src/hub/state/overlay-workbench.ts
vantare-v2/frontend/src/hub/state/overlay-workbench.test.ts
vantare-v2/frontend/src/hub/preview/WidgetList.tsx
vantare-v2/frontend/src/hub/preview/WidgetList.test.tsx
.omo/evidence/v2-preview-profile-workbench.txt
```

Modify:

```text
vantare-v2/frontend/src/hub/HubApp.tsx
vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx
vantare-v2/frontend/src/hub/pages/PreviewPage.tsx
vantare-v2/frontend/src/hub/pages/PreviewPage.test.tsx
vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx
vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx
vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx
vantare-v2/frontend/src/hub/preview/profile-editor.ts
vantare-v2/frontend/src/hub/preview/profile-editor.test.ts
docs/proyecto/04-ESTADO-ACTUAL.md
docs/proyecto/08-PERFILES-Y-LAYOUT.md
docs/proyecto/09-EVENTOS-IPC.md
docs/proyecto/11-COMANDOS-Y-VERIFICACION.md
```

Do not modify backend unless a failing test proves a frontend-only solution is impossible. The required events already exist:

```text
hub:list
hub:profiles
hub:activate
hub:profile-activated
profile:request
profile:loaded
layout:save
layout:saved
overlay:start
overlay:stop
overlay:status
hub:error
```

---

# Miniplan A: Hub Workbench State

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add a tiny typed helper layer for Hub profile/overlay events so `ProfilesPage` and `PreviewPage` do not duplicate Wails event parsing.

**Architecture:** This is not Zustand, Context, or a global telemetry store. It is a small module with types and pure helpers for interpreting profile entries, overlay status, and choosing the active/running profile. React components still own their local UI state.

**Tech Stack:** TypeScript, Vitest.

---

## Task A1: Add Typed Workbench Helpers

**Files:**

- Create: `vantare-v2/frontend/src/hub/state/overlay-workbench.ts`
- Create: `vantare-v2/frontend/src/hub/state/overlay-workbench.test.ts`

- [ ] **Step 1: Write failing tests**

Create `vantare-v2/frontend/src/hub/state/overlay-workbench.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  isRunningProfile,
  profileLabel,
  profileTarget,
  type OverlayStatus,
  type ProfileEntry,
} from "./overlay-workbench";

describe("overlay-workbench", () => {
  const profile: ProfileEntry = {
    id: "default-racing",
    file: "example-racing.json",
    name: "Default Racing",
    displayMode: "racing",
    widgets: 3,
  };

  it("uses display name when available", () => {
    expect(profileLabel(profile)).toBe("Default Racing");
    expect(profileLabel({ ...profile, name: "" })).toBe("default-racing");
  });

  it("builds event target with id and file", () => {
    expect(profileTarget(profile)).toEqual({
      id: "default-racing",
      file: "example-racing.json",
    });
  });

  it("detects the currently running profile", () => {
    const status: OverlayStatus = {
      running: true,
      profileId: "default-racing",
      mode: "racing",
    };
    expect(isRunningProfile(profile, status)).toBe(true);
    expect(isRunningProfile({ ...profile, id: "other" }, status)).toBe(false);
    expect(isRunningProfile(profile, { ...status, running: false })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test overlay-workbench
```

Expected:

```text
FAIL src/hub/state/overlay-workbench.test.ts
Cannot find module './overlay-workbench'
```

- [ ] **Step 3: Implement helpers**

Create `vantare-v2/frontend/src/hub/state/overlay-workbench.ts`:

```ts
export type ProfileEntry = {
  id: string;
  file: string;
  name?: string;
  displayMode: string;
  widgets: number;
};

export type ProfileTarget = {
  id: string;
  file: string;
};

export type OverlayStatus = {
  running?: boolean;
  profileId?: string;
  mode?: string;
};

export function profileLabel(profile: ProfileEntry): string {
  return profile.name?.trim() || profile.id;
}

export function profileTarget(profile: ProfileEntry): ProfileTarget {
  return {
    id: profile.id,
    file: profile.file,
  };
}

export function isRunningProfile(profile: ProfileEntry, status: OverlayStatus | null): boolean {
  return Boolean(status?.running && status.profileId === profile.id);
}
```

- [ ] **Step 4: Verify helper tests pass**

Run:

```powershell
pnpm --dir frontend test overlay-workbench
```

Expected:

```text
PASS src/hub/state/overlay-workbench.test.ts
```

---

# Miniplan B: Preview As Profile Workbench

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make `PreviewPage` able to list/select profiles, save changes, and start/stop the selected profile from the same screen.

**Architecture:** `PreviewPage` subscribes to `hub:profiles`, `profile:loaded`, `overlay:status`, `layout:saved`, and `hub:error`. It emits `hub:list` on mount, `hub:activate` when Isaac chooses a profile, `layout:save` when saving, and `overlay:start/overlay:stop` for runtime lifecycle. `ProfilesPage` remains a CRUD list but no longer needs to be the main start/stop surface.

**Tech Stack:** React 19, Wails `Events`, Testing Library, Vitest.

---

## Task B1: Extend PreviewPage Tests For Profile Selection And Lifecycle Controls

**Files:**

- Modify: `vantare-v2/frontend/src/hub/pages/PreviewPage.test.tsx`

- [ ] **Step 1: Add tests for profile list, selection, start, and stop**

Append these tests to the existing `describe("PreviewPage", ...)` block. Reuse the existing mocked `Events` helpers in that test file.

```tsx
it("lists profiles and activates a selected profile from preview", () => {
  render(<PreviewPage />);

  dispatch("hub:profiles", {
    profiles: [
      {
        id: "default-racing",
        file: "example-racing.json",
        name: "Default Racing",
        displayMode: "racing",
        widgets: 3,
      },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: "Default Racing" }));

  expect(runtimeMock.emit).toHaveBeenCalledWith("hub:activate", {
    id: "default-racing",
    file: "example-racing.json",
  });
});

it("starts and stops the selected profile from preview", () => {
  render(<PreviewPage />);

  dispatch("profile:loaded", { profile });

  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

  expect(runtimeMock.emit).toHaveBeenCalledWith("overlay:start", {
    id: "default-racing",
    file: "example-racing.json",
  });

  dispatch("overlay:status", { running: true, profileId: "default-racing", mode: "racing" });

  fireEvent.click(screen.getByRole("button", { name: "Detener" }));

  expect(runtimeMock.emit).toHaveBeenCalledWith("overlay:stop");
});
```

If the existing `profile` fixture in this test does not include `file`, add this property to the fixture:

```ts
file: "example-racing.json",
```

If TypeScript rejects `file` on `ProfileConfig`, do not add it to `ProfileConfig`. Instead track the selected `ProfileEntry` in `PreviewPage` and use that target for start/stop.

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
pnpm --dir frontend test PreviewPage
```

Expected:

```text
FAIL
Unable to find role="button" and name "Default Racing"
```

---

## Task B2: Implement Profile List And Lifecycle Controls In PreviewPage

**Files:**

- Modify: `vantare-v2/frontend/src/hub/pages/PreviewPage.tsx`

- [ ] **Step 1: Import shared types/helpers**

Add imports near the top:

```ts
import {
  isRunningProfile,
  profileLabel,
  profileTarget,
  type OverlayStatus,
  type ProfileEntry,
} from "../state/overlay-workbench";
```

- [ ] **Step 2: Add state for profiles and selected entry**

Inside `PreviewPage`, add:

```ts
const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
const [selectedEntry, setSelectedEntry] = useState<ProfileEntry | null>(null);
const [overlayStatus, setOverlayStatus] = useState<OverlayStatus | null>(null);
const selectedProfileRunning = selectedEntry ? isRunningProfile(selectedEntry, overlayStatus) : overlayRunning;
```

Keep `overlayRunning` if existing tests depend on it, but derive UI disabling from `selectedProfileRunning` or `overlayStatus?.running`.

- [ ] **Step 3: Subscribe to `hub:profiles` and keep selected profile stable**

Inside the existing `useEffect`, add:

```ts
const unsubProfiles = Events.On("hub:profiles", (event: { data: unknown }) => {
  const data = event.data as { profiles?: ProfileEntry[] };
  const nextProfiles = data.profiles ?? [];
  setProfiles(nextProfiles);
  setSelectedEntry((current) => {
    if (current) {
      return nextProfiles.find((entry) => entry.id === current.id) ?? current;
    }
    return nextProfiles[0] ?? null;
  });
});
```

Also emit profile list request on mount:

```ts
Events.Emit("hub:list");
Events.Emit("profile:request");
```

And cleanup:

```ts
unsubProfiles();
```

- [ ] **Step 4: Update overlay status handling**

Replace the current `overlay:status` handler body with:

```ts
const data = event.data as OverlayStatus;
setOverlayStatus(data);
setOverlayRunning(Boolean(data?.running));
```

- [ ] **Step 5: Add profile activation/start/stop handlers**

Add these functions inside `PreviewPage`:

```ts
function activateProfile(entry: ProfileEntry) {
  if (overlayStatus?.running) return;
  setSelectedEntry(entry);
  setSaveState("idle");
  setDirty(false);
  Events.Emit("hub:activate", profileTarget(entry));
}

function startSelectedProfile() {
  if (!selectedEntry || dirty || saveState === "saving") return;
  Events.Emit("overlay:start", profileTarget(selectedEntry));
}

function stopOverlay() {
  Events.Emit("overlay:stop");
}
```

- [ ] **Step 6: Render profile selector and lifecycle buttons**

Replace the top header block with a layout that keeps the existing title but adds a profile rail and action buttons:

```tsx
<div className="mb-6 flex flex-col gap-4">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-2">Preview</h1>
      <p className="text-vantare-textMuted text-sm">
        Elige un perfil, ajusta widgets, guarda y arranca el overlay.
      </p>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-xs font-mono text-vantare-textMuted">
        {saveState === "saving" && "Guardando..."}
        {saveState === "saved" && "Guardado"}
        {saveState === "error" && "Error al guardar"}
        {saveState === "idle" && dirty && "Cambios sin guardar"}
      </div>
      <button
        type="button"
        onClick={saveProfile}
        disabled={overlayRunning || !dirty || saveState === "saving"}
        className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Guardar
      </button>
      {selectedProfileRunning ? (
        <button
          type="button"
          onClick={stopOverlay}
          className="btn-secondary px-5 py-2 rounded-lg text-xs font-bold text-white"
        >
          Detener
        </button>
      ) : (
        <button
          type="button"
          onClick={startSelectedProfile}
          disabled={!selectedEntry || dirty || saveState === "saving"}
          className="btn-primary px-5 py-2 rounded-lg text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Iniciar
        </button>
      )}
    </div>
  </div>

  <div className="flex gap-2 overflow-x-auto pb-1">
    {profiles.map((entry) => (
      <button
        key={entry.id}
        type="button"
        onClick={() => activateProfile(entry)}
        disabled={overlayRunning}
        className={`shrink-0 rounded-lg border px-4 py-2 text-left text-xs transition-colors ${
          selectedEntry?.id === entry.id
            ? "border-vantare-red-500 bg-vantare-red-950/30 text-white"
            : "border-white/10 bg-black/30 text-vantare-textMuted hover:text-white"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span className="block font-bold">{profileLabel(entry)}</span>
        <span className="block font-mono text-[10px] text-vantare-textDim">
          {entry.displayMode} · {entry.widgets} widgets
        </span>
      </button>
    ))}
  </div>
</div>
```

Remove the old bottom `Guardar` button from the grid because saving is now in the header action group.

- [ ] **Step 7: Verify PreviewPage tests pass**

Run:

```powershell
pnpm --dir frontend test PreviewPage
```

Expected:

```text
PASS src/hub/pages/PreviewPage.test.tsx
```

---

# Miniplan C: Widget List And Enable/Disable UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make enabled/disabled widget management clear in Preview without losing disabled widgets from the editor.

**Architecture:** The profile keeps all widgets in `profile.widgets`. Runtime filters enabled widgets. Preview renders all widgets in a side list. The canvas should show enabled widgets normally and disabled widgets as muted editable frames, or omit them only from runtime. The inspector controls the selected widget including `Visible`.

**Tech Stack:** React, TypeScript, Testing Library, existing `profile-editor.ts`.

---

## Task C1: Add WidgetList Component

**Files:**

- Create: `vantare-v2/frontend/src/hub/preview/WidgetList.tsx`
- Create: `vantare-v2/frontend/src/hub/preview/WidgetList.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `WidgetList.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetList } from "./WidgetList";
import type { WidgetConfig } from "../../lib/profile";

const widgets: WidgetConfig[] = [
  { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 1, y: 2, w: 3, h: 4 } },
  { id: "standings", type: "standings", enabled: false, updateHz: 15, position: { x: 5, y: 6, w: 7, h: 8 } },
];

describe("WidgetList", () => {
  it("renders enabled and disabled widgets", () => {
    render(<WidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={vi.fn()} />);

    expect(screen.getByText("delta")).toBeTruthy();
    expect(screen.getByText("standings")).toBeTruthy();
    expect(screen.getByText("Visible")).toBeTruthy();
    expect(screen.getByText("Oculto")).toBeTruthy();
  });

  it("selects a widget", () => {
    const onSelectWidget = vi.fn();
    render(<WidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={onSelectWidget} />);

    fireEvent.click(screen.getByRole("button", { name: /standings/i }));

    expect(onSelectWidget).toHaveBeenCalledWith("standings");
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
pnpm --dir frontend test WidgetList
```

Expected:

```text
FAIL Cannot find module './WidgetList'
```

- [ ] **Step 3: Implement WidgetList**

Create `WidgetList.tsx`:

```tsx
import type { WidgetConfig } from "../../lib/profile";

type WidgetListProps = {
  widgets: WidgetConfig[];
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
};

export function WidgetList({ widgets, selectedWidgetId, onSelectWidget }: WidgetListProps) {
  return (
    <aside className="glass-panel rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Widgets</h2>
        <span className="font-mono text-[10px] text-vantare-textDim">{widgets.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {widgets.map((widget) => (
          <button
            key={widget.id}
            type="button"
            onClick={() => onSelectWidget(widget.id)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              selectedWidgetId === widget.id
                ? "border-vantare-red-500 bg-vantare-red-950/30"
                : "border-white/10 bg-black/25 hover:border-white/20"
            } ${widget.enabled ? "text-white" : "text-vantare-textDim"}`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold">{widget.id}</span>
              <span className={`text-[10px] font-bold ${widget.enabled ? "text-emerald-400" : "text-vantare-textDim"}`}>
                {widget.enabled ? "Visible" : "Oculto"}
              </span>
            </span>
            <span className="mt-1 block font-mono text-[10px] text-vantare-textDim">
              {widget.type} · {widget.position.w}×{widget.position.h}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Verify WidgetList tests pass**

Run:

```powershell
pnpm --dir frontend test WidgetList
```

Expected:

```text
PASS src/hub/preview/WidgetList.test.tsx
```

---

## Task C2: Show Disabled Widgets In Preview Canvas

**Files:**

- Modify: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx`
- Modify: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx`

- [ ] **Step 1: Add visual disabled state to PreviewWidgetFrame**

In `PreviewWidgetFrame.tsx`, update the root `button` class/style so disabled profile widgets are visually muted but still selectable unless the whole editor is disabled:

```tsx
className={`absolute text-left border transition-colors ${
  selected ? "border-vantare-red-400" : "border-white/15 hover:border-white/30"
} ${widget.enabled ? "" : "border-dashed opacity-45 grayscale"}`}
```

Do not use the native `disabled` attribute to represent `widget.enabled === false`; native disabled would prevent selection. Keep native `disabled={disabled}` only for “overlay is running”.

- [ ] **Step 2: Ensure PreviewCanvas maps all widgets**

In `PreviewCanvas.tsx`, confirm this line maps all widgets:

```tsx
{profile.widgets.map((widget) => (
```

Do not change it to filter enabled widgets. Preview must show hidden widgets so Isaac can re-enable them.

- [ ] **Step 3: Verify existing PreviewPage tests**

Run:

```powershell
pnpm --dir frontend test PreviewPage
```

Expected:

```text
PASS
```

---

## Task C3: Integrate WidgetList Into PreviewPage

**Files:**

- Modify: `vantare-v2/frontend/src/hub/pages/PreviewPage.tsx`

- [ ] **Step 1: Import WidgetList**

Add:

```ts
import { WidgetList } from "../preview/WidgetList";
```

- [ ] **Step 2: Change Preview grid layout**

Replace the current profile grid:

```tsx
<div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
```

with:

```tsx
<div className="grid grid-cols-1 2xl:grid-cols-[220px_1fr_320px] gap-6">
```

Inside the grid, before `PreviewCanvas`, add:

```tsx
<WidgetList
  widgets={profile.widgets}
  selectedWidgetId={selectedWidgetId}
  onSelectWidget={setSelectedWidgetId}
/>
```

Keep `PreviewInspector` on the right.

- [ ] **Step 3: Verify hidden widget selection works**

Run:

```powershell
pnpm --dir frontend test WidgetList PreviewPage
```

Expected:

```text
PASS
```

---

# Miniplan D: Profiles Page Becomes CRUD, Preview Becomes Control Surface

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Avoid two competing places for starting/stopping overlays. `ProfilesPage` should manage profile CRUD and send users to Preview; `PreviewPage` should control runtime.

**Architecture:** `HubApp` owns active section navigation. `ProfilesPage` receives an `onOpenPreview` callback. Clicking `Editar` or `Preview` activates the profile and navigates to Preview. Start/stop controls are removed from `ProfilesPage` to reduce confusion.

**Tech Stack:** React props, existing Hub state.

---

## Task D1: Add Navigation Callback From Profiles To Preview

**Files:**

- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx`
- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`

- [ ] **Step 1: Change ProfilesPage props**

In `ProfilesPage.tsx`, add:

```ts
type ProfilesPageProps = {
  onOpenPreview?: () => void;
};

export function ProfilesPage({ onOpenPreview }: ProfilesPageProps) {
```

Do not leave the old `export function ProfilesPage()` signature.

- [ ] **Step 2: Replace start/stop buttons with Preview action**

Remove `runningProfileId`, `handleStart`, and `handleStop` from `ProfilesPage`.

Add:

```ts
const handlePreview = useCallback((profile: ProfileEntry) => {
  setError(null);
  Events.Emit("hub:activate", { id: profile.id, file: profile.file });
  onOpenPreview?.();
}, [onOpenPreview]);
```

In each profile card, replace `Seleccionar`, `Iniciar/Detener`, and `Eliminar` button group with:

```tsx
<button
  type="button"
  onClick={() => handlePreview(p)}
  className="btn-primary px-5 py-2 rounded-lg text-xs font-bold text-white whitespace-nowrap"
>
  Preview
</button>
<button
  type="button"
  onClick={() => handleSelect(p)}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-vantare-textMuted hover:text-white whitespace-nowrap"
>
  Seleccionar
</button>
<button
  type="button"
  onClick={() => handleDelete(p)}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-vantare-textMuted hover:text-vantare-red-400 whitespace-nowrap"
>
  Eliminar
</button>
```

Keep `Seleccionar` for now because it is useful as a low-risk profile activation action. Do not add `Iniciar` back to this page.

- [ ] **Step 3: Wire HubApp navigation**

In `HubApp.tsx`, replace:

```tsx
{section === "profiles" && <ProfilesPage />}
```

with:

```tsx
{section === "profiles" && <ProfilesPage onOpenPreview={() => setSection("preview")} />}
```

- [ ] **Step 4: Run frontend tests**

Run:

```powershell
pnpm --dir frontend test
```

Expected:

```text
PASS
```

---

# Miniplan E: Runtime Contract And Manual Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Prove the new workflow works end-to-end with mock and LMU live without regressing OBS.

**Architecture:** No new product code unless a test/manual check fails. Add evidence and documentation so the new mental model is clear: profiles are overlays, Preview edits profiles, runtime renders saved enabled widgets.

**Tech Stack:** PowerShell, Go tests, Vitest, Wails manual validation.

---

## Task E1: Update Documentation

**Files:**

- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/08-PERFILES-Y-LAYOUT.md`
- Modify: `docs/proyecto/09-EVENTOS-IPC.md`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`

- [ ] **Step 1: Document product model in perfiles doc**

In `docs/proyecto/08-PERFILES-Y-LAYOUT.md`, add a short section:

```md
## Modelo Hub Preview

En v2, un "overlay" visible en el Hub es un perfil/layout guardado en `configs/*.json`.

- `widgets[]` contiene todos los widgets del perfil.
- `enabled: true` significa que el widget se renderiza en runtime.
- `enabled: false` significa que el widget queda oculto en runtime, pero sigue apareciendo en Preview para poder reactivarlo.
- Preview es el editor principal: seleccionar perfil, ajustar widgets, guardar e iniciar.
- La ventana desktop overlay no se usa para editar.
```

- [ ] **Step 2: Document IPC/event flow**

In `docs/proyecto/09-EVENTOS-IPC.md`, add:

```md
## Flujo Preview Workbench

1. Preview monta y emite `hub:list` + `profile:request`.
2. Backend responde con `hub:profiles` y `profile:loaded`.
3. Al elegir perfil, Preview emite `hub:activate`.
4. Backend carga perfil y emite `profile:loaded`.
5. Preview edita localmente y emite `layout:save` solo al pulsar Guardar.
6. Backend persiste JSON y emite `layout:saved`.
7. Preview emite `overlay:start` para iniciar la ventana runtime.
8. Backend emite `overlay:status`.
9. Overlay runtime escucha `profile:request`, `profile:loaded` y `telemetry:update`.
```

- [ ] **Step 3: Add manual checklist**

In `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`, add:

```md
## Verificación Preview Workbench

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Checklist:

- [ ] Hub abre solo.
- [ ] Overlays muestra perfiles y botón Preview.
- [ ] Preview muestra selector de perfiles.
- [ ] Elegir `Default Racing` carga canvas, lista de widgets e inspector.
- [ ] Desactivar `standings`, guardar, iniciar.
- [ ] Runtime no muestra `standings`.
- [ ] Detener, reactivar `standings`, guardar, iniciar.
- [ ] Runtime vuelve a mostrar `standings`.
- [ ] Con overlay iniciado, Preview bloquea edición.
- [ ] LMU live: `go run ./cmd/vantare -live -profile configs/example-racing.json` muestra datos reales en Relative/Standings.
```

- [ ] **Step 4: Update current state**

In `docs/proyecto/04-ESTADO-ACTUAL.md`, add a dated note:

```md
### Preview Workbench

Estado: implementado como flujo principal de edición/control de perfiles. Pendiente de diseño visual avanzado por widget desde HTML/mockups externos.
```

---

## Task E2: Create Evidence File

**Files:**

- Create: `.omo/evidence/v2-preview-profile-workbench.txt`

- [ ] **Step 1: Add evidence template**

Create `.omo/evidence/v2-preview-profile-workbench.txt`:

```text
Vantare v2 — Preview Profile Workbench Evidence

Date: 2026-06-13
Scope:
- Preview is the main profile workbench.
- Profiles are treated as overlay layouts.
- Widgets can be enabled/disabled from Preview.
- Runtime renders only enabled widgets.
- Overlay lifecycle remains Hub-controlled.

Commands:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build

Manual checklist:
- Hub-only startup:
- Profiles -> Preview navigation:
- Preview profile selector:
- Widget disable/save/start:
- Widget re-enable/save/start:
- LMU live Relative/Standings:
- OBS health/profile/overlay/SSE:

Notes:
- Delta may remain blank until deltaBest is available from the telemetry model.
- No commit/push performed.
- apps/desktop was not touched.
```

- [ ] **Step 2: Fill command results after running verification**

After the required commands pass, update the evidence file with exact observed results:

```text
go test ./...: PASS
pnpm --dir frontend test: PASS, <N> tests
pnpm --dir frontend build: PASS
```

Do not mark manual checks as passed unless Isaac actually verifies them.

---

## Task E3: Final Verification

**Files:** no new code unless verification fails.

- [ ] **Step 1: Run Go tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected:

```text
PASS in all packages
```

- [ ] **Step 2: Run frontend tests**

Run:

```powershell
pnpm --dir frontend test
```

Expected:

```text
Test Files passed
Tests passed
```

- [ ] **Step 3: Build frontend**

Run:

```powershell
pnpm --dir frontend build
```

Expected:

```text
tsc -b && vite build
✓ built
```

- [ ] **Step 4: Mock manual smoke**

Run:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- Overlay does not open until `Iniciar`.
- Preview can disable/enable widgets and save.

- [ ] **Step 5: LMU live manual smoke**

With Le Mans Ultimate open and in session:

```powershell
go run ./cmd/lmu-debug -once
go run ./cmd/vantare -live -profile configs/example-racing.json
```

Expected:

- `lmu-debug` prints real track/speed/rpm.
- Hub Ops source shows `Le Mans Ultimate`.
- Preview -> Iniciar shows live Relative/Standings data.

- [ ] **Step 6: OBS endpoint smoke**

With app running:

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream
```

Expected:

- `/health` returns `{"ok":true}`.
- `/api/profile` returns profile JSON.
- SSE emits `event: telemetry`.

---

## Acceptance Criteria

- `Preview` has a profile selector.
- `Preview` has `Guardar`, `Iniciar`, and `Detener`.
- `ProfilesPage` no longer competes as the main start/stop screen.
- `ProfilesPage` can send Isaac into Preview for a profile.
- Widget visibility can be toggled from Preview.
- Disabled widgets remain visible/selectable in Preview as muted frames/list entries.
- Runtime overlay renders only enabled widgets.
- Runtime overlay still fullscreen transparent and click-through.
- LMU live still updates Relative/Standings.
- OBS HTTP/SSE still works.
- Required test/build commands pass.
- No changes to `apps/desktop`.
- No commit/push.

---

## Self-Review

Spec coverage:

- Profile-as-overlay model: covered by Miniplans B, D, E.
- Preview colocated with overlays/control flow: covered by B and D.
- Enable/disable widgets from Preview: covered by C.
- Runtime only enabled widgets: covered by existing runtime contract and C/E manual validation.
- HTML/design adaptation is intentionally out of scope for this plan; that should be a later visual-widget-design miniplan after Isaac provides a mock HTML.

Placeholder scan:

- No `TBD`.
- No “implement later”.
- No unspecified “add tests”.

Type consistency:

- Profile entries use `ProfileEntry`.
- Runtime status uses `OverlayStatus`.
- Event payloads use existing `id` + `file` contract.

---

## Executor Notes

This plan should be implemented in order:

1. Miniplan A
2. Miniplan B
3. Miniplan C
4. Miniplan D
5. Miniplan E

Do not start visual redesign of widget skins in this plan. The next visual design phase should consume Isaac-provided HTML/mockups and convert them into widget components/styles after the workbench UX is stable.
