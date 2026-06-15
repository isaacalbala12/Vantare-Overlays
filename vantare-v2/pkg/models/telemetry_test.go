package models

import "testing"

func TestVehicleScoringHasTimeGapToPlayer(t *testing.T) {
	v := VehicleScoring{ID: 1, TimeGapToPlayer: 1.25}
	if v.TimeGapToPlayer != 1.25 {
		t.Fatalf("expected TimeGapToPlayer field")
	}
}
