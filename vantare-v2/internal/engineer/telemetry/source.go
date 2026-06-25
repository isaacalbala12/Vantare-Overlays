package telemetry

type Kind string

const (
	KindLMU       Kind = "lmu"
	KindReplay    Kind = "replay"
	KindSimulator Kind = "simulator"
)

type SourceInfo struct {
	Kind      Kind   `json:"kind"`
	Name      string `json:"name"`
	Live      bool   `json:"live"`
	Available bool   `json:"available"`
}

type Source interface {
	ReadFrame() *Frame
	Info() SourceInfo
	Close() error
}
