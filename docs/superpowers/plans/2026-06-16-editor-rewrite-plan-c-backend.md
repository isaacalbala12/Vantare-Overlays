# Plan C — Backend Save Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Hub's "Guardar" button, the widget-enable toggles, and the desktop overlay edit mode actually persist changes to disk and keep the active profile in sync.

**Architecture:**
- `ProfileService.SaveProfile` persists a full profile to disk.
- `HubService.SaveProfile` and `SetWidgetEnabled` expose save operations to the Wails event layer.
- `main.go` wires `profile:save` (full profile), `profile:widget:update` (single toggle), and `overlay:edit:start` (open edit window) events.
- The desktop overlay controller can reload the active profile in edit mode by reusing `OverlayController.Start` with `DisplayMode = ModeEdit`.
- After save, the backend emits `profile:loaded` and `hub:profile` so both the Hub and the overlay reflect the new state.

**Tech Stack:** Go 1.22+, Wails v3 alpha.

**Target release:** v0.2.11-alpha.1.

**Prerequisite:** Plan B is merged and tagged.

---

## Task C1: Add SaveProfile to ProfileService

**Files:**
- Modify: `vantare-v2/internal/app/profile_service.go`

- [ ] **Step 1: Add SaveProfile method**

```go
// SaveProfile persists the given profile to the configured profile path.
func (s *ProfileService) SaveProfile(p *config.ProfileConfig) error {
	if s.path == "" {
		return fmt.Errorf("profile path not configured")
	}
	if err := config.SaveFile(s.path, p); err != nil {
		return fmt.Errorf("save profile: %w", err)
	}
	s.profile = p
	s.EmitLoaded()
	if s.emitter != nil {
		s.emitter.Emit("hub:profile", map[string]any{"profile": p})
	}
	return nil
}
```

- [ ] **Step 2: Add test**

Add to `vantare-v2/internal/app/profile_service_test.go`:

```go
func TestProfileServiceSaveProfile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.json")
	initial := &config.ProfileConfig{
		ID:          "test",
		DisplayMode: config.ModeRacing,
		Widgets:     []config.WidgetConfig{{ID: "w1", Type: "delta", Enabled: true, Position: config.Rect{W: 100, H: 40}}},
	}
	require.NoError(t, config.SaveFile(path, initial))

	s := NewProfileService(path, nil, nil)
	require.NoError(t, s.Load())

	updated := &config.ProfileConfig{
		ID:          "test",
		DisplayMode: config.ModeRacing,
		Widgets:     []config.WidgetConfig{{ID: "w1", Type: "delta", Enabled: false, Position: config.Rect{W: 200, H: 80}}},
	}
	require.NoError(t, s.SaveProfile(updated))

	loaded, err := config.LoadFile(path)
	require.NoError(t, err)
	require.Equal(t, 200, loaded.Widgets[0].Position.Width)
	require.False(t, loaded.Widgets[0].Enabled)
}
```

Run: `cd vantare-v2 && go test ./internal/app/... -run TestProfileServiceSaveProfile`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(profile): SaveProfile persists full profile"
```

---

## Task C2: Add save helpers to HubService

**Files:**
- Modify: `vantare-v2/internal/app/hub_service.go`

- [ ] **Step 1: Add SaveProfile and SetWidgetEnabled**

Important: do not mutate the pointer returned by `profileSvc.GetProfile()`. Clone the profile before modifying.

```go
// SaveProfile persists the provided profile to disk via the profile service.
func (s *HubService) SaveProfile(profile *config.ProfileConfig) error {
	return s.profileSvc.SaveProfile(profile)
}

