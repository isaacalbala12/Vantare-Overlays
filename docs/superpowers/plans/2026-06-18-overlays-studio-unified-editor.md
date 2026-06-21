# Overlays Studio Unified Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate `Overlays` and `Preview` hub tabs with one `Overlays Studio` flow that has a profile library, a widget configuration area, and a profile layout editor based on `overlays_mockup.html`.

**Architecture:** Implement Phase A first: a Hub-only refactor that keeps the current canvas editor, Wails events, autosave, undo/redo, OBS URL, and overlay start/stop behavior, but reorganizes them under a new `Overlays Studio` page. Leave Phase B (`/overlay/edit` desktop edit mode) as a later plan after Phase A is verified.

**Tech Stack:** Go 1.25, Wails v3 events, React 19, TypeScript, Vite, Tailwind CSS v4, Vitest, Testing Library.

---

## Product Decisions Locked In

- Topbar tabs become: `Hub`, `Overlays Studio`, `Telemetría`, `Setup`.
- `Preview` disappears as a topbar tab.
- App still opens on `Hub`.
- `Overlays Studio` has a library state and editor states.
- `Mis perfiles > Widgets` edits widget appearance/behavior, not screen placement.
- `Mis perfiles > Perfiles específicos` edits profile layouts: widget placement, size, enabled state, OBS URL, and overlay runtime actions.
- `Recomendados por Vantare` shows fixed read-only presets; users can save a preset as their own profile and then edit it under `Mis perfiles > Perfiles específicos`.
- `Comunidad` is a visible `Próximamente` section only.
- Phase A keeps drag/resize in the Hub canvas. Phase B later adds real desktop edit mode.
- Existing widgets only: `delta`, `relative`, `standings`, `telemetry`, `telemetry-vertical`, `pedals`.
- New widget types from the mockup (`flags`, `radar`, `track map`, `delta trace`) do not appear yet.
- OBS validation is part of this plan.

---

## Final UX Croquis

```text
Topbar
Hub | Overlays Studio | Telemetría | Setup
```

```text
Overlays Studio
├─ Mis perfiles
│  ├─ Widgets
│  │  └─ [Lista widgets] [Preview widget] [Ajustes visuales/comportamiento]
│  └─ Perfiles específicos
│     └─ [Widgets del perfil] [Canvas layout 1920x1080] [Posición/tamaño/acciones]
├─ Recomendados por Vantare
│  └─ Presets fijos read-only → Guardar como perfil propio
└─ Comunidad
   └─ Próximamente
```

---

## File Structure After Phase A

| File | Responsibility |
|---|---|
| `frontend/src/hub/pages/OverlaysStudioPage.tsx` | New single page replacing visible `ProfilesPage` + `PreviewPage` navigation. Owns mode switching between library, widget studio, and profile layout editor. |
| `frontend/src/hub/overlays/useOverlayStudioState.ts` | Extracted state/event logic from `PreviewPage`: profiles, active profile, selected widget, dirty/save/autosave, undo/redo, overlay status. |
| `frontend/src/hub/overlays/StudioHome.tsx` | Library landing view with `Mis perfiles`, `Recomendados por Vantare`, and `Comunidad`. |
| `frontend/src/hub/overlays/ProfileLibraryCard.tsx` | Reusable profile/preset card. |
| `frontend/src/hub/overlays/recommended-profiles.ts` | Local read-only Vantare recommended preset descriptors and profile templates. |
| `frontend/src/hub/overlays/WidgetStudio.tsx` | Widget-level editor for appearance/behavior defaults. Initial implementation edits selected widgets in the active profile, with clear copy that layout placement belongs in profile editor. |
| `frontend/src/hub/overlays/ProfileLayoutStudio.tsx` | Three-pane editor based on `overlays_mockup.html`. |
| `frontend/src/hub/overlays/StudioWidgetList.tsx` | Left panel: filter/search/select existing widgets in the active profile. |
| `frontend/src/hub/overlays/StudioCanvas.tsx` | Dark full-height 1920x1080 scaled canvas using current drag/resize logic. |
| `frontend/src/hub/overlays/StudioInspector.tsx` | Right panel: widget inspector adapted from `PreviewInspector`. |
| `frontend/src/hub/overlays/StudioActionBar.tsx` | Bottom toolbar: workspace status, save, open/stop overlay, browser view, copy OBS URL, back to library. |
| `frontend/src/hub/components/Topbar.tsx` | Remove `Preview`, rename `Overlays` to `Overlays Studio`. |
| `frontend/src/hub/HubApp.tsx` | Route `profiles` section to `OverlaysStudioPage`; remove visible `preview` section. |
| `internal/app/hub_service.go` | Add preset-copy helper only if frontend-only recommended copy is insufficient. Preferred path: reuse existing `hub:create` in Phase A and add backend helper only in Task 8 if required. |
| `cmd/vantare/main.go` | Wire one optional event for saving a recommended preset as own profile if Task 8 uses backend. |

Old files are not deleted until the new page compiles and tests pass:

- `frontend/src/hub/pages/ProfilesPage.tsx`
- `frontend/src/hub/pages/PreviewPage.tsx`
- `frontend/src/hub/preview/PreviewCanvas.tsx`
- `frontend/src/hub/preview/WidgetList.tsx`
- `frontend/src/hub/preview/PreviewInspector.tsx`

---

## Task 1: Navigation Shell

**Files:**
- Modify: `frontend/src/hub/components/Topbar.tsx`
- Modify: `frontend/src/hub/HubApp.tsx`
- Create: `frontend/src/hub/pages/OverlaysStudioPage.tsx`
- Test: `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`

- [ ] **Step 1: Create a failing page test**

Create `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverlaysStudioPage } from "./OverlaysStudioPage";

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
}));

describe("OverlaysStudioPage", () => {
  it("renders the Overlays Studio library shell", () => {
    render(<OverlaysStudioPage />);
    expect(screen.getByRole("heading", { name: "Overlays Studio" })).toBeTruthy();
    expect(screen.getByText("Mis perfiles")).toBeTruthy();
    expect(screen.getByText("Recomendados por Vantare")).toBeTruthy();
    expect(screen.getByText("Comunidad")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx
```

Expected: FAIL because `OverlaysStudioPage` does not exist.

- [ ] **Step 3: Create placeholder OverlaysStudioPage**

Create `frontend/src/hub/pages/OverlaysStudioPage.tsx`:

```tsx
export function OverlaysStudioPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1800px] flex-col px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Overlays Studio</h1>
        <p className="mt-2 text-sm text-vantare-textMuted">
          Crea, organiza y edita tus overlays desde un único lugar.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-sleek rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold text-white">Mis perfiles</h2>
        </section>
        <section className="card-sleek rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold text-white">Recomendados por Vantare</h2>
        </section>
        <section className="card-sleek rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold text-white">Comunidad</h2>
          <p className="mt-2 text-sm text-vantare-textMuted">Próximamente</p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update topbar navigation**

In `frontend/src/hub/components/Topbar.tsx`, replace `NAV_ITEMS` with:

```tsx
const NAV_ITEMS: NavItem[] = [
  { label: 'Hub', id: 'dashboard', active: true },
  { label: 'Overlays Studio', id: 'profiles' },
  { label: 'Telemetría', id: 'telemetry' },
  { label: 'Setup', id: 'setup' },
];
```

- [ ] **Step 5: Route profiles section to OverlaysStudioPage**

In `frontend/src/hub/HubApp.tsx`, add import:

```tsx
import { OverlaysStudioPage } from './pages/OverlaysStudioPage';
```

Change `Section`:

```tsx
type Section = 'dashboard' | 'profiles' | 'telemetry' | 'setup';
```

Change render:

```tsx
{section === "profiles" && <OverlaysStudioPage />}
```

Remove the `PreviewPage` import and the `section === "preview"` branch.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Build frontend**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/hub/components/Topbar.tsx frontend/src/hub/HubApp.tsx frontend/src/hub/pages/OverlaysStudioPage.tsx frontend/src/hub/pages/OverlaysStudioPage.test.tsx
git commit -m "feat(hub): introduce Overlays Studio navigation"
```

