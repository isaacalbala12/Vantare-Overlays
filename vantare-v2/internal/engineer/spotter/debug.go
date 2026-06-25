package spotter

import (
	"encoding/json"
	"io"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

type DebugRecord struct {
	TimestampUnixMS int64   `json:"timestampUnixMs"`
	OpponentID      int32   `json:"opponentId"`
	OpponentName    string  `json:"opponentName,omitempty"`
	PlayerX         float64 `json:"playerX"`
	PlayerZ         float64 `json:"playerZ"`
	OpponentX       float64 `json:"opponentX"`
	OpponentZ       float64 `json:"opponentZ"`
	PlayerYaw       float64 `json:"playerYaw"`
	AlignedX        float64 `json:"alignedX"`
	AlignedZ        float64 `json:"alignedZ"`
	Side            Side    `json:"side,omitempty"`
	InOverlap       bool    `json:"inOverlap"`
	RejectReason    string  `json:"rejectReason,omitempty"`
	InPits          bool    `json:"inPits,omitempty"`
	PitState        string  `json:"pitState,omitempty"`
	LapDistance     float64 `json:"lapDistance,omitempty"`
}

// DebugRecords evaluates the spotter geometry mathematically for a single telemetry frame.
// Note: This function operates purely on raw geometry (existingOverlap=false) and is
// completely stateless. It does not reflect the Spotter Machine's hysteresis, debouncing,
// or stateful ActiveSides logic. It is strictly meant for raw alignment debugging.
// See docs/manual-verification.md "Export JSONL del Spotter" for how to interpret InOverlap.
func DebugRecords(frame *telemetry.Frame, sensitivity Sensitivity) []DebugRecord {
	if frame == nil {
		return nil
	}

	player := findPlayerVehicle(frame)
	if player == nil {
		return nil
	}

	playerPos := player.Position
	playerYaw := YawFromRF2Orientation(player.Orientation)
	if frame.Player != nil {
		if !isZeroVec(frame.Player.Orientation.Row2) {
			playerYaw = YawFromRF2Orientation(frame.Player.Orientation)
		}
		if !isZeroVec(frame.Player.Position) {
			playerPos = frame.Player.Position
		}
	}

	records := make([]DebugRecord, 0, len(frame.Vehicles))
	cfg := overlapConfigForSensitivity(sensitivity)
	for i := range frame.Vehicles {
		opp := &frame.Vehicles[i]
		if opp.ID == player.ID || opp.IsPlayer {
			continue
		}

		aligned := AlignOpponentXZ(playerYaw, playerPos, opp.Position)
		result := ClassifyAlignedOverlap(aligned, false, cfg)
		rejectReason := result.RejectReason
		inOverlap := result.InOverlap
		side := result.Side
		if player.InPits {
			inOverlap = false
			rejectReason = "player_in_pits"
		} else if opp.InPits {
			inOverlap = false
			rejectReason = "opponent_in_pits"
		} else if opp.LapDistance < 0 {
			inOverlap = false
			rejectReason = "invalid_lap_distance"
		}

		records = append(records, DebugRecord{
			TimestampUnixMS: frame.TimestampUnixMS,
			OpponentID:      opp.ID,
			OpponentName:    opp.DriverName,
			PlayerX:         playerPos.X,
			PlayerZ:         playerPos.Z,
			OpponentX:       opp.Position.X,
			OpponentZ:       opp.Position.Z,
			PlayerYaw:       playerYaw,
			AlignedX:        aligned.X,
			AlignedZ:        aligned.Z,
			Side:            side,
			InOverlap:       inOverlap,
			RejectReason:    rejectReason,
			InPits:          opp.InPits,
			PitState:        opp.PitState,
			LapDistance:     opp.LapDistance,
		})
	}

	return records
}

func WriteDebugRecordsJSONL(w io.Writer, records []DebugRecord) error {
	enc := json.NewEncoder(w)
	for _, record := range records {
		if err := enc.Encode(record); err != nil {
			return err
		}
	}
	return nil
}

func findPlayerVehicle(frame *telemetry.Frame) *telemetry.VehicleScoring {
	for i := range frame.Vehicles {
		if frame.Vehicles[i].IsPlayer {
			return &frame.Vehicles[i]
		}
	}
	if frame.Player != nil {
		for i := range frame.Vehicles {
			if frame.Vehicles[i].ID == frame.Player.ID {
				return &frame.Vehicles[i]
			}
		}
	}
	if len(frame.Vehicles) == 1 {
		return &frame.Vehicles[0]
	}
	return nil
}

