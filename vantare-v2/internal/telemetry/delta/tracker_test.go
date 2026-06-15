package delta_test

import (
	"testing"

	"github.com/vantare/overlays/v2/internal/telemetry/delta"
	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
)

func TestAlphaDeltaUsesEstimatedMinusBestForPlayer(t *testing.T) {
	rows := []lmuapi.StandingRow{{
		DriverName:       "Isaac Albala",
		Player:           true,
		EstimatedLapTime: 246.5,
		BestLapTime:      245.2,
	}}
	got, ok := delta.AlphaDelta(rows)
	if !ok {
		t.Fatal("expected delta")
	}
	if got < 1.29 || got > 1.31 {
		t.Fatalf("delta: got %.3f want about 1.300", got)
	}
}

func TestAlphaDeltaRejectsInvalidTimes(t *testing.T) {
	rows := []lmuapi.StandingRow{{
		DriverName:       "Isaac Albala",
		Player:           true,
		EstimatedLapTime: 246.5,
		BestLapTime:      -1,
	}}
	if got, ok := delta.AlphaDelta(rows); ok {
		t.Fatalf("expected invalid delta, got %.3f", got)
	}
}

func TestAlphaDeltaReturnsFalseIfNoPlayer(t *testing.T) {
	rows := []lmuapi.StandingRow{{
		DriverName:       "Other",
		Player:           false,
		EstimatedLapTime: 246.5,
		BestLapTime:      245.2,
	}}
	if got, ok := delta.AlphaDelta(rows); ok {
		t.Fatalf("expected no delta without player, got %.3f", got)
	}
}