---

## Task 2: Extract Reusable Studio State

**Files:**
- Create: `frontend/src/hub/overlays/useOverlayStudioState.ts`
- Test: `frontend/src/hub/overlays/useOverlayStudioState.test.tsx`
- Source reference: `frontend/src/hub/pages/PreviewPage.tsx`

- [ ] **Step 1: Create state hook test**

Create `frontend/src/hub/overlays/useOverlayStudioState.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Events } from "@wailsio/runtime";
import { useOverlayStudioState } from "./useOverlayStudioState";

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
}));

describe("useOverlayStudioState", () => {
  it("requests profiles and active profile on mount", () => {
    renderHook(() => useOverlayStudioState());
    expect(Events.Emit).toHaveBeenCalledWith("hub:list");
    expect(Events.Emit).toHaveBeenCalledWith("profile:request");
  });

  it("marks profile dirty when draft changes", () => {
    const { result } = renderHook(() => useOverlayStudioState());
    act(() => {
      result.current.loadProfileForTest({
        id: "p1",
        name: "Profile",
        displayMode: "racing",
        monitorIndex: 0,
        widgets: [{ id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 0, y: 0, w: 400, h: 48 } }],
      });
    });
    act(() => {
      result.current.updateDraft({
        id: "p1",
        name: "Profile",
        displayMode: "racing",
        monitorIndex: 0,
        widgets: [{ id: "delta", type: "delta", enabled: false, updateHz: 30, position: { x: 0, y: 0, w: 400, h: 48 } }],
      });
    });
    expect(result.current.dirty).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- useOverlayStudioState.test.tsx
```

Expected: FAIL because hook does not exist.

- [ ] **Step 3: Implement initial hook**

Create `frontend/src/hub/overlays/useOverlayStudioState.ts`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Events } from "@wailsio/runtime";
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import {
  isRunningProfile,
  profileTarget,
  type OverlayStatus,
  type ProfileEntry,
} from "../state/overlay-workbench";

type ProfileLoadedEvent = {
  data: {
    profile: ProfileConfig;
  };
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useOverlayStudioState() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const nextProfilesRef = useRef<ProfileEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ProfileEntry | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<OverlayStatus | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [history, setHistory] = useState<ProfileConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const overlayRunning = Boolean(overlayStatus?.running);
  const selectedProfileRunning = selectedEntry
    ? isRunningProfile(selectedEntry, overlayStatus)
    : overlayRunning;

  const selectedWidget = useMemo(
    () => profile?.widgets.find((widget) => widget.id === selectedWidgetId) ?? null,
    [profile, selectedWidgetId],
  );

  const obsUrl = useMemo(() => {
    if (!selectedEntry) return "";
    return `${window.location.origin}/overlay?profile=${encodeURIComponent(selectedEntry.file)}&obs=1`;
  }, [selectedEntry]);

  const loadProfile = useCallback((loaded: ProfileConfig) => {
    setProfile(loaded);
    setHistory([loaded]);
    setHistoryIndex(0);
    setSelectedWidgetId((current) => current ?? loaded.widgets[0]?.id ?? null);
    setDirty(false);
    setSaveState("idle");
    setPendingProfileId(null);
    setSelectedEntry((current) => {
      if (current && current.id === loaded.id) return current;
      const fromList = nextProfilesRef.current.find((entry) => entry.id === loaded.id);
      if (fromList) return fromList;
      if (!loaded.id) return current;
      return {
        id: loaded.id,
        file: loaded.id + ".json",
        name: loaded.name,
        displayMode: loaded.displayMode,
        widgets: loaded.widgets.length,
      };
    });
  }, []);

  useEffect(() => {
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
      setPendingProfileId(null);
      setLastError(data?.message ?? "Error del hub");
    });
    const unsubOverlayStatus = Events.On("overlay:status", (event: { data: unknown }) => {
      setOverlayStatus(event.data as OverlayStatus);
    });
    const unsubProfiles = Events.On("hub:profiles", (event: { data: unknown }) => {
      const data = event.data as { profiles?: ProfileEntry[] };
      const nextProfiles = data.profiles ?? [];
      nextProfilesRef.current = nextProfiles;
      setProfiles(nextProfiles);
      setSelectedEntry((current) => {
        if (current) return nextProfiles.find((entry) => entry.id === current.id) ?? current;
        return nextProfiles[0] ?? null;
      });
    });

    Events.Emit("hub:list");
    Events.Emit("profile:request");

    return () => {
      unsubLoaded();
      unsubSaved();
      unsubError();
      unsubOverlayStatus();
      unsubProfiles();
    };
  }, [loadProfile]);

  const updateDraft = useCallback((nextProfile: ProfileConfig) => {
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(nextProfile);
      return nextHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    setProfile(nextProfile);
    setDirty(true);
    setSaveState("idle");
    setLastError(null);
  }, [historyIndex]);

  const saveProfile = useCallback(() => {
    if (!profile || overlayRunning || !dirty) return;
    setSaveState("saving");
    setLastError(null);
    Events.Emit("layout:save", { widgets: profile.widgets });
  }, [dirty, overlayRunning, profile]);

  const activateProfile = useCallback((entry: ProfileEntry) => {
    if (overlayRunning) return;
    setPendingProfileId(entry.id);
    setLastError(null);
    setSaveState("idle");
    setDirty(false);
    Events.Emit("hub:activate", profileTarget(entry));
  }, [overlayRunning]);

  const startSelectedProfile = useCallback(() => {
    if (!selectedEntry || dirty || saveState === "saving" || pendingProfileId) return;
    setLastError(null);
    Events.Emit("overlay:start", profileTarget(selectedEntry));
  }, [dirty, pendingProfileId, saveState, selectedEntry]);

  const stopOverlay = useCallback(() => {
    Events.Emit("overlay:stop");
  }, []);

  const undo = useCallback(() => {
    if (historyIndex <= 0 || !history.length) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setProfile(history[nextIndex]);
    setDirty(true);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setProfile(history[nextIndex]);
    setDirty(true);
  }, [history, historyIndex]);

  const updateWidget = useCallback((widget: WidgetConfig) => {
    if (!profile) return;
    updateDraft({
      ...profile,
      widgets: profile.widgets.map((current) => current.id === widget.id ? widget : current),
    });
  }, [profile, updateDraft]);

  return {
    profile,
    profiles,
    selectedEntry,
    selectedWidget,
    selectedWidgetId,
    pendingProfileId,
    saveState,
    dirty,
    overlayRunning,
    overlayStatus,
    selectedProfileRunning,
    lastError,
    obsUrl,
    canUndo: historyIndex > 0,
    canRedo: historyIndex >= 0 && historyIndex < history.length - 1,
    setSelectedWidgetId,
    activateProfile,
    startSelectedProfile,
    stopOverlay,
    saveProfile,
    updateDraft,
    updateWidget,
    undo,
    redo,
    loadProfileForTest: loadProfile,
  };
}
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
pnpm --dir frontend test -- useOverlayStudioState.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/useOverlayStudioState.ts frontend/src/hub/overlays/useOverlayStudioState.test.tsx
git commit -m "refactor(hub): extract Overlays Studio state"
```

---

## Task 3: Recommended Profiles Data

**Files:**
- Create: `frontend/src/hub/overlays/recommended-profiles.ts`
- Test: `frontend/src/hub/overlays/recommended-profiles.test.ts`

- [ ] **Step 1: Create recommended profiles test**

Create `frontend/src/hub/overlays/recommended-profiles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RECOMMENDED_PROFILES, cloneRecommendedProfile } from "./recommended-profiles";

