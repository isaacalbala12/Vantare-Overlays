package simulator

import (
	"sync"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

type Source struct {
	mu     sync.Mutex
	frames []telemetry.Frame
	index  int
}

// NewSource creates a new simulator source with the provided frames.
func NewSource(frames []telemetry.Frame) *Source {
	return &Source{
		frames: frames,
	}
}

// ReadFrame returns telemetry frames sequentially, keeping returning the last frame after EOF.
func (s *Source) ReadFrame() *telemetry.Frame {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.frames) == 0 {
		return nil
	}

	var frame telemetry.Frame
	if s.index < len(s.frames) {
		frame = s.frames[s.index]
		s.index++
	} else {
		frame = s.frames[len(s.frames)-1]
	}
	return &frame
}

// Info returns metadata about the source.
func (s *Source) Info() telemetry.SourceInfo {
	return telemetry.SourceInfo{
		Kind:      telemetry.KindSimulator,
		Name:      "Simulator",
		Live:      false,
		Available: true,
	}
}

// Close closes the source.
func (s *Source) Close() error {
	return nil
}
