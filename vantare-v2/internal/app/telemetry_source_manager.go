package app

import (
	"fmt"
	"sync"

	"github.com/vantare/overlays/v2/internal/telemetry/normalizer"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
	"github.com/vantare/overlays/v2/pkg/models"
)

type TelemetrySourceManagerConfig struct {
	UseLive  bool
	OpenLive func() (service.Source, error)
	Mock     service.Source
}

type TelemetrySourceManager struct {
	mu       sync.RWMutex
	useLive  bool
	openLive func() (service.Source, error)
	mock     service.Source
	current  service.Source
	norm     *normalizer.Normalizer
}

func NewTelemetrySourceManager(cfg TelemetrySourceManagerConfig) *TelemetrySourceManager {
	m := &TelemetrySourceManager{
		useLive:  cfg.UseLive,
		openLive: cfg.OpenLive,
		mock:     cfg.Mock,
		current:  cfg.Mock,
		norm:     normalizer.New(),
	}
	if m.current == nil {
		m.current = createMockSource()
	}
	if m.useLive {
		_ = m.tryLiveLocked()
	}
	return m
}

func (m *TelemetrySourceManager) Source() service.Source {
	if m == nil {
		return nil
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}

func (m *TelemetrySourceManager) Read() []byte {
	if m == nil {
		return nil
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	src := m.current
	if src == nil {
		return nil
	}
	return src.Read()
}

func (m *TelemetrySourceManager) ReadTelemetry() *models.Telemetry {
	if m == nil {
		return nil
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	src := m.current
	if src == nil {
		return nil
	}
	if direct, ok := src.(service.TelemetrySource); ok {
		return direct.ReadTelemetry()
	}
	return m.norm.FromBuffer(src.Read())
}

func (m *TelemetrySourceManager) Info() service.SourceInfo {
	if m == nil {
		return service.SourceInfo{Kind: service.SimulatorUnknown, Name: "No source", Live: false, Available: false}
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	return service.InfoForSource(m.current)
}

func (m *TelemetrySourceManager) EnsureLive() error {
	if m == nil {
		return fmt.Errorf("telemetry source manager is nil")
	}
	if !m.useLive {
		return nil
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.tryLiveLocked()
}

func (m *TelemetrySourceManager) tryLiveLocked() error {
	if info := service.InfoForSource(m.current); info.Live && info.Available {
		return nil
	}
	if m.openLive == nil {
		return fmt.Errorf("live telemetry opener is not configured")
	}
	src, err := m.openLive()
	if err != nil {
		if m.current == nil {
			m.current = m.mock
		}
		return err
	}
	if src == nil {
		return fmt.Errorf("live telemetry opener returned nil source")
	}
	info := service.InfoForSource(src)
	if info.Live && !info.Available {
		closeSource(src)
		if m.current == nil {
			m.current = m.mock
		}
		return fmt.Errorf("live telemetry source is not available")
	}
	if m.current != src {
		closeSource(m.current)
	}
	m.current = src
	return nil
}

func (m *TelemetrySourceManager) Close() {
	if m == nil {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	closeSource(m.current)
	m.current = nil
}

func closeSource(src service.Source) {
	if closer, ok := src.(interface{ Close() error }); ok {
		_ = closer.Close()
	}
}
