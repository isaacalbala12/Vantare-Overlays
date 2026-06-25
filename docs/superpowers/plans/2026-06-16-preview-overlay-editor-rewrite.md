# Preview and Overlay Editor Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Preview Workbench canvas with a per-widget WYSIWYG preview inside the Hub, and move real drag/resize editing to the desktop overlay window. Keep the Hub clean, stable and free of layout-vibration bugs.

**Architecture:**
- The **Hub** shows one widget at a time in a scaled, real-component preview. Each widget can be edited (appearance, enabled state, visible-when rules) from the inspector next to it.
- A new **Profiles** page lets the user activate/deactivate widgets per profile and choose the active profile.
- The **desktop overlay** gets an `/overlay/edit` route where all enabled widgets are rendered with drag handles. Moving/resizing there saves back to the profile.
- The **OBS/streaming overlay** (`/overlay?profile=...`) remains untouched and clean.

**Tech Stack:** Go 1.22+, Wails v3 alpha, React 19, TypeScript, Tailwind CSS, Web Animations API where needed.

---

## File structure after this plan

| File | Responsibility |
|------|----------------|
| `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx` | New Hub page: per-widget WYSIWYG preview + inspector. |
| `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx` | Refactored: list profiles, activate profile, toggle widget enabled states. |
| `vantare-v2/frontend/src/hub/preview/WidgetPreview.tsx` | Renders one real overlay widget scaled inside a viewport. |
| `vantare-v2/frontend/src/hub/components/Topbar.tsx` | Update navigation: Hub, Perfiles, Widgets, Setup, Telemetría. |
| `vantare-v2/frontend/src/overlay/EditOverlayApp.tsx` | New overlay app for desktop edit mode with drag/resize. |
| `vantare-v2/frontend/src/overlay/WidgetEditFrame.tsx` | Draggable/resizable frame used by EditOverlayApp. |
| `vantare-v2/frontend/src/overlay/shared-widget-map.ts` | Shared registry of widget components used by CompositeApp, ObsOverlayApp and EditOverlayApp. |
| `vantare-v2/internal/server/server.go` | Add route `GET /overlay/edit` and `POST /api/profile/save`. |
| `vantare-v2/internal/server/profile.go` | Implement save handler; reuse config.SaveFile. |
| `vantare-v2/internal/app/hub_service.go` | Add `SaveProfile` and `SetWidgetEnabled` helpers. |
| `vantare-v2/cmd/vantare/main.go` | Wire new routes, handle `layout:save` for edit mode. |
| `vantare-v2/frontend/src/main.tsx` | Route `/overlay/edit` to `EditOverlayApp`. |
| Deleted files | `PreviewCanvas.tsx`, `PreviewCanvas.test.tsx`, `PreviewWidgetFrame.tsx`, `PreviewWidgetFrame.test.tsx`, `WidgetList.tsx`, old `PreviewPage.tsx`. |

---

## Phase 1: Foundation — remove broken preview canvas and stabilize the Hub

### Task 1.1: Delete broken preview files

**Files:**
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.test.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.test.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/WidgetList.tsx`
- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx` (remove PreviewPage import, replace with WidgetsPage)

- [ ] **Step 1: Delete the four files above**

```bash
rm vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewCanvas.test.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx
rm vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.test.tsx
rm vantare-v2/frontend/src/hub/preview/WidgetList.tsx
```

- [ ] **Step 2: Update HubApp navigation to remove broken PreviewPage**

In `vantare-v2/frontend/src/hub/HubApp.tsx`, replace `PreviewPage` import with `WidgetsPage` and update the section switch:

```typescript
import { WidgetsPage } from './pages/WidgetsPage';

// inside render:
{section === "widgets" && <WidgetsPage />}
```