// SetWidgetEnabled toggles a widget's enabled state in the active profile.
func (s *HubService) SetWidgetEnabled(widgetID string, enabled bool) error {
	current := s.profileSvc.GetProfile()
	if current == nil {
		return fmt.Errorf("no active profile")
	}
	// Clone to avoid mutating the service's internal pointer.
	profile := *current
	found := false
	profile.Widgets = make([]config.WidgetConfig, len(current.Widgets))
	copy(profile.Widgets, current.Widgets)
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
	return s.SaveProfile(&profile)
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

## Task C3: Add StartEditOverlay to HubService

**Files:**
- Modify: `vantare-v2/internal/app/hub_service.go`

- [ ] **Step 1: Add method**

```go
// StartEditOverlay opens the desktop overlay in edit mode for the active profile.
func (s *HubService) StartEditOverlay(idOrFile string) (OverlayStatus, error) {
	if err := s.ActivateProfile(idOrFile); err != nil {
		return OverlayStatus{}, err
	}
	profile := s.profileSvc.GetProfile()
	if profile == nil {
		return OverlayStatus{}, fmt.Errorf("no active profile")
	}
	editProfile := *profile
	editProfile.DisplayMode = config.ModeEdit
	return s.overlay.Start(&editProfile)
}
```

- [ ] **Step 2: Verify compile**

Run: `cd vantare-v2 && go test ./internal/app/...`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(hub): StartEditOverlay opens overlay in edit mode"
```

---

## Task C4: Wire all events in main.go

**Files:**
- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Replace stub handlers from Plan A with real ones**

Use a helper to safely extract the event payload as `map[string]any`, because Wails v3 alpha may deliver it as `map[string]interface{}` or another type.

```go
func eventPayload(event *application.CustomEvent) (map[string]any, bool) {
	if event == nil {
		return nil, false
	}
	switch v := event.Data.(type) {
	case map[string]any:
		return v, true
	case map[string]interface{}:
		out := make(map[string]any, len(v))
		for k, val := range v {
			out[k] = val
		}
		return out, true
	}
	return nil, false
}
```

Then replace the stub handlers with:

```go
wailsApp.Event.On("hub:profile:get", func(event *application.CustomEvent) {
	p := profileService.GetProfile()
	wailsApp.Event.Emit("hub:profile", map[string]any{"profile": p})
})

wailsApp.Event.On("profile:save", func(event *application.CustomEvent) {
	data, ok := eventPayload(event)
	if !ok {
		log.Printf("profile:save: invalid event payload")
		return
	}
	profileMap, ok := data["profile"].(map[string]any)
	if !ok {
		log.Printf("profile:save: missing profile payload")
		return
	}
	b, err := json.Marshal(profileMap)
	if err != nil {
		log.Printf("profile:save marshal failed: %v", err)
		return
	}
	var profile config.ProfileConfig
	if err := json.Unmarshal(b, &profile); err != nil {
		log.Printf("profile:save unmarshal failed: %v", err)
		return
	}
	if err := hubService.SaveProfile(&profile); err != nil {
		log.Printf("profile:save failed: %v", err)
	}
})

wailsApp.Event.On("profile:widget:update", func(event *application.CustomEvent) {
	data, ok := eventPayload(event)
	if !ok {
		return
	}
	widgetID, _ := data["widgetId"].(string)
	enabled, _ := data["enabled"].(bool)
	if widgetID == "" {
		return
	}
	if err := hubService.SetWidgetEnabled(widgetID, enabled); err != nil {
		log.Printf("profile:widget:update failed: %v", err)
	}
})

wailsApp.Event.On("overlay:edit:start", func(event *application.CustomEvent) {
	data, ok := eventPayload(event)
	if !ok {
		log.Printf("overlay:edit:start: invalid event payload")
		return
	}
	id, _ := data["id"].(string)
	file, _ := data["file"].(string)
	if id == "" && file == "" {
		log.Printf("overlay:edit:start: missing id/file")
		return
	}
	target := id
	if target == "" {
		target = file
	}
	status, err := hubService.StartEditOverlay(target)
	if err != nil {
		log.Printf("overlay:edit:start failed: %v", err)
		return
	}
	wailsApp.Event.Emit("overlay:status", status)
})
```

Ensure the `json` import is present in `main.go`.

- [ ] **Step 2: Verify compile and tests**

Run: `cd vantare-v2 && go test ./cmd/vantare/...`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(events): wire profile save, toggle and edit overlay events"
```

---

## Task C5: Remove unused HTTP save endpoint

If a `POST /api/profile/save` endpoint was added in earlier drafts, remove it.

- [ ] **Step 1: Search and remove**

Search `vantare-v2/internal/server/` for `handleProfileSave`, `POST /api/profile/save` and `POST /api/profile`. Delete any handler and route.

- [ ] **Step 2: Commit**

```bash
git commit -am "chore(server): remove unused HTTP profile save endpoint"
```

---

## Task C6: Version bump and release

- [ ] **Step 1: Update version strings**

Update:
- `vantare-v2/cmd/vantare/main.go` to `"v0.2.11-alpha.1"`
- `vantare-v2/build/config.yml` to `0.2.11`
- `vantare-v2/build/windows/nsis/project.nsi` to `0.2.11`

- [ ] **Step 2: Update CHANGELOG.md**

Add v0.2.11-alpha.1 entry describing save wiring.

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
git commit -m "release: v0.2.11-alpha.1 backend save wiring"
git tag -a v0.2.11-alpha.1 -m "v0.2.11-alpha.1"
git push origin master
git push origin v0.2.11-alpha.1
gh release create v0.2.11-alpha.1 vantare-v2/bin/vantare-amd64-installer.exe --repo isaacalbala12/Vantare-Overlays --title "v0.2.11-alpha.1" --notes-file "docs/superpowers/plans/v0.2.11-alpha.1-release-notes.md" --prerelease
```

---

## Self-review

**Spec coverage:**
- Hub save button persists → Tasks C1, C4.
- Widget enable toggles persist → Tasks C2, C4.
- Desktop overlay edit mode opens and saves positions → Tasks C3, C4, plus Plan B.
- Active profile sync via `hub:profile` and `profile:loaded` → Task C1.
- Defensive payload handling → Task C4.
- No mutation of shared profile pointer → Task C2.

**Placeholder scan:** no placeholders.

**Type consistency:**
- `config.ProfileConfig`, `config.WidgetConfig`, `config.Rect`, `config.ModeEdit` from `pkg/config`.
- Event payloads normalized to `map[string]any` before access.
