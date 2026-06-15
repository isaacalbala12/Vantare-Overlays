package ops

import (
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

type ProcessMetrics struct {
	MemoryMB   float64  `json:"memoryMb"`
	CPUPercent *float64 `json:"cpuPercent"`
	Goroutines int      `json:"goroutines"`
}

type MetricsSnapshot struct {
	Timestamp time.Time          `json:"timestamp"`
	App       ProcessMetrics     `json:"app"`
	Source    service.SourceInfo `json:"source"`
}
