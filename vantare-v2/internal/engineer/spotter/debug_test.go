package spotter

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

func TestDebugRecordsIncludeAcceptedAndRejectedOpponents(t *testing.T) {
	frame := &telemetry.Frame{
		TimestampUnixMS: 1234,
		Player: &telemetry.PlayerTelemetry{
			ID:          1,
			Position:    telemetry.Vec3{X: 100, Z: 200},
			Orientation: telemetry.Orientation{Row2: telemetry.Vec3{Z: 1}},
		},
		Vehicles: []telemetry.VehicleScoring{
			{ID: 1, IsPlayer: true, Position: telemetry.Vec3{X: 100, Z: 200}, Orientation: telemetry.Orientation{Row2: telemetry.Vec3{Z: 1}}},
			{ID: 2, DriverName: "Left", Position: telemetry.Vec3{X: 102.5, Z: 199}, LapDistance: 10},
			{ID: 3, DriverName: "Far", Position: telemetry.Vec3{X: 130, Z: 200}, LapDistance: 10},
			{ID: 4, DriverName: "Pit", Position: telemetry.Vec3{X: 102.5, Z: 200}, LapDistance: 10, InPits: true},
		},
	}

	records := DebugRecords(frame, SensitivityNormal)

	if len(records) != 3 {
		t.Fatalf("expected 3 opponent records, got %d", len(records))
	}

	accepted := records[0]
	if accepted.OpponentID != 2 {
		t.Fatalf("expected first record for opponent 2, got %d", accepted.OpponentID)
	}
	if !accepted.InOverlap {
		t.Fatalf("expected opponent 2 to be in overlap")
	}
	if accepted.Side != SideLeft {
		t.Fatalf("expected opponent 2 on left, got %q", accepted.Side)
	}
	if accepted.RejectReason != "" {
		t.Fatalf("expected accepted opponent to have no reject reason, got %q", accepted.RejectReason)
	}

	far := records[1]
	if far.OpponentID != 3 {
		t.Fatalf("expected second record for opponent 3, got %d", far.OpponentID)
	}
	if far.InOverlap {
		t.Fatalf("expected far opponent to be rejected")
	}
	if far.RejectReason != "outside_track_zone" {
		t.Fatalf("expected outside_track_zone, got %q", far.RejectReason)
	}

	pit := records[2]
	if pit.OpponentID != 4 {
		t.Fatalf("expected third record for opponent 4, got %d", pit.OpponentID)
	}
	if pit.InOverlap {
		t.Fatalf("expected pit opponent to be rejected")
	}
	if pit.RejectReason != "opponent_in_pits" {
		t.Fatalf("expected opponent_in_pits, got %q", pit.RejectReason)
	}
}

func TestWriteDebugRecordsJSONL(t *testing.T) {
	records := []DebugRecord{
		{
			TimestampUnixMS: 1234,
			OpponentID:      2,
			PlayerX:         100,
			PlayerZ:         200,
			OpponentX:       102.5,
			OpponentZ:       199,
			PlayerYaw:       0,
			AlignedX:        2.5,
			AlignedZ:        -1,
			Side:            SideLeft,
			InOverlap:       true,
		},
		{
			TimestampUnixMS: 1234,
			OpponentID:      3,
			RejectReason:    "outside_track_zone",
		},
	}

	var buf bytes.Buffer
	if err := WriteDebugRecordsJSONL(&buf, records); err != nil {
		t.Fatalf("failed to write records: %v", err)
	}

	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("expected 2 JSONL lines, got %d: %q", len(lines), buf.String())
	}

	var decoded DebugRecord
	if err := json.Unmarshal([]byte(lines[0]), &decoded); err != nil {
		t.Fatalf("first line is not valid JSON: %v", err)
	}
	if decoded.OpponentID != 2 || !decoded.InOverlap || decoded.Side != SideLeft {
		t.Fatalf("unexpected first record: %+v", decoded)
	}
}

