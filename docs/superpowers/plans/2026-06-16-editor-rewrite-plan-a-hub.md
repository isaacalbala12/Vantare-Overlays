# Plan A — Hub Refactor: per-widget preview + dirty state + Profiles toggles

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Hub's broken Preview Workbench with a per-widget WYSIWYG preview page and a Profiles page that can activate/deactivate widgets. Keep the app compiling and passing tests at every step. Do not delete the old preview files until the new pages are fully working.

**Architecture:**
- `WidgetsPage` shows one widget at a time, rendered with the real overlay component scaled down, plus `PreviewInspector` for editing appearance and position.
- `ProfilesPage` keeps existing create/delete/activate and adds a widget-enabled toggle list for the active profile.
- `HubApp` swaps the `preview` section for `widgets`; `Topbar` labels are updated without changing the underlying `Section` type.
- A dirty state + single-level undo is managed in `WidgetsPage`. Save is triggered by a "Guardar" button and emits `profile:save` to the backend.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Wails Events.

**Target release:** v0.3.0-alpha.1.

---

## Task A1: Reorder Hub navigation and add dirty-state skeleton without deleting anything

**Files:**
- Modify: `vantare-v2/frontend/src/hub/components/Topbar.tsx`
- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx`
- Create: `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx`

- [ ] **Step 1: Update Topbar labels while keeping the same `id` values**

In `vantare-v2/frontend/src/hub/components/Topbar.tsx`, change only the labels in `NAV_ITEMS`. Keep all ids unchanged so the render logic (including the special `'live'` case) still works:

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: 'Hub', id: 'dashboard', active: true },
  { label: 'Perfiles', id: 'profiles' },
  { label: 'Overlays', id: 'preview' },   // old id kept for compatibility during refactor
  { label: 'Widgets', id: 'widgets' },
  { label: 'Telemetría', id: 'telemetry' },
  { label: 'Setup', id: 'setup' },
];
```

Do not remove the `'live'` render branch; it is dead code here but will be removed when PreviewPage is deleted.

Run: `pnpm --dir vantare-v2/frontend build`
Expected: build succeeds.

- [ ] **Step 2: Create empty WidgetsPage and add it to HubApp without removing PreviewPage yet**

Create `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx`:

```typescript
export function WidgetsPage() {
  return (
    <div className="text-white p-8">
      Widgets editor — en construcción
    </div>
  );
}
```

Modify `vantare-v2/frontend/src/hub/HubApp.tsx`:

1. Import `WidgetsPage`.
2. Add the section union: `type Section = 'dashboard' | 'profiles' | 'preview' | 'widgets' | 'telemetry' | 'setup';`
3. Add the route switch: `{section === "widgets" && <WidgetsPage />}`.
4. Keep `PreviewPage` imported and routed.

```typescript
import { WidgetsPage } from './pages/WidgetsPage';

type Section = 'dashboard' | 'profiles' | 'preview' | 'widgets' | 'telemetry' | 'setup';

// inside ScrollableMain:
{section === "preview" && <PreviewPage />}
{section === "widgets" && <WidgetsPage />}
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(hub): add WidgetsPage navigation skeleton"
```

---

## Task A2: Extract shared widget component registry

**Files:**
- Create: `vantare-v2/frontend/src/overlay/shared-widget-map.ts`
- Modify: `vantare-v2/frontend/src/overlay/CompositeApp.tsx`
- Modify: `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx`

- [ ] **Step 1: Create shared-widget-map.ts**

```typescript
import type { ComponentType } from "react";
import type { WidgetTelemetryMode } from "./widgets/use-widget-telemetry";
import { DeltaWidget } from "./widgets/DeltaWidget";
import { RelativeWidget } from "./widgets/RelativeWidget";
import { StandingsWidget } from "./widgets/StandingsWidget";
import { TelemetryWidget } from "./widgets/TelemetryWidget";
import { TelemetryVerticalWidget } from "./widgets/TelemetryVerticalWidget";
import { PedalsWidget } from "./widgets/PedalsWidget";

type WidgetComponentProps = {
  editMode: boolean;
  telemetryMode?: WidgetTelemetryMode;
  updateHz?: number;
  props?: Record<string, unknown>;
};

export const WIDGET_COMPONENTS: Record<string, ComponentType<WidgetComponentProps>> = {
  delta: DeltaWidget,
  relative: RelativeWidget,
  standings: StandingsWidget,
  telemetry: TelemetryWidget,
  "telemetry-vertical": TelemetryVerticalWidget,
  pedals: PedalsWidget,
};
```

