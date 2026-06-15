package service

import "github.com/vantare/overlays/v2/pkg/models"

type SimulatorKind string

const (
	SimulatorUnknown SimulatorKind = "unknown"
	SimulatorMock    SimulatorKind = "mock"
	SimulatorLMU     SimulatorKind = "lmu"
	SimulatorIRacing SimulatorKind = "iracing"
	SimulatorAC      SimulatorKind = "assetto-corsa"
)

type SourceInfo struct {
	Kind      SimulatorKind `json:"kind"`
	Name      string        `json:"name"`
	Live      bool          `json:"live"`
	Available bool          `json:"available"`
}

type Source interface {
	Read() []byte
}

type TelemetrySource interface {
	Source
	ReadTelemetry() *models.Telemetry
}

type SourceWithInfo interface {
	Source
	Info() SourceInfo
}

type FuncSource struct {
	ReadFunc func() []byte
	InfoData SourceInfo
}

func (f FuncSource) Read() []byte {
	if f.ReadFunc == nil {
		return nil
	}
	return f.ReadFunc()
}

func (f FuncSource) Info() SourceInfo {
	if f.InfoData.Kind == "" {
		return SourceInfo{
			Kind:      SimulatorMock,
			Name:      "Mock telemetry",
			Live:      false,
			Available: true,
		}
	}
	return f.InfoData
}

func InfoForSource(src Source) SourceInfo {
	if src == nil {
		return SourceInfo{Kind: SimulatorUnknown, Name: "No source", Live: false, Available: false}
	}
	if withInfo, ok := src.(SourceWithInfo); ok {
		return withInfo.Info()
	}
	return SourceInfo{Kind: SimulatorUnknown, Name: "Unknown source", Live: false, Available: true}
}
