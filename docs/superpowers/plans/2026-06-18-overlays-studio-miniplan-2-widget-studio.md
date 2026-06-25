# Overlays Studio Miniplan 2 — Widget Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Overlays Studio > Mis perfiles > Widgets` open a real widget configuration view where the user can select existing widget types and edit appearance/behavior settings without touching profile layout placement.

**Architecture:** Build a Hub-only Widget Studio view under the existing `OverlaysStudioPage`. Reuse the current active profile as the persistence target for this miniplan, because global widget defaults do not exist yet. Extract reusable state from `OverlaysStudioPage` just enough to load profiles, activate a profile, edit widget fields, autosave via existing `layout:save`, and return to the library.

**Tech Stack:** React 19, TypeScript, Wails v3 events, Tailwind CSS v4, Vitest, Testing Library.

---

## Scope

In scope:

- `Widgets` button opens a real `WidgetStudio` view.
- Widget Studio lists only existing widget types found in the active profile:
  - `delta`
  - `relative`
  - `standings`
  - `telemetry`
  - `telemetry-vertical`
  - `pedals`
- User can select a widget.
- User can edit existing widget fields already supported by profile schema:
  - `name`
  - `enabled`
  - `updateHz`
  - `style`
  - `props.appearance`
  - `visibleWhen`
- User can save manually.
- Autosave continues to work through the existing `layout:save` event.
- `Ctrl+S`, `Ctrl+Z`, and `Ctrl+Y` work inside Widget Studio.
- Widget Studio uses a three-pane layout inspired by `overlays_mockup.html`:
  - left widget list
  - center widget preview/details panel
  - right settings inspector
- If no active profile is loaded, Widget Studio shows a clear message asking the user to select or create a profile.

Out of scope:

- Editing widget placement on the 1920x1080 profile canvas.
- Opening `Perfiles específicos`.
- `/overlay/edit`.
- New backend events.
- Global widget defaults independent from profiles.
- New widget types.
- Saving Vantare recommended presets as own profiles.
- OBS validation.

---

## Important Product Note

This miniplan edits widget configuration on the currently active profile. It does **not** create a separate global widget-template system yet. The UI copy must say this clearly:

```text
Estos cambios se guardan en el perfil activo. La colocación de widgets se editará en Perfiles específicos.
```

This keeps the code small and avoids inventing persistence that the backend does not currently support.

---

## File Structure After This Miniplan

| File | Responsibility |
|---|---|
| `frontend/src/hub/overlays/useOverlayStudioState.ts` | Shared profile/widget state, profile loading, dirty state, autosave, save, undo/redo, Wails event subscriptions. |
| `frontend/src/hub/overlays/useOverlayStudioState.test.tsx` | Hook tests for load, dirty state, save event, undo/redo, and active profile request. |
| `frontend/src/hub/overlays/WidgetStudio.tsx` | Main Widget Studio three-pane view. |
| `frontend/src/hub/overlays/WidgetStudio.test.tsx` | UI tests for rendering, selecting widgets, save button, and no-profile empty state. |
| `frontend/src/hub/overlays/StudioWidgetList.tsx` | Reusable left-side widget list with `Todos` / `Activos` filters and search. |
| `frontend/src/hub/overlays/StudioWidgetList.test.tsx` | Tests for search/filter/selection behavior. |
| `frontend/src/hub/overlays/WidgetPreviewPanel.tsx` | Center panel with selected widget summary and compact preview placeholder. |
| `frontend/src/hub/overlays/WidgetPreviewPanel.test.tsx` | Tests for selected/no-selected states. |
| `frontend/src/hub/overlays/WidgetSettingsPanel.tsx` | Right panel wrapping current `PreviewInspector` for settings editing. |
| `frontend/src/hub/pages/OverlaysStudioPage.tsx` | Switches between library and Widget Studio mode. |
| `frontend/src/hub/pages/OverlaysStudioPage.test.tsx` | Updated to verify clicking `Abrir widgets` opens Widget Studio. |

---

## Current Starting Point

The repo already has Miniplan 1 implemented:

- `frontend/src/hub/pages/OverlaysStudioPage.tsx`
- `frontend/src/hub/overlays/StudioHome.tsx`
- `frontend/src/hub/overlays/ProfileLibraryCard.tsx`
- `frontend/src/hub/overlays/recommended-profiles.ts`

