package server_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	engineerservice "github.com/vantare/overlays/v2/internal/engineer/service"
	"github.com/vantare/overlays/v2/internal/server"
	"github.com/vantare/overlays/v2/internal/telemetry/lmu"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

type dummyEmitter struct{}

func (d dummyEmitter) Emit(name string, data any) {}

func TestEngineerStreamNoService(t *testing.T) {
	srv := server.New(server.ServerConfig{})
	req := httptest.NewRequest(http.MethodGet, "/engineer/stream", nil)
	rr := httptest.NewRecorder()

	srv.Handler().ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rr.Code)
	}
}

func TestEngineerStreamEmitsEvents(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Create and start the EngineerService
	engSvc := engineerservice.NewEngineerService(dummyEmitter{})
	engSvc.Start(ctx)
	defer engSvc.Stop()

	srv := server.New(server.ServerConfig{EngineerSvc: engSvc})
	s := httptest.NewServer(srv.Handler())
	defer s.Close()

	// Connect to the stream
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, s.URL+"/engineer/stream", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}

	// Read lines from the stream. The simulator runs at 60Hz and generates spotter notifications.
	lines, err := sseLines(ctx, s.URL+"/engineer/stream", 2)
	if err != nil {
		t.Fatalf("sseLines: %v", err)
	}

	foundEvent := false
	for _, line := range lines {
		if strings.HasPrefix(line, "event: engineer-notification") {
			foundEvent = true
			break
		}
	}

	if !foundEvent {
		t.Errorf("expected event: engineer-notification in stream, got lines: %v", lines)
	}
}

// TestEngineerAndTelemetryStreamCoexistence verifies that /engineer/stream and
// /telemetry/stream can both be served by the same Server without interference.
func TestEngineerAndTelemetryStreamCoexistence(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Start telemetry service (fast synthetic source)
	teleSvc := service.New(service.Config{
		ReadHz: 1000,
		EmitHz: 100,
		Source: service.FuncSource{ReadFunc: func() []byte {
			return lmu.BuildSyntheticBuffer()
		}},
	})
	go teleSvc.Run(ctx)
	time.Sleep(50 * time.Millisecond)

	// Start engineer service (simulator)
	engSvc := engineerservice.NewEngineerService(dummyEmitter{})
	engSvc.Start(ctx)
	defer engSvc.Stop()

	// Create a single server with both services
	srv := server.New(server.ServerConfig{
		Svc:         teleSvc,
		EngineerSvc: engSvc,
	})
	s := httptest.NewServer(srv.Handler())
	defer s.Close()

	// 1. Telemetry stream responds and emits events
	telLines, err := sseLines(ctx, s.URL+"/telemetry/stream", 2)
	if err != nil {
		t.Fatalf("telemetry sseLines: %v", err)
	}
	if len(telLines) == 0 || !strings.HasPrefix(telLines[0], "event: telemetry") {
		t.Errorf("expected telemetry events, got lines: %v", telLines)
	}

	// 2. Engineer stream responds and emits events
	engLines, err := sseLines(ctx, s.URL+"/engineer/stream", 2)
	if err != nil {
		t.Fatalf("engineer sseLines: %v", err)
	}
	foundEngEvent := false
	for _, line := range engLines {
		if strings.HasPrefix(line, "event: engineer-notification") {
			foundEngEvent = true
			break
		}
	}
	if !foundEngEvent {
		t.Errorf("expected engineer-notification events, got lines: %v", engLines)
	}

	// 3. Confirm telemetry still works after engineer stream consumed
	telLines2, err := sseLines(ctx, s.URL+"/telemetry/stream", 1)
	if err != nil {
		t.Fatalf("telemetry second sseLines: %v", err)
	}
	if len(telLines2) == 0 {
		t.Errorf("expected telemetry events after engineer stream consumed, got none")
	}
}
