package models_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/vantare/overlays/v2/pkg/models"
)

func TestVehicleScoringExtendedJSONFields(t *testing.T) {
	tel := models.Telemetry{
		Connected: true,
		Vehicles: []models.VehicleScoring{{
			ID:                    31,
			DriverName:            "Isaac Albala",
			DriverNumber:          "46",
			TeamName:              "ADESS Factory Racing Team 2025",
			VehicleName:           "ADESS Factory Racing Team 2025 #46:ELMS",
			Place:                 12,
			VehicleClass:          "LMP3",
			IsPlayer:              true,
			InPits:                true,
			Pitting:               true,
			InGarageStall:         true,
			PitState:              "EXITING",
			LapDistance:           165.79,
			TimeIntoLap:           3.02,
			TimeBehindNext:        243.93,
			LapsBehindLeader:      6,
			LapsBehindClassLeader: 2,
			BestLapTime:           -1,
			LastLapTime:           0,
			EstimatedLapTime:      246.19,
			Sector:                "SECTOR1",
		}},
	}
	b, err := json.Marshal(tel)
	if err != nil {
		t.Fatal(err)
	}
	s := string(b)
	for _, want := range []string{
		`"driverNumber":"46"`,
		`"teamName":"ADESS Factory Racing Team 2025"`,
		`"lapDistance":165.79`,
		`"timeIntoLap":3.02`,
		`"pitState":"EXITING"`,
		`"lapsBehindLeader":6`,
	} {
		if !strings.Contains(s, want) {
			t.Fatalf("json missing %s in %s", want, s)
		}
	}
}

func TestTelemetryJSONUsesCamelCase(t *testing.T) {
	tel := &models.Telemetry{
		Connected: true,
		Player: &models.PlayerTelemetry{
			Speed:     15,
			Gear:      4,
			EngineRPM: 7200,
		},
	}
	raw, err := json.Marshal(tel)
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	if doc["connected"] != true {
		t.Fatalf("expected connected key, got %v", doc)
	}
	player, ok := doc["player"].(map[string]any)
	if !ok {
		t.Fatalf("expected player object in %s", raw)
	}
	if _, ok := player["engineRPM"]; !ok {
		t.Fatalf("expected engineRPM key in player: %v", player)
	}
}
