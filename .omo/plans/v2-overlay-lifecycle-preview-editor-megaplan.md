# Overlay Lifecycle + Hub Preview Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragile always-open/editable desktop overlay flow with an explicit Hub-controlled overlay lifecycle and a Hub-native Preview editor.

**Architecture:** The Hub is the permanent control surface. The desktop overlay is runtime-only: it is created cleanly when the user clicks `Iniciar`, destroyed when the user clicks `Detener`, and never used as an editor. Editing positions, sizes, visibility, and appearance happens inside a Hub `Preview` tab and is saved to the active profile before starting the runtime overlay.

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

Required verification after each plan:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Known bug motivating this refactor:

- The current app creates the overlay window at startup.
- The Hub later mutates that already-living overlay window when `Activar` is clicked.
- Minimal Wails smoke tests proved transparent windows, URL navigation, click-through, resize, and two-window flows work in isolation.
- The failure appears only in the full Vantare flow, so the current boundary is wrong: too much state is recycled across Hub and overlay.

New product decision:

- The app starts with **Hub only**.
- The desktop overlay starts only when the user clicks **Iniciar**.
- The desktop overlay is never used for editing.
- A Hub tab called **Preview** is where Isaac edits the overlay before starting it.

---

# Miniplan A: Overlay Lifecycle Controller

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop overlay a cleanly-created runtime window controlled by Hub actions `Iniciar` and `Detener`.

**Architecture:** Introduce a Go `OverlayController` that owns the lifetime of the Wails overlay window. `cmd/vantare/main.go` creates the Hub window at startup, registers services/events, and does not create the overlay window until the Hub requests it. `HubService` loads/selects profiles and delegates runtime window creation to the controller.

**Tech Stack:** Go/Wails v3 backend, existing React Hub `ProfilesPage`, existing React overlay `CompositeApp`.

---

## Plan A File Map

Create:

```text
vantare-v2/internal/app/overlay_controller.go
vantare-v2/internal/app/overlay_controller_test.go
```

Modify:

```text
vantare-v2/cmd/vantare/main.go
vantare-v2/internal/app/hub_service.go
vantare-v2/internal/app/hub_service_test.go
vantare-v2/internal/app/profile_service.go
vantare-v2/internal/app/profile_service_test.go
vantare-v2/internal/window/manager.go
vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx
vantare-v2/docs/proyecto/02-ARQUITECTURA-V2.md
vantare-v2/docs/proyecto/08-PERFILES-Y-LAYOUT.md
vantare-v2/docs/proyecto/09-EVENTOS-IPC.md
vantare-v2/docs/proyecto/11-COMANDOS-Y-VERIFICACION.md
```

Delete diagnostic-only commands created during transparency debugging unless Isaac asks to keep them:

```text
vantare-v2/cmd/transparent-smoke/main.go
vantare-v2/cmd/transparent-url-smoke/main.go
vantare-v2/cmd/transparent-clickthrough-smoke/main.go
vantare-v2/cmd/two-window-activate-smoke/main.go
vantare-v2/overlay_transparency_analysis.md
```

Do not delete evidence or miniplans.

---

## Plan A Behavior Contract

Startup:

```text
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- No desktop overlay window opens.
- HTTP/SSE server still starts for OBS endpoints.
- Active profile is loaded in memory for Hub/Preview.

Click `Iniciar` for `default-racing`:

- Close any existing runtime overlay.
- Load profile by `file` first, falling back to profile `id`.
- Force runtime mode to `racing` in memory.
- Create a new Wails overlay window with transparent/click-through runtime options.
- Set initial bounds from `window.ShrinkWrap`.
- Overlay frontend receives `profile:loaded` after it mounts via existing `profile:request`.
- Hub receives `overlay:status` with `running: true`.

Click `Detener`:

- Close the runtime overlay window.
- Hub receives `overlay:status` with `running: false`.
- Process stays alive because Hub is still open.

Streaming profile:

- `Iniciar` for `displayMode: "streaming"` must not create a desktop overlay.
- Hub receives status showing `mode: "streaming"` and the OBS URL can be shown in UI.
- Existing `/overlay`, `/api/profile`, and `/telemetry/stream` keep working.

---

## Plan A High-Risk Failure Points

1. **Emitting `profile:loaded` before the overlay runtime is listening.**
   Use the existing `profile:request` event from `CompositeApp` as the reliable handshake. Do not rely only on emitting immediately after window creation.

2. **Keeping `ProfileService` tied to a window manager.**
   The profile service should primarily own profile data and saving. Window application belongs to `OverlayController`. Keep any old `ApplyToWindow` compatibility only if tests require it, but do not use it from Hub activation.

3. **Creating an overlay at startup accidentally.**
   `cmd/vantare/main.go` must no longer call `wailsApp.Window.NewWithOptions` for the overlay during startup.

4. **Confusing `Activar` with `Iniciar`.**
   `Activar` currently implies mutating an existing overlay. Replace the UI action with `Iniciar`/`Detener` language.

5. **Breaking OBS streaming.**
   The embedded HTTP server is independent from the desktop overlay and must remain running.

6. **Losing save path after profile selection/start.**
   `LoadActiveProfile(path)` must still update the active save target.

---

## Plan A Tasks

### Task A1: Add Controller Interfaces And Tests

**Files:**

- Create: `vantare-v2/internal/app/overlay_controller.go`
- Create: `vantare-v2/internal/app/overlay_controller_test.go`

- [ ] **Step 1: Write tests for lifecycle state without Wails**

Create `vantare-v2/internal/app/overlay_controller_test.go` with test doubles so the controller can be tested without opening real windows.

```go
package app_test

import (
	"testing"

	"github.com/vantare/overlays/v2/internal/app"
	"github.com/vantare/overlays/v2/pkg/config"
)

type fakeOverlayWindow struct {
	closed      bool
	boundsSet   bool
	ignoreMouse bool
}

func (f *fakeOverlayWindow) Close() {
	f.closed = true
}

type fakeOverlayFactory struct {
	created int
	last    *fakeOverlayWindow
}

func (f *fakeOverlayFactory) NewOverlayWindow(profile *config.ProfileConfig, origin config.Rect, bounds config.Rect) (app.OverlayWindow, error) {
	f.created++
	f.last = &fakeOverlayWindow{boundsSet: true, ignoreMouse: true}
	return f.last, nil
}

func TestOverlayControllerStartCreatesCleanWindow(t *testing.T) {
	factory := &fakeOverlayFactory{}
	controller := app.NewOverlayController(factory)
	profile := &config.ProfileConfig{
		ID:          "default-racing",
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 760, Y: 40, W: 400, H: 48}},
		},
	}

	status, err := controller.Start(profile)
	if err != nil {
		t.Fatal(err)
	}
	if factory.created != 1 {
		t.Fatalf("created=%d, want 1", factory.created)
	}
	if !status.Running {
		t.Fatal("status should be running")
	}
	if status.ProfileID != "default-racing" {
		t.Fatalf("profile id=%q", status.ProfileID)
	}
	if status.Mode != config.ModeRacing {
		t.Fatalf("mode=%q, want racing", status.Mode)
	}
}

