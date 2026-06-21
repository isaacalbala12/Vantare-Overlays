# Overlays Studio Miniplan 4 — Autosave, Wiring, Polish y Cleanup Final (Phase A) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finalizar la Fase A del `Overlays Studio` unificado añadiendo autosave, atajos de teclado, y persistencia backend.

**Architecture:** Extender `useOverlayStudioState` para soportar autosave y atajos. Añadir helper `SaveProfileAsOwnCopy` en el backend Go para copiar presets.

**Tech Stack:** React 19, TypeScript, Go 1.25, Wails v3 events, Tailwind CSS v4, Vitest, Testing Library.

---

### Task 1: Autosave, Keyboard Shortcuts, and Manual Save Stability

**Files:**
- Modify: `frontend/src/hub/overlays/useOverlayStudioState.ts`
- Test: `frontend/src/hub/overlays/useOverlayStudioState.test.tsx`

**Step 1: Write the failing test**

```tsx
// frontend/src/hub/overlays/useOverlayStudioState.test.tsx
// Add inside the describe block:
  it("emits layout:save when saving a dirty profile", () => {
    const { result } = renderHook(() => useOverlayStudioState());
    act(() => {
      result.current.loadProfileForTest({
        id: "p1", name: "Profile", displayMode: "racing", monitorIndex: 0,
        widgets: [{ id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 0, y: 0, w: 400, h: 48 } }],
      });
    });
    act(() => {
      result.current.updateDraft({
        id: "p1", name: "Profile", displayMode: "racing", monitorIndex: 0,
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

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend test -- useOverlayStudioState.test.tsx`
Expected: FAIL if save profile logic is incomplete or we didn't mock Events properly. (Note: in earlier task we made `saveProfile` so it might pass partially, but let's assume we ensure the hooks logic).

**Step 3: Write minimal implementation**

```tsx
// frontend/src/hub/overlays/useOverlayStudioState.ts
// Inside useOverlayStudioState hook, add:
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

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend test -- useOverlayStudioState.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/hub/overlays/useOverlayStudioState.ts frontend/src/hub/overlays/useOverlayStudioState.test.tsx
git commit -m "feat(hub): preserve autosave and shortcuts in Overlays Studio"
```

---

### Task 2: Profile Creation and Recommended Copy Wiring

**Files:**
- Modify: `internal/app/hub_service.go`
- Test: `internal/app/hub_service_test.go`
- Modify: `cmd/vantare/main.go`
- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`
- Modify: `frontend/src/hub/overlays/useOverlayStudioState.ts`

**Step 1: Write the failing test**

```go
// internal/app/hub_service_test.go
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

**Step 2: Run test to verify it fails**

Run: `go test ./internal/app/... -run TestHubServiceSaveProfileAsOwnCopy -v`
Expected: FAIL with "SaveProfileAsOwnCopy not defined"

**Step 3: Write minimal implementation**

```go
// internal/app/hub_service.go
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

And in `cmd/vantare/main.go` add the event listener:
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

And in `frontend/src/hub/pages/OverlaysStudioPage.tsx` update the events:
```tsx
import { Events } from "@wailsio/runtime";
import { cloneRecommendedProfile } from "../overlays/recommended-profiles";

// inside component:
  function createProfile() {
    const name = window.prompt("Nombre del nuevo perfil");
    if (!name?.trim()) return;
    Events.Emit("hub:create", { name: name.trim() });
  }

  function saveRecommended(profile: RecommendedProfile) {
    const name = window.prompt("Nombre del perfil propio", profile.name);
    if (!name?.trim()) return;
    Events.Emit("hub:save-own-copy", { profile: cloneRecommendedProfile(profile, name.trim()) });
  }
```

And in `frontend/src/hub/overlays/useOverlayStudioState.ts` inside the `useEffect`:
```tsx
    const unsubCreated = Events.On("hub:profile-created", () => {
      Events.Emit("hub:list");
    });
    // add unsubCreated to cleanup!
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/app/... -run TestHubServiceSaveProfileAsOwnCopy -v`
Run: `pnpm --dir frontend test`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/app/hub_service.go internal/app/hub_service_test.go cmd/vantare/main.go frontend/src/hub/pages/OverlaysStudioPage.tsx frontend/src/hub/overlays/useOverlayStudioState.ts
git commit -m "feat(hub): save recommended overlays as own profiles via backend"
```

---

### Task 3: Remove Visible Legacy Preview Flow

**Files:**
- Modify: `frontend/src/hub/pages/PreviewPage.tsx`
- Modify: `frontend/src/hub/pages/ProfilesPage.tsx`

**Step 1: Write the failing test**

*(No test needed for a comment, we do manual check via codebase).*

**Step 2: Run test to verify it fails**

*(Skip)*

**Step 3: Write minimal implementation**

Add this to the top of `frontend/src/hub/pages/PreviewPage.tsx`:
```tsx
// Legacy fallback for the pre-Overlays-Studio preview flow. Do not route to this
// page from HubApp; remove after Overlays Studio has passed manual validation.
```

Add this to the top of `frontend/src/hub/pages/ProfilesPage.tsx`:
```tsx
// Legacy fallback for the pre-Overlays-Studio profile list. Do not route to this
// page from HubApp; remove after Overlays Studio has passed manual validation.
```

**Step 4: Run test to verify it passes**

*(Skip)*

**Step 5: Commit**

```bash
git add frontend/src/hub/pages/PreviewPage.tsx frontend/src/hub/pages/ProfilesPage.tsx
git commit -m "chore(hub): mark legacy overlay pages as fallback"
```

---

### Task 4: Full Verification

**Files:**
- N/A

**Step 1: Write the failing test**
*(Skip)*

**Step 2: Run test to verify it fails**
*(Skip)*

**Step 3: Write minimal implementation**
*(Skip)*

**Step 4: Run test to verify it passes**

Run: `go test ./...`
Run: `pnpm --dir frontend run lint`
Run: `pnpm --dir frontend test`
Run: `pnpm --dir frontend build`
Run: `go run ./cmd/vantare -profile configs/example-racing.json`
Verify in browser:
- `http://127.0.0.1:39261/health`
- `http://127.0.0.1:39261/api/profile?profile=example-racing.json`
- `http://127.0.0.1:39261/overlay?profile=example-racing.json&obs=1`

Expected: PASS

**Step 5: Commit**
*(No commit for verification)*