describe("recommended-profiles", () => {
  it("contains fixed read-only Vantare presets", () => {
    expect(RECOMMENDED_PROFILES.length).toBeGreaterThanOrEqual(3);
    expect(RECOMMENDED_PROFILES.every((profile) => profile.readOnly)).toBe(true);
  });

  it("clones a preset as an editable custom profile", () => {
    const clone = cloneRecommendedProfile(RECOMMENDED_PROFILES[0], "My Copy");
    expect(clone.name).toBe("My Copy");
    expect(clone.id?.startsWith("custom-")).toBe(true);
    expect(clone.widgets.length).toBe(RECOMMENDED_PROFILES[0].profile.widgets.length);
    expect(clone).not.toBe(RECOMMENDED_PROFILES[0].profile);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- recommended-profiles.test.ts
```

Expected: FAIL because data file does not exist.

- [ ] **Step 3: Implement local recommended presets**

Create `frontend/src/hub/overlays/recommended-profiles.ts`:

```ts
import type { ProfileConfig } from "../../lib/profile";

export type RecommendedProfile = {
  id: string;
  name: string;
  description: string;
  tag: "racing" | "streaming" | "minimal";
  readOnly: true;
  profile: ProfileConfig;
};

export const RECOMMENDED_PROFILES: RecommendedProfile[] = [
  {
    id: "vantare-racing-basic",
    name: "Racing Básico",
    description: "Delta, relative y standings para conducir con información esencial.",
    tag: "racing",
    readOnly: true,
    profile: {
      id: "vantare-racing-basic",
      name: "Racing Básico",
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [
        { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
        { id: "relative", type: "relative", enabled: true, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
        { id: "standings", type: "standings", enabled: true, updateHz: 15, position: { x: 1560, y: 40, w: 340, h: 420 } },
      ],
    },
  },
  {
    id: "vantare-stream-clean",
    name: "Streamer Clean",
    description: "Layout OBS limpio con datos legibles y poco ruido visual.",
    tag: "streaming",
    readOnly: true,
    profile: {
      id: "vantare-stream-clean",
      name: "Streamer Clean",
      displayMode: "streaming",
      monitorIndex: 0,
      widgets: [
        { id: "standings", type: "standings", enabled: true, updateHz: 15, position: { x: 1450, y: 70, w: 380, h: 500 } },
        { id: "relative", type: "relative", enabled: true, updateHz: 15, position: { x: 70, y: 650, w: 360, h: 300 } },
        { id: "telemetry", type: "telemetry", enabled: true, updateHz: 30, position: { x: 760, y: 900, w: 420, h: 120 } },
      ],
    },
  },
  {
    id: "vantare-minimal-telemetry",
    name: "Minimal Telemetry",
    description: "Solo telemetría esencial para pantallas pequeñas o PCs modestos.",
    tag: "minimal",
    readOnly: true,
    profile: {
      id: "vantare-minimal-telemetry",
      name: "Minimal Telemetry",
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [
        { id: "telemetry-vertical", type: "telemetry-vertical", enabled: true, updateHz: 30, position: { x: 40, y: 380, w: 140, h: 360 } },
        { id: "pedals", type: "pedals", enabled: true, updateHz: 30, position: { x: 40, y: 760, w: 180, h: 220 } },
      ],
    },
  },
];

export function cloneRecommendedProfile(profile: RecommendedProfile, name: string): ProfileConfig {
  const safeName = name.trim() || `${profile.name} Copy`;
  const slug = safeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    ...structuredClone(profile.profile),
    id: `custom-${slug || profile.id}`,
    name: safeName,
  };
}
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
pnpm --dir frontend test -- recommended-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/recommended-profiles.ts frontend/src/hub/overlays/recommended-profiles.test.ts
git commit -m "feat(hub): add read-only Vantare recommended profiles"
```

---

## Task 4: Studio Home Library

**Files:**
- Create: `frontend/src/hub/overlays/ProfileLibraryCard.tsx`
- Create: `frontend/src/hub/overlays/StudioHome.tsx`
- Test: `frontend/src/hub/overlays/StudioHome.test.tsx`
- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`

- [ ] **Step 1: Create StudioHome test**

Create `frontend/src/hub/overlays/StudioHome.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudioHome } from "./StudioHome";

const profiles = [
  { id: "default-racing", file: "example-racing.json", name: "Default Racing", displayMode: "racing", widgets: 3 },
];

describe("StudioHome", () => {
  it("shows own profiles, widget studio entry, recommended profiles, and community placeholder", () => {
    render(
      <StudioHome
        profiles={profiles}
        onOpenWidgetStudio={vi.fn()}
        onOpenProfile={vi.fn()}
        onCreateProfile={vi.fn()}
        onSaveRecommended={vi.fn()}
      />,
    );
    expect(screen.getByText("Widgets")).toBeTruthy();
    expect(screen.getByText("Perfiles específicos")).toBeTruthy();
    expect(screen.getByText("Default Racing")).toBeTruthy();
    expect(screen.getByText("Comunidad")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
  });

  it("opens widget studio when Widgets is clicked", () => {
    const onOpenWidgetStudio = vi.fn();
    render(
      <StudioHome
        profiles={profiles}
        onOpenWidgetStudio={onOpenWidgetStudio}
        onOpenProfile={vi.fn()}
        onCreateProfile={vi.fn()}
        onSaveRecommended={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Widgets/i }));
    expect(onOpenWidgetStudio).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Create ProfileLibraryCard**

Create `frontend/src/hub/overlays/ProfileLibraryCard.tsx`:

```tsx
import type { ReactNode } from "react";

type ProfileLibraryCardProps = {
  title: string;
  description: string;
  meta?: string;
  actionLabel: string;
  onAction: () => void;
  secondaryAction?: ReactNode;
};

export function ProfileLibraryCard({
  title,
  description,
  meta,
  actionLabel,
  onAction,
  secondaryAction,
}: ProfileLibraryCardProps) {
  return (
    <article className="card-sleek rounded-xl p-5">
      <div className="flex min-h-28 flex-col justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-vantare-textMuted">{description}</p>
          {meta && <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-vantare-textDim">{meta}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAction} className="btn-primary rounded-lg px-4 py-2 text-xs font-bold text-white">
            {actionLabel}
          </button>
          {secondaryAction}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create StudioHome**

Create `frontend/src/hub/overlays/StudioHome.tsx`:

```tsx
import { RECOMMENDED_PROFILES, type RecommendedProfile } from "./recommended-profiles";
import { ProfileLibraryCard } from "./ProfileLibraryCard";
import { profileLabel, type ProfileEntry } from "../state/overlay-workbench";

type StudioHomeProps = {
  profiles: ProfileEntry[];
  onOpenWidgetStudio: () => void;
  onOpenProfile: (profile: ProfileEntry) => void;
  onCreateProfile: () => void;
  onSaveRecommended: (profile: RecommendedProfile) => void;
};

export function StudioHome({
  profiles,
  onOpenWidgetStudio,
  onOpenProfile,
  onCreateProfile,
  onSaveRecommended,
}: StudioHomeProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1800px] flex-col px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Overlays Studio</h1>
          <p className="mt-2 text-sm text-vantare-textMuted">
            Gestiona widgets, perfiles propios y presets recomendados desde un único lugar.
          </p>
        </div>
        <button type="button" onClick={onCreateProfile} className="btn-primary rounded-lg px-5 py-2 text-xs font-bold text-white">
          Nuevo perfil
        </button>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-2xl font-semibold text-white">Mis perfiles</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <ProfileLibraryCard
            title="Widgets"
            description="Edita aspecto, comportamiento y visibilidad de los widgets disponibles."
            meta="Delta · Relative · Standings · Telemetry · Pedals"
            actionLabel="Abrir widgets"
            onAction={onOpenWidgetStudio}
          />
          <div className="card-sleek rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">Perfiles específicos</h3>
                <p className="mt-1 text-sm text-vantare-textMuted">Edita la colocación y tamaño de widgets por perfil.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {profiles.length === 0 && (
                <p className="rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-sm text-vantare-textMuted">
                  No hay perfiles propios todavía.
                </p>
              )}
              {profiles.map((profile) => (
                <button
                  key={profile.file}
                  type="button"
                  onClick={() => onOpenProfile(profile)}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/25 px-3 py-3 text-left transition-colors hover:border-vantare-red-500/40 hover:bg-white/5"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">{profileLabel(profile)}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-vantare-textDim">
                      {profile.displayMode} · {profile.widgets} widgets
                    </span>
                  </span>
                  <span className="text-xs font-bold text-vantare-red-400">Editar</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-2xl font-semibold text-white">Recomendados por Vantare</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {RECOMMENDED_PROFILES.map((profile) => (
            <ProfileLibraryCard
              key={profile.id}
              title={profile.name}
              description={profile.description}
              meta={`${profile.tag} · preset fijo`}
              actionLabel="Guardar como propio"
              onAction={() => onSaveRecommended(profile)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold text-white">Comunidad</h2>
        <div className="card-sleek rounded-xl p-6">
          <p className="font-display text-xl font-semibold text-white">Próximamente</p>
          <p className="mt-2 text-sm text-vantare-textMuted">
            Más adelante podrás descubrir overlays compartidos por la comunidad.
          </p>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire StudioHome in OverlaysStudioPage**

Replace `frontend/src/hub/pages/OverlaysStudioPage.tsx` with:

```tsx
import { useState } from "react";
import { StudioHome } from "../overlays/StudioHome";
import { useOverlayStudioState } from "../overlays/useOverlayStudioState";
import type { RecommendedProfile } from "../overlays/recommended-profiles";
import type { ProfileEntry } from "../state/overlay-workbench";

type StudioMode =
  | { kind: "home" }
  | { kind: "widgets" }
  | { kind: "profile"; profile: ProfileEntry };

export function OverlaysStudioPage() {
  const studio = useOverlayStudioState();
  const [mode, setMode] = useState<StudioMode>({ kind: "home" });

  function createProfile() {
    const name = window.prompt("Nombre del nuevo perfil");
    if (!name?.trim()) return;
    // Existing backend flow creates default editable profile.
    // Refresh comes through hub:profile-created -> hub:list in Task 8.
    window.dispatchEvent(new CustomEvent("vantare:create-profile", { detail: name.trim() }));
  }

  function saveRecommended(profile: RecommendedProfile) {
    const name = window.prompt("Nombre del perfil propio", profile.name);
    if (!name?.trim()) return;
    window.dispatchEvent(new CustomEvent("vantare:save-recommended-profile", {
      detail: { profile, name: name.trim() },
    }));
  }

  if (mode.kind === "widgets") {
    return (
      <div className="px-6 py-8 text-vantare-textMuted">
        Widget Studio se implementa en la siguiente tarea.
        <button type="button" className="ml-4 btn-secondary rounded-lg px-4 py-2 text-xs text-white" onClick={() => setMode({ kind: "home" })}>
          Volver
        </button>
      </div>
    );
  }

  if (mode.kind === "profile") {
    return (
      <div className="px-6 py-8 text-vantare-textMuted">
        Editor de perfil se implementa en tareas posteriores.
        <button type="button" className="ml-4 btn-secondary rounded-lg px-4 py-2 text-xs text-white" onClick={() => setMode({ kind: "home" })}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <StudioHome
      profiles={studio.profiles}
      onOpenWidgetStudio={() => setMode({ kind: "widgets" })}
      onOpenProfile={(profile) => {
        studio.activateProfile(profile);
        setMode({ kind: "profile", profile });
      }}
      onCreateProfile={createProfile}
      onSaveRecommended={saveRecommended}
    />
  );
}
```

This uses custom browser events only as temporary placeholders. Task 8 replaces them with Wails event handlers.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
pnpm --dir frontend test -- StudioHome.test.tsx OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/hub/overlays/ProfileLibraryCard.tsx frontend/src/hub/overlays/StudioHome.tsx frontend/src/hub/overlays/StudioHome.test.tsx frontend/src/hub/pages/OverlaysStudioPage.tsx
git commit -m "feat(hub): build Overlays Studio profile library"
```

---

## Task 5: Widget Studio View

**Files:**
- Create: `frontend/src/hub/overlays/WidgetStudio.tsx`
- Test: `frontend/src/hub/overlays/WidgetStudio.test.tsx`
- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`

- [ ] **Step 1: Create WidgetStudio test**

Create `frontend/src/hub/overlays/WidgetStudio.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetStudio } from "./WidgetStudio";
import type { ProfileConfig } from "../../lib/profile";

const profile: ProfileConfig = {
  id: "p1",
  name: "Profile",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 0, y: 0, w: 400, h: 48 } },
    { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 0, y: 80, w: 320, h: 280 } },
  ],
};

describe("WidgetStudio", () => {
  it("renders widget-level studio with existing widgets only", () => {
    render(<WidgetStudio profile={profile} selectedWidgetId="delta" onSelectWidget={vi.fn()} onChangeProfile={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Widgets")).toBeTruthy();
    expect(screen.getByText("delta")).toBeTruthy();
    expect(screen.getByText("relative")).toBeTruthy();
    expect(screen.queryByText("radar")).toBeNull();
  });

  it("calls back when a widget is selected", () => {
    const onSelectWidget = vi.fn();
    render(<WidgetStudio profile={profile} selectedWidgetId="delta" onSelectWidget={onSelectWidget} onChangeProfile={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /relative/i }));
    expect(onSelectWidget).toHaveBeenCalledWith("relative");
  });
});
```

- [ ] **Step 2: Implement WidgetStudio**

Create `frontend/src/hub/overlays/WidgetStudio.tsx`:

```tsx
import type { ProfileConfig } from "../../lib/profile";
import { PreviewInspector } from "../preview/PreviewInspector";

type WidgetStudioProps = {
  profile: ProfileConfig;
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
  onChangeProfile: (profile: ProfileConfig) => void;
  onBack: () => void;
};

export function WidgetStudio({
  profile,
  selectedWidgetId,
  onSelectWidget,
  onChangeProfile,
  onBack,
}: WidgetStudioProps) {
  const selectedWidget = profile.widgets.find((widget) => widget.id === selectedWidgetId) ?? profile.widgets[0] ?? null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button type="button" onClick={onBack} className="mb-3 text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white">
            ← Volver a Overlays Studio
          </button>
          <h1 className="font-display text-3xl font-bold text-white">Widgets</h1>
          <p className="mt-1 text-sm text-vantare-textMuted">
            Edita aspecto y comportamiento. La colocación se ajusta en perfiles específicos.
          </p>
        </div>
      </div>

      <div className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[280px_1fr_340px]">
        <aside className="card-sleek flex min-h-0 flex-col rounded-xl p-4">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-white">Widgets disponibles</h2>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {profile.widgets.map((widget) => (
              <button
                key={widget.id}
                type="button"
                onClick={() => onSelectWidget(widget.id)}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  selectedWidget?.id === widget.id
                    ? "border-vantare-red-500/50 bg-vantare-red-950/30 text-white"
                    : "border-white/5 bg-black/25 text-vantare-textMuted hover:text-white"
                }`}
              >
                <span className="block font-mono text-xs font-bold">{widget.id}</span>
                <span className="block font-mono text-[10px] text-vantare-textDim">{widget.type}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="card-sleek flex min-h-[420px] items-center justify-center rounded-xl p-6">
          {selectedWidget ? (
            <div className="rounded-xl border border-white/10 bg-black/50 px-8 py-6 text-center">
              <p className="font-display text-2xl font-bold text-white">{selectedWidget.id}</p>
              <p className="mt-2 font-mono text-xs text-vantare-textMuted">{selectedWidget.type}</p>
              <p className="mt-4 max-w-md text-sm text-vantare-textMuted">
                Preview visual del widget. En esta fase usa la configuración real del perfil activo; en una fase posterior se podrán guardar defaults globales por tipo.
              </p>
            </div>
          ) : (
            <p className="text-sm text-vantare-textMuted">Selecciona un widget</p>
          )}
        </section>

        <PreviewInspector
          profile={profile}
          widget={selectedWidget}
          onChangeProfile={onChangeProfile}
          disabled={false}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire WidgetStudio mode**

In `frontend/src/hub/pages/OverlaysStudioPage.tsx`, replace the `mode.kind === "widgets"` branch with:

```tsx
if (mode.kind === "widgets") {
  if (!studio.profile) {
    return (
      <div className="px-6 py-8">
        <button type="button" className="mb-4 text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white" onClick={() => setMode({ kind: "home" })}>
          ← Volver
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
      onSelectWidget={studio.setSelectedWidgetId}
      onChangeProfile={studio.updateDraft}
      onBack={() => setMode({ kind: "home" })}
    />
  );
}
```

Add import:

```tsx
import { WidgetStudio } from "../overlays/WidgetStudio";
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
pnpm --dir frontend test -- WidgetStudio.test.tsx OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/WidgetStudio.tsx frontend/src/hub/overlays/WidgetStudio.test.tsx frontend/src/hub/pages/OverlaysStudioPage.tsx
git commit -m "feat(hub): add widget-level Overlays Studio view"
```

---

## Task 6: Profile Layout Studio Components

**Files:**
- Create: `frontend/src/hub/overlays/StudioWidgetList.tsx`
- Create: `frontend/src/hub/overlays/StudioCanvas.tsx`
- Create: `frontend/src/hub/overlays/StudioInspector.tsx`
- Create: `frontend/src/hub/overlays/StudioActionBar.tsx`
- Create: `frontend/src/hub/overlays/ProfileLayoutStudio.tsx`
- Test: `frontend/src/hub/overlays/ProfileLayoutStudio.test.tsx`
- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`

- [ ] **Step 1: Create ProfileLayoutStudio test**

Create `frontend/src/hub/overlays/ProfileLayoutStudio.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileLayoutStudio } from "./ProfileLayoutStudio";
import type { ProfileConfig } from "../../lib/profile";

const profile: ProfileConfig = {
  id: "p1",
  name: "Profile",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
    { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
  ],
};

describe("ProfileLayoutStudio", () => {
  it("renders the three-pane profile layout editor", () => {
    render(
      <ProfileLayoutStudio
        profile={profile}
        selectedWidgetId="delta"
        dirty={false}
        saveState="idle"
        overlayRunning={false}
        selectedProfileRunning={false}
        obsUrl="http://localhost/overlay?profile=p1"
        onSelectWidget={vi.fn()}
        onChangeProfile={vi.fn()}
        onSave={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByText("1920×1080")).toBeTruthy();
    expect(screen.getByText("Workspace: Activo")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar URL OBS/i })).toBeTruthy();
  });

  it("selects widgets from the left panel", () => {
    const onSelectWidget = vi.fn();
    render(
      <ProfileLayoutStudio
        profile={profile}
        selectedWidgetId="delta"
        dirty={false}
        saveState="idle"
        overlayRunning={false}
        selectedProfileRunning={false}
        obsUrl="http://localhost/overlay?profile=p1"
        onSelectWidget={onSelectWidget}
        onChangeProfile={vi.fn()}
        onSave={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /relative/i }));
    expect(onSelectWidget).toHaveBeenCalledWith("relative");
  });
});
```

- [ ] **Step 2: Implement StudioWidgetList**

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return widgets.filter((widget) => {
      if (filter === "active" && !widget.enabled) return false;
      if (!q) return true;
      return widget.id.toLowerCase().includes(q) || widget.type.toLowerCase().includes(q) || (widget.name ?? "").toLowerCase().includes(q);
    });
  }, [filter, query, widgets]);

  return (
    <aside className="card-sleek flex min-h-0 flex-col rounded-xl">
      <div className="border-b border-white/5 p-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Widgets</h2>
        <div className="mt-3 flex gap-2 rounded-lg border border-white/5 bg-black/30 p-1">
          <button type="button" onClick={() => setFilter("all")} className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase ${filter === "all" ? "bg-white/10 text-white" : "text-vantare-textMuted"}`}>
            Todos
          </button>
          <button type="button" onClick={() => setFilter("active")} className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase ${filter === "active" ? "bg-white/10 text-white" : "text-vantare-textMuted"}`}>
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
        {filtered.map((widget) => (
          <button
            key={widget.id}
            type="button"
            onClick={() => onSelectWidget(widget.id)}
            className={`mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
              selectedWidgetId === widget.id
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
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Implement StudioCanvas**

Create `frontend/src/hub/overlays/StudioCanvas.tsx` by copying `PreviewCanvas` behavior and changing only shell styling. The required outer render shape is:

```tsx
// Use the same imports and drag logic from ../preview/PreviewCanvas.
// Keep LOGICAL_WIDTH = 1920 and LOGICAL_HEIGHT = 1080.
// Keep PreviewWidgetFrame and updateWidgetPosition.

return (
  <section ref={shellRef} className="card-sleek canvas-bg flex min-h-0 flex-col overflow-hidden rounded-xl">
    <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
      <div className="font-mono text-xs text-white/80">{profile.name || profile.id || "Perfil activo"}</div>
      <div className="font-mono text-xs text-vantare-textMuted">1920×1080</div>
    </div>
    <div className="flex min-h-0 flex-1 items-center justify-center p-5">
      <div
        ref={canvasRef}
        data-testid="preview-viewport"
        className="relative bg-black/50 border border-white/10 overflow-hidden outline-none shadow-2xl"
        style={{ width: canvasWidth, height: LOGICAL_HEIGHT * scale }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        <div
          data-testid="preview-scene"
          className="absolute left-0 top-0"
          style={{
            width: LOGICAL_WIDTH,
            height: LOGICAL_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {profile.widgets.map((widget) => (
            <PreviewWidgetFrame
              key={widget.id}
              widget={widget}
              selected={widget.id === selectedWidgetId}
              scale={scale}
              onSelect={onSelectWidget}
              onDragStart={onMouseDown}
              onChangePosition={handleChangePosition}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  </section>
);
```

- [ ] **Step 4: Implement StudioInspector**

Create `frontend/src/hub/overlays/StudioInspector.tsx`:

```tsx
import type { ProfileConfig, WidgetConfig } from "../../lib/profile";
import { PreviewInspector } from "../preview/PreviewInspector";

type StudioInspectorProps = {
  profile: ProfileConfig;
  widget: WidgetConfig | null;
  onChangeProfile: (profile: ProfileConfig) => void;
  disabled: boolean;
};

export function StudioInspector({ profile, widget, onChangeProfile, disabled }: StudioInspectorProps) {
  return (
    <PreviewInspector
      profile={profile}
      widget={widget}
      onChangeProfile={onChangeProfile}
      disabled={disabled}
    />
  );
}
```

- [ ] **Step 5: Implement StudioActionBar**

Create `frontend/src/hub/overlays/StudioActionBar.tsx`:

```tsx
import type { SaveState } from "./useOverlayStudioState";

type StudioActionBarProps = {
  dirty: boolean;
  saveState: SaveState;
  selectedProfileRunning: boolean;
  obsUrl: string;
  onSave: () => void;
  onStart: () => void;
  onStop: () => void;
};

export function StudioActionBar({
  dirty,
  saveState,
  selectedProfileRunning,
  obsUrl,
  onSave,
  onStart,
  onStop,
}: StudioActionBarProps) {
  function copyObsUrl() {
    if (!obsUrl) return;
    void navigator.clipboard.writeText(obsUrl);
  }

  function openBrowserView() {
    if (!obsUrl) return;
    window.open(obsUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-vantare-surface px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-vantare-textMuted">Workspace: Activo</span>
        <span className="font-mono text-[10px] text-vantare-textDim">
          {saveState === "saving" && "Guardando..."}
          {saveState === "saved" && "Guardado"}
          {saveState === "error" && "Error"}
          {saveState === "idle" && dirty && "Cambios sin guardar"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSave} disabled={!dirty || saveState === "saving"} className="btn-secondary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
          Guardar
        </button>
        {selectedProfileRunning ? (
          <button type="button" onClick={onStop} className="btn-secondary rounded-lg px-4 py-2 text-xs font-bold text-white">
            Detener overlay
          </button>
        ) : (
          <button type="button" onClick={onStart} disabled={dirty || saveState === "saving"} className="btn-primary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
            Abrir overlay
          </button>
        )}
        <button type="button" onClick={openBrowserView} className="btn-secondary rounded-lg px-4 py-2 text-xs font-bold text-white">
          Vista navegador
        </button>
        <button type="button" onClick={copyObsUrl} className="btn-primary rounded-lg px-4 py-2 text-xs font-bold text-white">
          Copiar URL OBS
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement ProfileLayoutStudio**

Create `frontend/src/hub/overlays/ProfileLayoutStudio.tsx`:

```tsx
import type { ProfileConfig } from "../../lib/profile";
import type { SaveState } from "./useOverlayStudioState";
import { StudioActionBar } from "./StudioActionBar";
import { StudioCanvas } from "./StudioCanvas";
import { StudioInspector } from "./StudioInspector";
import { StudioWidgetList } from "./StudioWidgetList";

type ProfileLayoutStudioProps = {
  profile: ProfileConfig;
  selectedWidgetId: string | null;
  dirty: boolean;
  saveState: SaveState;
  overlayRunning: boolean;
  selectedProfileRunning: boolean;
  obsUrl: string;
  onSelectWidget: (id: string) => void;
  onChangeProfile: (profile: ProfileConfig) => void;
  onSave: () => void;
  onStart: () => void;
  onStop: () => void;
  onBack: () => void;
};

export function ProfileLayoutStudio({
  profile,
  selectedWidgetId,
  dirty,
  saveState,
  overlayRunning,
  selectedProfileRunning,
  obsUrl,
  onSelectWidget,
  onChangeProfile,
  onSave,
  onStart,
  onStop,
  onBack,
}: ProfileLayoutStudioProps) {
  const selectedWidget = profile.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <button type="button" onClick={onBack} className="mb-2 text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white">
            ← Volver a Overlays Studio
          </button>
          <h1 className="font-display text-2xl font-bold text-white">{profile.name || profile.id || "Perfil"}</h1>
        </div>
        {overlayRunning && (
          <div className="rounded-lg border border-vantare-red-500/30 bg-vantare-red-950/20 px-3 py-2 text-xs text-vantare-red-300">
            Detén el overlay antes de editar.
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr_340px]">
        <StudioWidgetList widgets={profile.widgets} selectedWidgetId={selectedWidgetId} onSelectWidget={onSelectWidget} />
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl">
          <StudioCanvas
            profile={profile}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={onSelectWidget}
            onChangeProfile={onChangeProfile}
            disabled={overlayRunning}
          />
          <StudioActionBar
            dirty={dirty}
            saveState={saveState}
            selectedProfileRunning={selectedProfileRunning}
            obsUrl={obsUrl}
            onSave={onSave}
            onStart={onStart}
            onStop={onStop}
          />
        </div>
        <StudioInspector profile={profile} widget={selectedWidget} onChangeProfile={onChangeProfile} disabled={overlayRunning} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Wire profile mode**

In `frontend/src/hub/pages/OverlaysStudioPage.tsx`, replace the `mode.kind === "profile"` branch with:

```tsx
if (mode.kind === "profile") {
  if (!studio.profile) {
    return (
      <div className="px-6 py-8">
        <button type="button" className="mb-4 text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white" onClick={() => setMode({ kind: "home" })}>
          ← Volver
        </button>
        <div className="glass-panel rounded-xl p-8 text-sm text-vantare-textMuted">
          Cargando perfil...
        </div>
      </div>
    );
  }
  return (
    <ProfileLayoutStudio
      profile={studio.profile}
      selectedWidgetId={studio.selectedWidgetId}
      dirty={studio.dirty}
      saveState={studio.saveState}
      overlayRunning={studio.overlayRunning}
      selectedProfileRunning={studio.selectedProfileRunning}
      obsUrl={studio.obsUrl}
      onSelectWidget={studio.setSelectedWidgetId}
      onChangeProfile={studio.updateDraft}
      onSave={studio.saveProfile}
      onStart={studio.startSelectedProfile}
      onStop={studio.stopOverlay}
      onBack={() => setMode({ kind: "home" })}
    />
  );
}
```

Add import:

```tsx
import { ProfileLayoutStudio } from "../overlays/ProfileLayoutStudio";
```

- [ ] **Step 8: Run focused tests**

Run:

```powershell
pnpm --dir frontend test -- ProfileLayoutStudio.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add frontend/src/hub/overlays/StudioWidgetList.tsx frontend/src/hub/overlays/StudioCanvas.tsx frontend/src/hub/overlays/StudioInspector.tsx frontend/src/hub/overlays/StudioActionBar.tsx frontend/src/hub/overlays/ProfileLayoutStudio.tsx frontend/src/hub/overlays/ProfileLayoutStudio.test.tsx frontend/src/hub/pages/OverlaysStudioPage.tsx
git commit -m "feat(hub): add profile layout editor to Overlays Studio"
```

---

## Task 7: Autosave, Keyboard Shortcuts, and Manual Save Stability

**Files:**
- Modify: `frontend/src/hub/overlays/useOverlayStudioState.ts`
- Test: `frontend/src/hub/overlays/useOverlayStudioState.test.tsx`

- [ ] **Step 1: Extend hook tests**

Add to `useOverlayStudioState.test.tsx`:

```tsx
it("emits layout:save when saving a dirty profile", () => {
  const { result } = renderHook(() => useOverlayStudioState());
  act(() => {
    result.current.loadProfileForTest({
      id: "p1",
      name: "Profile",
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [{ id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 0, y: 0, w: 400, h: 48 } }],
    });
  });
  act(() => {
    result.current.updateDraft({
      id: "p1",
      name: "Profile",
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [{ id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 10, y: 0, w: 400, h: 48 } }],
    });
  });
  act(() => {
    result.current.saveProfile();
  });
  expect(Events.Emit).toHaveBeenCalledWith("layout:save", {
    widgets: [{ id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 10, y: 0, w: 400, h: 48 } }],
  });
});
```

- [ ] **Step 2: Add autosave and keyboard effects**

In `useOverlayStudioState.ts`, add after `saveProfile` definition:

```tsx
useEffect(() => {
  if (!dirty) return;
  const id = window.setTimeout(() => saveProfile(), 800);
  return () => window.clearTimeout(id);
}, [dirty, profile, saveProfile]);

useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
      event.preventDefault();
      redo();
    } else if (event.key === "s") {
      event.preventDefault();
      saveProfile();
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [redo, saveProfile, undo]);
```

- [ ] **Step 3: Run hook tests**

Run:

```powershell
pnpm --dir frontend test -- useOverlayStudioState.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/hub/overlays/useOverlayStudioState.ts frontend/src/hub/overlays/useOverlayStudioState.test.tsx
git commit -m "feat(hub): preserve autosave and shortcuts in Overlays Studio"
```

---

## Task 8: Profile Creation and Recommended Copy Wiring

**Files:**
- Modify: `internal/app/hub_service.go`
- Modify: `internal/app/hub_service_test.go`
- Modify: `cmd/vantare/main.go`
- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`

- [ ] **Step 1: Add Go test for saving an imported profile**

Add to `internal/app/hub_service_test.go`:

```go
func TestHubServiceSaveProfileAsOwnCopy(t *testing.T) {
	dir := t.TempDir()
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), nil, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil, nil)

	p := &config.ProfileConfig{
		ID:          "custom-recommended-copy",
		Name:        "Recommended Copy",
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 1, Y: 2, W: 3, H: 4}},
		},
	}

	if err := hubSvc.SaveProfileAsOwnCopy(p); err != nil {
		t.Fatal(err)
	}
	loaded, err := config.LoadFile(filepath.Join(dir, "custom-recommended-copy.json"))
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Name != "Recommended Copy" {
		t.Fatalf("name=%q", loaded.Name)
	}
}
```

- [ ] **Step 2: Run Go test to verify it fails**

Run:

```powershell
go test ./internal/app/... -run TestHubServiceSaveProfileAsOwnCopy -v
```

Expected: FAIL because `SaveProfileAsOwnCopy` does not exist.

- [ ] **Step 3: Implement SaveProfileAsOwnCopy**

Add to `internal/app/hub_service.go`:

```go
// SaveProfileAsOwnCopy persists an imported/read-only preset as a normal user profile.
func (s *HubService) SaveProfileAsOwnCopy(profile *config.ProfileConfig) error {
	if s.profilesDir == "" {
		return fmt.Errorf("profiles directory not configured")
	}
	if profile == nil {
		return fmt.Errorf("profile is required")
	}
	id := strings.TrimSpace(profile.ID)
	if id == "" {
		return fmt.Errorf("profile id is required")
	}
	basename := filepath.Base(id)
	if basename != id || strings.Contains(basename, "..") {
		return fmt.Errorf("invalid profile id")
	}
	if !strings.HasPrefix(id, "custom-") {
		id = "custom-" + id
		profile.ID = id
	}
	path := filepath.Join(s.profilesDir, id+".json")
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("profile already exists: %s", id)
	}
	return config.SaveFile(path, profile)
}
```

- [ ] **Step 4: Wire Wails event**

In `cmd/vantare/main.go`, add near other hub event handlers:

```go
wailsApp.Event.On("hub:save-own-copy", func(event *application.CustomEvent) {
	var data struct {
		Profile config.ProfileConfig `json:"profile"`
	}
	if event.Data != nil {
		if raw, err := json.Marshal(event.Data); err == nil {
			_ = json.Unmarshal(raw, &data)
		}
	}
	if err := hubSvc.SaveProfileAsOwnCopy(&data.Profile); err != nil {
		log.Printf("hub:save-own-copy error: %v", err)
		emitHubError(err.Error())
		return
	}
	emitter.Emit("hub:profile-created", map[string]any{"ok": true})
})
```

- [ ] **Step 5: Replace temporary browser events in OverlaysStudioPage**

In `frontend/src/hub/pages/OverlaysStudioPage.tsx`, import:

```tsx
import { Events } from "@wailsio/runtime";
import { cloneRecommendedProfile } from "../overlays/recommended-profiles";
```

Replace `createProfile`:

```tsx
function createProfile() {
  const name = window.prompt("Nombre del nuevo perfil");
  if (!name?.trim()) return;
  Events.Emit("hub:create", { name: name.trim() });
}
```

Replace `saveRecommended`:

```tsx
function saveRecommended(profile: RecommendedProfile) {
  const name = window.prompt("Nombre del perfil propio", profile.name);
  if (!name?.trim()) return;
  Events.Emit("hub:save-own-copy", { profile: cloneRecommendedProfile(profile, name.trim()) });
}
```

- [ ] **Step 6: Refresh list after create/copy**

In `useOverlayStudioState.ts`, inside the main effect, add:

```tsx
const unsubCreated = Events.On("hub:profile-created", () => {
  Events.Emit("hub:list");
});
```

And call `unsubCreated()` in cleanup.

- [ ] **Step 7: Run Go and frontend tests**

Run:

```powershell
go test ./internal/app/... -run TestHubServiceSaveProfileAsOwnCopy -v
pnpm --dir frontend test -- recommended-profiles.test.ts OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add internal/app/hub_service.go internal/app/hub_service_test.go cmd/vantare/main.go frontend/src/hub/pages/OverlaysStudioPage.tsx frontend/src/hub/overlays/useOverlayStudioState.ts
git commit -m "feat(hub): save recommended overlays as own profiles"
```

---

## Task 9: Responsive Behavior and Visual Polish

**Files:**
- Modify: `frontend/src/hub/overlays/ProfileLayoutStudio.tsx`
- Modify: `frontend/src/hub/overlays/WidgetStudio.tsx`
- Modify: `frontend/src/hub/overlays/StudioHome.tsx`
- Modify: `frontend/src/index.css` only if a reusable `.canvas-bg` utility is needed.

- [ ] **Step 1: Ensure profile editor stacks on narrow screens**

In `ProfileLayoutStudio.tsx`, change grid classes:

```tsx
<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:overflow-hidden xl:grid-cols-[280px_1fr_340px]">
```

Set each panel minimum height on mobile:

```tsx
<StudioWidgetList ... />
<div className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl">
...
</div>
<StudioInspector ... />
```

- [ ] **Step 2: Add dark canvas background utility if missing**

In `frontend/src/index.css`, add:

```css
.canvas-bg {
  background:
    radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(180deg, rgba(8, 8, 8, 0.96), rgba(8, 8, 8, 0.9));
  background-size: 32px 32px, auto;
}
```

- [ ] **Step 3: Run frontend build**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/hub/overlays/ProfileLayoutStudio.tsx frontend/src/hub/overlays/WidgetStudio.tsx frontend/src/hub/overlays/StudioHome.tsx frontend/src/index.css
git commit -m "style(hub): polish Overlays Studio responsive layout"
```

---

## Task 10: Remove Visible Legacy Preview Flow

**Files:**
- Modify: `frontend/src/hub/pages/ProfilesPage.tsx` only if no longer imported.
- Modify: `frontend/src/hub/pages/PreviewPage.tsx` only if no longer imported.
- Delete later only after search confirms no references.

- [ ] **Step 1: Search references**

Run:

```powershell
rg "PreviewPage|ProfilesPage|section === \"preview\"|onOpenPreview" frontend/src
```

Expected: no active route references from `HubApp`. Test references may remain.

- [ ] **Step 2: Keep legacy files for one release**

Do not delete `PreviewPage.tsx`, `ProfilesPage.tsx`, or preview components in this task. They remain as fallback during Phase A verification.

- [ ] **Step 3: Add cleanup note**

Add this comment at the top of `frontend/src/hub/pages/PreviewPage.tsx`:

```tsx
// Legacy fallback for the pre-Overlays-Studio preview flow. Do not route to this
// page from HubApp; remove after Overlays Studio has passed manual validation.
```

Add this comment at the top of `frontend/src/hub/pages/ProfilesPage.tsx`:

```tsx
// Legacy fallback for the pre-Overlays-Studio profile list. Do not route to this
// page from HubApp; remove after Overlays Studio has passed manual validation.
```

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/hub/pages/PreviewPage.tsx frontend/src/hub/pages/ProfilesPage.tsx
git commit -m "chore(hub): mark legacy overlay pages as fallback"
```

---

## Task 11: Full Verification

**Files:**
- No code changes unless a test fails.

- [ ] **Step 1: Run Go tests**

Run:

```powershell
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests**

Run:

```powershell
pnpm --dir frontend test
```

Expected: PASS.

- [ ] **Step 3: Build frontend**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 4: Run app in mock mode**

Run:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens on `Hub`.
- Topbar shows `Overlays Studio`, not `Preview`.
- Enter `Overlays Studio`.
- Library shows `Mis perfiles`, `Recomendados por Vantare`, `Comunidad Próximamente`.
- Open a profile under `Perfiles específicos`.
- Three-pane editor renders.
- Drag a widget in canvas.
- `Cambios sin guardar` appears.
- Manual `Guardar` saves.
- `Abrir overlay` opens runtime overlay.
- Editor blocks changes while overlay is running.
- `Detener overlay` closes runtime overlay.

- [ ] **Step 5: Validate OBS technical path**

With the app still running:

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-racing.json"
curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream
```

Expected:

- `/health` returns `{"ok":true}`.
- `/api/profile` returns JSON.
- SSE emits `event: telemetry`.

- [ ] **Step 6: Validate OBS UI manually**

Open the copied OBS URL in a browser:

```text
http://127.0.0.1:39261/overlay?profile=example-racing.json&obs=1
```

Expected:

- Overlay page loads without blank screen.
- Assets load.
- Widgets render.

- [ ] **Step 7: Commit verification evidence**

Create or update evidence file:

`../.omo/evidence/2026-06-18-overlays-studio-phase-a.md`

Content:

```md
# Overlays Studio Phase A Verification

- go test ./...: PASS
- pnpm --dir frontend test: PASS
- pnpm --dir frontend build: PASS
- Mock app smoke: PASS
- OBS /health: PASS
- OBS /api/profile: PASS
- OBS SSE: PASS
- Browser overlay URL: PASS
```

Commit:

```powershell
git add ../.omo/evidence/2026-06-18-overlays-studio-phase-a.md
git commit -m "test: verify Overlays Studio phase A"
```

---

## Phase B Follow-Up Plan Boundary

Do not implement Phase B in this plan.

Create a separate plan after Phase A is verified:

```text
docs/superpowers/plans/YYYY-MM-DD-overlays-studio-desktop-edit-mode.md
```

Phase B should add:

- `/overlay/edit` route.
- Desktop edit overlay window.
- Real 1:1 drag/resize on monitor.
- Shared save path with Phase A profile state.
- Tests proving OBS `/overlay?profile=...` remains clean.

---

## Self-Review

**Spec coverage:**

- One tab replacing `Overlays` + `Preview`: Tasks 1 and 10.
- Library with `Mis perfiles`, `Recomendados`, `Comunidad`: Tasks 3 and 4.
- `Comunidad` as `Próximamente`: Task 4.
- Recommended read-only presets copied to own profiles: Tasks 3 and 8.
- Widget editor separate from profile layout editor: Tasks 5 and 6.
- Existing widgets only: Tasks 3, 5, and 6.
- Hub canvas drag/resize retained in Phase A: Task 6.
- Autosave + manual save + undo/redo: Tasks 2 and 7.
- OBS copy/browser validation: Tasks 6 and 11.
- Responsive stacking: Task 9.
- Phase B deferred: dedicated boundary section.

**Placeholder scan:** No `TBD`, `TODO`, or unspecified implementation steps remain. The only intentionally deferred scope is Phase B, explicitly out of scope.

**Type consistency:** React files use existing `ProfileConfig`, `WidgetConfig`, `ProfileEntry`, `OverlayStatus`, and Wails events already present in the app. New Go helper uses existing `config.ProfileConfig` and `config.SaveFile`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-overlays-studio-unified-editor.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