- [ ] **Step 2: Refactor CompositeApp.tsx**

Replace the local `WIDGETS` map with the shared one:

```typescript
import { WIDGET_COMPONENTS } from "./shared-widget-map";
```

Remove the old local `WIDGETS: Record<...> = { ... }` declaration. Replace all `WIDGETS[w.type]` with `WIDGET_COMPONENTS[w.type]`.

- [ ] **Step 3: Refactor ObsOverlayApp.tsx**

Same as CompositeApp: import `WIDGET_COMPONENTS`, remove local map, use `WIDGET_COMPONENTS[w.type]`.

Run: `pnpm --dir vantare-v2/frontend test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(overlay): extract shared widget component registry"
```

---

## Task A3: Create WidgetPreview component

**Files:**
- Create: `vantare-v2/frontend/src/hub/preview/WidgetPreview.tsx`
- Create: `vantare-v2/frontend/src/hub/preview/WidgetPreview.test.tsx`

- [ ] **Step 1: Implement WidgetPreview**

```typescript
import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";
import { WIDGET_COMPONENTS } from "../../overlay/shared-widget-map";

type WidgetPreviewProps = {
  widget: WidgetConfig;
  scale?: number;
};

export function WidgetPreview({ widget, scale = 0.5 }: WidgetPreviewProps) {
  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) {
    return (
      <div className="flex items-center justify-center w-full h-full text-white/30 text-xs font-mono">
        {widget.type}
      </div>
    );
  }
  const style = getWidgetStyle(widget);
  return (
    <div
      className="relative overflow-hidden bg-transparent"
      style={{
        width: widget.position.w * scale,
        height: widget.position.h * scale,
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: widget.position.w,
          height: widget.position.h,
          transform: `scale(${scale})`,
        }}
      >
        <Component
          editMode={true}
          telemetryMode="mock"
          updateHz={widget.updateHz}
          props={{ ...widget.props, style }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add test**

Create `vantare-v2/frontend/src/hub/preview/WidgetPreview.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WidgetPreview } from "./WidgetPreview";
import type { WidgetConfig } from "../../lib/profile";

function makeWidget(type: string): WidgetConfig {
  return {
    id: "w1",
    type,
    enabled: true,
    updateHz: 30,
    position: { x: 0, y: 0, w: 400, h: 200 },
    props: {},
  };
}

vi.mock("../../overlay/shared-widget-map", () => ({
  WIDGET_COMPONENTS: {
    delta: () => <div data-testid="delta-mock">Delta</div>,
  },
}));

describe("WidgetPreview", () => {
  it("renders the real widget component scaled", () => {
    render(<WidgetPreview widget={makeWidget("delta")} scale={0.5} />);
    expect(screen.getByTestId("delta-mock")).toBeTruthy();
  });

  it("renders placeholder for unknown widget type", () => {
    render(<WidgetPreview widget={makeWidget("unknown")} scale={0.5} />);
    expect(screen.getByText("unknown")).toBeTruthy();
  });
});
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(hub): WidgetPreview component using real overlay widgets"
```

---

## Task A4: Build WidgetsPage with dirty state and undo

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx`
- Create: `vantare-v2/frontend/src/hub/pages/WidgetsPage.test.tsx`
- Verify: `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx` renders action buttons only when callbacks are provided.

- [ ] **Step 1: Verify PreviewInspector action buttons are guarded**

Before using `PreviewInspector` in `WidgetsPage`, confirm that `onDuplicate`, `onReset` and `onDelete` are optional and that their buttons are only rendered when the callbacks are passed. If not, modify `PreviewInspector.tsx` to make them conditional:

```typescript
<div className="grid grid-cols-3 gap-2 mt-4">
  {onDuplicate && (
    <button type="button" onClick={() => onDuplicate(selectedWidget)} className="...">Duplicar</button>
  )}
  {onReset && (
    <button type="button" onClick={() => onReset(selectedWidget)} className="...">Reset</button>
  )}
  {onDelete && (
    <button type="button" onClick={() => onDelete(selectedWidget.id)} className="...">Eliminar</button>
  )}
</div>
```

If this change is required, commit it separately as a fix to `PreviewInspector`.

- [ ] **Step 2: Implement WidgetsPage**

