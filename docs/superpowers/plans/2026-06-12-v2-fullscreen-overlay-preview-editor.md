# V2 Fullscreen Overlay Preview Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace desktop overlay editing with a Hub preview editor, while the real racing overlay becomes a fullscreen transparent click-through layer.

**Architecture:** The real overlay window should have one simple job: render enabled widgets over the sim in fullscreen transparent mode and ignore mouse input. Layout editing moves into the Hub, where a normal React page renders a 16:9 preview canvas, scales profile coordinates to preview pixels, supports dragging widgets, and saves the updated profile JSON through Go services.

**Tech Stack:** Go/Wails v3 window manager and services, React 19, Tailwind v4, existing V2 profile JSON schema.

---

## Roadmap Position

This is a corrective plan between completed F6 and pending F7. Do not continue to F7 optimization until this plan is complete, because F7 depends on the final window/layout model.

Existing state:

- F4 introduced `racing` shrink-wrap and desktop `edit` mode.
- F5 introduced Hub profile CRUD.
- F6 introduced OBS/SSE and `streaming` mode.
- Current bug shows that shrink-wrap with widely separated widgets creates a large transparent native window with visible border artifacts.

New decision:

- `racing`: fullscreen transparent click-through.
- `edit`: no longer the normal desktop editing workflow.
- Hub profile page owns layout editing through a preview canvas.
- `streaming`: unchanged unless tests reveal a conflict.

## File Structure

- Modify `vantare-v2/internal/window/manager.go`
  - Make racing fullscreen, transparent, click-through, non-resizable.
  - Keep streaming off-screen 1x1.
  - Keep edit mode only as debug/legacy until removed later.

- Modify `vantare-v2/internal/window/manager_test.go`
  - Update racing expectations.
  - Add regression for no shrink-wrap in racing.

- Modify `vantare-v2/pkg/config/profile.go`
  - Update comments so `ModeRacing` no longer claims shrink-wrap.

- Modify `vantare-v2/frontend/src/lib/profile.ts`
  - Add preview coordinate helpers:
    - `MONITOR_WIDTH = 1920`
    - `MONITOR_HEIGHT = 1080`
    - `profileRectToPreviewRect`
    - `previewRectToProfileRect`
    - `clampRectToMonitor`

- Create `vantare-v2/frontend/src/lib/profile-preview.test.ts`
  - Unit tests for scaling, reverse scaling, clamping.

- Create `vantare-v2/frontend/src/hub/components/ProfilePreviewEditor.tsx`
  - Render 16:9 preview area.
  - Render widgets as draggable boxes using existing widget components.
  - Convert drag results back to profile coordinates.
  - Emit save callback with updated profile.

- Modify `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`
  - Add `Editar` button per profile.
  - Add editor panel/modal for selected profile.
  - Load full profile data from backend.
  - Save updated profile.

- Modify `vantare-v2/internal/app/hub_service.go`
  - Add `GetProfile(idOrFile string)`.
  - Add `SaveProfile(profile config.ProfileConfig)`.
  - Ensure saving by `File` is supported without path traversal.

- Modify `vantare-v2/cmd/vantare/main.go`
  - Register Wails event handlers:
    - `hub:get-profile`
    - `hub:save-profile`
  - Emit:
    - `hub:profile-detail`
    - `hub:profile-saved`
    - existing `hub:error`

- Modify docs:
  - `docs/V2-MASTER-PLAN.md`
  - `docs/proyecto/04-ESTADO-ACTUAL.md`

---

### Task 1: Racing Window Model

**Files:**
- Modify: `vantare-v2/internal/window/manager.go`
- Modify: `vantare-v2/internal/window/manager_test.go`
- Modify: `vantare-v2/pkg/config/profile.go`

- [ ] **Step 1: Update failing racing test**

In `vantare-v2/internal/window/manager_test.go`, change `TestApplyRacingMode` to expect fullscreen and no shrink-wrap:

```go
func TestApplyRacingMode(t *testing.T) {
	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 8)
	p := &config.ProfileConfig{
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{Enabled: true, Position: config.Rect{X: 100, Y: 200, W: 400, H: 48}},
			{Enabled: true, Position: config.Rect{X: 40, Y: 600, W: 320, H: 280}},
		},
	}
	mgr.ApplyProfile(p, false)

	if !fw.ignoreMouse {
		t.Fatal("racing mode should set ignoreMouseEvents=true")
	}
	if fw.resizable {
		t.Fatal("racing mode should set resizable=false")
	}
	if !fw.fullscreen {
		t.Fatal("racing mode should fullscreen")
	}
	if fw.setBoundsCalls != 0 {
		t.Fatalf("racing mode should not shrink-wrap: setBoundsCalls=%d", fw.setBoundsCalls)
	}
}
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
cd vantare-v2
go test ./internal/window -run TestApplyRacingMode -v
```

Expected: FAIL because current racing mode calls `UnFullscreen()` and shrink-wraps.

- [ ] **Step 3: Implement fullscreen racing**

In `vantare-v2/internal/window/manager.go`, replace the `default: // racing` branch with:

```go
	default: // racing
		if !skipRefresh {
			m.win.SetResizable(false)
			m.win.Fullscreen()
			m.win.SetIgnoreMouseEvents(true)
		}
```

Do not call `m.applyShrinkWrap(p)` in racing.

- [ ] **Step 4: Update mode comment**

In `vantare-v2/pkg/config/profile.go`, update the display mode comments:

```go
const (
	ModeRacing    DisplayMode = "racing"    // fullscreen transparent, click-through
	ModeEdit      DisplayMode = "edit"      // legacy/debug desktop edit mode
	ModeStreaming DisplayMode = "streaming" // OBS/browser-source mode; desktop window off-screen
)
```

- [ ] **Step 5: Run window tests**

Run:

```bash
cd vantare-v2
go test ./internal/window -v
```

Expected: PASS.

---

### Task 2: Preview Coordinate Helpers

**Files:**
- Modify: `vantare-v2/frontend/src/lib/profile.ts`
- Create: `vantare-v2/frontend/src/lib/profile-preview.test.ts`

- [ ] **Step 1: Write failing tests**

Create `vantare-v2/frontend/src/lib/profile-preview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MONITOR_HEIGHT,
  MONITOR_WIDTH,
  clampRectToMonitor,
  previewRectToProfileRect,
  profileRectToPreviewRect,
} from "./profile";

describe("profile preview coordinate helpers", () => {
  it("uses a 1920x1080 monitor coordinate space", () => {
    expect(MONITOR_WIDTH).toBe(1920);
    expect(MONITOR_HEIGHT).toBe(1080);
  });

  it("scales profile coordinates into preview coordinates", () => {
    expect(profileRectToPreviewRect({ x: 960, y: 540, w: 480, h: 270 }, 960, 540)).toEqual({
      x: 480,
      y: 270,
      w: 240,
      h: 135,
    });
  });

  it("scales preview coordinates back into profile coordinates", () => {
    expect(previewRectToProfileRect({ x: 480, y: 270, w: 240, h: 135 }, 960, 540)).toEqual({
      x: 960,
      y: 540,
      w: 480,
      h: 270,
    });
  });

  it("clamps rectangles inside monitor bounds", () => {
    expect(clampRectToMonitor({ x: -20, y: 1200, w: 3000, h: 2000 })).toEqual({
      x: 0,
      y: 0,
      w: 1920,
      h: 1080,
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd vantare-v2
pnpm --dir frontend test -- src/lib/profile-preview.test.ts
```

Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Add helpers**

Append this to `vantare-v2/frontend/src/lib/profile.ts`:

```ts
export const MONITOR_WIDTH = 1920;
export const MONITOR_HEIGHT = 1080;

export function profileRectToPreviewRect(rect: Rect, previewWidth: number, previewHeight: number): Rect {
  const scaleX = previewWidth / MONITOR_WIDTH;
  const scaleY = previewHeight / MONITOR_HEIGHT;
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    w: Math.round(rect.w * scaleX),
    h: Math.round(rect.h * scaleY),
  };
}

export function previewRectToProfileRect(rect: Rect, previewWidth: number, previewHeight: number): Rect {
  const scaleX = MONITOR_WIDTH / previewWidth;
  const scaleY = MONITOR_HEIGHT / previewHeight;
  return clampRectToMonitor({
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    w: Math.round(rect.w * scaleX),
    h: Math.round(rect.h * scaleY),
  });
}

export function clampRectToMonitor(rect: Rect): Rect {
  const w = Math.min(Math.max(rect.w, 1), MONITOR_WIDTH);
  const h = Math.min(Math.max(rect.h, 1), MONITOR_HEIGHT);
  return {
    x: Math.min(Math.max(rect.x, 0), MONITOR_WIDTH - w),
    y: Math.min(Math.max(rect.y, 0), MONITOR_HEIGHT - h),
    w,
    h,
  };
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
cd vantare-v2
pnpm --dir frontend test -- src/lib/profile-preview.test.ts
```

Expected: PASS.

---

### Task 3: Hub Profile Load/Save Events

**Files:**
- Modify: `vantare-v2/internal/app/hub_service.go`
- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Add service methods**

Add to `HubService` in `vantare-v2/internal/app/hub_service.go`:

```go
// GetProfile loads a complete profile by id or file basename.
func (s *HubService) GetProfile(idOrFile string) (*config.ProfileConfig, string, error) {
	path, err := s.findProfilePath(idOrFile)
	if err != nil {
		return nil, "", err
	}
	p, err := config.LoadFile(path)
	if err != nil {
		return nil, "", err
	}
	return p, filepath.Base(path), nil
}

// SaveProfile writes a complete profile by file basename and refreshes the active overlay if needed.
func (s *HubService) SaveProfile(file string, profile *config.ProfileConfig) error {
	path, err := s.findProfilePath(file)
	if err != nil {
		return err
	}
	if err := config.SaveFile(path, profile); err != nil {
		return err
	}
	if s.profileSvc != nil && s.profileSvc.Profile() != nil {
		active := s.profileSvc.Profile()
		if active.ID == profile.ID {
			if err := s.profileSvc.LoadActiveProfile(path); err != nil {
				return err
			}
			s.profileSvc.ApplyToWindow(true)
			s.profileSvc.EmitLoaded()
		}
	}
	return nil
}
```

- [ ] **Step 2: Register `hub:get-profile` event**

In `vantare-v2/cmd/vantare/main.go`, after existing hub event handlers, add:

```go
wailsApp.Event.On("hub:get-profile", func(event *application.CustomEvent) {
	var data struct {
		ID   string `json:"id"`
		File string `json:"file"`
	}
	if event.Data != nil {
		if raw, err := json.Marshal(event.Data); err == nil {
			json.Unmarshal(raw, &data)
		}
	}
	target := data.File
	if target == "" {
		target = data.ID
	}
	profile, file, err := hubSvc.GetProfile(target)
	if err != nil {
		log.Printf("hub:get-profile error: %v", err)
		emitHubError(err.Error())
		return
	}
	emitter.Emit("hub:profile-detail", map[string]any{
		"profile": profile,
		"file":    file,
	})
})
```

- [ ] **Step 3: Register `hub:save-profile` event**

In `vantare-v2/cmd/vantare/main.go`, add:

```go
wailsApp.Event.On("hub:save-profile", func(event *application.CustomEvent) {
	var data struct {
		File    string                `json:"file"`
		Profile *config.ProfileConfig `json:"profile"`
	}
	if event.Data != nil {
		if raw, err := json.Marshal(event.Data); err == nil {
			json.Unmarshal(raw, &data)
		}
	}
	if data.File == "" || data.Profile == nil {
		emitHubError("profile save payload is invalid")
		return
	}
	if err := hubSvc.SaveProfile(data.File, data.Profile); err != nil {
		log.Printf("hub:save-profile error: %v", err)
		emitHubError(err.Error())
		return
	}
	emitter.Emit("hub:profile-saved", map[string]any{"ok": true})
})
```