Current `OverlaysStudioPage` behavior:

- Loads profiles using `hub:list` / `hub:profiles`.
- `Abrir widgets` currently shows this controlled message:

```text
El editor de widgets se implementará en el siguiente miniplan.
```

This miniplan replaces that message with a real view.

---

## Task 1: Shared Overlays Studio State Hook

**Files:**

- Create: `frontend/src/hub/overlays/useOverlayStudioState.ts`
- Test: `frontend/src/hub/overlays/useOverlayStudioState.test.tsx`
- Source reference: `frontend/src/hub/pages/PreviewPage.tsx`

- [ ] **Step 1: Write the failing hook tests**

Create `frontend/src/hub/overlays/useOverlayStudioState.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Events } from "@wailsio/runtime";
import { useOverlayStudioState } from "./useOverlayStudioState";
import type { ProfileConfig } from "../../lib/profile";

const listeners = new Map<string, (event: { data: unknown }) => void>();

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn((name: string, callback: (event: { data: unknown }) => void) => {
      listeners.set(name, callback);
      return vi.fn();
    }),
    Emit: vi.fn(),
  },
}));

const profile: ProfileConfig = {
  id: "default-racing",
  name: "Default Racing",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
    { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
  ],
};

describe("useOverlayStudioState", () => {
  beforeEach(() => {
    listeners.clear();
    vi.clearAllMocks();
  });

  it("requests profiles and active profile on mount", () => {
    renderHook(() => useOverlayStudioState());

    expect(Events.Emit).toHaveBeenCalledWith("hub:list");
    expect(Events.Emit).toHaveBeenCalledWith("profile:request");
  });

  it("loads profile and selects the first widget", () => {
    const { result } = renderHook(() => useOverlayStudioState());

    act(() => {
      listeners.get("profile:loaded")?.({ data: { profile } });
    });

    expect(result.current.profile?.id).toBe("default-racing");
    expect(result.current.selectedWidget?.id).toBe("delta");
    expect(result.current.dirty).toBe(false);
  });

  it("marks dirty when a draft changes and emits layout:save on save", () => {
    const { result } = renderHook(() => useOverlayStudioState());

    act(() => {
      listeners.get("profile:loaded")?.({ data: { profile } });
    });

    act(() => {
      result.current.updateWidget({
        ...profile.widgets[0],
        name: "Delta Edited",
      });
    });

    expect(result.current.dirty).toBe(true);

    act(() => {
      result.current.saveProfile();
    });

    expect(Events.Emit).toHaveBeenCalledWith("layout:save", {
      widgets: [
        { ...profile.widgets[0], name: "Delta Edited" },
        profile.widgets[1],
      ],
    });
  });

  it("supports undo and redo", () => {
    const { result } = renderHook(() => useOverlayStudioState());

    act(() => {
      listeners.get("profile:loaded")?.({ data: { profile } });
    });

    act(() => {
      result.current.updateWidget({
        ...profile.widgets[0],
        name: "Delta Edited",
      });
    });

    expect(result.current.selectedWidget?.name).toBe("Delta Edited");

    act(() => {
      result.current.undo();
    });

    expect(result.current.selectedWidget?.name).toBeUndefined();

    act(() => {
      result.current.redo();
    });

    expect(result.current.selectedWidget?.name).toBe("Delta Edited");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- useOverlayStudioState.test.tsx
```

Expected: FAIL because `useOverlayStudioState.ts` does not exist.

- [ ] **Step 3: Implement the shared hook**

Create `frontend/src/hub/overlays/useOverlayStudioState.ts`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Events } from "@wailsio/runtime";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import type { ProfileEntry } from "../state/overlay-workbench";