```typescript
import { useEffect, useMemo, useState, useCallback } from "react";
import { Events } from "@wailsio/runtime";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { WidgetPreview } from "../preview/WidgetPreview";
import { PreviewInspector } from "../preview/PreviewInspector";

export function WidgetsPage() {
  const [savedProfile, setSavedProfile] = useState<ProfileConfig | null>(null);
  const [workingProfile, setWorkingProfile] = useState<ProfileConfig | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = Events.On("hub:profile", (event: { data: { profile?: ProfileConfig } }) => {
      if (event.data.profile) {
        setSavedProfile(event.data.profile);
        setWorkingProfile(event.data.profile);
        setSelectedWidgetId((current) => current ?? event.data.profile?.widgets[0]?.id ?? null);
      }
    });
    Events.Emit("hub:profile:get");
    return () => unsub?.();
  }, []);

  const dirty = useMemo(() => {
    if (!savedProfile || !workingProfile) return false;
    return JSON.stringify(savedProfile) !== JSON.stringify(workingProfile);
  }, [savedProfile, workingProfile]);

  const selectedWidget = useMemo(
    () => workingProfile?.widgets.find((w) => w.id === selectedWidgetId) ?? workingProfile?.widgets[0],
    [workingProfile, selectedWidgetId],
  );

  const handleChangeProfile = useCallback((next: ProfileConfig) => {
    setWorkingProfile(next);
  }, []);

  const handleSave = useCallback(() => {
    if (!workingProfile) return;
    setSaving(true);
    Events.Emit("profile:save", { profile: workingProfile });
    window.setTimeout(() => setSaving(false), 300);
  }, [workingProfile]);

  const handleUndo = useCallback(() => {
    if (!savedProfile) return;
    setWorkingProfile(savedProfile);
    setSelectedWidgetId(savedProfile.widgets[0]?.id ?? null);
  }, [savedProfile]);

  if (!workingProfile) {
    return <div className="p-8 text-vantare-textMuted text-sm">Cargando perfil activo...</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-white mb-2">Widgets</h1>
          <p className="text-vantare-textMuted text-sm">
            Previsualiza y edita cada widget individualmente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs font-medium text-vantare-amber-400">Cambios sin guardar</span>
          )}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!dirty}
            className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="btn-primary px-5 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_340px] gap-6">
        <aside className="glass-panel rounded-xl p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white mb-3">Lista</h2>
          <div className="flex flex-col gap-2">
            {workingProfile.widgets.map((widget) => (
              <button
                key={widget.id}
                type="button"
                onClick={() => setSelectedWidgetId(widget.id)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  selectedWidget?.id === widget.id
                    ? "bg-vantare-red-950/40 border border-vantare-red-500/50 text-white"
                    : "bg-black/30 border border-white/5 text-vantare-textMuted hover:text-white"
                }`}
              >
                <span className="block font-semibold">{widget.id}</span>
                <span className="block font-mono text-[10px] text-vantare-textDim">{widget.type}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="glass-panel rounded-xl p-6 flex items-center justify-center min-h-[540px]">
          {selectedWidget ? (
            <WidgetPreview widget={selectedWidget} scale={0.5} />
          ) : (
            <div className="text-vantare-textMuted text-sm">Selecciona un widget</div>
          )}
        </div>

        <aside className="glass-panel rounded-xl p-4">
          {selectedWidget ? (
            <PreviewInspector
              profile={workingProfile}
              widget={selectedWidget}
              onChangeProfile={handleChangeProfile}
              disabled={false}
            />
          ) : (
            <div className="text-vantare-textMuted text-sm">Selecciona un widget para editar</div>
          )}
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add minimal test for WidgetsPage skeleton**

Create `vantare-v2/frontend/src/hub/pages/WidgetsPage.test.tsx`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WidgetsPage } from "./WidgetsPage";

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
}));

vi.mock("../preview/PreviewInspector", () => ({
  PreviewInspector: () => <div data-testid="inspector-mock">Inspector</div>,
}));

vi.mock("../preview/WidgetPreview", () => ({
  WidgetPreview: () => <div data-testid="preview-mock">Preview</div>,
}));

describe("WidgetsPage", () => {
  afterEach(() => cleanup());

  it("renders heading", () => {
    render(<WidgetsPage />);
    expect(screen.getByText("Widgets")).toBeTruthy();
  });
});
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(hub): WidgetsPage with per-widget preview, dirty state and undo"
```

---

## Task A5: Add widget enable toggles to ProfilesPage

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`
- Create: `vantare-v2/frontend/src/hub/pages/ProfilesPage.test.tsx`

