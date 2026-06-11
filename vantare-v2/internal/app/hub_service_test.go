package app_test

import (
	"path/filepath"
	"testing"

	"github.com/vantare/overlays/v2/internal/app"
	"github.com/vantare/overlays/v2/internal/window"
	"github.com/vantare/overlays/v2/pkg/config"
)

func TestHubServiceCreateAndList(t *testing.T) {
	dir := t.TempDir()

	// Create a profile first via real service
	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	if err := hubSvc.CreateProfile("Test Layout"); err != nil {
		t.Fatal(err)
	}

	profiles, err := hubSvc.ListProfiles()
	if err != nil {
		t.Fatal(err)
	}
	if len(profiles) != 1 {
		t.Fatalf("expected 1 profile, got %d", len(profiles))
	}
	if profiles[0].File != "custom-test-layout.json" {
		t.Fatalf("file=%q", profiles[0].File)
	}
	if profiles[0].Name != "Test Layout" {
		t.Fatalf("name=%q, want 'Test Layout'", profiles[0].Name)
	}
	if profiles[0].Widgets != 3 {
		t.Fatalf("expected 3 widgets, got %d", profiles[0].Widgets)
	}
}

func TestHubServiceActivateProfile(t *testing.T) {
	dir := t.TempDir()

	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	if err := hubSvc.CreateProfile("Racing"); err != nil {
		t.Fatal(err)
	}

	if err := hubSvc.ActivateProfile("custom-racing"); err != nil {
		t.Fatal(err)
	}

	p := profileSvc.GetProfile()
	if p == nil || p.ID != "custom-racing" {
		t.Fatalf("profile not activated: got %v", p)
	}
}

func TestHubServiceDeleteProfile(t *testing.T) {
	dir := t.TempDir()

	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	if err := hubSvc.CreateProfile("To Delete"); err != nil {
		t.Fatal(err)
	}

	if err := hubSvc.DeleteProfile("custom-to-delete"); err != nil {
		t.Fatal(err)
	}

	profiles, _ := hubSvc.ListProfiles()
	if len(profiles) != 0 {
		t.Fatalf("expected 0 profiles after delete, got %d", len(profiles))
	}

	// Delete non-existent should error
	if err := hubSvc.DeleteProfile("nonexistent"); err == nil {
		t.Fatal("expected error deleting nonexistent profile")
	}
}

func TestHubServiceListNoProfilesDir(t *testing.T) {
	dir := t.TempDir()

	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	profiles, err := hubSvc.ListProfiles()
	if err != nil {
		t.Fatal(err)
	}
	if len(profiles) != 0 {
		t.Fatalf("expected 0 profiles, got %d", len(profiles))
	}
}

func TestHubServiceActivateByIDWhenFilenameDiffers(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "example-racing.json")
	profile := &config.ProfileConfig{
		ID:          "default-racing",
		Name:        "Default Racing",
		DisplayMode: config.ModeRacing,
		Widgets: []config.WidgetConfig{
			{ID: "delta", Type: "delta", Enabled: true, Position: config.Rect{X: 0, Y: 0, W: 100, H: 50}},
		},
	}
	if err := config.SaveFile(path, profile); err != nil {
		t.Fatal(err)
	}

	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "other.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	if err := hubSvc.ActivateProfile("default-racing"); err != nil {
		t.Fatal(err)
	}
	if profileSvc.GetProfile().ID != "default-racing" {
		t.Fatalf("profile id=%q", profileSvc.GetProfile().ID)
	}
}

func TestHubServiceCreateDuplicate(t *testing.T) {
	dir := t.TempDir()
	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	if err := hubSvc.CreateProfile("Racing"); err != nil {
		t.Fatal(err)
	}
	if err := hubSvc.CreateProfile("Racing"); err == nil {
		t.Fatal("expected duplicate create error")
	}
}

func TestHubServiceRejectPathTraversal(t *testing.T) {
	dir := t.TempDir()
	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	profileSvc := app.NewProfileService(filepath.Join(dir, "dummy.json"), mgr, nil)
	hubSvc := app.NewHubService(dir, profileSvc, nil)

	if err := hubSvc.DeleteProfile("../outside"); err == nil {
		t.Fatal("expected error for path traversal")
	}
	if err := hubSvc.ActivateProfile("..\\evil"); err == nil {
		t.Fatal("expected error for path traversal")
	}
}

func TestProfileServiceLoadActiveProfileUpdatesSavePath(t *testing.T) {
	dir := t.TempDir()
	pathA := filepath.Join(dir, "a.json")
	pathB := filepath.Join(dir, "b.json")
	config.SaveFile(pathA, &config.ProfileConfig{DisplayMode: config.ModeRacing, Widgets: []config.WidgetConfig{
		{ID: "w1", Enabled: true, Position: config.Rect{X: 1, Y: 2, W: 3, H: 4}},
	}})
	config.SaveFile(pathB, &config.ProfileConfig{DisplayMode: config.ModeRacing, Widgets: []config.WidgetConfig{
		{ID: "w2", Enabled: true, Position: config.Rect{X: 10, Y: 20, W: 30, H: 40}},
	}})

	fw := &fakeWindow{}
	mgr := window.NewManager(fw, 0)
	svc := app.NewProfileService(pathA, mgr, nil)
	svc.Load()

	if err := svc.LoadActiveProfile(pathB); err != nil {
		t.Fatal(err)
	}
	newWidgets := []config.WidgetConfig{
		{ID: "w2", Enabled: true, Position: config.Rect{X: 99, Y: 88, W: 30, H: 40}},
	}
	if err := svc.SaveLayout(newWidgets); err != nil {
		t.Fatal(err)
	}

	reloaded, err := config.LoadFile(pathB)
	if err != nil {
		t.Fatal(err)
	}
	if reloaded.Widgets[0].Position.X != 99 {
		t.Fatalf("saved to wrong file: X=%d", reloaded.Widgets[0].Position.X)
	}
}
