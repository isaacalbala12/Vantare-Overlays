# Plan B — Overlay Desktop Edit Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real drag/resize editor inside the desktop overlay window via a new `/overlay/edit` route.

**Architecture:**
- `main.tsx` routes `/overlay/edit` to a new `EditOverlayApp`.
- `EditOverlayApp` loads the active profile through Wails Events (same as `CompositeApp`), renders enabled widgets with `WidgetEditFrame`, and saves positions via the existing `layout:save` Wails event.
- `WidgetEditFrame` handles drag and resize locally and commits the final rect to the parent on `mouseup`.
- The OBS/streaming path (`/overlay?profile=...`) is left untouched.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Wails Events.

**Target release:** v0.2.10-alpha.1.

**Prerequisite:** Plan A is merged and tagged.
---

## Task B1: Create WidgetEditFrame

**Files:**
- Create: `vantare-v2/frontend/src/overlay/WidgetEditFrame.tsx`
- Create: `vantare-v2/frontend/src/overlay/WidgetEditFrame.test.tsx`

- [ ] **Step 1: Implement WidgetEditFrame**

```typescript
import { useRef, useState } from "react";
import type { Rect, WidgetConfig } from "../lib/profile";
import { getWidgetStyle } from "../lib/profile";
import { WIDGET_COMPONENTS } from "./shared-widget-map";

const MIN_SIZE = { w: 80, h: 40 };

type WidgetEditFrameProps = {
  widget: WidgetConfig;
  onChange: (widgetId: string, rect: Rect) => void;
};

export function WidgetEditFrame({ widget, onChange }: WidgetEditFrameProps) {
  const Component = WIDGET_COMPONENTS[widget.type];
  const [previewRect, setPreviewRect] = useState<Rect | null>(null);
  const visualRect = previewRect ?? widget.position;
  const committedRef = useRef(onChange);
  committedRef.current = onChange;

  function handleDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.testid?.startsWith("resize-handle-")) return;
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = { ...widget.position };
    let lastRect = startRect;

    function onMouseMove(ev: MouseEvent) {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
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

  function handleResizeStart(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = { ...widget.position };
    let lastRect = startRect;

    function onMouseMove(ev: MouseEvent) {
      const dw = ev.clientX - startMouseX;
      const dh = ev.clientY - startMouseY;
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

  const style = getWidgetStyle(widget);

  return (
    <div
      data-testid={`edit-frame-${widget.id}`}
      onMouseDown={handleDragStart}
      className="absolute border border-vantare-red-400/70 hover:border-vantare-red-400 cursor-move"
      style={{
        left: visualRect.x,
        top: visualRect.y,
        width: visualRect.w,
        height: visualRect.h,
      }}
    >
      {Component && (
        <div className="w-full h-full overflow-hidden" style={{ pointerEvents: "none" }}>
          <Component
            editMode={true}
            telemetryMode="mock"
            updateHz={widget.updateHz}
            props={{ ...widget.props, style }}
          />
        </div>
      )}
      <div
        data-testid={`resize-handle-${widget.id}`}
        className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-vantare-red-500 cursor-se-resize"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add test**

Create `vantare-v2/frontend/src/overlay/WidgetEditFrame.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WidgetEditFrame } from "./WidgetEditFrame";
import type { WidgetConfig } from "../lib/profile";

vi.mock("./shared-widget-map", () => ({
  WIDGET_COMPONENTS: {
    delta: () => <div data-testid="delta-mock">Delta</div>,
  },
}));

function makeWidget(): WidgetConfig {
  return {
    id: "w1",
    type: "delta",
    enabled: true,
    updateHz: 30,
    position: { x: 10, y: 10, w: 100, h: 50 },
    props: {},
  };
}