- [ ] **Step 1: Add active profile subscription, selectedProfileId state and toggles**

Keep all existing `ProfilesPage` logic (create/delete/activate/list). Add the missing state and handlers:

```typescript
import type { ProfileConfig } from "../../lib/profile";

// inside ProfilesPage component, after existing state declarations:
const [activeProfile, setActiveProfile] = useState<ProfileConfig | null>(null);
const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

// inside useEffect, add:
const unsubActivated = Events.On("hub:profile", (event: { data: { profile?: ProfileConfig } }) => {
  if (event.data.profile) {
    setActiveProfile(event.data.profile);
    setSelectedProfileId(event.data.profile.id ?? null);
  }
});
Events.Emit("hub:profile:get");

// in cleanup:
unsubActivated?.();

// helper:
const handleToggleWidget = useCallback((widgetId: string, enabled: boolean) => {
  setActiveProfile((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, enabled } : w)),
    };
  });
  Events.Emit("profile:widget:update", { widgetId, enabled });
}, []);
```

Add to each profile card:

```typescript
const isSelected = selectedProfileId === p.id;
const isActive = activeProfile?.id === p.id;

// Buttons row (keep existing plus add):
<button
  type="button"
  onClick={() => setSelectedProfileId(isSelected ? null : p.id)}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-vantare-textMuted hover:text-white whitespace-nowrap"
>
  {isSelected ? "Ocultar" : "Widgets"}
</button>

// Expanded panel:
{isSelected && isActive && activeProfile && (
  <div className="mt-4 pt-4 border-t border-white/5">
    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Widgets habilitados</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {activeProfile.widgets.map((w) => (
        <label key={w.id} className="flex items-center gap-2 text-sm text-vantare-textMuted cursor-pointer">
          <input
            type="checkbox"
            checked={w.enabled}
            onChange={(e) => handleToggleWidget(w.id, e.target.checked)}
            className="accent-vantare-red-500"
          />
          <span>{w.id}</span>
          <span className="text-[10px] text-vantare-textDim font-mono">({w.type})</span>
        </label>
      ))}
    </div>
  </div>
)}

{isSelected && !isActive && (
  <div className="mt-4 pt-4 border-t border-white/5 text-xs text-vantare-textMuted">
    Activa este perfil para ver y configurar sus widgets.
  </div>
)}
```

- [ ] **Step 2: Add minimal test**

Create `vantare-v2/frontend/src/hub/pages/ProfilesPage.test.tsx`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProfilesPage } from "./ProfilesPage";

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
}));

describe("ProfilesPage", () => {
  afterEach(() => cleanup());

  it("renders heading", () => {
    render(<ProfilesPage />);
    expect(screen.getByText("Perfiles")).toBeTruthy();
  });
});
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(hub): ProfilesPage widget enable toggles for active profile"
```

---

## Task A6: Remove old preview files and PreviewPage route

**Files:**
- Delete: `vantare-v2/frontend/src/hub/pages/PreviewPage.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.test.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.test.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/WidgetList.tsx`
- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx`

- [ ] **Step 1: Delete files**

```bash
rm vantare-v2/frontend/src/hub/pages/PreviewPage.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewCanvas.test.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.test.tsx
rm vantare-v2/frontend/src/hub/preview/WidgetList.tsx
```

- [ ] **Step 2: Update HubApp to remove PreviewPage and finalize sections**

In `vantare-v2/frontend/src/hub/HubApp.tsx`:

1. Remove `PreviewPage` import.
2. Update `Section` type: `type Section = 'dashboard' | 'profiles' | 'widgets' | 'telemetry' | 'setup';`
3. Remove `onOpenPreview` prop usage from `ProfilesPage` (delete it from `ProfilesPageProps` too in Task A5).
4. Remove the `preview` route switch. Keep `widgets`.

```typescript
type Section = 'dashboard' | 'profiles' | 'widgets' | 'telemetry' | 'setup';

// imports:
import { DashboardPage } from './pages/DashboardPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { WidgetsPage } from './pages/WidgetsPage';
import { SettingsPage } from './pages/SettingsPage';

// render:
{section === "dashboard" && <DashboardPage />}
{section === "profiles" && <ProfilesPage />}
{section === "widgets" && <WidgetsPage />}
{section === "setup" && <SettingsPage />}
```

- [ ] **Step 3: Update Topbar to remove the old Preview/Overlays item**