func TestOverlayControllerStartClosesPreviousWindow(t *testing.T) {
	factory := &fakeOverlayFactory{}
	controller := app.NewOverlayController(factory)
	profile := &config.ProfileConfig{
		ID:          "default-racing",
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 0, Y: 0, W: 100, H: 50}},
		},
	}

	_, err := controller.Start(profile)
	if err != nil {
		t.Fatal(err)
	}
	first := factory.last

	_, err = controller.Start(profile)
	if err != nil {
		t.Fatal(err)
	}
	if !first.closed {
		t.Fatal("previous overlay window should be closed before creating a new one")
	}
	if factory.created != 2 {
		t.Fatalf("created=%d, want 2", factory.created)
	}
}

func TestOverlayControllerStopClosesWindow(t *testing.T) {
	factory := &fakeOverlayFactory{}
	controller := app.NewOverlayController(factory)
	profile := &config.ProfileConfig{
		ID:          "default-racing",
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 0, Y: 0, W: 100, H: 50}},
		},
	}

	_, err := controller.Start(profile)
	if err != nil {
		t.Fatal(err)
	}
	win := factory.last

	status := controller.Stop()
	if !win.closed {
		t.Fatal("window should be closed")
	}
	if status.Running {
		t.Fatal("status should not be running after stop")
	}
}

func TestOverlayControllerStreamingDoesNotCreateDesktopWindow(t *testing.T) {
	factory := &fakeOverlayFactory{}
	controller := app.NewOverlayController(factory)
	profile := &config.ProfileConfig{
		ID:          "default-streaming",
		DisplayMode: config.ModeStreaming,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 0, Y: 0, W: 100, H: 50}},
		},
	}

	status, err := controller.Start(profile)
	if err != nil {
		t.Fatal(err)
	}
	if factory.created != 0 {
		t.Fatalf("streaming created desktop windows=%d, want 0", factory.created)
	}
	if status.Running {
		t.Fatal("desktop overlay should not be running for streaming")
	}
	if status.Mode != config.ModeStreaming {
		t.Fatalf("mode=%q, want streaming", status.Mode)
	}
}
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/app -run OverlayController -v
```

Expected: fail because `OverlayController`, `OverlayWindow`, and factory types do not exist.

- [ ] **Step 3: Implement controller types**

Create `vantare-v2/internal/app/overlay_controller.go`.

```go
package app

import (
	"sync"

	"github.com/vantare/overlays/v2/pkg/config"
)

type OverlayStatus struct {
	Running   bool               `json:"running"`
	ProfileID string             `json:"profileId,omitempty"`
	Mode      config.DisplayMode `json:"mode,omitempty"`
}

type OverlayWindow interface {
	Close()
}

type OverlayWindowFactory interface {
	NewOverlayWindow(profile *config.ProfileConfig, origin config.Rect, bounds config.Rect) (OverlayWindow, error)
}

type OverlayController struct {
	mu      sync.Mutex
	factory OverlayWindowFactory
	current OverlayWindow
	status  OverlayStatus
}

func NewOverlayController(factory OverlayWindowFactory) *OverlayController {
	return &OverlayController{factory: factory}
}

func (c *OverlayController) Start(profile *config.ProfileConfig) (OverlayStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.current != nil {
		c.current.Close()
		c.current = nil
	}

	if profile == nil {
		c.status = OverlayStatus{}
		return c.status, nil
	}

	mode := profile.DisplayMode
	if mode == config.ModeStreaming {
		c.status = OverlayStatus{Running: false, ProfileID: profile.ID, Mode: config.ModeStreaming}
		return c.status, nil
	}

	runtimeProfile := *profile
	runtimeProfile.DisplayMode = config.ModeRacing

	bounds := config.CompositeBounds(&runtimeProfile, 8)
	origin := config.LayoutOrigin(&runtimeProfile, 8)
	win, err := c.factory.NewOverlayWindow(&runtimeProfile, origin, bounds)
	if err != nil {
		c.status = OverlayStatus{Running: false, ProfileID: profile.ID, Mode: config.ModeRacing}
		return c.status, err
	}

	c.current = win
	c.status = OverlayStatus{Running: true, ProfileID: profile.ID, Mode: config.ModeRacing}
	return c.status, nil
}

func (c *OverlayController) Stop() OverlayStatus {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.current != nil {
		c.current.Close()
		c.current = nil
	}
	c.status.Running = false
	return c.status
}

func (c *OverlayController) Status() OverlayStatus {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.status
}
```

- [ ] **Step 4: Run controller tests**

```powershell
go test ./internal/app -run OverlayController -v
```

Expected: PASS.

---

### Task A2: Make ProfileService Window-Independent For Activation

**Files:**

- Modify: `vantare-v2/internal/app/profile_service.go`
- Modify: `vantare-v2/internal/app/profile_service_test.go`

- [ ] **Step 1: Add tests for save without window manager**

Append this test to `profile_service_test.go`.

```go
func TestProfileServiceSaveLayoutWithoutWindowManager(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.json")
	original := &config.ProfileConfig{
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 10, Y: 20, W: 100, H: 50}},
		},
	}
	if err := config.SaveFile(path, original); err != nil {
		t.Fatal(err)
	}

	svc := app.NewProfileService(path, nil, nil)
	if err := svc.Load(); err != nil {
		t.Fatal(err)
	}

	updated := []config.WidgetConfig{
		{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 30, Y: 40, W: 120, H: 60}},
	}
	if err := svc.SaveLayout(updated); err != nil {
		t.Fatal(err)
	}

	reloaded, err := config.LoadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if reloaded.Widgets[0].Position.X != 30 {
		t.Fatalf("X=%d, want 30", reloaded.Widgets[0].Position.X)
	}
}
```

- [ ] **Step 2: Run test and confirm failure or panic**

```powershell
go test ./internal/app -run TestProfileServiceSaveLayoutWithoutWindowManager -v
```

Expected today: fail or panic if `SaveLayout` assumes `s.mgr` exists.

- [ ] **Step 3: Make window manager optional**

Modify `SaveLayout`, `SetDisplayMode`, and `ApplyToWindow` defensively.

```go
func (s *ProfileService) SaveLayout(widgets []config.WidgetConfig) error {
	if s.profile == nil {
		return nil
	}
	s.profile.Widgets = widgets
	if err := config.SaveFile(s.path, s.profile); err != nil {
		return err
	}
	if s.mgr != nil {
		s.mgr.ApplyProfile(s.profile, true)
	}
	if s.emitter != nil {
		s.emitter.Emit("layout:saved", map[string]any{
			"ok":      true,
			"profile": s.profile,
		})
		s.EmitLoaded()
	}
	return nil
}

func (s *ProfileService) SetDisplayMode(mode config.DisplayMode) error {
	if s.profile == nil {
		return nil
	}
	s.profile.DisplayMode = mode
	if s.mgr != nil {
		s.mgr.ApplyProfile(s.profile, false)
	}
	return nil
}

