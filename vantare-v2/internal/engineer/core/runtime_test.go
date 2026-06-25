package core_test

import (
	"testing"

	"github.com/vantare/overlays/v2/internal/engineer/audio"
	"github.com/vantare/overlays/v2/internal/engineer/core"
	"github.com/vantare/overlays/v2/internal/engineer/simulator"
	"github.com/vantare/overlays/v2/internal/engineer/spotter"
)

func TestRuntime_SpotterFlow(t *testing.T) {
	frames := simulator.Build(simulator.ScenarioLeftBasic)
	if len(frames) < 4 {
		t.Fatalf("expected at least 4 frames, got %d", len(frames))
	}

	queue := audio.NewQueue()
	rt := core.NewRuntime(queue, spotter.SensitivityNormal, true)

	// Timestamps spaced to trigger events:
	// Frame 0 (0ms): no overlap -> none, 0 events
	// Frame 1 (1000ms): left opponent -> car_left
	// Frame 2 (3500ms): left opponent -> still_there (3500-1000=2500 >= 2500 repeat)
	// Frame 3 (5500ms): no overlap -> debounce: 5500-3500=2000 >= 1000 holdExpiry
	//   → clear_left scheduled (fires after clearDelay)
	timestamps := []int64{0, 1000, 3500, 5500}

	for i, ts := range timestamps {
		rt.ProcessFrame(ts, &frames[i])
	}

	// Fire the pending clear after the clear delay boundary.
	rt.ProcessFrame(5650, &frames[3])

	// Check queued messages. Left→None now emits only clear_left, not all_clear.
	expectedKeys := map[string]bool{
		"spotter.car_left":    false,
		"spotter.still_there": false,
		"spotter.clear_left":  false,
	}

	var queuedKeys []string
	for {
		msg, ok := queue.Next(0)
		if !ok {
			break
		}
		queuedKeys = append(queuedKeys, msg.TextKey)
		if _, exists := expectedKeys[msg.TextKey]; exists {
			expectedKeys[msg.TextKey] = true
		}
	}

	t.Logf("Queued keys: %v", queuedKeys)

	for key, found := range expectedKeys {
		if !found {
			t.Errorf("expected text key %q to be queued, but it was not", key)
		}
	}
}

func TestRuntime_Disabled(t *testing.T) {
	frames := simulator.Build(simulator.ScenarioLeftBasic)
	if len(frames) < 2 {
		t.Fatalf("expected at least 2 frames, got %d", len(frames))
	}

	queue := audio.NewQueue()
	rt := core.NewRuntime(queue, spotter.SensitivityNormal, false)

	rt.ProcessFrame(1000, &frames[1])

	if queue.Len() > 0 {
		t.Errorf("expected queue to be empty when runtime is disabled, got %d messages", queue.Len())
	}
}

