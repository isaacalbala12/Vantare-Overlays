package ops

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

func TestDefaultSamplerReturnsProcessMetrics(t *testing.T) {
	sampler := NewRuntimeSampler(service.SourceInfo{
		Kind:      service.SimulatorMock,
		Name:      "Mock telemetry",
		Live:      false,
		Available: true,
	})

	snapshot := sampler.Sample()

	if snapshot.Timestamp.IsZero() {
		t.Fatal("expected timestamp")
	}
	if snapshot.App.MemoryMB <= 0 {
		t.Fatalf("expected positive memory usage, got %.2f", snapshot.App.MemoryMB)
	}
	if snapshot.App.Goroutines <= 0 {
		t.Fatalf("expected positive goroutine count, got %d", snapshot.App.Goroutines)
	}
	if snapshot.Source.Kind != service.SimulatorMock {
		t.Fatalf("expected mock source, got %q", snapshot.Source.Kind)
	}
}

func TestDefaultIntervalIsOneSecond(t *testing.T) {
	if DefaultInterval != time.Second {
		t.Fatalf("expected 1s interval, got %s", DefaultInterval)
	}
}

func TestMetricsSnapshotDoesNotExposeFakeSystemMetrics(t *testing.T) {
	sampler := NewRuntimeSampler(service.SourceInfo{
		Kind:      service.SimulatorMock,
		Name:      "Mock telemetry",
		Available: true,
	})

	raw, err := json.Marshal(sampler.Sample())
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatal(err)
	}
	if _, ok := payload["system"]; ok {
		t.Fatal("did not expect system metrics until real system memory is measured")
	}
}