func (s *ProfileService) ApplyToWindow(skipRefresh bool) {
	if s.profile != nil && s.mgr != nil {
		s.mgr.ApplyProfile(s.profile, skipRefresh)
	}
}
```

- [ ] **Step 4: Run profile service tests**

```powershell
go test ./internal/app -run ProfileService -v
```

Expected: PASS.

---

### Task A3: Add Wails Overlay Window Factory

**Files:**

- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Add a Wails factory type near `wailsWindowHandle`**

Use the existing `wailsWindowHandle` adapter. The factory creates a fresh overlay window each time.

```go
type wailsOverlayFactory struct {
	app *application.App
}

type wailsOverlayWindow struct {
	w *application.WebviewWindow
}

func (o *wailsOverlayWindow) Close() {
	o.w.Close()
}

func (f *wailsOverlayFactory) NewOverlayWindow(profile *config.ProfileConfig, origin config.Rect, bounds config.Rect) (app.OverlayWindow, error) {
	w := f.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:             "Vantare Overlay",
		X:                 bounds.X,
		Y:                 bounds.Y,
		Width:             bounds.W,
		Height:            bounds.H,
		Frameless:         true,
		BackgroundType:    application.BackgroundTypeTransparent,
		BackgroundColour:  application.NewRGBA(0, 0, 0, 0),
		IgnoreMouseEvents: false,
		AlwaysOnTop:       true,
		URL:               "/",
	})

	handle := &wailsWindowHandle{w: w}
	handle.SetIgnoreMouseEvents(true)
	handle.SetResizable(false)
	handle.SetBounds(window.WailsRect{
		X:      bounds.X,
		Y:      bounds.Y,
		Width:  bounds.W,
		Height: bounds.H,
	})
	return &wailsOverlayWindow{w: w}, nil
}
```

If `WebviewWindowOptions` does not support `X`/`Y` in this Wails version, create with width/height and call `SetBounds` immediately after creation as shown. Verify by compiling.

- [ ] **Step 2: Compile `cmd/vantare`**

```powershell
go test ./cmd/vantare -v
```

Expected: PASS compile.

---

### Task A4: Refactor `main.go` Startup To Hub-Only

**Files:**

- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Remove startup overlay creation**

Delete the startup block that creates:

```go
w := wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{Title: "Vantare Overlay", ...})
winsrc := &wailsWindowHandle{w: w}
mgr := window.NewManager(winsrc, 8)
profileSvc := app.NewProfileService(*profilePath, mgr, emitter)
profileSvc.ApplyToWindow(false)
```

Replace it with a profile service that has no manager:

```go
profileSvc := app.NewProfileService(*profilePath, nil, emitter)
if err := profileSvc.Load(); err != nil {
	log.Printf("warning: could not load profile %s: %v (using defaults)", *profilePath, err)
	profileSvc.SetProfile(&config.ProfileConfig{
		ID:           "default-fallback",
		Name:         "Fallback Racing",
		DisplayMode:  config.ModeRacing,
		MonitorIndex: 0,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, UpdateHz: 30, Position: config.Rect{X: 760, Y: 40, W: 400, H: 48}},
			{ID: "relative", Type: "relative", Enabled: true, UpdateHz: 15, Position: config.Rect{X: 40, Y: 600, W: 320, H: 280}},
			{ID: "standings", Type: "standings", Enabled: true, UpdateHz: 15, Position: config.Rect{X: 1560, Y: 40, W: 340, H: 420}},
		},
	})
}
if *edit {
	log.Printf("warning: -edit is deprecated in Hub Preview flow; start Hub and use Preview instead")
}
```

- [ ] **Step 2: Instantiate overlay controller**

After `wailsApp` exists:

```go
overlayController := app.NewOverlayController(&wailsOverlayFactory{app: wailsApp})
```

- [ ] **Step 3: Keep Hub creation**

The Hub window creation remains at startup:

```go
hubW := wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
	Title:          "Vantare Hub",
	Width:          1280,
	Height:         800,
	Frameless:      false,
	BackgroundType: application.BackgroundTypeSolid,
	URL:            "/#/hub",
	MinWidth:       900,
	MinHeight:      600,
})
hubW.Show()
```

- [ ] **Step 4: Update cleanup to stop overlay**

In `cleanupApp`, call:

```go
if overlayController != nil {
	overlayController.Stop()
}
```

before stopping telemetry bridges. Do not call overlay stop after Wails app destruction.

- [ ] **Step 5: Compile**

```powershell
go test ./cmd/vantare -v
```

Expected: PASS compile.

---

### Task A5: Refactor HubService To Start/Stop Overlay

**Files:**

- Modify: `vantare-v2/internal/app/hub_service.go`
- Modify: `vantare-v2/internal/app/hub_service_test.go`

- [ ] **Step 1: Add runtime interface to `hub_service.go`**

```go
type OverlayRuntime interface {
	Start(profile *config.ProfileConfig) (OverlayStatus, error)
	Stop() OverlayStatus
	Status() OverlayStatus
}
```

Update `HubService`:

```go
type HubService struct {
	profilesDir string
	profileSvc  *ProfileService
	emitter     EventEmitter
	overlay     OverlayRuntime
}

func NewHubService(profilesDir string, profileSvc *ProfileService, emitter EventEmitter, overlay OverlayRuntime) *HubService {
	return &HubService{
		profilesDir: profilesDir,
		profileSvc:  profileSvc,
		emitter:     emitter,
		overlay:     overlay,
	}
}
```

Update all call sites/tests to pass `nil` or a fake runtime.

- [ ] **Step 2: Replace activation semantics**

Keep `ActivateProfile` only as profile selection/load, no window mutation:

```go
func (s *HubService) ActivateProfile(idOrFile string) error {
	path, err := s.findProfilePath(idOrFile)
	if err != nil {
		return err
	}
	return s.profileSvc.LoadActiveProfile(path)
}
```

Add:

```go
func (s *HubService) StartOverlay(idOrFile string) (OverlayStatus, error) {
	if err := s.ActivateProfile(idOrFile); err != nil {
		return OverlayStatus{}, err
	}
	if s.overlay == nil {
		return OverlayStatus{}, fmt.Errorf("overlay runtime not configured")
	}
	profile := s.profileSvc.GetProfile()
	status, err := s.overlay.Start(profile)
	if err != nil {
		return status, err
	}
	if s.emitter != nil {
		s.emitter.Emit("overlay:status", status)
	}
	return status, nil
}

func (s *HubService) StopOverlay() OverlayStatus {
	if s.overlay == nil {
		return OverlayStatus{}
	}
	status := s.overlay.Stop()
	if s.emitter != nil {
		s.emitter.Emit("overlay:status", status)
	}
	return status
}
```

- [ ] **Step 3: Add tests with fake runtime**

Append to `hub_service_test.go`:

```go
type fakeOverlayRuntime struct {
	started int
	stopped int
	lastID  string
}

