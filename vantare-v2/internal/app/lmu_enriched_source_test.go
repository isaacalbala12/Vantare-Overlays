package app

import (
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

func TestEnrichedLMUSourceReadTelemetryDoesNotBlockOnREST(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/rest/watch/standings":
			_, _ = w.Write([]byte(`[]`))
		case "/rest/watch/sessionInfo":
			_, _ = w.Write([]byte(`{}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	cache := newLMURESTCache(lmuapi.NewClient(srv.URL, 750*time.Millisecond), time.Hour, time.Second)
	defer cache.Close()
	src := &EnrichedLMUSource{
		mmap:  service.FuncSource{ReadFunc: func() []byte { return lmu.BuildSyntheticBuffer() }},
		cache: cache,
	}

	start := time.Now()
	tele := src.ReadTelemetry()
	elapsed := time.Since(start)
	if tele == nil || !tele.Connected {
		t.Fatalf("expected connected telemetry, got %#v", tele)
	}
	if elapsed > 50*time.Millisecond {
		t.Fatalf("ReadTelemetry blocked on REST for %s", elapsed)
	}
}

func TestEnrichedLMUSourcePrioritizesNativeDelta(t *testing.T) {
	tests := []struct {
		name          string
		nativeDelta   float64
		expectedDelta float64
	}{
		{
			name:          "valid negative delta is prioritized",
			nativeDelta:   -0.250,
			expectedDelta: -0.250,
		},
		{
			name:          "valid positive delta is prioritized",
			nativeDelta:   0.350,
			expectedDelta: 0.350,
		},
		{
			name:          "zero delta falls back to engine/REST (which returns 0 in this mock)",
			nativeDelta:   0.0,
			expectedDelta: 0.0,
		},
		{
			name:          "NaN delta is not prioritized (falls back to 0)",
			nativeDelta:   math.NaN(),
			expectedDelta: 0.0,
		},
		{
			name:          "positive infinity delta is not prioritized (falls back to 0)",
			nativeDelta:   math.Inf(1),
			expectedDelta: 0.0,
		},
		{
			name:          "negative infinity delta is not prioritized (falls back to 0)",
			nativeDelta:   math.Inf(-1),
			expectedDelta: 0.0,
		},
		{
			name:          "absurdly large delta is not prioritized (falls back to 0)",
			nativeDelta:   15000.0,
			expectedDelta: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buf := lmu.BuildSyntheticBuffer()
			lmu.SetPlayerDeltaBest(buf, tt.nativeDelta)

			src := &EnrichedLMUSource{
				mmap: service.FuncSource{ReadFunc: func() []byte { return buf }},
			}

			tele := src.ReadTelemetry()
			if tele.Player == nil {
				t.Fatal("expected player telemetry")
			}

			// For NaN, we can't directly compare using ==
			if math.IsNaN(tt.expectedDelta) {
				if !math.IsNaN(tele.Player.DeltaBest) {
					t.Fatalf("expected DeltaBest to be NaN, got %v", tele.Player.DeltaBest)
				}
			} else {
				if tele.Player.DeltaBest != tt.expectedDelta {
					t.Fatalf("expected DeltaBest to be %v, got %v", tt.expectedDelta, tele.Player.DeltaBest)
				}
			}
		})
	}
}