type ProfileLoadedEvent = {
  data: {
    profile: ProfileConfig;
  };
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useOverlayStudioState() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [history, setHistory] = useState<ProfileConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const profileRef = useRef<ProfileConfig | null>(null);

  const selectedWidget = useMemo(() => {
    return profile?.widgets.find((widget) => widget.id === selectedWidgetId) ?? profile?.widgets[0] ?? null;
  }, [profile, selectedWidgetId]);

  const loadProfile = useCallback((loaded: ProfileConfig) => {
    profileRef.current = loaded;
    setProfile(loaded);
    setHistory([loaded]);
    setHistoryIndex(0);
    setSelectedWidgetId((current) => current ?? loaded.widgets[0]?.id ?? null);
    setDirty(false);
    setSaveState("idle");
    setLastError(null);
  }, []);

  useEffect(() => {
    const unsubProfiles = Events.On("hub:profiles", (event: { data: unknown }) => {
      const data = event.data as { profiles?: ProfileEntry[] };
      setProfiles(data.profiles ?? []);
    });

    const unsubLoaded = Events.On("profile:loaded", (event: ProfileLoadedEvent) => {
      loadProfile(event.data.profile);
    });

    const unsubSaved = Events.On("layout:saved", () => {
      setSaveState("saved");
      setDirty(false);
      setLastError(null);
    });

    const unsubError = Events.On("hub:error", (event: { data: unknown }) => {
      const data = event.data as { message?: string };
      setSaveState("error");
      setLastError(data?.message ?? "Error del hub");
    });

    Events.Emit("hub:list");
    Events.Emit("profile:request");

    return () => {
      unsubProfiles();
      unsubLoaded();
      unsubSaved();
      unsubError();
    };
  }, [loadProfile]);

  const updateDraft = useCallback((nextProfile: ProfileConfig) => {
    profileRef.current = nextProfile;
    setHistory((previous) => {
      const base = previous.slice(0, historyIndex + 1);
      return [...base, nextProfile];
    });
    setHistoryIndex((previous) => previous + 1);
    setProfile(nextProfile);
    setDirty(true);
    setSaveState("idle");
    setLastError(null);
  }, [historyIndex]);

  const updateWidget = useCallback((nextWidget: WidgetConfig) => {
    const current = profileRef.current;
    if (!current) return;
    updateDraft({
      ...current,
      widgets: current.widgets.map((widget) => widget.id === nextWidget.id ? nextWidget : widget),
    });
  }, [updateDraft]);

  const saveProfile = useCallback(() => {
    const current = profileRef.current;
    if (!current || !dirty) return;
    setSaveState("saving");
    setLastError(null);
    Events.Emit("layout:save", { widgets: current.widgets });
  }, [dirty]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const nextProfile = history[nextIndex];
    profileRef.current = nextProfile;
    setHistoryIndex(nextIndex);
    setProfile(nextProfile);
    setDirty(true);
    setSaveState("idle");
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const nextProfile = history[nextIndex];
    profileRef.current = nextProfile;
    setHistoryIndex(nextIndex);
    setProfile(nextProfile);
    setDirty(true);
    setSaveState("idle");
  }, [history, historyIndex]);

  useEffect(() => {
    if (!dirty) return;
    const id = window.setTimeout(() => saveProfile(), 800);
    return () => window.clearTimeout(id);
  }, [dirty, profile, saveProfile]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key === "s") {
        event.preventDefault();
        saveProfile();
      } else if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, saveProfile, undo]);

  return {
    profile,
    profiles,
    selectedWidget,
    selectedWidgetId,
    saveState,
    dirty,
    lastError,
    canUndo: historyIndex > 0,
    canRedo: historyIndex >= 0 && historyIndex < history.length - 1,
    setSelectedWidgetId,
    updateDraft,
    updateWidget,
    saveProfile,
    undo,
    redo,
  };
}
```

- [ ] **Step 4: Run the hook test**

Run:

```powershell
pnpm --dir frontend test -- useOverlayStudioState.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/useOverlayStudioState.ts frontend/src/hub/overlays/useOverlayStudioState.test.tsx
git commit -m "refactor(hub): add Overlays Studio state hook"
```

---

## Task 2: Reusable Studio Widget List

**Files:**

- Create: `frontend/src/hub/overlays/StudioWidgetList.tsx`
- Test: `frontend/src/hub/overlays/StudioWidgetList.test.tsx`

- [ ] **Step 1: Write the failing list test**

Create `frontend/src/hub/overlays/StudioWidgetList.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudioWidgetList } from "./StudioWidgetList";
import type { WidgetConfig } from "../../lib/profile";