func (f *fakeOverlayRuntime) Start(profile *config.ProfileConfig) (app.OverlayStatus, error) {
	f.started++
	if profile != nil {
		f.lastID = profile.ID
	}
	return app.OverlayStatus{Running: true, ProfileID: f.lastID, Mode: config.ModeRacing}, nil
}

func (f *fakeOverlayRuntime) Stop() app.OverlayStatus {
	f.stopped++
	return app.OverlayStatus{Running: false, ProfileID: f.lastID, Mode: config.ModeRacing}
}

func (f *fakeOverlayRuntime) Status() app.OverlayStatus {
	return app.OverlayStatus{Running: f.started > f.stopped, ProfileID: f.lastID, Mode: config.ModeRacing}
}

func TestHubServiceStartOverlayLoadsProfileAndStartsRuntime(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "example-racing.json")
	err := config.SaveFile(path, &config.ProfileConfig{
		ID:          "default-racing",
		Name:        "Default Racing",
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 0, Y: 0, W: 100, H: 50}},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), nil, nil)
	runtime := &fakeOverlayRuntime{}
	hubSvc := app.NewHubService(dir, profileSvc, nil, runtime)

	status, err := hubSvc.StartOverlay("default-racing")
	if err != nil {
		t.Fatal(err)
	}
	if !status.Running {
		t.Fatal("overlay should be running")
	}
	if runtime.started != 1 {
		t.Fatalf("started=%d, want 1", runtime.started)
	}
	if runtime.lastID != "default-racing" {
		t.Fatalf("lastID=%q", runtime.lastID)
	}
}

func TestHubServiceStopOverlayStopsRuntime(t *testing.T) {
	dir := t.TempDir()
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), nil, nil)
	runtime := &fakeOverlayRuntime{}
	hubSvc := app.NewHubService(dir, profileSvc, nil, runtime)

	status := hubSvc.StopOverlay()
	if status.Running {
		t.Fatal("overlay should not be running")
	}
	if runtime.stopped != 1 {
		t.Fatalf("stopped=%d, want 1", runtime.stopped)
	}
}
```

- [ ] **Step 4: Run app tests**

```powershell
go test ./internal/app -v
```

Expected: PASS.

---

### Task A6: Wire New Hub Events In `main.go`

**Files:**

- Modify: `vantare-v2/cmd/vantare/main.go`
- Modify: `vantare-v2/docs/proyecto/09-EVENTOS-IPC.md`

- [ ] **Step 1: Update `NewHubService` call**

```go
hubSvc := app.NewHubService(cfgDir, profileSvc, emitter, overlayController)
```

- [ ] **Step 2: Keep `hub:activate` as select-only for compatibility**

The existing event can remain but must not start the overlay:

```go
wailsApp.Event.On("hub:activate", func(event *application.CustomEvent) {
	target := readProfileTarget(event)
	if err := hubSvc.ActivateProfile(target); err != nil {
		log.Printf("hub:activate error: %v", err)
		emitHubError(err.Error())
		return
	}
	emitter.Emit("hub:profile-activated", map[string]any{"ok": true})
})
```

If `readProfileTarget` does not exist, extract the existing repeated parsing into:

```go
func readProfileTarget(event *application.CustomEvent) string {
	var data struct {
		ID   string `json:"id"`
		File string `json:"file"`
	}
	if event.Data != nil {
		if raw, err := json.Marshal(event.Data); err == nil {
			_ = json.Unmarshal(raw, &data)
		}
	}
	if data.File != "" {
		return data.File
	}
	return data.ID
}
```

- [ ] **Step 3: Add `overlay:start` event**

```go
wailsApp.Event.On("overlay:start", func(event *application.CustomEvent) {
	target := readProfileTarget(event)
	status, err := hubSvc.StartOverlay(target)
	if err != nil {
		log.Printf("overlay:start error: %v", err)
		emitHubError(err.Error())
		return
	}
	emitter.Emit("overlay:started", status)
})
```

- [ ] **Step 4: Add `overlay:stop` event**

```go
wailsApp.Event.On("overlay:stop", func(event *application.CustomEvent) {
	status := hubSvc.StopOverlay()
	emitter.Emit("overlay:stopped", status)
})
```

- [ ] **Step 5: Update `profile:request`**

Keep this event. It is the reliable overlay handshake:

```go
wailsApp.Event.On("profile:request", func(event *application.CustomEvent) {
	profileSvc.EmitLoaded()
})
```

- [ ] **Step 6: Update events documentation**

In `docs/proyecto/09-EVENTOS-IPC.md`, add:

```markdown
| `overlay:start` | `{ id, file }` | Loads profile and creates a fresh runtime overlay window |
| `overlay:stop` | — | Closes runtime overlay window |
| `overlay:status` | `{ running, profileId, mode }` | Emitted after start/stop |
```

- [ ] **Step 7: Compile**

```powershell
go test ./cmd/vantare ./internal/app -v
```

Expected: PASS.

---

### Task A7: Update ProfilesPage UI To `Iniciar` / `Detener`

**Files:**

- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`

- [ ] **Step 1: Add overlay status state**

Near other state:

```tsx
const [runningProfileId, setRunningProfileId] = useState<string | null>(null);
```

- [ ] **Step 2: Subscribe to overlay status**

Inside the existing `useEffect`:

```tsx
const unsubOverlayStatus = Events.On("overlay:status", (event: { data: unknown }) => {
  const data = event.data as { running?: boolean; profileId?: string };
  setRunningProfileId(data?.running ? data.profileId ?? null : null);
});
```

Return cleanup:

```tsx
unsubOverlayStatus();
```

- [ ] **Step 3: Replace `handleActivate` with `handleStart`**

```tsx
const handleStart = useCallback((profile: ProfileEntry) => {
  setError(null);
  Events.Emit("overlay:start", { id: profile.id, file: profile.file });
}, []);
```

- [ ] **Step 4: Add `handleStop`**

```tsx
const handleStop = useCallback(() => {
  setError(null);
  Events.Emit("overlay:stop");
}, []);
```

- [ ] **Step 5: Replace button text and behavior**

Use:

```tsx
{runningProfileId === p.id ? (
  <button
    type="button"
    onClick={handleStop}
    className="btn-secondary px-5 py-2 rounded-lg text-xs font-bold text-white whitespace-nowrap"
  >
    Detener
  </button>
) : (
  <button
    type="button"
    onClick={() => handleStart(p)}
    className="btn-primary px-5 py-2 rounded-lg text-xs font-bold text-white whitespace-nowrap"
  >
    Iniciar
  </button>
)}
```

Remove the old `Activar` button.

- [ ] **Step 6: Run frontend tests**