- [ ] **Step 4: Run Go tests**

Run:

```bash
cd vantare-v2
go test ./...
```

Expected: PASS.

---

### Task 4: Profile Preview Editor Component

**Files:**
- Create: `vantare-v2/frontend/src/hub/components/ProfilePreviewEditor.tsx`

- [ ] **Step 1: Create component**

Create `vantare-v2/frontend/src/hub/components/ProfilePreviewEditor.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProfileConfig, Rect, WidgetConfig } from "../../lib/profile";
import {
  MONITOR_HEIGHT,
  MONITOR_WIDTH,
  previewRectToProfileRect,
  profileRectToPreviewRect,
} from "../../lib/profile";

type Props = {
  file: string;
  profile: ProfileConfig;
  onClose: () => void;
  onSave: (file: string, profile: ProfileConfig) => void;
};

export function ProfilePreviewEditor({ file, profile, onClose, onSave }: Props) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(profile);
  const [previewSize, setPreviewSize] = useState({ w: 960, h: 540 });
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);

  useEffect(() => setDraft(profile), [profile]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setPreviewSize({ w: width, h: Math.round(width * 9 / 16) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const enabledWidgets = useMemo(() => draft.widgets.filter((w) => w.enabled), [draft.widgets]);

  const updateWidgetPosition = (id: string, position: Rect) => {
    setDraft((current) => ({
      ...current,
      widgets: current.widgets.map((w) => w.id === id ? { ...w, position } : w),
    }));
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: MouseEvent) => {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const nextPreviewRect = {
        ...drag.startRect,
        x: drag.startRect.x + dx,
        y: drag.startRect.y + dy,
      };
      updateWidgetPosition(
        drag.id,
        previewRectToProfileRect(nextPreviewRect, previewSize.w, previewSize.h),
      );
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, previewSize.h, previewSize.w]);

  return (
    <div className="glass-panel rounded-xl p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-white">Editor de preview</h2>
          <p className="text-xs text-vantare-textMuted font-mono mt-1">
            {profile.name || profile.id || file} · {MONITOR_WIDTH}×{MONITOR_HEIGHT}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onSave(file, draft)} className="btn-primary px-5 py-2 rounded-lg text-xs font-bold text-white">
            Guardar
          </button>
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold text-white">
            Cerrar
          </button>
        </div>
      </div>

      <div ref={previewRef} className="w-full">
        <div
          className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#101010_0%,#1a0710_45%,#080808_100%)]"
          style={{ height: `${previewSize.h}px` }}
        >
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.18) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          {enabledWidgets.map((widget: WidgetConfig) => {
            const rect = profileRectToPreviewRect(widget.position, previewSize.w, previewSize.h);
            return (
              <button
                key={widget.id}
                type="button"
                className="absolute cursor-move rounded border border-white/30 bg-black/65 text-left shadow-xl"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setDrag({ id: widget.id, startX: event.clientX, startY: event.clientY, startRect: rect });
                }}
              >
                <span className="absolute left-2 top-1 text-[10px] font-mono uppercase text-white/50">{widget.id}</span>
                <span className="flex h-full items-center justify-center px-2 text-xs font-bold uppercase tracking-wide text-white/70">
                  {widget.type}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript build and verify failure or pass**

Run:

```bash
cd vantare-v2
pnpm --dir frontend build
```

Expected: PASS after helper functions exist.

---

### Task 5: Wire Preview Editor Into Profiles Page

**Files:**
- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`

- [ ] **Step 1: Import types and editor**

At the top of `ProfilesPage.tsx`, add:

```tsx
import type { ProfileConfig } from "../../lib/profile";
import { ProfilePreviewEditor } from "../components/ProfilePreviewEditor";
```

- [ ] **Step 2: Add editor state**

Inside `ProfilesPage`, add:

```tsx
const [editingFile, setEditingFile] = useState<string | null>(null);
const [editingProfile, setEditingProfile] = useState<ProfileConfig | null>(null);
```

- [ ] **Step 3: Subscribe to detail and saved events**

Inside the existing `useEffect`, add:

```tsx
const unsubDetail = Events.On("hub:profile-detail", (event: { data: unknown }) => {
  const data = event.data as { file?: string; profile?: ProfileConfig };
  if (data.file && data.profile) {
    setEditingFile(data.file);
    setEditingProfile(data.profile);
  }
});

const unsubSaved = Events.On("hub:profile-saved", () => {
  setError(null);
  Events.Emit("hub:list");
});
```

In cleanup, call:

```tsx
unsubDetail();
unsubSaved();
```

- [ ] **Step 4: Add edit/save handlers**

Add:

```tsx
const handleEdit = useCallback((profile: ProfileEntry) => {
  setError(null);
  Events.Emit("hub:get-profile", { id: profile.id, file: profile.file });
}, []);

const handleSaveProfile = useCallback((file: string, profile: ProfileConfig) => {
  setError(null);
  Events.Emit("hub:save-profile", { file, profile });
}, []);
```

- [ ] **Step 5: Render editor above profile list**

After the create profile panel, add:

```tsx
{editingFile && editingProfile && (
  <ProfilePreviewEditor
    file={editingFile}
    profile={editingProfile}
    onClose={() => {
      setEditingFile(null);
      setEditingProfile(null);
    }}
    onSave={handleSaveProfile}
  />
)}
```

- [ ] **Step 6: Add Editar button**

In each profile row button group, add before `Activar`:

```tsx
<button
  type="button"
  onClick={() => handleEdit(p)}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold text-white whitespace-nowrap"
>
  Editar
</button>
```

- [ ] **Step 7: Remove misleading desktop edit button**

Remove the current `Salir de edición` button and `handleExitEdit` if no other code uses it.

- [ ] **Step 8: Run frontend build**

Run:

```bash
cd vantare-v2
pnpm --dir frontend build
```

Expected: PASS.

---

### Task 6: Docs And Verification

**Files:**
- Modify: `docs/V2-MASTER-PLAN.md`
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`

- [ ] **Step 1: Update master plan**

In `docs/V2-MASTER-PLAN.md`, update F4 notes from shrink-wrap racing to fullscreen racing + Hub preview editor. Add a changelog row:

```markdown
| 2026-06-12 | Corrección de arquitectura: racing fullscreen transparente click-through; edición pasa al Hub preview editor |
```

- [ ] **Step 2: Update state doc**

In `docs/proyecto/04-ESTADO-ACTUAL.md`, update current behavior:

```markdown
- Modo **racing**: fullscreen transparente, click-through.
- Edición de layout: desde Hub → Overlays → Editar, usando preview 16:9.
- Modo **edit** desktop queda como legado/debug, no flujo principal.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
cd vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: all PASS.

- [ ] **Step 4: Manual smoke**

Run:

```bash
cd vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Manual checks:

- Hub opens.
- Real overlay window does not show a large grey shrink-wrap border.
- In Hub → Overlays, each profile has `Editar`.
- Clicking `Editar` opens preview canvas.
- Dragging a widget changes its position inside preview.
- Clicking `Guardar` persists JSON.
- Clicking `Activar` updates the real overlay.

---

## Self-Review

Spec coverage:

- Fullscreen transparent racing overlay: Task 1.
- Click-through in racing: Task 1.
- Hub preview editor: Tasks 2, 4, 5.
- Background in preview: Task 4.
- Profile save: Task 3 and Task 5.
- Existing roadmap continuity: Task 6.

Placeholder scan:

- No `TBD`, no generic “implement later”, no missing file targets.

Type consistency:

- `ProfileConfig`, `WidgetConfig`, `Rect`, `DisplayMode` match `frontend/src/lib/profile.ts`.
- Go service methods use existing `config.ProfileConfig`.
- Wails events use existing `Events.Emit`/`Events.On` style in `ProfilesPage.tsx`.
