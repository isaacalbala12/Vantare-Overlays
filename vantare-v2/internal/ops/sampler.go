package ops

import (
	"runtime"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

const DefaultInterval = time.Second

type Sampler interface {
	Sample() MetricsSnapshot
}

type RuntimeSampler struct {
	source service.SourceInfo
}

func NewRuntimeSampler(source service.SourceInfo) *RuntimeSampler {
	return &RuntimeSampler{source: source}
}

func (s *RuntimeSampler) Sample() MetricsSnapshot {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	memoryMB := float64(mem.Alloc) / 1024 / 1024

	return MetricsSnapshot{
		Timestamp: time.Now(),
		App: ProcessMetrics{
			MemoryMB:   memoryMB,
			CPUPercent: nil,
			Goroutines: runtime.NumGoroutine(),
		},
		Source: s.source,
	}
}