```powershell
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: PASS.

---

### Task A8: Manual Validation For Plan A

**Files:**

- Modify: `.omo/evidence/v2-overlay-lifecycle.txt`

- [ ] **Step 1: Run full verification**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: all PASS.

- [ ] **Step 2: Start app**

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- No overlay appears before pressing `Iniciar`.

- [ ] **Step 3: Start default racing**

In Hub:

```text
Overlays > Default Racing > Iniciar
```

Expected:

- A transparent overlay appears.
- No white rectangle appears.
- Widgets are visible if telemetry/mock data produces visible content.
- The overlay is click-through.

- [ ] **Step 4: Stop overlay**

In Hub:

```text
Overlays > Default Racing > Detener
```

Expected:

- Overlay closes.
- Hub remains open.
- `vantare` process remains alive because Hub is still open.

- [ ] **Step 5: Restart overlay**

Click `Iniciar` again.

Expected:

- A new clean overlay appears.
- No stale white window appears.

- [ ] **Step 6: Validate streaming profile**

Click `Iniciar` on `Default Streaming`.

Expected:

- No desktop overlay appears.
- HTTP endpoint still works:

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
```

- [ ] **Step 7: Save evidence**

Create `.omo/evidence/v2-overlay-lifecycle.txt` with:

```text
Date:
Commands:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build
Manual:
- Startup opens Hub only:
- Default Racing > Iniciar:
- Default Racing > Detener:
- Restart overlay:
- Streaming profile:
Known limitations:
- Preview editor is implemented in Miniplan B, not Plan A.
```

---

## Plan A Self-Review Checklist

- Startup overlay removed: covered by Task A4 and manual validation.
- Fresh overlay per `Iniciar`: covered by Task A1, A3, A5, A6.
- `Detener`: covered by Task A1, A5, A6, A7.
- Streaming does not create desktop overlay: covered by Task A1 and A8.
- Existing OBS HTTP/SSE untouched: covered by A8.
- Profile save path preserved: covered by A2 and existing HubService tests.
- No v1 Electron paths touched: explicit instruction and file map exclude `apps/desktop`.

---

# Miniplan B: Hub Preview Editor Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Hub `Preview` tab where Isaac edits overlay positions, sizes, visibility, and basic colors before clicking `Iniciar`.

**Architecture:** The Preview editor runs entirely inside the Hub. It uses the active profile from `ProfileService`, renders a scaled 16:9 canvas, lets the user select and adjust widgets, and saves JSON through `ProfileService.SaveLayout`. The runtime desktop overlay remains read-only and uses the saved profile.

**Tech Stack:** React 19, TypeScript, Wails Events/Services, existing profile JSON with widget `position` and `props`.

---

## Plan B Dependency

Implement Plan B after Plan A.

Plan B assumes:

- Hub opens without desktop overlay.
- `overlay:start` and `overlay:stop` exist.
- `ProfileService` can save layout without requiring a live overlay window manager.
- Profile selection/loading is independent from starting the overlay.

---

## Plan B File Map

Create:

```text
vantare-v2/frontend/src/hub/pages/PreviewPage.tsx
vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx
vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx
vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx
vantare-v2/frontend/src/hub/preview/profile-editor.ts
vantare-v2/frontend/src/hub/preview/profile-editor.test.ts
```

Modify:

```text
vantare-v2/frontend/src/hub/HubApp.tsx
vantare-v2/frontend/src/hub/components/Topbar.tsx
vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx
vantare-v2/frontend/src/lib/profile.ts
vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx
vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx
vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx
vantare-v2/docs/proyecto/06-DISENO-UI.md
vantare-v2/docs/proyecto/08-PERFILES-Y-LAYOUT.md
vantare-v2/docs/proyecto/11-COMANDOS-Y-VERIFICACION.md
```

No Go schema change is required for colors. Use existing `widgets[].props` to store appearance settings.

Recommended appearance shape:

```json
{
  "props": {
    "appearance": {
      "accentColor": "#E63946",
      "backgroundColor": "rgba(0,0,0,0.35)",
      "textColor": "#FFFFFF",
      "opacity": 1
    }
  }
}
```

---

## Plan B Behavior Contract

Hub navigation:

```text
Dashboard | Overlays | Preview | Telemetría | Setup
```

Preview:

- Shows the selected/active profile.
- Uses a 1920x1080 logical coordinate system scaled to fit Hub content.
- Shows enabled widgets as editable frames.
- Allows selecting one widget.
- Allows editing exact `x`, `y`, `w`, `h`.
- Allows basic colors:
  - accent color
  - background color
  - text color
  - opacity
- Allows toggling `enabled`.
- Saves profile through existing backend.
- Does not open, mutate, or depend on the desktop overlay window.

Runtime overlay:

- Reads saved `props.appearance`.
- Applies appearance where practical without introducing React hot state.
- Widget update loops remain throttled as in F7.

---

## Plan B High-Risk Failure Points

1. **Using runtime overlay widgets directly in the Preview and starting hot telemetry loops inside Hub.**
   For foundation, use Preview-specific frames and labels. Do not mount 30 Hz runtime widget loops in Hub Preview.

2. **Storing color fields in a new Go schema too early.**
   Use `props.appearance` to avoid breaking existing profiles and tests.

3. **Scaled canvas math corrupting saved profile coordinates.**
   Save logical 1920x1080 coordinates, not CSS pixel coordinates. All drag/resize math must divide by scale before saving.

4. **Preview page losing the active profile.**
   `ProfilesPage` should provide a `Seleccionar` action. Preview should request/load the active profile on mount.

5. **Saving to the wrong profile file.**
   Use `ProfileService.LoadActiveProfile` through profile selection before editing. Existing F5 fix must remain intact.

6. **Reintroducing edit-mode desktop overlay.**
   Do not call `profile:set-mode` with `edit` from Preview. This plan replaces desktop edit mode for normal UI.

---

## Plan B Tasks

### Task B1: Extend Frontend Profile Types For Appearance

**Files:**

- Modify: `vantare-v2/frontend/src/lib/profile.ts`

- [ ] **Step 1: Add appearance types**

Add:

```ts
export type WidgetAppearance = {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  opacity?: number;
};

export type WidgetPropsMap = Record<string, unknown> & {
  appearance?: WidgetAppearance;
};
```

Change `WidgetConfig`:

```ts
export type WidgetConfig = {
  id: string;
  type: string;
  enabled: boolean;
  updateHz?: number;
  position: Rect;
  props?: WidgetPropsMap;
};
```

- [ ] **Step 2: Typecheck through build**

```powershell
pnpm --dir frontend build
```

Expected: PASS.

---

### Task B2: Add Pure Profile Editor Helpers

**Files:**

- Create: `vantare-v2/frontend/src/hub/preview/profile-editor.ts`
- Create: `vantare-v2/frontend/src/hub/preview/profile-editor.test.ts`

- [ ] **Step 1: Write tests**

Create `profile-editor.test.ts`.