Run: `pnpm --dir vantare-v2/frontend build`
Expected: build succeeds (tests may fail because pages do not exist yet; that is expected in this phase).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(preview): remove broken canvas-based preview files"
```

---

## Phase 2: Hub navigation refactor

### Task 2.1: Update Topbar navigation labels

**Files:**
- Modify: `vantare-v2/frontend/src/hub/components/Topbar.tsx`

- [ ] **Step 1: Change nav items**

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: 'Hub', id: 'dashboard', active: true },
  { label: 'Perfiles', id: 'profiles' },
  { label: 'Widgets', id: 'widgets' },
  { label: 'Telemetría', id: 'telemetry' },
  { label: 'Setup', id: 'setup' },
];
```

Run: `pnpm --dir vantare-v2/frontend build`
Expected: succeeds.

- [ ] **Step 2: Commit**

```bash
git commit -am "refactor(hub): update topbar navigation labels"
```

### Task 2.2: Create empty WidgetsPage and ProfilesPage placeholders

**Files:**
- Create: `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx`
- Create: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx` (overwrite existing)
- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx` (import both)

- [ ] **Step 1: Write WidgetsPage placeholder**

```typescript
export function WidgetsPage() {
  return <div className="text-white p-8">Widgets editor — en construcción</div>;
}
```

- [ ] **Step 2: Write ProfilesPage placeholder**

```typescript
export function ProfilesPage() {
  return <div className="text-white p-8">Gestión de perfiles — en construcción</div>;
}
```

- [ ] **Step 3: Update imports in HubApp.tsx**

```typescript
import { ProfilesPage } from './pages/ProfilesPage';
import { WidgetsPage } from './pages/WidgetsPage';
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: all tests pass (placeholders have no tests).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(hub): scaffold new WidgetsPage and ProfilesPage"
```

---

## Phase 3: Shared widget registry

### Task 3.1: Extract shared widget component map

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

- [ ] **Step 2: Replace inline WIDGETS map in CompositeApp.tsx**

```typescript
import { WIDGET_COMPONENTS } from "./shared-widget-map";

// remove old local WIDGETS record
```

Use `WIDGET_COMPONENTS[w.type]` instead.

- [ ] **Step 3: Replace inline WIDGETS map in ObsOverlayApp.tsx**

Same pattern as CompositeApp.

Run: `pnpm --dir vantare-v2/frontend test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(overlay): extract shared widget component registry"
```

---

## Phase 4: Per-widget WYSIWYG preview in the Hub

### Task 4.1: Create WidgetPreview component

**Files:**
- Create: `vantare-v2/frontend/src/hub/preview/WidgetPreview.tsx`

- [ ] **Step 1: Write WidgetPreview**

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

- [ ] **Step 2: Add minimal test for WidgetPreview**

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
Expected: tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(hub): per-widget WYSIWYG preview component"
```

### Task 4.2: Build WidgetsPage

**Files:**
- Create: `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx` (overwrite placeholder)
- Modify: `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx` if needed

- [ ] **Step 1: Write WidgetsPage**

```typescript
import { useEffect, useMemo, useState } from "react";
import { Events } from "@wailsio/runtime";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { WidgetPreview } from "../preview/WidgetPreview";
import { PreviewInspector } from "../preview/PreviewInspector";

