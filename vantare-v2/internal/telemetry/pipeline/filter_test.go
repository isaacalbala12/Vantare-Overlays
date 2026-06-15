package pipeline_test

import (
	"testing"

	"github.com/vantare/overlays/v2/internal/telemetry/pipeline"
	"github.com/vantare/overlays/v2/pkg/models"
)

func sampleTelemetry(speed float64) *models.Telemetry {
	return &models.Telemetry{
		Connected: true,
		Player: &models.PlayerTelemetry{
			Speed:     speed,
			Gear:      4,
			EngineRPM: 5000,
			Fuel:      50,
		},
		Session: &models.SessionInfo{TrackName: "Spa"},
	}
}

func TestFilterFirstEmit(t *testing.T) {
	f := pipeline.NewFilter()
	snap := sampleTelemetry(20)
	out, ok := f.ShouldPublish(snap)
	if !ok || out == nil {
		t.Fatal("first snapshot must publish")
	}
}

func TestFilterSuppressesRPMNoise(t *testing.T) {
	f := pipeline.NewFilter()
	_, _ = f.ShouldPublish(sampleTelemetry(20))

	quiet := sampleTelemetry(20.001)
	quiet.Player.EngineRPM = 5000 + 10 // below ThresholdRPM 50
	_, ok := f.ShouldPublish(quiet)
	if ok {
		t.Fatal("expected suppress for small RPM change")
	}
}

func TestFilterEmitsGearChange(t *testing.T) {
	f := pipeline.NewFilter()
	_, _ = f.ShouldPublish(sampleTelemetry(20))

	shift := sampleTelemetry(20)
	shift.Player.Gear = 5
	_, ok := f.ShouldPublish(shift)
	if !ok {
		t.Fatal("gear change must publish")
	}
}

func TestFilterEmitsConnectionChange(t *testing.T) {
	f := pipeline.NewFilter()
	_, _ = f.ShouldPublish(sampleTelemetry(20))

	disconnected := sampleTelemetry(20)
	disconnected.Connected = false
	_, ok := f.ShouldPublish(disconnected)
	if !ok {
		t.Fatal("connected flag change must publish")
	}
}

func TestFilterEmitsVehiclePlaceChange(t *testing.T) {
	f := pipeline.NewFilter()
	base := sampleTelemetry(20)
	base.Vehicles = []models.VehicleScoring{{ID: 1, Place: 2, DriverName: "A"}}
	_, _ = f.ShouldPublish(base)

	changed := sampleTelemetry(20)
	changed.Vehicles = []models.VehicleScoring{{ID: 1, Place: 1, DriverName: "A"}}
	_, ok := f.ShouldPublish(changed)
	if !ok {
		t.Fatal("vehicle place change must publish")
	}
}

func TestFilterAnnotatesAndEmitsSessionEpochChanges(t *testing.T) {
	f := pipeline.NewFilter()
	base := sampleTelemetry(20)
	base.PlayerHasVehicle = true
	base.Session = &models.SessionInfo{TrackName: "Spa", SessionType: 10, NumVehicles: 2, PlayerName: "Isaac"}

	first, ok := f.ShouldPublish(base)
	if !ok {
		t.Fatal("first snapshot must publish")
	}
	if first.SessionEpoch != 1 || first.SessionState != "session" {
		t.Fatalf("epoch/state: got %d/%q", first.SessionEpoch, first.SessionState)
	}

	next := sampleTelemetry(20)
	next.PlayerHasVehicle = true
	next.Session = &models.SessionInfo{TrackName: "Monza", SessionType: 10, NumVehicles: 2, PlayerName: "Isaac"}
	changed, ok := f.ShouldPublish(next)
	if !ok {
		t.Fatal("new track session must publish")
	}
	if changed.SessionEpoch != 2 {
		t.Fatalf("epoch: got %d want 2", changed.SessionEpoch)
	}
}

func TestFilterEmitsRestSessionFieldChanges(t *testing.T) {
	f := pipeline.NewFilter()
	base := sampleTelemetry(20)
	base.PlayerHasVehicle = true
	base.Session = &models.SessionInfo{
		TrackName:                "Spa",
		SessionName:              "PRACTICE1",
		TimeRemainingInGamePhase: 600,
		NumVehicles:              2,
		PlayerName:               "Isaac",
		YellowFlagState:          "NONE",
		SectorFlags:              []string{"GREEN", "GREEN", "GREEN"},
	}
	_, _ = f.ShouldPublish(base)

	changed := sampleTelemetry(20)
	changed.PlayerHasVehicle = true
	changed.Session = &models.SessionInfo{
		TrackName:                "Spa",
		SessionName:              "RACE",
		TimeRemainingInGamePhase: 590,
		NumVehicles:              2,
		PlayerName:               "Isaac",
		YellowFlagState:          "FULL",
		SectorFlags:              []string{"YELLOW", "GREEN", "GREEN"},
	}
	out, ok := f.ShouldPublish(changed)
	if !ok {
		t.Fatal("REST session field changes must publish")
	}
	if out.SessionEpoch == base.SessionEpoch {
		t.Fatalf("session epoch should change when session name changes: got %d", out.SessionEpoch)
	}
}

func TestFilterEmitsClutchChange(t *testing.T) {
	f := pipeline.NewFilter()
	base := sampleTelemetry(20)
	base.Player.Clutch = 0.1
	_, _ = f.ShouldPublish(base)

	changed := sampleTelemetry(20)
	changed.Player.Clutch = 0.3
	if _, ok := f.ShouldPublish(changed); !ok {
		t.Fatal("clutch change must publish")
	}
}
