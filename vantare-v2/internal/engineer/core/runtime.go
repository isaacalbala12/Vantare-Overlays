package core

import (
	"fmt"

	"github.com/vantare/overlays/v2/internal/engineer/audio"
	"github.com/vantare/overlays/v2/internal/engineer/spotter"
	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

// Runtime connects telemetry frames to the spotter and audio queue.
type Runtime struct {
	queue       *audio.Queue
	machine     *spotter.Machine
	sensitivity spotter.Sensitivity
	enabled     bool
}

// NewRuntime creates a new Runtime instance.
func NewRuntime(queue *audio.Queue, sensitivity spotter.Sensitivity, enabled bool) *Runtime {
	return &Runtime{
		queue:       queue,
		machine:     spotter.NewMachine(),
		sensitivity: sensitivity,
		enabled:     enabled,
	}
}

// ProcessFrame processes a telemetry frame and enqueues any spotter events.
func (r *Runtime) ProcessFrame(nowMS int64, frame *telemetry.Frame) {
	if !r.enabled || frame == nil {
		return
	}

	// Check if player exists in the frame.
	playerExists := false
	for _, v := range frame.Vehicles {
		if v.IsPlayer {
			playerExists = true
			break
		}
	}
	if !playerExists && len(frame.Vehicles) == 1 {
		playerExists = true
	}
	if !playerExists && frame.Player != nil {
		playerExists = true
	}
	if !playerExists {
		return
	}

	active := r.machine.ActiveSides()
	zones := spotter.ClassifyWithActiveSides(frame, r.sensitivity, active)
	events := r.machine.Process(nowMS, zones)

	for _, event := range events {
		textKey := r.MapEventToTextKey(event.Type)
		if textKey == "" {
			continue
		}

		msg := audio.Message{
			ID:        fmt.Sprintf("spotter-%s-%d", event.Type, nowMS),
			TextKey:   textKey,
			Priority:  audio.PrioritySpotter,
			CreatedAt: nowMS,
			ExpiresAt: event.ExpiresAt,
		}
		r.queue.Enqueue(msg)
	}
}

// MapEventToTextKey maps a spotter event type to a localized text key string.
func (r *Runtime) MapEventToTextKey(eventType string) string {
	switch eventType {
	case spotter.EventCarLeft:
		return "spotter.car_left"
	case spotter.EventCarRight:
		return "spotter.car_right"
	case spotter.EventStillThere:
		return "spotter.still_there"
	case spotter.EventClearLeft:
		return "spotter.clear_left"
	case spotter.EventClearRight:
		return "spotter.clear_right"
	case spotter.EventAllClear:
		return "spotter.all_clear"
	case spotter.EventThreeWide:
		return "spotter.three_wide"
	default:
		return ""
	}
}

// SetEnabled enables or disables the runtime processing.
func (r *Runtime) SetEnabled(enabled bool) {
	r.enabled = enabled
}

// SetSensitivity updates the spotter sensitivity.
func (r *Runtime) SetSensitivity(s spotter.Sensitivity) {
	r.sensitivity = s
}