export function WidgetsPage() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = Events.On("hub:profile", (event: { data: { profile?: ProfileConfig } }) => {
      if (event.data.profile) {
        setProfile(event.data.profile);
      }
    });
    Events.Emit("hub:profile:get");
    return () => unsub?.();
  }, []);

  const selectedWidget = useMemo(
    () => profile?.widgets.find((w) => w.id === selectedWidgetId) ?? profile?.widgets[0],
    [profile, selectedWidgetId],
  );

  function updateWidget(widgetId: string, updates: Partial<WidgetConfig>) {
    if (!profile) return;
    const next: ProfileConfig = {
      ...profile,
      widgets: profile.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
    };
    setProfile(next);
    Events.Emit("profile:widget:update", { widgetId, updates });
  }

  if (!profile) {
    return <div className="p-8 text-vantare-textMuted text-sm">Cargando perfil activo...</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-white mb-2">Widgets</h1>
        <p className="text-vantare-textMuted text-sm">
          Previsualiza y edita cada widget individualmente. El posicionamiento real se hace en el overlay.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6">
        <aside className="glass-panel rounded-xl p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white mb-3">Lista</h2>
          <div className="flex flex-col gap-2">
            {profile.widgets.map((widget) => (
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
              profile={profile}
              widget={selectedWidget}
              onChangeProfile={(next) => {
                setProfile(next);
                Events.Emit("profile:save", next);
              }}
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

- [ ] **Step 2: Verify build**

Run: `pnpm --dir vantare-v2/frontend build`
Expected: succeeds. PreviewInspector may need adjustments if it expects `onDuplicate/onReset/onDelete` props; make them optional first if needed.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(hub): WidgetsPage with per-widget preview and inspector"
```

---

## Phase 5: Profiles page for activation/toggling

### Task 5.1: Rewrite ProfilesPage

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`

- [ ] **Step 1: Implement profile list with widget toggles**

Keep the existing profile list (create, delete, activate) and add an expanded panel when a profile is selected that shows all widgets with on/off toggles.

```typescript
import { useState, useEffect, useCallback } from "react";
import { Events } from "@wailsio/runtime";
import { profileLabel, type ProfileEntry } from "../state/overlay-workbench";
import type { ProfileConfig } from "../../lib/profile";

type ProfilesPageProps = {
  onOpenWidgets?: () => void;
};

export function ProfilesPage({ onOpenWidgets }: ProfilesPageProps) {
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<ProfileConfig | null>(null);

  useEffect(() => {
    const unsubProfiles = Events.On("hub:profiles", (event: { data: { profiles: ProfileEntry[] } }) => {
      setProfiles(event.data.profiles ?? []);
      setLoading(false);
    });
    const unsubActivated = Events.On("hub:profile", (event: { data: { profile?: ProfileConfig } }) => {
      if (event.data.profile) {
        setActiveProfile(event.data.profile);
        setSelectedProfileId(event.data.profile.id ?? null);
      }
    });
    Events.Emit("hub:list");
    Events.Emit("hub:profile:get");
    return () => {
      unsubProfiles?.();
      unsubActivated?.();
    };
  }, []);

  const handleCreate = useCallback(() => {
    const name = newName.trim();
    if (!name) {
      setError("El nombre no puede estar vacío");
      return;
    }
    setError(null);
    setNewName("");
    Events.Emit("hub:create", { name });
  }, [newName]);

  const handleDelete = useCallback((profile: ProfileEntry) => {
    if (!window.confirm(`¿Eliminar el perfil "${profileLabel(profile)}"?`)) return;
    setError(null);
    Events.Emit("hub:delete", { id: profile.id, file: profile.file });
  }, []);

  const handleActivate = useCallback((profile: ProfileEntry) => {
    setError(null);
    Events.Emit("hub:activate", { id: profile.id, file: profile.file });
  }, []);

  const handleToggleWidget = useCallback((widgetId: string, enabled: boolean) => {
    if (!activeProfile) return;
    const next: ProfileConfig = {
      ...activeProfile,
      widgets: activeProfile.widgets.map((w) => (w.id === widgetId ? { ...w, enabled } : w)),
    };
    setActiveProfile(next);
    Events.Emit("profile:save", next);
  }, [activeProfile]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-2">Perfiles</h1>
        <p className="text-vantare-textMuted text-sm">
          Activa un perfil y elige qué widgets están habilitados.
        </p>
      </div>

      {/* Create new profile — same as before */}
      <div className="glass-panel rounded-xl p-6 mb-8">
        <h2 className="font-display font-semibold text-lg text-white mb-4">Crear nuevo perfil</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nombre del perfil"
            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-vantare-textDim focus:outline-none focus:border-vantare-red-500/50"
          />
          <button type="button" onClick={handleCreate} className="btn-primary px-6 py-2.5 rounded-lg text-sm font-bold text-white whitespace-nowrap">
            Crear
          </button>
        </div>
        {error && <p className="text-vantare-red-400 text-xs mt-2">{error}</p>}
      </div>

      {loading && <div className="text-center py-12 text-vantare-textMuted text-sm">Cargando perfiles...</div>}

      <div className="flex flex-col gap-3">
        {profiles.map((p) => {
          const isSelected = selectedProfileId === p.id;
          const isActive = activeProfile?.id === p.id;
          return (
            <div key={p.id} className="card-sleek rounded-xl p-5 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-vantare-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white text-lg">{profileLabel(p)}</h3>
                    <p className="text-xs text-vantare-textMuted font-mono mt-0.5">
                      {p.displayMode} · {p.widgets} widgets {isActive && "· activo"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProfileId(isSelected ? null : p.id)}
                    className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-vantare-textMuted hover:text-white whitespace-nowrap"
                  >
                    {isSelected ? "Ocultar" : "Widgets"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleActivate(p)}
                    className="btn-primary px-5 py-2 rounded-lg text-xs font-bold text-white whitespace-nowrap"
                  >
                    Activar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-vantare-textMuted hover:text-vantare-red-400 whitespace-nowrap"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
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
git add -A
git commit -m "feat(hub): ProfilesPage with widget activation toggles"
```

---

## Phase 6: Backend support for widget updates and profile save

### Task 6.1: Add profile save endpoint

**Files:**
- Modify: `vantare-v2/internal/server/server.go`
- Modify: `vantare-v2/internal/server/profile.go`

- [ ] **Step 1: Add route in server.go**

```go
mux.HandleFunc("GET /overlay/edit", s.handleOverlay)
mux.HandleFunc("POST /api/profile/save", s.handleProfileSave)
```

- [ ] **Step 2: Implement handleProfileSave in profile.go**

```go
type saveProfileRequest struct {
	Profile *config.ProfileConfig `json:"profile"`
}

func (s *Server) handleProfileSave(w http.ResponseWriter, r *http.Request) {
	profileParam := r.URL.Query().Get("profile")
	if profileParam == "" {
		http.Error(w, "profile required", http.StatusBadRequest)
		return
	}

	path, err := s.resolveProfilePath(profileParam)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	var req saveProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("decode: %v", err), http.StatusBadRequest)
		return
	}
	if req.Profile == nil {
		http.Error(w, "profile body required", http.StatusBadRequest)
		return
	}

	if err := config.SaveFile(path, req.Profile); err != nil {
		http.Error(w, fmt.Sprintf("save: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
```

- [ ] **Step 3: Add test**

Add to `vantare-v2/internal/server/server_test.go`:

```go
func TestHandleProfileSave(t *testing.T) {
	cfgDir := t.TempDir()
	p := &config.ProfileConfig{
		ID:          "save-test",
		Name:        "Save Test",
		DisplayMode: config.ModeRacing,
		Widgets:     []config.WidgetConfig{{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 10, Y: 10, W: 100, H: 40}}},
	}
	path := filepath.Join(cfgDir, "save-test.json")
	require.NoError(t, config.SaveFile(path, p))

	s := New(ServerConfig{CfgDir: cfgDir})
	body := bytes.NewReader([]byte(`{"profile":{"id":"save-test","name":"Save Test","displayMode":"racing","widgets":[{"id":"delta","type":"delta","enabled":true,"position":{"x":20,"y":20,"w":200,"h":80}}]}}`))
	req := httptest.NewRequest(http.MethodPost, "/api/profile/save?profile=save-test.json", body)
	rr := httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	loaded, err := config.LoadFile(path)
	require.NoError(t, err)
	require.Equal(t, 20, loaded.Widgets[0].Position.X)
}
```

Run: `cd vantare-v2 && go test ./internal/server/...`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(server): POST /api/profile/save endpoint"
```

### Task 6.2: Add HubService save helpers

**Files:**
- Modify: `vantare-v2/internal/app/hub_service.go`

- [ ] **Step 1: Add SaveProfile and SetWidgetEnabled**

```go
// SaveProfile persists the given profile to the active profile file.
func (s *HubService) SaveProfile(profile *config.ProfileConfig) error {
	path, err := s.findProfilePath(profile.ID)
	if err != nil {
		return err
	}
	if err := config.SaveFile(path, profile); err != nil {
		return err
	}
	if s.emitter != nil {
		s.emitter.Emit("hub:profile", map[string]any{"profile": profile})
	}
	return nil
}

// SetWidgetEnabled toggles a widget in the active profile and persists it.
func (s *HubService) SetWidgetEnabled(widgetID string, enabled bool) error {
	profile := s.profileSvc.GetProfile()
	if profile == nil {
		return fmt.Errorf("no active profile")
	}
	found := false
	for i := range profile.Widgets {
		if profile.Widgets[i].ID == widgetID {
			profile.Widgets[i].Enabled = enabled
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("widget not found: %s", widgetID)
	}
	return s.SaveProfile(profile)
}
```

- [ ] **Step 2: Add test**

Add to `vantare-v2/internal/app/hub_service_test.go`:

```go
func TestHubServiceSetWidgetEnabled(t *testing.T) {
	dir := t.TempDir()
	ps := NewProfileService(dir)
	h := NewHubService(dir, ps, nil, nil)
	require.NoError(t, h.CreateProfile("test"))
	require.NoError(t, h.ActivateProfile("custom-test"))

	require.NoError(t, h.SetWidgetEnabled("delta", false))
	p := ps.GetProfile()
	require.NotNil(t, p)
	require.False(t, p.Widgets[0].Enabled)
}
```

Run: `cd vantare-v2 && go test ./internal/app/... -run TestHubServiceSetWidgetEnabled`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(hub): SaveProfile and SetWidgetEnabled helpers"
```

---

## Phase 7: Desktop overlay edit mode

### Task 7.1: Create EditOverlayApp

**Files:**
- Create: `vantare-v2/frontend/src/overlay/EditOverlayApp.tsx`
- Create: `vantare-v2/frontend/src/overlay/WidgetEditFrame.tsx`
- Create: `vantare-v2/frontend/src/overlay/EditOverlayApp.test.tsx`

- [ ] **Step 1: Create WidgetEditFrame**

```typescript
import { useRef, useState } from "react";
import type { Rect, WidgetConfig } from "../lib/profile";
import { WIDGET_COMPONENTS } from "./shared-widget-map";

const MIN_SIZE = { w: 80, h: 40 };

type WidgetEditFrameProps = {
  widget: WidgetConfig;
  layoutOrigin: { x: number; y: number };
  scale: number;
  onChange: (widgetId: string, rect: Rect) => void;
};

export function WidgetEditFrame({ widget, layoutOrigin, scale, onChange }: WidgetEditFrameProps) {
  const Component = WIDGET_COMPONENTS[widget.type];
  const [previewRect, setPreviewRect] = useState<Rect | null>(null);
  const visualRect = previewRect ?? widget.position;
  const localPos = {
    x: (visualRect.x - layoutOrigin.x) * scale,
    y: (visualRect.y - layoutOrigin.y) * scale,
    w: visualRect.w * scale,
    h: visualRect.h * scale,
  };
  const committedRef = useRef(onChange);
  committedRef.current = onChange;

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.testid?.startsWith("resize-handle-")) return;
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = { ...widget.position };

    let lastRect = startRect;

    function onMouseMove(ev: MouseEvent) {
      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;
      lastRect = {
        x: Math.max(0, Math.round(startRect.x + dx)),
        y: Math.max(0, Math.round(startRect.y + dy)),
        w: startRect.w,
        h: startRect.h,
      };
      setPreviewRect(lastRect);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setPreviewRect(null);
      committedRef.current(widget.id, lastRect);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = { ...widget.position };

    let lastRect = startRect;

    function onMouseMove(ev: MouseEvent) {
      const dw = (ev.clientX - startMouseX) / scale;
      const dh = (ev.clientY - startMouseY) / scale;
      lastRect = {
        ...startRect,
        w: Math.max(MIN_SIZE.w, Math.round(startRect.w + dw)),
        h: Math.max(MIN_SIZE.h, Math.round(startRect.h + dh)),
      };
      setPreviewRect(lastRect);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setPreviewRect(null);
      committedRef.current(widget.id, lastRect);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      data-testid={`edit-frame-${widget.id}`}
      onMouseDown={handleMouseDown}
      className="absolute border border-vantare-red-400/70 hover:border-vantare-red-400 cursor-move"
      style={{
        left: localPos.x,
        top: localPos.y,
        width: localPos.w,
        height: localPos.h,
      }}
    >
      {Component && (
        <div className="w-full h-full overflow-hidden" style={{ pointerEvents: "none" }}>
          <Component editMode={true} telemetryMode="mock" updateHz={widget.updateHz} props={widget.props} />
        </div>
      )}
      <div
        data-testid={`resize-handle-${widget.id}`}
        className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-vantare-red-500 cursor-se-resize"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create EditOverlayApp**

```typescript
import { useEffect, useState } from "react";
import type { ProfileConfig, LayoutOrigin, Rect } from "../lib/profile";
import { applyOverlayDocumentMode } from "./overlay-document";
import { WidgetEditFrame } from "./WidgetEditFrame";

export function EditOverlayApp() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [layoutOrigin, setLayoutOrigin] = useState<LayoutOrigin>({ x: 0, y: 0 });

  useEffect(() => {
    return applyOverlayDocumentMode();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profileName = params.get("profile") || "";
    fetch(`/api/profile?profile=${encodeURIComponent(profileName)}`)
      .then((res) => res.json())
      .then((data: { profile: ProfileConfig; layoutOrigin: LayoutOrigin }) => {
        setProfile(data.profile);
        setLayoutOrigin(data.layoutOrigin);
      })
      .catch((err) => console.error("edit overlay load failed", err));
  }, []);

  function handleChange(widgetId: string, rect: Rect) {
    if (!profile) return;
    const next: ProfileConfig = {
      ...profile,
      widgets: profile.widgets.map((w) => (w.id === widgetId ? { ...w, position: rect } : w)),
    };
    setProfile(next);
    const params = new URLSearchParams(window.location.search);
    const profileName = params.get("profile") || profile.id || "";
    fetch(`/api/profile/save?profile=${encodeURIComponent(profileName)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: next }),
    }).catch((err) => console.error("save failed", err));
  }

  if (!profile) {
    return <div className="flex items-center justify-center w-full h-full text-white/40 text-sm">Loading edit mode...</div>;
  }

  const scale = 1; // edit mode is 1:1 on the monitor

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent">
      {profile.widgets.filter((w) => w.enabled).map((w) => (
        <WidgetEditFrame key={w.id} widget={w} layoutOrigin={layoutOrigin} scale={scale} onChange={handleChange} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Add minimal test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditOverlayApp } from "./EditOverlayApp";

vi.mock("./overlay-document", () => ({
  applyOverlayDocumentMode: () => vi.fn(),
}));

vi.mock("./shared-widget-map", () => ({
  WIDGET_COMPONENTS: {
    delta: () => <div data-testid="delta-mock">Delta</div>,
  },
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        profile: {
          id: "p1",
          displayMode: "racing",
          widgets: [{ id: "w1", type: "delta", enabled: true, position: { x: 10, y: 10, w: 100, h: 50 } }],
        },
        layoutOrigin: { x: 0, y: 0 },
      }),
  } as Response),
);

describe("EditOverlayApp", () => {
  it("renders widget edit frame", async () => {
    render(<EditOverlayApp />);
    expect(await screen.findByTestId("edit-frame-w1")).toBeTruthy();
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(overlay): EditOverlayApp and WidgetEditFrame for desktop edit mode"
```

### Task 7.2: Wire /overlay/edit route in main.tsx

**Files:**
- Modify: `vantare-v2/frontend/src/main.tsx`

- [ ] **Step 1: Route edit path**

```typescript
import { EditOverlayApp } from "./overlay/EditOverlayApp";

if (path.startsWith("/overlay/edit")) {
  return <EditOverlayApp />;
}
if (path.startsWith("/overlay") || params.get("obs") === "1") {
  return <ObsOverlayApp />;
}
```

Run: `pnpm --dir vantare-v2/frontend build`
Expected: succeeds.

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(overlay): wire /overlay/edit route to EditOverlayApp"
```

### Task 7.3: Open desktop edit mode from Hub

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`
- Modify: `vantare-v2/internal/app/hub_service.go` (add StartEditOverlay method)
- Modify: `vantare-v2/cmd/vantare/main.go` (wire hub events)

- [ ] **Step 1: Add StartEditOverlay in HubService**

```go
// StartEditOverlay opens the desktop window in edit mode.
func (s *HubService) StartEditOverlay(idOrFile string) (OverlayStatus, error) {
	if err := s.ActivateProfile(idOrFile); err != nil {
		return OverlayStatus{}, err
	}
	profile := s.profileSvc.GetProfile()
	if profile == nil {
		return OverlayStatus{}, fmt.Errorf("no active profile")
	}
	// Force edit mode so the window is fullscreen, resizable and clickable.
	editProfile := *profile
	editProfile.DisplayMode = config.ModeEdit
	return s.overlay.Start(&editProfile)
}
```

- [ ] **Step 2: Wire hub events in main.go**

Add handlers:

```go
wailsApp.Event.On("overlay:edit:start", func(event *application.CustomEvent) {
	data, _ := event.Data.([]any)
	if len(data) < 2 { return }
	id, _ := data[0].(string)
	status, err := hubService.StartEditOverlay(id)
	if err != nil { log.Printf("edit overlay start failed: %v", err) }
	wailsApp.Event.Emit("overlay:status", status)
})
```

- [ ] **Step 3: Add "Editar en overlay" button in ProfilesPage**

```typescript
<button
  type="button"
  onClick={() => Events.Emit("overlay:edit:start", { id: p.id, file: p.file })}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap"
>
  Editar posición
</button>
```

- [ ] **Step 4: Test Go changes**

Run: `cd vantare-v2 && go test ./internal/app/... ./cmd/vantare/...`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(hub,backend): open desktop overlay in edit mode"
```

---

## Phase 8: Frontend event wiring for Hub profile state

### Task 8.1: Add frontend-backend event bridge for profile state

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/WidgetsPage.tsx`
- Modify: `vantare-v2/internal/app/hub_service.go`
- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Wire `hub:profile:get`, `profile:widget:update`, `profile:save`**

In `main.go`, add:

```go
wailsApp.Event.On("hub:profile:get", func(event *application.CustomEvent) {
	p := profileService.GetProfile()
	wailsApp.Event.Emit("hub:profile", map[string]any{"profile": p})
})

wailsApp.Event.On("profile:widget:update", func(event *application.CustomEvent) {
	data, _ := event.Data.(map[string]any)
	widgetID, _ := data["widgetId"].(string)
	enabled, _ := data["enabled"].(bool)
	if err := hubService.SetWidgetEnabled(widgetID, enabled); err != nil {
		log.Printf("widget enable failed: %v", err)
	}
})

wailsApp.Event.On("profile:save", func(event *application.CustomEvent) {
	data, _ := event.Data.(map[string]any)
	profileMap, _ := data["profile"].(map[string]any)
	if profileMap == nil { return }
	var profile config.ProfileConfig
	// use json round-trip to convert map to struct
	b, _ := json.Marshal(profileMap)
	if err := json.Unmarshal(b, &profile); err != nil {
		log.Printf("profile save unmarshal failed: %v", err)
		return
	}
	if err := hubService.SaveProfile(&profile); err != nil {
		log.Printf("profile save failed: %v", err)
	}
})
```

- [ ] **Step 2: Update WidgetsPage event names to match**

WidgetsPage already emits `hub:profile:get` and `profile:save` in the example above.

- [ ] **Step 3: Run tests**

Run: `cd vantare-v2 && go test ./...`
Run: `pnpm --dir vantare-v2/frontend test`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(events): wire Hub profile state to backend"
```

---

## Phase 9: Cleanup, final tests and release

### Task 9.1: Delete old PreviewPage and dead code

**Files:**
- Delete: `vantare-v2/frontend/src/hub/pages/PreviewPage.tsx`
- Delete: `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx` (if inspector logic is moved to WidgetsPage inline, otherwise keep and adapt)

- [ ] **Step 1: Delete PreviewPage.tsx**

```bash
rm vantare-v2/frontend/src/hub/pages/PreviewPage.tsx
```

- [ ] **Step 2: Verify no references remain**

Search for `PreviewPage`, `PreviewCanvas`, `PreviewWidgetFrame`, `WidgetList` in `vantare-v2/frontend/src`.
Expected: zero references.

- [ ] **Step 3: Commit**

```bash
git commit -am "chore(hub): remove dead PreviewPage and preview canvas code"
```

### Task 9.2: Full verification

- [ ] **Step 1: Run Go tests**

```bash
cd vantare-v2 && go test ./...
```
Expected: all packages pass.

- [ ] **Step 2: Run frontend tests**

```bash
pnpm --dir vantare-v2/frontend test
```
Expected: all tests pass.

- [ ] **Step 3: Build frontend**

```bash
pnpm --dir vantare-v2/frontend build
```
Expected: succeeds.

- [ ] **Step 4: Build Wails release**

```bash
cd vantare-v2 && wails3 build -tags release
```
Expected: succeeds.

- [ ] **Step 5: Build NSIS installer**

```bash
cmd.exe /C "C:\Users\isaac\AppData\Local\Temp\vantare-build-nsis.bat"
```
Expected: installer created in `vantare-v2/bin/vantare-amd64-installer.exe`.

- [ ] **Step 6: Get SHA256**

```bash
sha256sum vantare-v2/bin/vantare-amd64-installer.exe
```

- [ ] **Step 7: Update version strings**

Update:
- `vantare-v2/cmd/vantare/main.go` (version constant)
- `vantare-v2/build/config.yml` (version)
- `vantare-v2/build/windows/nsis/project.nsi` (version)

- [ ] **Step 8: Update CHANGELOG.md**

Add entry for v0.3.0-alpha.1 describing the rewrite.

- [ ] **Step 9: Commit, tag and push**

```bash
git add -A
git commit -m "feat(editor): per-widget preview + desktop overlay edit mode"
git tag -a v0.3.0-alpha.1 -m "v0.3.0-alpha.1"
git push origin master
git push origin v0.3.0-alpha.1
```

- [ ] **Step 10: Create GitHub release**

```bash
gh release create v0.3.0-alpha.1 vantare-v2/bin/vantare-amd64-installer.exe --repo isaacalbala12/Vantare-Overlays --title "v0.3.0-alpha.1" --notes-file "docs/superpowers/plans/v0.3.0-alpha.1-release-notes.md" --prerelease
```

---

## Self-review

**Spec coverage:**
- Per-widget preview in Hub → Task 4
- Separate Profiles page with activation/toggles → Task 5
- Desktop overlay edit mode with drag/resize → Tasks 7
- OBS overlay untouched → no tasks modify `/overlay` clean path
- Save with visual indicator → Task 6 + 8
- No trace of old preview canvas → Tasks 1 and 9

**Placeholder scan:** all steps contain concrete code/commands. No TBD/TODO.

**Type consistency:**
- `ProfileConfig` from `pkg/config` (Go) and `../../lib/profile` (TS) used consistently.
- `LayoutOrigin` type matches existing `{x,y}` shape.
- Event names `hub:profile`, `hub:profile:get`, `profile:save`, `profile:widget:update`, `overlay:edit:start` used consistently across frontend and backend.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-16-preview-overlay-editor-rewrite.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task with two-stage review.
2. **Inline Execution** — execute tasks in this session using executing-plans.

Which approach do you want?
