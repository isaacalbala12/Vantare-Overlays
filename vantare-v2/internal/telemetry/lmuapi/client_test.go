package lmuapi_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
)

func TestClientFetchesStandings(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/watch/standings" {
			t.Fatalf("path: got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{
			"driverName":"Isaac Albala",
			"carNumber":"46",
			"carClass":"LMP3",
			"fullTeamName":"ADESS Factory Racing Team 2025",
			"position":12,
			"player":true,
			"lapsBehindLeader":6,
			"lapsBehindClassLeader":2,
			"timeBehindNext":243.93,
			"lapDistance":165.79,
			"timeIntoLap":3.02,
			"bestLapTime":-1,
			"lastLapTime":0,
			"estimatedLapTime":246.19,
			"pitState":"EXITING",
			"pitting":true,
			"inGarageStall":true,
			"sector":"SECTOR1"
		}]`))
	}))
	defer srv.Close()

	client := lmuapi.NewClient(srv.URL, 500*time.Millisecond)
	rows, err := client.Standings()
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("rows: got %d want 1", len(rows))
	}
	row := rows[0]
	if row.DriverName != "Isaac Albala" || row.CarNumber != "46" || !row.Player {
		t.Fatalf("unexpected row: %#v", row)
	}
}

func TestClientFetchesSessionInfo(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/watch/sessionInfo" {
			t.Fatalf("path: got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"trackName":"Circuit de la Sarthe",
			"session":"PRACTICE1",
			"gamePhase":5,
			"numberOfVehicles":12,
			"playerName":"Isaac Albala",
			"currentEventTime":1587,
			"timeRemainingInGamePhase":123.9,
			"yellowFlagState":"NONE",
			"sectorFlag":["YELLOW","YELLOW","YELLOW"]
		}`))
	}))
	defer srv.Close()

	client := lmuapi.NewClient(srv.URL, 500*time.Millisecond)
	info, err := client.SessionInfo()
	if err != nil {
		t.Fatal(err)
	}
	if info.TrackName != "Circuit de la Sarthe" || info.Session != "PRACTICE1" || info.NumberOfVehicles != 12 {
		t.Fatalf("unexpected session info: %#v", info)
	}
}

func TestClientUsesDefaultTimeout(t *testing.T) {
	c := lmuapi.NewClient("http://localhost:6397", 0)
	if c == nil {
		t.Fatal("expected client")
	}
}

func TestClientPropagatesHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()
	c := lmuapi.NewClient(srv.URL, 500*time.Millisecond)
	if _, err := c.Standings(); err == nil {
		t.Fatal("expected error")
	}
}
