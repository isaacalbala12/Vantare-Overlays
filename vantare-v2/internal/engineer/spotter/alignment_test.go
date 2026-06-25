package spotter

import (
	"math"
	"testing"

	"github.com/vantare/overlays/v2/internal/engineer/telemetry"
)

func almostEqual(t *testing.T, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.000001 {
		t.Fatalf("got %.9f want %.9f", got, want)
	}
}

func TestYawFromRF2Orientation_NormalizesNegativeYaw(t *testing.T) {
	o := telemetry.Orientation{
		Row2: telemetry.Vec3{X: -1, Z: 0},
	}
	got := YawFromRF2Orientation(o)
	almostEqual(t, got, 3*math.Pi/2)
}

func TestYawFromRF2Orientation_UsesRow2XAndRow2Z(t *testing.T) {
	o := telemetry.Orientation{
		Row2: telemetry.Vec3{X: 1, Z: 0},
	}
	got := YawFromRF2Orientation(o)
	almostEqual(t, got, math.Pi/2)
}

func TestAlignOpponentXZ_StraightAhead(t *testing.T) {
	got := AlignOpponentXZ(0, telemetry.Vec3{}, telemetry.Vec3{Z: -10})
	almostEqual(t, got.X, 0)
	almostEqual(t, got.Z, -10)
}

func TestAlignOpponentXZ_StraightBehind(t *testing.T) {
	got := AlignOpponentXZ(0, telemetry.Vec3{}, telemetry.Vec3{Z: 10})
	almostEqual(t, got.X, 0)
	almostEqual(t, got.Z, 10)
}

func TestAlignOpponentXZ_PositiveXIsLeftAtZeroYaw(t *testing.T) {
	got := AlignOpponentXZ(0, telemetry.Vec3{}, telemetry.Vec3{X: 3})
	almostEqual(t, got.X, 3)
	almostEqual(t, got.Z, 0)
	if sideFromAlignedX(got.X) != SideLeft {
		t.Fatalf("positive aligned X must be left")
	}
}

func TestAlignOpponentXZ_NegativeXIsRightAtZeroYaw(t *testing.T) {
	got := AlignOpponentXZ(0, telemetry.Vec3{}, telemetry.Vec3{X: -3})
	almostEqual(t, got.X, -3)
	almostEqual(t, got.Z, 0)
	if sideFromAlignedX(got.X) != SideRight {
		t.Fatalf("negative aligned X must be right")
	}
}

func TestAlignOpponentXZ_RotatedNinetyDegrees(t *testing.T) {
	got := AlignOpponentXZ(math.Pi/2, telemetry.Vec3{}, telemetry.Vec3{X: 10})
	almostEqual(t, got.X, 0)
	almostEqual(t, got.Z, -10)
}