```ts
import { describe, expect, it } from "vitest";
import type { ProfileConfig } from "../../lib/profile";
import {
  updateWidgetPosition,
  updateWidgetAppearance,
  setWidgetEnabled,
} from "./profile-editor";

const profile: ProfileConfig = {
  id: "default-racing",
  name: "Default Racing",
  displayMode: "racing",
  monitorIndex: 0,
  widgets: [
    {
      id: "delta",
      type: "delta",
      enabled: true,
      position: { x: 10, y: 20, w: 100, h: 50 },
    },
  ],
};

describe("profile-editor", () => {
  it("updates widget position immutably", () => {
    const next = updateWidgetPosition(profile, "delta", { x: 30, y: 40, w: 120, h: 60 });
    expect(next).not.toBe(profile);
    expect(next.widgets[0].position).toEqual({ x: 30, y: 40, w: 120, h: 60 });
    expect(profile.widgets[0].position).toEqual({ x: 10, y: 20, w: 100, h: 50 });
  });

  it("updates appearance inside props", () => {
    const next = updateWidgetAppearance(profile, "delta", {
      accentColor: "#34D399",
      backgroundColor: "rgba(0,0,0,0.35)",
      textColor: "#FFFFFF",
      opacity: 0.8,
    });
    expect(next.widgets[0].props?.appearance?.accentColor).toBe("#34D399");
    expect(next.widgets[0].props?.appearance?.opacity).toBe(0.8);
  });

  it("toggles widget enabled", () => {
    const next = setWidgetEnabled(profile, "delta", false);
    expect(next.widgets[0].enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
pnpm --dir frontend test -- profile-editor.test.ts
```

Expected: fail because helpers do not exist.

- [ ] **Step 3: Implement helpers**

Create `profile-editor.ts`.

```ts
import type { ProfileConfig, Rect, WidgetAppearance } from "../../lib/profile";

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function normalizeRect(rect: Rect): Rect {
  return {
    x: clampInt(rect.x, 0, 3840),
    y: clampInt(rect.y, 0, 2160),
    w: clampInt(rect.w, 24, 3840),
    h: clampInt(rect.h, 24, 2160),
  };
}

export function updateWidgetPosition(profile: ProfileConfig, widgetId: string, rect: Rect): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((widget) =>
      widget.id === widgetId
        ? { ...widget, position: normalizeRect(rect) }
        : widget,
    ),
  };
}

export function updateWidgetAppearance(
  profile: ProfileConfig,
  widgetId: string,
  appearance: WidgetAppearance,
): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((widget) =>
      widget.id === widgetId
        ? {
            ...widget,
            props: {
              ...(widget.props ?? {}),
              appearance: {
                ...(widget.props?.appearance ?? {}),
                ...appearance,
              },
            },
          }
        : widget,
    ),
  };
}

export function setWidgetEnabled(profile: ProfileConfig, widgetId: string, enabled: boolean): ProfileConfig {
  return {
    ...profile,
    widgets: profile.widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, enabled } : widget,
    ),
  };
}
```

- [ ] **Step 4: Run helper tests**

```powershell
pnpm --dir frontend test -- profile-editor.test.ts
```

Expected: PASS.

---

### Task B3: Add Preview Navigation Tab

**Files:**

- Modify: `vantare-v2/frontend/src/hub/components/Topbar.tsx`
- Modify: `vantare-v2/frontend/src/hub/HubApp.tsx`

- [ ] **Step 1: Add nav item**

In `Topbar.tsx`:

```ts
const NAV_ITEMS: NavItem[] = [
  { label: "Hub", id: "dashboard", active: true },
  { label: "Overlays", id: "profiles" },
  { label: "Preview", id: "preview" },
  { label: "Telemetría", id: "telemetry" },
  { label: "Setup", id: "setup" },
];
```

- [ ] **Step 2: Extend section type**

In `HubApp.tsx`:

```ts
type Section = "dashboard" | "profiles" | "preview" | "telemetry" | "setup";
```

- [ ] **Step 3: Render PreviewPage**

Import:

```ts
import { PreviewPage } from "./pages/PreviewPage";
```

Render:

```tsx
{section === "preview" && <PreviewPage />}
```

Keep telemetry/setup stubs:

```tsx
{(section === "telemetry" || section === "setup") && (
  <div className="flex items-center justify-center h-[60vh] text-vantare-textMuted text-sm font-mono">
    {section === "telemetry" ? "Telemetría — próxima actualización" : "Setup — próxima actualización"}
  </div>
)}
```

- [ ] **Step 4: Build to catch missing PreviewPage**

```powershell
pnpm --dir frontend build
```

Expected: fail until Task B4 creates `PreviewPage`.

---

### Task B4: Create Preview Page Skeleton And Profile Loading

**Files:**

- Create: `vantare-v2/frontend/src/hub/pages/PreviewPage.tsx`

- [ ] **Step 1: Implement page skeleton**

Create `PreviewPage.tsx`.

```tsx
import { useEffect, useState } from "react";
import { Events } from "@wailsio/runtime";
import type { ProfileConfig, LayoutOrigin, DisplayMode } from "../../lib/profile";
import { PreviewCanvas } from "../preview/PreviewCanvas";
import { PreviewInspector } from "../preview/PreviewInspector";

type ProfileLoadedEvent = {
  data: {
    profile: ProfileConfig;
    layoutOrigin?: LayoutOrigin;
    windowMode?: DisplayMode;
  };
};

export function PreviewPage() {
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const unsub = Events.On("profile:loaded", (event: ProfileLoadedEvent) => {
      const loaded = event.data.profile;
      setProfile(loaded);
      setSelectedWidgetId((current) => current ?? loaded.widgets[0]?.id ?? null);
    });
    Events.Emit("profile:request");
    return () => unsub();
  }, []);

  function saveProfile(nextProfile: ProfileConfig) {
    setSaveState("saving");
    setProfile(nextProfile);
    Events.Emit("layout:save", { widgets: nextProfile.widgets });
    window.setTimeout(() => setSaveState("saved"), 250);
  }

  const selectedWidget = profile?.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white mb-2">Preview</h1>
          <p className="text-vantare-textMuted text-sm">
            Edita el layout del perfil activo antes de iniciar el overlay.
          </p>
        </div>
        <div className="text-xs font-mono text-vantare-textMuted">
          {saveState === "saving" && "Guardando..."}
          {saveState === "saved" && "Guardado"}
          {saveState === "error" && "Error al guardar"}
        </div>
      </div>

      {!profile && (
        <div className="glass-panel rounded-xl p-8 text-vantare-textMuted text-sm">
          Selecciona un perfil en Overlays para editarlo.
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <PreviewCanvas
            profile={profile}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={setSelectedWidgetId}
            onChangeProfile={saveProfile}
          />
          <PreviewInspector
            profile={profile}
            widget={selectedWidget}
            onChangeProfile={saveProfile}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build and confirm missing child components**

```powershell
pnpm --dir frontend build
```

Expected: fail until Task B5 and B6 create `PreviewCanvas` and `PreviewInspector`.

---

### Task B5: Implement Preview Canvas And Editable Frames

**Files:**

- Create: `vantare-v2/frontend/src/hub/preview/PreviewCanvas.tsx`
- Create: `vantare-v2/frontend/src/hub/preview/PreviewWidgetFrame.tsx`

- [ ] **Step 1: Create `PreviewWidgetFrame.tsx`**

```tsx
import type { WidgetConfig } from "../../lib/profile";