describe("WidgetEditFrame", () => {
  it("renders the widget", () => {
    render(<WidgetEditFrame widget={makeWidget()} onChange={vi.fn()} />);
    expect(screen.getByTestId("edit-frame-w1")).toBeTruthy();
  });

  it("calls onChange after resize", () => {
    const onChange = vi.fn();
    render(<WidgetEditFrame widget={makeWidget()} onChange={onChange} />);
    const handle = screen.getByTestId("resize-handle-w1");
    fireEvent.mouseDown(handle, { clientX: 110, clientY: 60 });
    fireEvent.mouseMove(window, { clientX: 130, clientY: 80 });
    fireEvent.mouseUp(window);
    expect(onChange).toHaveBeenCalled();
    const rect = onChange.mock.calls[0][1];
    expect(rect.w).toBeGreaterThan(100);
    expect(rect.h).toBeGreaterThan(50);
  });
});
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(overlay): WidgetEditFrame for desktop edit mode"
```

---

## Task B2: Create EditOverlayApp

**Files:**
- Create: `vantare-v2/frontend/src/overlay/EditOverlayApp.tsx`
- Create: `vantare-v2/frontend/src/overlay/EditOverlayApp.test.tsx`

- [ ] **Step 1: Implement EditOverlayApp**

```typescript
import { useEffect, useState } from "react";
import { Events } from "@wailsio/runtime";
import type { ProfileConfig, LayoutOrigin, Rect } from "../lib/profile";
import { applyOverlayDocumentMode } from "./overlay-document";
import { WidgetEditFrame } from "./WidgetEditFrame";

export function EditOverlayApp() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);

  useEffect(() => {
    return applyOverlayDocumentMode();
  }, []);

  useEffect(() => {
    const unsub = Events.On("profile:loaded", (event: { data: { profile?: ProfileConfig; layoutOrigin?: LayoutOrigin } }) => {
      if (event.data.profile) {
        setProfile(event.data.profile);
      }
    });

    const unsubSaved = Events.On("layout:saved", () => {
      Events.Emit("profile:request");
    });

    Events.Emit("profile:request");

    return () => {
      unsub?.();
      unsubSaved?.();
    };
  }, []);

  function handleChange(widgetId: string, rect: Rect) {
    if (!profile) return;
    const next: ProfileConfig = {
      ...profile,
      widgets: profile.widgets.map((w) => (w.id === widgetId ? { ...w, position: rect } : w)),
    };
    setProfile(next);
    Events.Emit("layout:save", {
      widgets: next.widgets,
    });
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center w-screen h-screen text-white/40 text-sm">
        Loading edit mode...
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent">
      {profile.widgets
        .filter((w) => w.enabled)
        .map((w) => (
          <WidgetEditFrame key={w.id} widget={w} onChange={handleChange} />
        ))}
    </div>
  );
}
```

Important: the `layout:save` payload must contain full `WidgetConfig` objects, not just `{id, position}`. The existing backend handler unmarshals into `[]config.WidgetConfig`. Passing the full `next.widgets` array satisfies that.

- [ ] **Step 2: Add test**

Create `vantare-v2/frontend/src/overlay/EditOverlayApp.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
- `vantare-v2/cmd/vantare/main.go` to `"v0.2.10-alpha.1"`
- `vantare-v2/build/config.yml` to `0.2.10`
- `vantare-v2/build/windows/nsis/project.nsi` to `0.2.10`

- [ ] **Step 2: Update CHANGELOG.md**

Add v0.2.10-alpha.1 entry.

- [ ] **Step 3: Full verification**

```bash
cd vantare-v2 && go test ./...
pnpm --dir vantare-v2/frontend test
pnpm --dir vantare-v2/frontend build
cd vantare-v2 && wails3 build -tags release
cmd.exe /C "C:\Users\isaac\AppData\Local\Temp\vantare-build-nsis.bat"
sha256sum vantare-v2/bin/vantare-amd64-installer.exe
```

- [ ] **Step 4: Commit, tag, push and release**

```bash
git add -A
git commit -m "release: v0.2.10-alpha.1 overlay edit mode"
git tag -a v0.2.10-alpha.1 -m "v0.2.10-alpha.1"
git push origin master
git push origin v0.2.10-alpha.1
gh release create v0.2.10-alpha.1 vantare-v2/bin/vantare-amd64-installer.exe --repo isaacalbala12/Vantare-Overlays --title "v0.2.10-alpha.1" --notes-file "docs/superpowers/plans/v0.2.10-alpha.1-release-notes.md" --prerelease
```
  applyOverlayDocumentMode: () => vi.fn(),
}));

