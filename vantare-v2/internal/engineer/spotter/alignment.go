package spotter

import (
	"math"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

type AlignedOpponent struct {
	X float64
	Z float64
}

func YawFromRF2Orientation(o telemetry.Orientation) float64 {
	yaw := math.Atan2(o.Row2.X, o.Row2.Z)
	if yaw < 0 {
		yaw += 2 * math.Pi
	}
	return yaw
}

func AlignOpponentXZ(playerYaw float64, player telemetry.Vec3, opponent telemetry.Vec3) AlignedOpponent {
	rawX := opponent.X - player.X
	rawZ := opponent.Z - player.Z
	c := math.Cos(playerYaw)
	s := math.Sin(playerYaw)
	return AlignedOpponent{
		X: c*rawX + s*rawZ,
		Z: c*rawZ - s*rawX,
	}
}

func sideFromAlignedX(x float64) Side {
	if x > 0 {
		return SideLeft
	}
	if x < 0 {
		return SideRight
	}
	return ""
}