type PreviewWidgetFrameProps = {
  widget: WidgetConfig;
  scale: number;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function PreviewWidgetFrame({ widget, scale, selected, onSelect }: PreviewWidgetFrameProps) {
  const appearance = widget.props?.appearance;
  const backgroundColor = appearance?.backgroundColor ?? "rgba(0,0,0,0.35)";
  const accentColor = appearance?.accentColor ?? "var(--v-red-500)";
  const textColor = appearance?.textColor ?? "#FFFFFF";
  const opacity = appearance?.opacity ?? 1;

  return (
    <button
      type="button"
      onClick={() => onSelect(widget.id)}
      className={`absolute text-left border transition-colors ${
        selected ? "border-vantare-red-400" : "border-white/15 hover:border-white/30"
      }`}
      style={{
        left: widget.position.x * scale,
        top: widget.position.y * scale,
        width: widget.position.w * scale,
        height: widget.position.h * scale,
        backgroundColor,
        color: textColor,
        opacity,
      }}
    >
      <div className="h-full w-full overflow-hidden rounded-sm">
        <div className="h-1" style={{ backgroundColor: accentColor }} />
        <div className="p-2">
          <div className="text-[10px] uppercase tracking-wider text-white/50">{widget.type}</div>
          <div className="font-mono text-xs font-bold">{widget.id}</div>
          <div className="mt-1 text-[10px] text-white/40">
            {widget.position.x}, {widget.position.y} · {widget.position.w}×{widget.position.h}
          </div>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create `PreviewCanvas.tsx`**

```tsx
import type { ProfileConfig, Rect } from "../../lib/profile";
import { updateWidgetPosition } from "./profile-editor";
import { PreviewWidgetFrame } from "./PreviewWidgetFrame";

type PreviewCanvasProps = {
  profile: ProfileConfig;
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
  onChangeProfile: (profile: ProfileConfig) => void;
};

const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;
const CANVAS_WIDTH = 960;
const SCALE = CANVAS_WIDTH / LOGICAL_WIDTH;

function nudge(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

export function PreviewCanvas({ profile, selectedWidgetId, onSelectWidget, onChangeProfile }: PreviewCanvasProps) {
  const selectedWidget = profile.widgets.find((widget) => widget.id === selectedWidgetId);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!selectedWidget) return;
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChangeProfile(updateWidgetPosition(profile, selectedWidget.id, nudge(selectedWidget.position, -step, 0)));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChangeProfile(updateWidgetPosition(profile, selectedWidget.id, nudge(selectedWidget.position, step, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onChangeProfile(updateWidgetPosition(profile, selectedWidget.id, nudge(selectedWidget.position, 0, -step)));
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onChangeProfile(updateWidgetPosition(profile, selectedWidget.id, nudge(selectedWidget.position, 0, step)));
    }
  }

  return (
    <div className="glass-panel rounded-xl p-4 overflow-hidden">
      <div className="mb-3 flex items-center justify-between text-xs font-mono text-vantare-textMuted">
        <span>{profile.name || profile.id || "Perfil activo"}</span>
        <span>1920×1080</span>
      </div>
      <div
        className="relative mx-auto bg-black/40 border border-white/10 overflow-hidden outline-none"
        style={{ width: CANVAS_WIDTH, height: LOGICAL_HEIGHT * SCALE }}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: `${40 * SCALE}px ${40 * SCALE}px`,
          }}
        />
        {profile.widgets.map((widget) => (
          <PreviewWidgetFrame
            key={widget.id}
            widget={widget}
            scale={SCALE}
            selected={widget.id === selectedWidgetId}
            onSelect={onSelectWidget}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build**

```powershell
pnpm --dir frontend build
```

Expected: fail until `PreviewInspector` exists.

---

### Task B6: Implement Preview Inspector

**Files:**

- Create: `vantare-v2/frontend/src/hub/preview/PreviewInspector.tsx`

- [ ] **Step 1: Create inspector**

```tsx
import type { ProfileConfig, WidgetConfig, WidgetAppearance } from "../../lib/profile";
import {
  setWidgetEnabled,
  updateWidgetAppearance,
  updateWidgetPosition,
} from "./profile-editor";

type PreviewInspectorProps = {
  profile: ProfileConfig;
  widget: WidgetConfig | null;
  onChangeProfile: (profile: ProfileConfig) => void;
};

function numberValue(value: number, onChange: (value: number) => void) {
  return {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value)),
  };
}

export function PreviewInspector({ profile, widget, onChangeProfile }: PreviewInspectorProps) {
  if (!widget) {
    return (
      <aside className="glass-panel rounded-xl p-5 text-sm text-vantare-textMuted">
        Selecciona un widget en el preview.
      </aside>
    );
  }

  const appearance: WidgetAppearance = widget.props?.appearance ?? {};

  function updateRect(next: Partial<typeof widget.position>) {
    onChangeProfile(updateWidgetPosition(profile, widget.id, { ...widget.position, ...next }));
  }

  function updateAppearance(next: WidgetAppearance) {
    onChangeProfile(updateWidgetAppearance(profile, widget.id, next));
  }

  return (
    <aside className="glass-panel rounded-xl p-5">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-wider text-vantare-textDim">Widget</div>
        <h2 className="font-display text-xl font-bold text-white">{widget.id}</h2>
        <p className="text-xs font-mono text-vantare-textMuted">{widget.type}</p>
      </div>

      <label className="mb-5 flex items-center gap-2 text-sm text-white">
        <input
          type="checkbox"
          checked={widget.enabled}
          onChange={(event) => onChangeProfile(setWidgetEnabled(profile, widget.id, event.target.checked))}
        />
        Visible
      </label>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <label className="text-xs text-vantare-textMuted">
          X
          <input className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" type="number" {...numberValue(widget.position.x, (x) => updateRect({ x }))} />
        </label>
        <label className="text-xs text-vantare-textMuted">
          Y
          <input className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" type="number" {...numberValue(widget.position.y, (y) => updateRect({ y }))} />
        </label>
        <label className="text-xs text-vantare-textMuted">
          W
          <input className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" type="number" {...numberValue(widget.position.w, (w) => updateRect({ w }))} />
        </label>
        <label className="text-xs text-vantare-textMuted">
          H
          <input className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" type="number" {...numberValue(widget.position.h, (h) => updateRect({ h }))} />
        </label>
      </div>

      <div className="space-y-3">
        <label className="block text-xs text-vantare-textMuted">
          Accent
          <input className="mt-1 h-9 w-full bg-black/40 border border-white/10 rounded" type="color" value={appearance.accentColor ?? "#E63946"} onChange={(event) => updateAppearance({ accentColor: event.target.value })} />
        </label>
        <label className="block text-xs text-vantare-textMuted">
          Texto
          <input className="mt-1 h-9 w-full bg-black/40 border border-white/10 rounded" type="color" value={appearance.textColor ?? "#FFFFFF"} onChange={(event) => updateAppearance({ textColor: event.target.value })} />
        </label>
        <label className="block text-xs text-vantare-textMuted">
          Opacidad
          <input className="mt-1 w-full" type="range" min="0.2" max="1" step="0.05" value={appearance.opacity ?? 1} onChange={(event) => updateAppearance({ opacity: Number(event.target.value) })} />
        </label>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Build**

```powershell
pnpm --dir frontend build
```

Expected: PASS.

---

### Task B7: Add Profile Selection From Overlays To Preview

**Files:**

- Modify: `vantare-v2/frontend/src/hub/pages/ProfilesPage.tsx`
- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Add `Seleccionar` button in ProfilesPage**

Add handler:

```tsx
const handleSelect = useCallback((profile: ProfileEntry) => {
  setError(null);
  Events.Emit("hub:activate", { id: profile.id, file: profile.file });
}, []);
```

Add button before `Iniciar`:

```tsx
<button
  type="button"
  onClick={() => handleSelect(p)}
  className="btn-secondary px-4 py-2 rounded-lg text-xs font-medium text-vantare-textMuted hover:text-white whitespace-nowrap"
>
  Seleccionar
</button>
```

- [ ] **Step 2: Ensure `hub:activate` emits loaded profile**

In `main.go`, after select-only `hubSvc.ActivateProfile(target)`, emit:

```go
profileSvc.EmitLoaded()
emitter.Emit("hub:profile-activated", map[string]any{"ok": true})
```

This allows Preview to update after selection.

- [ ] **Step 3: Build**

```powershell
go test ./cmd/vantare ./internal/app -v
pnpm --dir frontend build
```

Expected: PASS.

---

### Task B8: Apply Appearance In Runtime Widgets

**Files:**

- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`

- [ ] **Step 1: Update widget prop types**

For each widget, ensure props type includes:

```ts
props?: Record<string, unknown> & {
  appearance?: {
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    opacity?: number;
  };
};
```

- [ ] **Step 2: Apply wrapper style without hot React state**

For `DeltaWidget`, change signature:

```tsx
export function DeltaWidget({ updateHz = 30, props }: DeltaProps) {
  const appearance = props?.appearance;
```

Wrap returned markup:

```tsx
return (
  <div
    className="w-full h-full flex flex-col justify-center px-2 rounded"
    style={{
      backgroundColor: appearance?.backgroundColor,
      color: appearance?.textColor,
      opacity: appearance?.opacity,
      borderTop: appearance?.accentColor ? `2px solid ${appearance.accentColor}` : undefined,
    }}
  >
    ...
  </div>
);
```

For `RelativeWidget` and `StandingsWidget`, apply similar style to the outer `<div>`.

- [ ] **Step 3: Preserve existing DOM-loop behavior**

Do not move telemetry values into React state. Keep `startFrameBudgetLoop` and `setHTMLIfChanged` / `setTextIfChanged` unchanged.

- [ ] **Step 4: Test/build**

```powershell
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: PASS.

---

### Task B9: Manual Validation For Plan B

**Files:**

- Create: `.omo/evidence/v2-hub-preview-editor.txt`
- Modify: `vantare-v2/docs/proyecto/06-DISENO-UI.md`
- Modify: `vantare-v2/docs/proyecto/08-PERFILES-Y-LAYOUT.md`
- Modify: `vantare-v2/docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`

- [ ] **Step 1: Run full verification**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: all PASS.

- [ ] **Step 2: Start app**

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- No overlay opens at startup.

- [ ] **Step 3: Select profile**

In Hub:

```text
Overlays > Default Racing > Seleccionar
Preview
```

Expected:

- Preview shows Default Racing widgets on a 16:9 canvas.

- [ ] **Step 4: Edit layout**

In Preview:

- Select `delta`.
- Change `X` by +20.
- Change accent color.
- Toggle opacity to `0.8`.

Expected:

- Frame moves in preview.
- Color/opacity update in preview.
- Profile JSON receives changed `position` and `props.appearance` after save.

- [ ] **Step 5: Start runtime overlay**

In Hub:

```text
Overlays > Default Racing > Iniciar
```

Expected:

- Runtime overlay opens cleanly.
- No white rectangle appears.
- Edited position and appearance are reflected.

- [ ] **Step 6: Save evidence**

Create `.omo/evidence/v2-hub-preview-editor.txt`:

```text
Date:
Commands:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build
Manual:
- Hub-only startup:
- Select profile:
- Preview layout:
- Edit position:
- Edit appearance:
- Start overlay after save:
Known limitations:
- Drag resize handles may be added in a later polish pass if numeric controls are accepted for foundation.
```

---

## Plan B Self-Review Checklist

- Preview editor inside Hub, not desktop overlay: covered by B3-B7.
- Positions and sizes editable: covered by B6.
- Colors planned and persisted: covered by B1, B2, B6, B8.
- Runtime overlay reads saved profile only: covered by Plan A and B8.
- No hot telemetry React state added: covered by B5/B8 instructions.
- Existing JSON compatibility preserved: uses `props.appearance`, no Go schema migration required.
- No v1 Electron touched: file map excludes `apps/desktop`.

---

# Combined Implementation Prompt For Executor

Use this prompt for the implementation model:

```text
Eres el ejecutor técnico del proyecto Vantare Overlays v2. Isaac es principiante; no asumas que sabe Go/Wails/React. Implementa el megaplán:

C:\Users\isaac\Desktop\Vantare-Overlays\.omo\plans\v2-overlay-lifecycle-preview-editor-megaplan.md

Repositorio:
C:\Users\isaac\Desktop\Vantare-Overlays

Código activo:
C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

No tocar:
C:\Users\isaac\Desktop\Vantare-Overlays\apps\desktop

Reglas:
- No commit ni push.
- Implementa primero Miniplan A completo.
- Verifica Miniplan A con:
  cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
  go test ./...
  pnpm --dir frontend test
  pnpm --dir frontend build
- Haz validación manual de Plan A antes de empezar Plan B.
- Implementa después Miniplan B completo.
- Verifica otra vez con los mismos comandos.
- Mantén diseño Hub compatible con hub_main_v5.html y tokens existentes.
- No uses React state para telemetría caliente.
- No añadas dependencias pesadas.
- Mantén OBS HTTP/SSE funcionando.
- Si una prueba del plan no compila por una diferencia menor de API Wails, corrige con la alternativa mínima y documenta el motivo.

Entrega:
- Lista de archivos creados/modificados/eliminados.
- Resultado de:
  go test ./...
  pnpm --dir frontend test
  pnpm --dir frontend build
- Validación manual:
  1. Hub abre sin overlay inicial.
  2. Iniciar crea overlay limpio sin rectángulo blanco.
  3. Detener cierra overlay sin matar Hub.
  4. Preview muestra perfil seleccionado.
  5. Preview permite editar posición/tamaño/color básico.
  6. Guardar e Iniciar reflejan cambios.
  7. Streaming no crea desktop overlay y HTTP sigue respondiendo.
- Limitaciones reales si las hay.
```