vi.mock("./shared-widget-map", () => ({
  WIDGET_COMPONENTS: {
    delta: () => <div data-testid="delta-mock">Delta</div>,
  },
}));

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn((name: string, handler: (event: { data: unknown }) => void) => {
      if (name === "profile:loaded") {
        handler({
          data: {
            profile: {
              id: "p1",
              displayMode: "racing",
              widgets: [{ id: "w1", type: "delta", enabled: true, position: { x: 10, y: 10, w: 100, h: 50 } }],
            },
            layoutOrigin: { x: 0, y: 0 },
          },
        });
      }
      return vi.fn();
    }),
    Emit: vi.fn(),
  },
}));

describe("EditOverlayApp", () => {
  it("renders edit frame for enabled widget", async () => {
    render(<EditOverlayApp />);
    expect(await screen.findByTestId("edit-frame-w1")).toBeTruthy();
  });
});
```

Run: `pnpm --dir vantare-v2/frontend test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(overlay): EditOverlayApp desktop edit mode"
```

---

## Task B3: Wire /overlay/edit route

**Files:**
- Modify: `vantare-v2/frontend/src/main.tsx`

- [ ] **Step 1: Add EditOverlayApp import and route**

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
git commit -am "feat(overlay): wire /overlay/edit route"
```

---

## Task B4: Add "Editar posición" button in ProfilesPage

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`

- [ ] **Step 1: Add button and event**

Inside each profile card, add:

```typescript
<button
  type="button"
  onClick={() => Events.Emit("overlay:edit:start", { id: p.id, file: p.file })}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap"
>
  Editar posición
</button>
```

- [ ] **Step 2: Verify build**

Run: `pnpm --dir vantare-v2/frontend build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(hub): button to open desktop overlay edit mode"
```

---

## Task B5: Version bump and release

- [ ] **Step 1: Update version strings**

Update:
- `vantare-v2/cmd/vantare/main.go` to `"v0.2.10-alpha.1"`
- `vantare-v2/build/config.yml` to `0.2.10`
- `vantare-v2/build/windows/nsis/project.nsi` to `0.2.10`

- [ ] **Step 2: Update CHANGELOG.md**

Add v0.2.10-alpha.1 entry.

- [ ] **Step 3: Full verification**

```bash
cd vantare-v2 && go test ./...
pnpm --dir vantare-v2/frontend test
pnpm --dir vantare-v2/frontend build
cd vantare-v2 && wails3 build -tags release
cmd.exe /C "C:\Users\isaac\AppData\Local\Temp\vantare-build-nsis.bat"
sha256sum vantare-v2/bin/vantare-amd64-installer.exe
```

- [ ] **Step 4: Commit, tag, push and release**

```bash
git add -A
git commit -m "release: v0.2.10-alpha.1 overlay edit mode"
git tag -a v0.2.10-alpha.1 -m "v0.2.10-alpha.1"
git push origin master
git push origin v0.2.10-alpha.1
gh release create v0.2.10-alpha.1 vantare-v2/bin/vantare-amd64-installer.exe --repo isaacalbala12/Vantare-Overlays --title "v0.2.10-alpha.1" --notes-file "docs/superpowers/plans/v0.2.10-alpha.1-release-notes.md" --prerelease
```

---

## Self-review

**Spec coverage:**
- Desktop overlay edit mode → Tasks B1, B2, B3.
- Drag/resize real positions → Task B1.
- Clean OBS path untouched → only the new route is added; `/overlay?profile=...` still maps to `ObsOverlayApp`.
- Button to open edit mode from Hub → Task B4.
- Full widget payload for `layout:save` → Task B2.
- Style passed to widgets → Task B1.

**Placeholder scan:** no placeholders.

**Type consistency:** `Rect`, `ProfileConfig`, `LayoutOrigin` from `lib/profile.ts`. `layout:save` payload now matches existing backend handler expectations.
