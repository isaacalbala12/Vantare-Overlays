package service

import (
	"log"
	"sync"

	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
)

// LMUSource reads live shared memory from Le Mans Ultimate (Windows).
// If the shared memory is not yet available, it retries on each Read() call.
type LMUSource struct {
	mu     sync.Mutex
	reader *lmu.Reader
}

// OpenLMUSource attaches to LMU_Data. Returns error only for non-recoverable
// failures (platform unsupported). A missing LMU process is not fatal: the
// source will keep trying to attach on subsequent reads.
func OpenLMUSource() (*LMUSource, error) {
	s := &LMUSource{}
	if r, err := lmu.Open(); err == nil {
		s.reader = r
		log.Printf("LMU: live source attached")
	} else {
		log.Printf("LMU: live source not yet available: %v (will retry on read)", err)
	}
	return s, nil
}

func (s *LMUSource) Read() []byte {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.reader == nil {
		if r, err := lmu.Open(); err == nil {
			s.reader = r
			log.Printf("LMU: live source attached (late)")
		} else {
			return nil
		}
	}
	return s.reader.Bytes()
}

func (s *LMUSource) Close() error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.reader == nil {
		return nil
	}
	err := s.reader.Close()
	s.reader = nil
	return err
}

func (s *LMUSource) Info() SourceInfo {
	if s == nil {
		return SourceInfo{Kind: SimulatorLMU, Name: "Le Mans Ultimate", Live: true, Available: false}
	}
	s.mu.Lock()
	available := s.reader != nil
	s.mu.Unlock()
	return SourceInfo{
		Kind:      SimulatorLMU,
		Name:      "Le Mans Ultimate",
		Live:      true,
		Available: available,
	}
}
