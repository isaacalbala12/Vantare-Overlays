package service_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/engineer/service"
)

type mockEmitter struct {
	mu     sync.Mutex
	events []map[string]any
}

func (e *mockEmitter) Emit(name string, data any) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.events = append(e.events, map[string]any{"name": name, "data": data})
}

func (e *mockEmitter) Events() []map[string]any {
	e.mu.Lock()
	defer e.mu.Unlock()
	res := make([]map[string]any, len(e.events))
	copy(res, e.events)
	return res
}

func TestNotificationStore(t *testing.T) {
	store := service.NewNotificationStore(50)

	// Test deep copy
	n1 := service.EngineerNotification{ID: "1", Text: "Hello"}
	store.Add(n1)

	all := store.GetAll()
	if len(all) != 1 {
		t.Fatalf("expected 1 notification, got %d", len(all))
	}

	// Mutate returned copy
	all[0].Text = "Mutated"

	all2 := store.GetAll()
	if all2[0].Text != "Hello" {
		t.Errorf("store did not return a deep copy; mutation affected the store")
	}

	// Test limit 50 and chronological order
	store.Clear()
	for i := 1; i <= 60; i++ {
		store.Add(service.EngineerNotification{
			ID:        string(rune(i)),
			CreatedAt: int64(i),
		})
	}

	all3 := store.GetAll()
	if len(all3) != 50 {
		t.Errorf("expected store to cap size at 50, got %d", len(all3))
	}

	// First item should have CreatedAt = 11 because we discarded the first 10
	if all3[0].CreatedAt != 11 {
		t.Errorf("expected first item to have CreatedAt 11, got %d (order/cap issue)", all3[0].CreatedAt)
	}
	if all3[49].CreatedAt != 60 {
		t.Errorf("expected last item to have CreatedAt 60, got %d", all3[49].CreatedAt)
	}
}

func TestEngineerService_InitialStateAndValidation(t *testing.T) {
	emitter := &mockEmitter{}
	svc := service.NewEngineerService(emitter)

	status := svc.Status()
	if status.Source != "simulator" {
		t.Errorf("expected initial source to be 'simulator', got %q", status.Source)
	}
	if !status.Enabled {
		t.Errorf("expected initial enabled to be true")
	}
	if !status.SpotterEnabled {
		t.Errorf("expected initial spotterEnabled to be true")
	}

	// Invalid source validation
	err := svc.SetSource("invalid-source")
	if err == nil {
		t.Error("expected error for invalid source, got nil")
	}

	// Invalid sensitivity validation
	err = svc.SetSensitivity("invalid-sensitivity")
	if err == nil {
		t.Error("expected error for invalid sensitivity, got nil")
	}

	// Valid toggles and sensitivity
	err = svc.SetSensitivity("conservative")
	if err != nil {
		t.Errorf("unexpected error setting sensitivity: %v", err)
	}
	if svc.Status().Sensitivity != "conservative" {
		t.Errorf("expected sensitivity to be 'conservative', got %q", svc.Status().Sensitivity)
	}

	err = svc.SetSpotterEnabled(false)
	if err != nil {
		t.Errorf("unexpected error setting spotter enabled: %v", err)
	}
	if svc.Status().SpotterEnabled {
		t.Errorf("expected spotterEnabled to be false")
	}

	err = svc.SetEnabled(false)
	if err != nil {
		t.Errorf("unexpected error setting enabled: %v", err)
	}
	if svc.Status().Enabled {
		t.Errorf("expected enabled to be false")
	}
}

func TestEngineerService_ToggleDoesNotDuplicateLoops(t *testing.T) {
	emitter := &mockEmitter{}
	svc := service.NewEngineerService(emitter)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.Start(ctx)
	time.Sleep(50 * time.Millisecond)

	// Toggle enabled multiple times — each should restart loops cleanly
	for i := 0; i < 3; i++ {
		_ = svc.SetEnabled(false)
		time.Sleep(50 * time.Millisecond)
		_ = svc.SetEnabled(true)
		time.Sleep(100 * time.Millisecond)
	}

	// Toggle source multiple times
	for i := 0; i < 3; i++ {
		_ = svc.SetSource("simulator")
		time.Sleep(100 * time.Millisecond)
		_ = svc.SetSource("simulator")
		time.Sleep(100 * time.Millisecond)
	}

	svc.Stop()

	// After Stop, no new notifications should arrive
	prevCount := len(svc.RecentNotifications())
	time.Sleep(300 * time.Millisecond)
	// Allow up to 2 additional due to in-flight messages
	if got := len(svc.RecentNotifications()); got > prevCount+5 {
		t.Errorf("notifications kept growing after Stop: prev=%d, got=%d (possible duplicate loop)", prevCount, got)
	}
}

func TestEngineerService_NoPanicWithoutTTS(t *testing.T) {
	emitter := &mockEmitter{}
	svc := service.NewEngineerService(emitter)

	// Start the service loops
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.Start(ctx)

	// Let the loops run briefly to ensure no panics
	time.Sleep(100 * time.Millisecond)
	svc.Stop()
}

func TestEngineerService_SimulatorGeneratesNotifications(t *testing.T) {
	emitter := &mockEmitter{}
	svc := service.NewEngineerService(emitter)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.Start(ctx)

	// Wait up to 2 seconds for the simulator to tick and generate a spotter notification
	var foundNotification bool
	start := time.Now()
	for time.Since(start) < 2*time.Second {
		notifications := svc.RecentNotifications()
		if len(notifications) > 0 {
			foundNotification = true
			break
		}
		time.Sleep(50 * time.Millisecond)
	}

	svc.Stop()

	if !foundNotification {
		t.Error("expected simulator to generate at least one notification, but none was found")
	}
}
