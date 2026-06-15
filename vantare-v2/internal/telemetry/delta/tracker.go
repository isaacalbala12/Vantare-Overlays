package delta

import "github.com/vantare/overlays/v2/internal/telemetry/lmuapi"

func AlphaDelta(rows []lmuapi.StandingRow) (float64, bool) {
	for _, r := range rows {
		if !r.Player {
			continue
		}
		if r.EstimatedLapTime <= 0 || r.BestLapTime <= 0 {
			return 0, false
		}
		return r.EstimatedLapTime - r.BestLapTime, true
	}
	return 0, false
}