In `vantare-v2/frontend/src/hub/components/Topbar.tsx`, remove the `preview` item and the dead `'live'` branch:

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: 'Hub', id: 'dashboard', active: true },
  { label: 'Perfiles', id: 'profiles' },
  { label: 'Widgets', id: 'widgets' },
  { label: 'Telemetría', id: 'telemetry' },
  { label: 'Setup', id: 'setup' },
];
```

```typescript
{NAV_ITEMS.map((item) => (
  <a
    key={item.id}
    href="#"
    onClick={handleNav(item.id)}
    className={`nav-item ${activeSection === item.id ? 'active text-vantare-text' : ''}`}
  >
    {item.label}
  </a>
))}
```

- [ ] **Step 4: Verify zero references to deleted files**

Search the codebase for:
- `PreviewPage`
- `PreviewCanvas`
- `PreviewWidgetFrame`
- `WidgetList`

Expected: no matches except CHANGELOG references.

Run: `pnpm --dir vantare-v2/frontend build`
Expected: succeeds.

Run: `pnpm --dir vantare-v2/frontend test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(hub): delete old Preview Workbench files"
```

---

## Task A7: Backend event stubs (minimal, no persistence yet)

**Files:**
- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Add no-op event handlers so the Hub events do not crash**

In `main.go`, add handlers for `hub:profile:get`, `profile:save`, and `profile:widget:update`. For Plan A they can be no-ops or log-only. Persistence comes in Plan C.

```go
wailsApp.Event.On("hub:profile:get", func(event *application.CustomEvent) {
	p := profileService.GetProfile()
	wailsApp.Event.Emit("hub:profile", map[string]any{"profile": p})
})

wailsApp.Event.On("profile:save", func(event *application.CustomEvent) {
	log.Printf("profile:save received (persistence in Plan C)")
})

wailsApp.Event.On("profile:widget:update", func(event *application.CustomEvent) {
	log.Printf("profile:widget:update received (persistence in Plan C)")
})
```

Run: `cd vantare-v2 && go test ./cmd/vantare/...`
Expected: passes.

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(events): add Hub profile event stubs"
```

---

## Task A8: Version bump and release

- [ ] **Step 1: Update version strings**

Update:
- `vantare-v2/cmd/vantare/main.go` to `"v0.3.0-alpha.1"`
- `vantare-v2/build/config.yml` to `0.3.0`
- `vantare-v2/build/windows/nsis/project.nsi` to `0.3.0`

- [ ] **Step 2: Update CHANGELOG.md**

Add entry at the top for v0.3.0-alpha.1 describing the new Hub pages and deleted old preview.

- [ ] **Step 3: Full verification**

```bash
cd vantare-v2 && go test ./...
pnpm --dir vantare-v2/frontend test
pnpm --dir vantare-v2/frontend build
cd vantare-v2 && wails3 build -tags release
cmd.exe /C "C:\Users\isaac\AppData\Local\Temp\vantare-build-nsis.bat"
sha256sum vantare-v2/bin/vantare-amd64-installer.exe
```

Expected: all green.

- [ ] **Step 4: Commit, tag, push and release**

```bash
git add -A
git commit -m "release: v0.3.0-alpha.1 Hub refactor"
git tag -a v0.3.0-alpha.1 -m "v0.3.0-alpha.1"
git push origin master
git push origin v0.3.0-alpha.1
gh release create v0.3.0-alpha.1 vantare-v2/bin/vantare-amd64-installer.exe --repo isaacalbala12/Vantare-Overlays --title "v0.3.0-alpha.1" --notes-file "docs/superpowers/plans/v0.3.0-alpha.1-release-notes.md" --prerelease
```

---

## Self-review

**Spec coverage:**
- Per-widget WYSIWYG preview → Tasks A3, A4.
- Profiles page with activation + toggles → Task A5.
- Dirty state + single undo → Task A4.
- No trace of old canvas → Task A6 (deferred until new pages work).
- Keep app compiling between tasks → verified at each step.

**Placeholder scan:** no TBD/TODO. All steps have code and commands.

**Type consistency:**
- `Section` type updated once at the end.
- Event names `hub:profile`, `hub:profile:get`, `profile:save`, `profile:widget:update` used consistently.
- `ProfileConfig` and `WidgetConfig` from existing `lib/profile.ts`.

**Known limitations intentionally deferred to Plan C:**
- `profile:save` and `profile:widget:update` are stubbed; they log but do not persist. That is correct for Plan A.
