package telemetry

import (
	"encoding/json"
	"testing"
)

func TestVec3Operations(t *testing.T) {
	a := Vec3{X: 5, Y: 2, Z: 1}
	b := Vec3{X: 3, Y: 1, Z: 1}
	got := a.Sub(b)
	if got != (Vec3{X: 2, Y: 1, Z: 0}) {
		t.Fatalf("Sub = %+v", got)
	}
	if got.Dot(Vec3{X: 1, Y: 0, Z: 0}) != 2 {
		t.Fatalf("Dot mismatch")
	}
}

func TestJSONSerialization(t *testing.T) {
	frame := Frame{
		Connected:        true,
		PlayerHasVehicle: true,
		Player: &PlayerTelemetry{
			ID:       1,
			Speed:    120.5,
			Position: Vec3{X: 1.0, Y: 2.0, Z: 3.0},
			Orientation: Orientation{
				Row0: Vec3{X: 1, Y: 0, Z: 0},
				Row1: Vec3{X: 0, Y: 1, Z: 0},
				Row2: Vec3{X: 0, Y: 0, Z: 1},
			},
		},
		Session: &SessionInfo{
			TrackName:   "Spa",
			TrackLength: 7004.0,
		},
		Vehicles: []VehicleScoring{
			{
				ID:          2,
				DriverName:  "Test Driver",
				PathLateral: 0.5,
				TrackEdge:   4.2,
				Position:    Vec3{X: 4.0, Y: 5.0, Z: 6.0},
			},
		},
		TimestampUnixMS: 1623800000000,
	}

	data, err := json.Marshal(frame)
	if err != nil {
		t.Fatalf("failed to marshal frame: %v", err)
	}

	var parsed Frame
	err = json.Unmarshal(data, &parsed)
	if err != nil {
		t.Fatalf("failed to unmarshal frame: %v", err)
	}

	if parsed.Player.Speed != frame.Player.Speed {
		t.Errorf("Speed mismatch: got %v, want %v", parsed.Player.Speed, frame.Player.Speed)
	}
	if parsed.Session.TrackLength != frame.Session.TrackLength {
		t.Errorf("TrackLength mismatch: got %v, want %v", parsed.Session.TrackLength, frame.Session.TrackLength)
	}
	if len(parsed.Vehicles) != 1 || parsed.Vehicles[0].PathLateral != frame.Vehicles[0].PathLateral {
		t.Errorf("Vehicle PathLateral mismatch")
	}
}
