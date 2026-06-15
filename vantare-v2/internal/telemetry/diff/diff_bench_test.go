package diff

import (
	"testing"

	"github.com/vantare/overlays/v2/pkg/models"
)

func BenchmarkVehiclesChanged(b *testing.B) {
	prev := &models.Telemetry{
		Vehicles: make([]models.VehicleScoring, 40),
	}
	next := &models.Telemetry{
		Vehicles: make([]models.VehicleScoring, 40),
	}
	for i := 0; i < 40; i++ {
		prev.Vehicles[i] = models.VehicleScoring{ID: int32(i), Place: byte(i), LapDistance: float64(i * 100)}
		next.Vehicles[i] = models.VehicleScoring{ID: int32(i), Place: byte(i), LapDistance: float64(i*100) + 0.5}
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		vehiclesChanged(prev, next)
	}
}
