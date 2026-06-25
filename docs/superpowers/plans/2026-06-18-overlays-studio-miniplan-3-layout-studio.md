# Overlays Studio Miniplan 3 — Layout Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Overlays Studio > Mis perfiles > Perfiles específicos` open a Layout Studio where the user can edit the placement, size, and visibility of widgets for a specific profile, keeping the appearance controls separated in Widget Studio.

**Architecture:** 
- Add a new `showAppearanceControls` prop to `PreviewInspector` to allow hiding the "APARIENCIA" section.
- Create a new `LayoutStudio` component that reuses `PreviewCanvas` and `PreviewInspector`.
- Connect `LayoutStudio` to `OverlaysStudioPage` using the same `useOverlayStudioState` hook to get autosave, undo/redo, and persistence for free.
- When clicking a profile in the list, activate it (e.g. `Events.Emit("hub:activate", { file: _profile.file })` or similar) so `useOverlayStudioState` automatically loads it.

**Tech Stack:** React 19, TypeScript, Wails v3 events, Tailwind CSS v4, Vitest, Testing Library.

---

## Task 1: Update PreviewInspector to allow hiding Appearance

**Files:**
- Modify: `frontend/src/hub/preview/PreviewInspector.tsx`
- Modify: `frontend/src/hub/preview/PreviewInspector.test.tsx`

**Step 1: Write the failing test**

In `frontend/src/hub/preview/PreviewInspector.test.tsx`, add a test to verify `showAppearanceControls`:

```tsx
  it("hides appearance controls when showAppearanceControls is false", () => {
    render(<PreviewInspector profile={profile} widget={widget} onChangeProfile={vi.fn()} showAppearanceControls={false} />);
    expect(screen.queryByText("APARIENCIA")).toBeNull();
    expect(screen.getByText("POSICIÓN Y TAMAÑO")).toBeTruthy();
  });
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test -- PreviewInspector.test.tsx`
Expected: FAIL because `showAppearanceControls` is not supported yet and "APARIENCIA" is found.

**Step 3: Implement the change**

In `frontend/src/hub/preview/PreviewInspector.tsx`:
1. Add `showAppearanceControls?: boolean;` to `PreviewInspectorProps`.
2. Add `showAppearanceControls = true,` to the destructured props.
3. Wrap the "APARIENCIA" accordion section (the header `div` and the content `div` with `openSections.appearance`) inside `{showAppearanceControls && ( ... )}`.

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test -- PreviewInspector.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/hub/preview/PreviewInspector.tsx frontend/src/hub/preview/PreviewInspector.test.tsx
git commit -m "feat(hub): add showAppearanceControls prop to PreviewInspector"
```

---

## Task 2: Create LayoutStudio View

**Files:**
- Create: `frontend/src/hub/overlays/LayoutStudio.tsx`
- Create: `frontend/src/hub/overlays/LayoutStudio.test.tsx`

**Step 1: Write the failing test**

Create `frontend/src/hub/overlays/LayoutStudio.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayoutStudio } from "./LayoutStudio";
import type { ProfileConfig } from "../../lib/profile";

const profile: ProfileConfig = {
  id: "default-racing",
  name: "Default Racing",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
  ],
};

describe("LayoutStudio", () => {
  it("renders layout studio and hides appearance controls", () => {
    render(
      <LayoutStudio
        profile={profile}
        selectedWidgetId="delta"
        dirty={false}
        saveState="idle"
        onSelectWidget={vi.fn()}
        onChangeProfile={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Perfiles Específicos")).toBeTruthy();
    expect(screen.queryByText("APARIENCIA")).toBeNull();
    expect(screen.getByText("POSICIÓN Y TAMAÑO")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test -- LayoutStudio.test.tsx`
Expected: FAIL because `LayoutStudio.tsx` does not exist.

**Step 3: Implement LayoutStudio**

Create `frontend/src/hub/overlays/LayoutStudio.tsx` mirroring `WidgetStudio.tsx` but using `PreviewCanvas` and `PreviewInspector` instead of Widget panels:

```tsx
import type { ProfileConfig } from "../../lib/profile";
import type { SaveState } from "./useOverlayStudioState";
import { StudioWidgetList } from "./StudioWidgetList";
import { PreviewCanvas } from "../preview/PreviewCanvas";
import { PreviewInspector } from "../preview/PreviewInspector";

type LayoutStudioProps = {
  profile: ProfileConfig;
  selectedWidgetId: string | null;
  dirty: boolean;
  saveState: SaveState;
  onSelectWidget: (id: string) => void;
  onChangeProfile: (profile: ProfileConfig) => void;
  onSave: () => void;
  onBack: () => void;
};

export function LayoutStudio({
  profile,
  selectedWidgetId,
  dirty,
  saveState,
  onSelectWidget,
  onChangeProfile,
  onSave,
  onBack,
}: LayoutStudioProps) {
  const selectedWidget = profile.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white cursor-pointer"
          >
            ← Volver a Overlays Studio
          </button>
          <h1 className="font-display text-3xl font-bold text-white">Perfiles Específicos</h1>
          <p className="mt-1 text-sm text-vantare-textMuted">
            Editando la colocación y visibilidad de los widgets para el perfil activo.
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
            className="btn-secondary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
        <PreviewCanvas
          profile={profile}
          selectedWidgetId={selectedWidget?.id ?? null}
          onSelectWidget={onSelectWidget}
          onChangeProfile={onChangeProfile}
        />
        <PreviewInspector
          profile={profile}
          widget={selectedWidget}
          onChangeProfile={onChangeProfile}
          showAppearanceControls={false}
          showPositionControls={true}
          showDangerActions={true}
        />
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test -- LayoutStudio.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/hub/overlays/LayoutStudio.tsx frontend/src/hub/overlays/LayoutStudio.test.tsx
git commit -m "feat(hub): add LayoutStudio component"
```

---

## Task 3: Integrate LayoutStudio in OverlaysStudioPage

**Files:**
- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`

**Step 1: Implement integration**

In `frontend/src/hub/pages/OverlaysStudioPage.tsx`:

1. Update `StudioMode` type:
```tsx
type StudioMode = "home" | "widgets" | "layout";
```

2. Update `openProfile` function:
```tsx
  function openProfile(_profile: ProfileEntry) {
    // Emitimos el evento para que el backend cargue y active este perfil
    // El backend debe emitir un profile:loaded en respuesta (que useOverlayStudioState ya maneja).
    Events.Emit("hub:activate", { file: _profile.file });
    setNotice(null);
    setMode("layout");
  }
```

3. Add `layout` mode rendering below `widgets` mode rendering:
```tsx
  if (mode === "layout") {
    if (!studio.profile) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1200px] flex-col px-6 py-8">
          <button
            type="button"
            className="mb-4 w-fit text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white cursor-pointer"
            onClick={() => setMode("home")}
          >
            ← Volver a Overlays Studio
          </button>
          <div className="glass-panel rounded-xl p-8 text-sm text-vantare-textMuted">
            Cargando perfil...
          </div>
        </div>
      );
    }

    return (
      <LayoutStudio
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
```

**Step 2: Run the tests**

Run: `pnpm --dir frontend test`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/src/hub/pages/OverlaysStudioPage.tsx
git commit -m "feat(hub): integrate LayoutStudio into OverlaysStudioPage"
```