const widgets: WidgetConfig[] = [
  { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 0, y: 0, w: 400, h: 48 } },
  { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 0, y: 80, w: 320, h: 280 } },
];

describe("StudioWidgetList", () => {
  it("renders widgets and selects one", () => {
    const onSelectWidget = vi.fn();
    render(<StudioWidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={onSelectWidget} />);

    fireEvent.click(screen.getByRole("button", { name: /relative/i }));

    expect(onSelectWidget).toHaveBeenCalledWith("relative");
  });

  it("filters active widgets", () => {
    render(<StudioWidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Activos" }));

    expect(screen.getByText("delta")).toBeTruthy();
    expect(screen.queryByText("relative")).toBeNull();
  });

  it("searches by id and type", () => {
    render(<StudioWidgetList widgets={widgets} selectedWidgetId="delta" onSelectWidget={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Buscar widget..."), { target: { value: "rel" } });

    expect(screen.queryByText("delta")).toBeNull();
    expect(screen.getByText("relative")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- StudioWidgetList.test.tsx
```

Expected: FAIL because `StudioWidgetList.tsx` does not exist.

- [ ] **Step 3: Implement StudioWidgetList**

Create `frontend/src/hub/overlays/StudioWidgetList.tsx`:

```tsx
import { useMemo, useState } from "react";
import type { WidgetConfig } from "../../lib/profile";

type StudioWidgetListProps = {
  widgets: WidgetConfig[];
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
};

export function StudioWidgetList({ widgets, selectedWidgetId, onSelectWidget }: StudioWidgetListProps) {
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [query, setQuery] = useState("");

  const filteredWidgets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return widgets.filter((widget) => {
      if (filter === "active" && !widget.enabled) return false;
      if (!normalizedQuery) return true;
      return (
        widget.id.toLowerCase().includes(normalizedQuery) ||
        widget.type.toLowerCase().includes(normalizedQuery) ||
        (widget.name ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filter, query, widgets]);

  return (
    <aside className="card-sleek flex min-h-0 flex-col rounded-xl">
      <div className="border-b border-white/5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Widgets</h2>
          <span className="font-mono text-[10px] text-vantare-textDim">{widgets.length}</span>
        </div>

        <div className="mt-3 flex gap-2 rounded-lg border border-white/5 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase ${
              filter === "all" ? "bg-white/10 text-white" : "text-vantare-textMuted hover:text-white"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase ${
              filter === "active" ? "bg-white/10 text-white" : "text-vantare-textMuted hover:text-white"
            }`}
          >
            Activos
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar widget..."
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none placeholder:text-vantare-textDim focus:border-vantare-red-500/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredWidgets.map((widget) => {
          const selected = selectedWidgetId === widget.id;
          return (
            <button
              key={widget.id}
              type="button"
              onClick={() => onSelectWidget(widget.id)}
              className={`mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                selected
                  ? "border-vantare-red-500/50 bg-vantare-red-950/30 text-white"
                  : "border-white/5 bg-black/25 text-vantare-textMuted hover:text-white"
              }`}
            >
              <span>
                <span className="block font-mono text-xs font-bold">{widget.id}</span>
                <span className="block font-mono text-[10px] text-vantare-textDim">{widget.type}</span>
              </span>
              <span className={`text-[10px] font-bold ${widget.enabled ? "text-emerald-400" : "text-vantare-textDim"}`}>
                {widget.enabled ? "Activo" : "Oculto"}
              </span>
            </button>
          );
        })}

        {filteredWidgets.length === 0 && (
          <p className="rounded-lg border border-white/5 bg-black/20 px-3 py-4 text-center text-xs text-vantare-textDim">
            Sin widgets
          </p>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run the list tests**

Run:

```powershell
pnpm --dir frontend test -- StudioWidgetList.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/StudioWidgetList.tsx frontend/src/hub/overlays/StudioWidgetList.test.tsx
git commit -m "feat(hub): add Studio widget list"
```

---

## Task 3: Widget Preview and Settings Panels

**Files:**

- Create: `frontend/src/hub/overlays/WidgetPreviewPanel.tsx`
- Test: `frontend/src/hub/overlays/WidgetPreviewPanel.test.tsx`
- Create: `frontend/src/hub/overlays/WidgetSettingsPanel.tsx`

- [ ] **Step 1: Write the failing preview panel test**

Create `frontend/src/hub/overlays/WidgetPreviewPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WidgetPreviewPanel } from "./WidgetPreviewPanel";
import type { WidgetConfig } from "../../lib/profile";

const widget: WidgetConfig = {
  id: "delta",
  type: "delta",
  enabled: true,
  updateHz: 30,
  position: { x: 760, y: 40, w: 400, h: 48 },
};

describe("WidgetPreviewPanel", () => {
  it("renders selected widget details", () => {
    render(<WidgetPreviewPanel widget={widget} />);

    expect(screen.getByText("delta")).toBeTruthy();
    expect(screen.getByText("Tipo: delta")).toBeTruthy();
    expect(screen.getByText("30 Hz")).toBeTruthy();
  });

  it("renders empty state without a widget", () => {
    render(<WidgetPreviewPanel widget={null} />);

    expect(screen.getByText("Selecciona un widget")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- WidgetPreviewPanel.test.tsx
```

Expected: FAIL because `WidgetPreviewPanel.tsx` does not exist.

- [ ] **Step 3: Implement WidgetPreviewPanel**

Create `frontend/src/hub/overlays/WidgetPreviewPanel.tsx`:

```tsx
import type { WidgetConfig } from "../../lib/profile";
import { getWidgetStyle } from "../../lib/profile";

type WidgetPreviewPanelProps = {
  widget: WidgetConfig | null;
};

export function WidgetPreviewPanel({ widget }: WidgetPreviewPanelProps) {
  if (!widget) {
    return (
      <section className="card-sleek flex min-h-[420px] items-center justify-center rounded-xl p-6">
        <p className="text-sm text-vantare-textMuted">Selecciona un widget</p>
      </section>
    );
  }

  return (
    <section className="card-sleek flex min-h-[420px] flex-col rounded-xl p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">{widget.id}</h2>
          <p className="mt-1 font-mono text-xs text-vantare-textMuted">Tipo: {widget.type}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
          widget.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-vantare-textDim"
        }`}>
          {widget.enabled ? "Activo" : "Oculto"}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-black/40 p-8">
        <div className="w-full max-w-lg rounded-xl border border-white/10 bg-black/60 p-6 text-center shadow-2xl">
          <p className="font-display text-2xl font-bold text-white">{widget.name || widget.id}</p>
          <p className="mt-2 text-sm text-vantare-textMuted">
            Preview compacto de configuración. La colocación se editará en Perfiles específicos.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-vantare-textDim">Hz</p>
              <p className="font-display text-lg font-bold text-white">{widget.updateHz ?? 30} Hz</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-vantare-textDim">Style</p>
              <p className="truncate font-mono text-xs text-white">{getWidgetStyle(widget)}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-vantare-textDim">Tamaño</p>
              <p className="font-mono text-xs text-white">{widget.position.w}×{widget.position.h}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement WidgetSettingsPanel**

Create `frontend/src/hub/overlays/WidgetSettingsPanel.tsx`:

```tsx
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { PreviewInspector } from "../preview/PreviewInspector";

type WidgetSettingsPanelProps = {
  profile: ProfileConfig;
  widget: WidgetConfig | null;
  onChangeProfile: (profile: ProfileConfig) => void;
};

export function WidgetSettingsPanel({ profile, widget, onChangeProfile }: WidgetSettingsPanelProps) {
  return (
    <PreviewInspector
      profile={profile}
      widget={widget}
      onChangeProfile={onChangeProfile}
      disabled={false}
    />
  );
}
```

- [ ] **Step 5: Run preview panel tests**

Run:

```powershell
pnpm --dir frontend test -- WidgetPreviewPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/hub/overlays/WidgetPreviewPanel.tsx frontend/src/hub/overlays/WidgetPreviewPanel.test.tsx frontend/src/hub/overlays/WidgetSettingsPanel.tsx
git commit -m "feat(hub): add widget preview and settings panels"
```

---

## Task 4: Widget Studio View

**Files:**

- Create: `frontend/src/hub/overlays/WidgetStudio.tsx`
- Test: `frontend/src/hub/overlays/WidgetStudio.test.tsx`

- [ ] **Step 1: Write the failing WidgetStudio test**

Create `frontend/src/hub/overlays/WidgetStudio.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetStudio } from "./WidgetStudio";
import type { ProfileConfig } from "../../lib/profile";

const profile: ProfileConfig = {
  id: "default-racing",
  name: "Default Racing",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
    { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
  ],
};

describe("WidgetStudio", () => {
  it("renders the Widget Studio view", () => {
    render(
      <WidgetStudio
        profile={profile}
        selectedWidgetId="delta"
        dirty={false}
        saveState="idle"
        onSelectWidget={vi.fn()}
        onChangeProfile={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Widgets" })).toBeTruthy();
    expect(screen.getByText("Estos cambios se guardan en el perfil activo.")).toBeTruthy();
    expect(screen.getByText("delta")).toBeTruthy();
    expect(screen.getByText("Tipo: delta")).toBeTruthy();
  });

  it("calls onBack from the back button", () => {
    const onBack = vi.fn();
    render(
      <WidgetStudio
        profile={profile}
        selectedWidgetId="delta"
        dirty={false}
        saveState="idle"
        onSelectWidget={vi.fn()}
        onChangeProfile={vi.fn()}
        onSave={vi.fn()}
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Volver a Overlays Studio/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it("calls onSave from manual save button", () => {
    const onSave = vi.fn();
    render(
      <WidgetStudio
        profile={profile}
        selectedWidgetId="delta"
        dirty={true}
        saveState="idle"
        onSelectWidget={vi.fn()}
        onChangeProfile={vi.fn()}
        onSave={onSave}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- WidgetStudio.test.tsx
```

Expected: FAIL because `WidgetStudio.tsx` does not exist.

- [ ] **Step 3: Implement WidgetStudio**

Create `frontend/src/hub/overlays/WidgetStudio.tsx`:

```tsx
import type { ProfileConfig } from "../../lib/profile";
import type { SaveState } from "./useOverlayStudioState";
import { StudioWidgetList } from "./StudioWidgetList";
import { WidgetPreviewPanel } from "./WidgetPreviewPanel";
import { WidgetSettingsPanel } from "./WidgetSettingsPanel";

type WidgetStudioProps = {
  profile: ProfileConfig;
  selectedWidgetId: string | null;
  dirty: boolean;
  saveState: SaveState;
  onSelectWidget: (id: string) => void;
  onChangeProfile: (profile: ProfileConfig) => void;
  onSave: () => void;
  onBack: () => void;
};

export function WidgetStudio({
  profile,
  selectedWidgetId,
  dirty,
  saveState,
  onSelectWidget,
  onChangeProfile,
  onSave,
  onBack,
}: WidgetStudioProps) {
  const selectedWidget = profile.widgets.find((widget) => widget.id === selectedWidgetId) ?? profile.widgets[0] ?? null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white"
          >
            ← Volver a Overlays Studio
          </button>
          <h1 className="font-display text-3xl font-bold text-white">Widgets</h1>
          <p className="mt-1 text-sm text-vantare-textMuted">
            Estos cambios se guardan en el perfil activo.
          </p>
          <p className="mt-1 text-xs text-vantare-textDim">
            La colocación de widgets se editará en Perfiles específicos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-vantare-textMuted">
            {saveState === "saving" && "Guardando..."}
            {saveState === "saved" && "Guardado"}
            {saveState === "error" && "Error al guardar"}
            {saveState === "idle" && dirty && "Cambios sin guardar"}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saveState === "saving"}
            className="btn-secondary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto xl:grid-cols-[280px_1fr_340px] xl:overflow-hidden">
        <StudioWidgetList
          widgets={profile.widgets}
          selectedWidgetId={selectedWidget?.id ?? null}
          onSelectWidget={onSelectWidget}
        />
        <WidgetPreviewPanel widget={selectedWidget} />
        <WidgetSettingsPanel
          profile={profile}
          widget={selectedWidget}
          onChangeProfile={onChangeProfile}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run WidgetStudio tests**

Run:

```powershell
pnpm --dir frontend test -- WidgetStudio.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/WidgetStudio.tsx frontend/src/hub/overlays/WidgetStudio.test.tsx
git commit -m "feat(hub): add Widget Studio view"
```

---

## Task 5: Wire Widget Studio Into OverlaysStudioPage

**Files:**

- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`
- Test: `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`

- [ ] **Step 1: Update page tests**

Add this test to `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`:

```tsx
it("opens Widget Studio after profiles and active profile load", async () => {
  render(<OverlaysStudioPage />);

  listeners.get("hub:profiles")?.({
    data: {
      profiles: [
        { id: "default-racing", file: "example-racing.json", name: "Default Racing", displayMode: "racing", widgets: 2 },
      ],
    },
  });

  listeners.get("profile:loaded")?.({
    data: {
      profile: {
        id: "default-racing",
        name: "Default Racing",
        displayMode: "racing",
        monitorIndex: 0,
        widgets: [
          { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
          { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
        ],
      },
    },
  });

  fireEvent.click(await screen.findByRole("button", { name: /Abrir widgets/i }));

  expect(await screen.findByRole("heading", { name: "Widgets" })).toBeTruthy();
  expect(screen.getByText("Estos cambios se guardan en el perfil activo.")).toBeTruthy();
});
```

Ensure the test file imports `fireEvent`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx
```

Expected: FAIL because `Abrir widgets` still shows the old controlled message.

- [ ] **Step 3: Replace local state with shared hook and mode switch**

Replace `frontend/src/hub/pages/OverlaysStudioPage.tsx` with:

```tsx
import { useState } from "react";
import { Events } from "@wailsio/runtime";
import { StudioHome } from "../overlays/StudioHome";
import { WidgetStudio } from "../overlays/WidgetStudio";
import { useOverlayStudioState } from "../overlays/useOverlayStudioState";
import type { RecommendedProfile } from "../overlays/recommended-profiles";
import type { ProfileEntry } from "../state/overlay-workbench";

type StudioMode = "home" | "widgets";

export function OverlaysStudioPage() {
  const studio = useOverlayStudioState();
  const [mode, setMode] = useState<StudioMode>("home");
  const [notice, setNotice] = useState<string | null>(null);

  function createProfile() {
    const name = window.prompt("Nombre del nuevo perfil");
    if (!name?.trim()) return;
    Events.Emit("hub:create", { name: name.trim() });
  }

  function openWidgetStudio() {
    setNotice(null);
    setMode("widgets");
  }

  function openProfile(_profile: ProfileEntry) {
    setNotice("El editor de perfiles específicos se implementará en el siguiente miniplan.");
  }

  function saveRecommended(_profile: RecommendedProfile) {
    setNotice("Guardar recomendados como perfil propio se implementará en un miniplan posterior.");
  }

  if (mode === "widgets") {
    if (!studio.profile) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1200px] flex-col px-6 py-8">
          <button
            type="button"
            className="mb-4 w-fit text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white"
            onClick={() => setMode("home")}
          >
            ← Volver a Overlays Studio
          </button>
          <div className="glass-panel rounded-xl p-8 text-sm text-vantare-textMuted">
            Selecciona o crea un perfil para editar widgets.
          </div>
        </div>
      );
    }

    return (
      <WidgetStudio
        profile={studio.profile}
        selectedWidgetId={studio.selectedWidgetId}
        dirty={studio.dirty}
        saveState={studio.saveState}
        onSelectWidget={studio.setSelectedWidgetId}
        onChangeProfile={studio.updateDraft}
        onSave={studio.saveProfile}
        onBack={() => setMode("home")}
      />
    );
  }

  return (
    <>
      {(notice || studio.lastError) && (
        <div className="mx-auto mt-4 max-w-[1800px] px-6">
          <div className="rounded-lg border border-vantare-red-500/30 bg-vantare-red-950/20 px-4 py-3 text-sm text-vantare-red-300">
            {notice || studio.lastError}
          </div>
        </div>
      )}

      <StudioHome
        profiles={studio.profiles}
        onOpenWidgetStudio={openWidgetStudio}
        onOpenProfile={openProfile}
        onCreateProfile={createProfile}
        onSaveRecommended={saveRecommended}
      />
    </>
  );
}
```

- [ ] **Step 4: Run focused page tests**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run all new Widget Studio tests**

Run:

```powershell
pnpm --dir frontend test -- useOverlayStudioState.test.tsx StudioWidgetList.test.tsx WidgetPreviewPanel.test.tsx WidgetStudio.test.tsx OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/hub/pages/OverlaysStudioPage.tsx frontend/src/hub/pages/OverlaysStudioPage.test.tsx
git commit -m "feat(hub): wire Widget Studio into Overlays Studio"
```

---

## Task 6: Build and Full Verification

**Files:**

- No code changes unless verification fails.

- [ ] **Step 1: Run full frontend tests**

Run:

```powershell
pnpm --dir frontend test
```

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 3: Run Go tests**

Run:

```powershell
go test ./...
```

Expected: PASS.

- [ ] **Step 4: Manual smoke in mock mode**

Run:

```powershell
go run ./cmd/vantare -live=false -profile configs/example-racing.json
```

Expected:

- Hub opens first.
- Topbar shows `Overlays Studio`.
- Open `Overlays Studio`.
- Click `Abrir widgets`.
- Widget Studio opens.
- Left list shows current profile widgets only.
- `Todos` / `Activos` filters work.
- Search filters by id/type.
- Selecting a widget updates the center panel.
- Right inspector edits `Nombre`, `Actualización (Hz)`, `Visible`, style, appearance, and visibility.
- Editing marks state as dirty.
- `Guardar` emits save and returns to `Guardado`.
- `Ctrl+Z` undoes a local edit.
- `Ctrl+Y` redoes it.
- `Volver a Overlays Studio` returns to library.
- `Editar` under `Perfiles específicos` still shows the controlled miniplan message.

- [ ] **Step 5: Record evidence**

Create evidence file:

`../.omo/evidence/2026-06-18-overlays-studio-miniplan-2.md`

Content:

```md
# Overlays Studio Miniplan 2 Verification

- pnpm --dir frontend test: PASS
- pnpm --dir frontend build: PASS
- go test ./...: PASS
- Manual mock smoke: PASS

Validated:
- Abrir widgets opens Widget Studio.
- Widget list filters by Todos/Activos and search.
- Selected widget updates preview/settings.
- Widget settings save through existing layout save flow.
- Ctrl+Z/Ctrl+Y/Ctrl+S work.
- Perfiles específicos remains a controlled future-flow message.
```

- [ ] **Step 6: Commit evidence**

```powershell
git add ../.omo/evidence/2026-06-18-overlays-studio-miniplan-2.md
git commit -m "test: verify Overlays Studio widget miniplan"
```

---

## Acceptance Criteria

- `Abrir widgets` opens a real Widget Studio view.
- Widget Studio does not implement profile placement.
- Widget Studio clearly states changes are saved to the active profile.
- Widget list contains only widgets from the active profile.
- Widget list supports `Todos`, `Activos`, and search.
- Widget settings are editable through existing profile widget fields.
- Manual save works through `layout:save`.
- Autosave works after edits.
- Undo/redo/save shortcuts work.
- Existing library still renders correctly.
- `Perfiles específicos` remains gated for the next miniplan.
- Full frontend tests, frontend build, and Go tests pass.

---

## Self-Review

**Spec coverage:**

- Real `Widgets` view: Tasks 4 and 5.
- Existing widgets only: Task 2 uses profile widgets; no new types are introduced.
- Appearance/behavior editing: Task 3 wraps `PreviewInspector`, which already edits supported schema fields.
- No placement editor: explicitly out of scope; `Perfiles específicos` remains gated in Task 5.
- Manual save/autosave/undo/redo: Task 1 implements hook behavior and Task 6 verifies it.
- Tests and verification: Tasks 1-6.

**Placeholder scan:** No `TBD`, `TODO`, or vague implementation steps remain. Deferred flows are explicit out-of-scope items.

**Type consistency:** Uses existing `ProfileConfig`, `WidgetConfig`, `ProfileEntry`, Wails `Events`, `layout:save`, `profile:loaded`, and `hub:profiles` contracts.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-overlays-studio-miniplan-2-widget-studio.md`.

Execute this miniplan only after Miniplan 1 is validated. After this passes, create Miniplan 3 for `Mis perfiles > Perfiles específicos` and the profile layout canvas editor.
