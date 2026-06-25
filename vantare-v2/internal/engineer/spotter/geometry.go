package spotter

import (
	"sort"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

func isZeroVec(v telemetry.Vec3) bool {
	return v.X == 0 && v.Y == 0 && v.Z == 0
}

type tempZone struct {
	zone    Zone
	lateral float64
}

func existingOverlap(aligned AlignedOpponent, active ActiveSides) bool {
	if aligned.X > 0 {
		return active.Left
	}
	if aligned.X < 0 {
		return active.Right
	}
	return false
}

func overlapConfigForSensitivity(s Sensitivity) OverlapConfig {
	cfg := DefaultOverlapConfig()
	switch s {
	case SensitivityConservative:
		cfg.CarWidthM = 1.6
		cfg.CarLengthM = 4.8
	case SensitivityAggressive:
		cfg.CarWidthM = 2.0
		cfg.CarLengthM = 4.2
	case SensitivityNormal:
		fallthrough
	default:
		cfg.CarWidthM = 1.8
		cfg.CarLengthM = 4.5
	}
	return cfg
}

// Classify determines lateral overlap zones around the player vehicle using CrewChief geometry.
func Classify(frame *telemetry.Frame, sensitivity Sensitivity) []Zone {
	return ClassifyWithActiveSides(frame, sensitivity, ActiveSides{})
}

func ClassifyWithActiveSides(frame *telemetry.Frame, sensitivity Sensitivity, active ActiveSides) []Zone {
	if frame == nil {
		return nil
	}

	var player *telemetry.VehicleScoring
	for i := range frame.Vehicles {
		if frame.Vehicles[i].IsPlayer {
			player = &frame.Vehicles[i]
			break
		}
	}

	// Fallback to match by player ID if available.
	if player == nil && frame.Player != nil {
		for i := range frame.Vehicles {
			if frame.Vehicles[i].ID == frame.Player.ID {
				player = &frame.Vehicles[i]
				break
			}
		}
	}

	// Fallback to first vehicle if exactly one vehicle exists.
	if player == nil && len(frame.Vehicles) == 1 {
		player = &frame.Vehicles[0]
	}
	if player == nil {
		return nil
	}
	if player.InPits {
		return nil
	}

	playerPos := player.Position
	playerYaw := YawFromRF2Orientation(player.Orientation)

	// Handle player telemetry fallbacks. Prefer frame.Player for position/orientation if it exists and Row2 is not zero.
	if frame.Player != nil {
		if !isZeroVec(frame.Player.Orientation.Row2) {
			playerYaw = YawFromRF2Orientation(frame.Player.Orientation)
		}
		if !isZeroVec(frame.Player.Position) {
			playerPos = frame.Player.Position
		}
	}

	// Default/absolute fallback if still zero.
	if isZeroVec(playerPos) && frame.Player != nil {
		playerPos = frame.Player.Position
	}

	cfg := overlapConfigForSensitivity(sensitivity)
	var results []tempZone

	for i := range frame.Vehicles {
		opp := &frame.Vehicles[i]
		if opp.ID == player.ID || opp.IsPlayer {
			continue
		}
		if opp.InPits {
			continue
		}
		if opp.LapDistance < 0 {
			continue
		}

		aligned := AlignOpponentXZ(playerYaw, playerPos, opp.Position)
		overlap := ClassifyAlignedOverlap(aligned, existingOverlap(aligned, active), cfg)
		if overlap.InOverlap {
			results = append(results, tempZone{
				zone: Zone{
					Side:      overlap.Side,
					VehicleID: opp.ID,
					LateralM:  overlap.LateralM,
					ForwardM:  overlap.ForwardM,
				},
				lateral: aligned.X,
			})
		}
	}

	// Sort deterministically: by lateral (signed projection), then vehicle ID.
	sort.Slice(results, func(i, j int) bool {
		if results[i].lateral != results[j].lateral {
			return results[i].lateral < results[j].lateral
		}
		return results[i].zone.VehicleID < results[j].zone.VehicleID
	})

	zones := make([]Zone, len(results))
	for i := range results {
		zones[i] = results[i].zone
	}

	return zones
}

