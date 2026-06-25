package app

import (
	"errors"
	"sync/atomic"
	"testing"

	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
	"github.com/vantare/overlays/v2/pkg/models"
)

type stubSource struct {
	info service.SourceInfo
}

func (s stubSource) Read() []byte { return nil }
func (s stubSource) Info() service.SourceInfo {
	return s.info
}

type directStubSource struct {
	stubSource
	readTelemetryCalls int32
}

func (s *directStubSource) ReadTelemetry() *models.Telemetry {
	atomic.AddInt32(&s.readTelemetryCalls, 1)
	return &models.Telemetry{Connected: true}
}

func TestTelemetrySourceManagerUsesMockWhenLiveUnavailable(t *testing.T) {
	var calls int32
	mgr := NewTelemetrySourceManager(TelemetrySourceManagerConfig{
		UseLive: true,
		OpenLive: func() (service.Source, error) {
			atomic.AddInt32(&calls, 1)
			return nil, errors.New("lmu unavailable")
		},
		Mock: stubSource{info: service.SourceInfo{
			Kind:      service.SimulatorMock,
			Name:      "Mock telemetry",
			Live:      false,
			Available: true,
		}},
	})

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("startup open calls=%d, want 1", got)
	}
	info := mgr.Info()
	if info.Kind != service.SimulatorMock || info.Live {
		t.Fatalf("info=%+v, want mock fallback", info)
	}
}

func TestTelemetrySourceManagerDelegatesDirectTelemetrySource(t *testing.T) {
	direct := &directStubSource{
		stubSource: stubSource{info: service.SourceInfo{
			Kind:      service.SimulatorLMU,
			Name:      "Le Mans Ultimate",
			Live:      true,
			Available: true,
		}},
	}
	mgr := NewTelemetrySourceManager(TelemetrySourceManagerConfig{
		UseLive: false,
		Mock:    direct,
	})

	telemetry := mgr.ReadTelemetry()
	if telemetry == nil || !telemetry.Connected {
		t.Fatalf("ReadTelemetry()=%#v, want connected telemetry", telemetry)
	}
	if got := atomic.LoadInt32(&direct.readTelemetryCalls); got != 1 {
		t.Fatalf("direct ReadTelemetry calls=%d, want 1", got)
	}
}

func TestTelemetrySourceManagerNormalizesFallbackSource(t *testing.T) {
	mgr := NewTelemetrySourceManager(TelemetrySourceManagerConfig{
		UseLive: false,
		Mock: service.FuncSource{
			ReadFunc: func() []byte { return lmu.BuildSyntheticBuffer() },
			InfoData: service.SourceInfo{
				Kind:      service.SimulatorMock,
				Name:      "Mock telemetry",
				Live:      false,
				Available: true,
			},
		},
	})

	telemetry := mgr.ReadTelemetry()
	if telemetry == nil || !telemetry.Connected {
		t.Fatalf("ReadTelemetry()=%#v, want normalized mock telemetry", telemetry)
	}
}

func TestTelemetrySourceManagerReconnectsToLiveOnEnsure(t *testing.T) {
	var calls int32
	liveSource := stubSource{info: service.SourceInfo{
		Kind:      service.SimulatorLMU,
		Name:      "Le Mans Ultimate",
		Live:      true,
		Available: true,
	}}
	mgr := NewTelemetrySourceManager(TelemetrySourceManagerConfig{
		UseLive: true,
		OpenLive: func() (service.Source, error) {
			call := atomic.AddInt32(&calls, 1)
			if call == 1 {
				return nil, errors.New("lmu unavailable")
			}
			return liveSource, nil
		},
		Mock: stubSource{info: service.SourceInfo{
			Kind:      service.SimulatorMock,
			Name:      "Mock telemetry",
			Live:      false,
			Available: true,
		}},
	})

	if err := mgr.EnsureLive(); err != nil {
		t.Fatalf("EnsureLive() error=%v", err)
	}
	info := mgr.Info()
	if info.Kind != service.SimulatorLMU || !info.Live || !info.Available {
		t.Fatalf("info=%+v, want live LMU", info)
	}
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Fatalf("open calls=%d, want 2", got)
	}
}

func TestTelemetrySourceManagerKeepsMockWhenEnsureLiveFails(t *testing.T) {
	mgr := NewTelemetrySourceManager(TelemetrySourceManagerConfig{
		UseLive: true,
		OpenLive: func() (service.Source, error) {
			return nil, errors.New("lmu unavailable")
		},
		Mock: stubSource{info: service.SourceInfo{
			Kind:      service.SimulatorMock,
			Name:      "Mock telemetry",
			Live:      false,
			Available: true,
		}},
	})

	if err := mgr.EnsureLive(); err == nil {
		t.Fatal("EnsureLive() error=nil, want error while fallback remains active")
	}
	info := mgr.Info()
	if info.Kind != service.SimulatorMock || info.Live {
		t.Fatalf("info=%+v, want mock fallback", info)
	}
}

func TestTelemetrySourceManagerKeepsMockWhenLiveSourceUnavailable(t *testing.T) {
	mgr := NewTelemetrySourceManager(TelemetrySourceManagerConfig{
		UseLive: true,
		OpenLive: func() (service.Source, error) {
			return stubSource{info: service.SourceInfo{
				Kind:      service.SimulatorLMU,
				Name:      "Le Mans Ultimate",
				Live:      true,
				Available: false,
			}}, nil
		},
		Mock: stubSource{info: service.SourceInfo{
			Kind:      service.SimulatorMock,
			Name:      "Mock telemetry",
			Live:      false,
			Available: true,
		}},
	})

	if err := mgr.EnsureLive(); err == nil {
		t.Fatal("EnsureLive() error=nil, want unavailable live error")
	}
	info := mgr.Info()
	if info.Kind != service.SimulatorMock || info.Live {
		t.Fatalf("info=%+v, want mock fallback", info)
	}
}
