# LMU Data Sources, Standings, Relative, and Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate LMU REST local data with shared memory so Standings, Relative, and Delta use correct race data instead of the current minimal scoring subset.

**Architecture:** Keep shared memory as the high-frequency source for fast car inputs, and add a low-frequency LMU REST source for standings, gaps, lap timing, pit state, and relative/delta context. Merge both sources in Go into the existing `models.Telemetry` snapshot consumed by Wails and SSE; React remains a renderer only.

**Tech Stack:** Go 1.25+, Wails v3, React 19, TypeScript, Vitest, LMU shared memory, LMU local REST API at `http://localhost:6397`.

---

## Hard Rules

- Do not touch `apps/desktop/`.
- Do not commit or push unless Isaac explicitly asks.
- Do not make React poll LMU REST.
- Do not use React state for hot telemetry.
- Keep shared memory read at 60 Hz and UI broadcast <=30 Hz.
- Poll LMU REST at 2-5 Hz, not 60 Hz.
- Run before completion:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

## Required Reading

- `docs/proyecto/12-FUENTES-TELEMETRIA-LMU.md`
- `docs/proyecto/02-ARQUITECTURA-V2.md`
- `docs/proyecto/07-TELEMETRIA-LMU.md`
- `docs/proyecto/09-EVENTOS-IPC.md`
- `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
- `vantare-v2/internal/telemetry/lmu/parser.go`
- `vantare-v2/internal/telemetry/service/service.go`
- `vantare-v2/pkg/models/telemetry.go`
- `vantare-v2/frontend/src/lib/telemetry-ref.ts`
- `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`

## File Structure

### Create

- `vantare-v2/internal/telemetry/lmuapi/client.go`
  - HTTP client for LMU REST local API.
- `vantare-v2/internal/telemetry/lmuapi/types.go`
  - JSON structs for `/rest/watch/standings` and `/rest/watch/sessionInfo`.
- `vantare-v2/internal/telemetry/lmuapi/client_test.go`
  - Tests with `httptest.Server`.
- `vantare-v2/internal/telemetry/fusion/fusion.go`
  - Pure functions that merge shared memory telemetry with REST standings/session data.
- `vantare-v2/internal/telemetry/fusion/fusion_test.go`
  - Tests for merge rules, player matching, gaps, pit state.
- `vantare-v2/internal/telemetry/delta/tracker.go`
  - Alpha delta calculator and future lap-distance reference tracker.
- `vantare-v2/internal/telemetry/delta/tracker_test.go`
  - Tests for estimated-vs-best alpha delta and invalid timing handling.
- `.omo/evidence/v2-lmu-data-sources-standings-relative-delta.txt`
  - Evidence from tests and manual validation.

### Modify

- `vantare-v2/pkg/models/telemetry.go`
  - Extend `VehicleScoring`, `PlayerTelemetry`, and `SessionInfo`.
- `vantare-v2/internal/telemetry/lmu/offsets.go`
  - Regenerate/add missing offsets, especially `vehicleTelemetryFilteredClutch`.
- `tools/generate-lmu-offsets.py`
  - Add Go mappings for all scoring fields required by overlays.
- `vantare-v2/internal/telemetry/lmu/parser.go`
  - Parse extended shared memory fields and fix clutch offset reference.
- `vantare-v2/internal/telemetry/service/source.go`
  - Define optional REST-enriched source interface if needed.
- `vantare-v2/internal/app/app.go`
  - Build live source with shared memory + REST enrichment when `-live` is used.
- `vantare-v2/internal/telemetry/pipeline/filter.go`
  - Emit updates when extended fields change.
- `vantare-v2/internal/telemetry/diff/diff.go`
  - Include extended fields in diffs where needed.
- `vantare-v2/frontend/src/lib/telemetry-ref.ts`
  - Add extended fields to TS state.
- `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
  - Render real gaps/laps/pit state.
- `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
  - Sort by track position, not classification.
- `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
  - Render alpha delta from backend value.
- `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
  - Add LMU REST validation checklist.
- `docs/proyecto/12-FUENTES-TELEMETRIA-LMU.md`
  - Update if implementation changes any field names.

---

## Task 1: Fix LMU Offset Coverage

**Files:**
- Modify: `tools/generate-lmu-offsets.py`
- Modify: `vantare-v2/internal/telemetry/lmu/offsets.go`
- Modify: `vantare-v2/internal/telemetry/lmu/parser.go`
- Test: `vantare-v2/internal/telemetry/lmu/parser_test.go`

- [ ] **Step 1: Write failing parser test for clutch and extended scoring fields**

Add this test to `vantare-v2/internal/telemetry/lmu/parser_test.go`:

```go
func TestParseSyntheticExtendedScoringFields(t *testing.T) {
	buf := BuildSyntheticBuffer()
	tele := Parse(buf, ParseFull)
	if tele == nil || tele.Player == nil {
		t.Fatal("expected telemetry with player")
	}
	if tele.Player.Clutch != 0 {
		t.Fatalf("synthetic clutch: got %v want 0", tele.Player.Clutch)
	}
	if len(tele.Vehicles) == 0 {
		t.Fatal("expected vehicles")
	}
	v := tele.Vehicles[0]
	if v.ID != 0 || v.DriverName != "TestDriver" || !v.IsPlayer {
		t.Fatalf("unexpected synthetic vehicle: %#v", v)
	}
}
```

- [ ] **Step 2: Run failing test**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/telemetry/lmu -run TestParseSyntheticExtendedScoringFields -v
```

Expected before fix: fail to compile with `undefined: vehicleTelemetryFilteredClutch` or fail because fields are missing.

- [ ] **Step 3: Add missing Go offset mappings**

In `tools/generate-lmu-offsets.py`, extend `GO_VT_MAP`:

```python
GO_VT_MAP = {
    'mID': 'vehicleTelemetryID',
    'mLapNumber': 'vehicleTelemetryLapNumber',
    'mLocalVel': 'vehicleTelemetryLocalVel',
    'mVehicleName': 'vehicleTelemetryVehicleName',
    'mTrackName': 'vehicleTelemetryTrackName',
    'mGear': 'vehicleTelemetryGear',
    'mEngineRPM': 'vehicleTelemetryEngineRPM',
    'mFuel': 'vehicleTelemetryFuel',
    'mFuelCapacity': 'vehicleTelemetryFuelCapacity',
    'mFilteredThrottle': 'vehicleTelemetryFilteredThrottle',
    'mFilteredBrake': 'vehicleTelemetryFilteredBrake',
    'mFilteredSteering': 'vehicleTelemetryFilteredSteering',
    'mFilteredClutch': 'vehicleTelemetryFilteredClutch',
    'mDeltaBest': 'vehicleTelemetryDeltaBest',
    'mTimeGapPlaceAhead': 'vehicleTelemetryTimeGapPlaceAhead',
    'mTimeGapPlaceBehind': 'vehicleTelemetryTimeGapPlaceBehind',
}
```

Extend `GO_VS_MAP`:

```python
GO_VS_MAP = {
    'mID': 'vehicleScoringID',
    'mDriverName': 'vehicleScoringDriverName',
    'mVehicleName': 'vehicleScoringVehicleName',
    'mTotalLaps': 'vehicleScoringTotalLaps',
    'mSector': 'vehicleScoringSector',
    'mFinishStatus': 'vehicleScoringFinishStatus',
    'mLapDist': 'vehicleScoringLapDistance',
    'mBestLapTime': 'vehicleScoringBestLapTime',
    'mLastLapTime': 'vehicleScoringLastLapTime',
    'mCurSector1': 'vehicleScoringCurrentSectorTime1',
    'mCurSector2': 'vehicleScoringCurrentSectorTime2',
    'mNumPitstops': 'vehicleScoringPitstops',
    'mNumPenalties': 'vehicleScoringPenalties',
    'mIsPlayer': 'vehicleScoringIsPlayer',
    'mInPits': 'vehicleScoringInPits',
    'mPlace': 'vehicleScoringPlace',
    'mVehicleClass': 'vehicleScoringVehicleClass',
    'mTimeBehindNext': 'vehicleScoringTimeBehindNext',
    'mLapsBehindNext': 'vehicleScoringLapsBehindNext',
    'mTimeBehindLeader': 'vehicleScoringTimeBehindLeader',
    'mLapsBehindLeader': 'vehicleScoringLapsBehindLeader',
    'mPitState': 'vehicleScoringPitState',
    'mQualification': 'vehicleScoringQualification',
    'mEstimatedLapTime': 'vehicleScoringEstimatedLapTime',
    'mPitGroup': 'vehicleScoringPitGroup',
    'mFlag': 'vehicleScoringFlag',
    'mFuelFraction': 'vehicleScoringFuelFraction',
}
```

- [ ] **Step 4: Regenerate offsets**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
python tools/generate-lmu-offsets.py
gofmt -w vantare-v2/internal/telemetry/lmu/offsets.go
```

Expected: `offsets.go` contains `vehicleTelemetryFilteredClutch` and the extended `vehicleScoring*` constants.

- [ ] **Step 5: Run parser tests**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/telemetry/lmu -v
```

Expected: PASS.

---

## Task 2: Extend Unified Telemetry Models

**Files:**
- Modify: `vantare-v2/pkg/models/telemetry.go`
- Test: `vantare-v2/pkg/models/telemetry_json_test.go`

- [ ] **Step 1: Write failing JSON test for extended fields**

Add to `vantare-v2/pkg/models/telemetry_json_test.go`:

```go
func TestVehicleScoringExtendedJSONFields(t *testing.T) {
	tel := Telemetry{
		Connected: true,
		Vehicles: []VehicleScoring{{
			ID:                    31,
			DriverName:            "Isaac Albala",
			DriverNumber:          "46",
			TeamName:              "ADESS Factory Racing Team 2025",
			VehicleName:           "ADESS Factory Racing Team 2025 #46:ELMS",
			Place:                 12,
			VehicleClass:          "LMP3",
			IsPlayer:              true,
			InPits:                true,
			Pitting:               true,
			InGarageStall:         true,
			PitState:              "EXITING",
			LapDistance:           165.79,
			TimeIntoLap:           3.02,
			TimeBehindNext:        243.93,
			LapsBehindLeader:      6,
			LapsBehindClassLeader: 2,
			BestLapTime:           -1,
			LastLapTime:           0,
			EstimatedLapTime:      246.19,
			Sector:                "SECTOR1",
		}},
	}
	b, err := json.Marshal(tel)
	if err != nil {
		t.Fatal(err)
	}
	s := string(b)
	for _, want := range []string{
		`"driverNumber":"46"`,
		`"teamName":"ADESS Factory Racing Team 2025"`,
		`"lapDistance":165.79`,
		`"timeIntoLap":3.02`,
		`"pitState":"EXITING"`,
		`"lapsBehindLeader":6`,
	} {
		if !strings.Contains(s, want) {
			t.Fatalf("json missing %s in %s", want, s)
		}
	}
}
```

If imports are missing, add:

```go
import (
	"encoding/json"
	"strings"
	"testing"
)
```

- [ ] **Step 2: Run failing model test**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./pkg/models -run TestVehicleScoringExtendedJSONFields -v
```

Expected: fail because fields do not exist.

- [ ] **Step 3: Extend model structs**

In `vantare-v2/pkg/models/telemetry.go`, extend `PlayerTelemetry`:

```go
type PlayerTelemetry struct {
	ID                 int32   `json:"id,omitempty"`
	LapNumber          int32   `json:"lapNumber,omitempty"`
	Speed              float64 `json:"speed"`
	Gear               int32   `json:"gear"`
	EngineRPM          float64 `json:"engineRPM"`
	Fuel               float64 `json:"fuel,omitempty"`
	FuelCap            float64 `json:"fuelCap,omitempty"`
	DeltaBest          float64 `json:"deltaBest,omitempty"`
	Throttle           float64 `json:"throttle,omitempty"`
	Brake              float64 `json:"brake,omitempty"`
	Clutch             float64 `json:"clutch,omitempty"`
	Steering           float64 `json:"steering,omitempty"`
	VehicleName        string  `json:"vehicleName,omitempty"`
	TrackName          string  `json:"trackName,omitempty"`
	TimeGapPlaceAhead  float64 `json:"timeGapPlaceAhead,omitempty"`
	TimeGapPlaceBehind float64 `json:"timeGapPlaceBehind,omitempty"`
}
```

Extend `VehicleScoring`:

```go
type VehicleScoring struct {
	ID                    int32   `json:"id"`
	DriverName            string  `json:"driverName,omitempty"`
	DriverNumber          string  `json:"driverNumber,omitempty"`
	TeamName              string  `json:"teamName,omitempty"`
	VehicleName           string  `json:"vehicleName,omitempty"`
	Place                 uint8   `json:"place,omitempty"`
	TotalLaps             int16   `json:"totalLaps,omitempty"`
	VehicleClass          string  `json:"vehicleClass,omitempty"`
	IsPlayer              bool    `json:"isPlayer,omitempty"`
	InPits                bool    `json:"inPits,omitempty"`
	Pitting               bool    `json:"pitting,omitempty"`
	InGarageStall         bool    `json:"inGarageStall,omitempty"`
	PitState              string  `json:"pitState,omitempty"`
	Sector                string  `json:"sector,omitempty"`
	FinishStatus          string  `json:"finishStatus,omitempty"`
	TimeBehindLeader      float64 `json:"timeBehindLeader,omitempty"`
	TimeBehindNext        float64 `json:"timeBehindNext,omitempty"`
	LapsBehindLeader      int32   `json:"lapsBehindLeader,omitempty"`
	LapsBehindClassLeader int32   `json:"lapsBehindClassLeader,omitempty"`
	LapsBehindNext        int32   `json:"lapsBehindNext,omitempty"`
	LapDistance           float64 `json:"lapDistance,omitempty"`
	TimeIntoLap           float64 `json:"timeIntoLap,omitempty"`
	BestLapTime           float64 `json:"bestLapTime,omitempty"`
	LastLapTime           float64 `json:"lastLapTime,omitempty"`
	EstimatedLapTime      float64 `json:"estimatedLapTime,omitempty"`
	Pitstops              int32   `json:"pitstops,omitempty"`
	Penalties             int32   `json:"penalties,omitempty"`
	Qualification         int32   `json:"qualification,omitempty"`
	Flag                  string  `json:"flag,omitempty"`
	FuelFraction          float64 `json:"fuelFraction,omitempty"`
}
```

Extend `SessionInfo`:

```go
type SessionInfo struct {
	TrackName                string   `json:"trackName,omitempty"`
	SessionType              int32    `json:"sessionType,omitempty"`
	SessionName              string   `json:"sessionName,omitempty"`
	SessionTime              float64  `json:"sessionTime,omitempty"`
	TimeRemainingInGamePhase float64  `json:"timeRemainingInGamePhase,omitempty"`
	NumVehicles              int32    `json:"numVehicles,omitempty"`
	GamePhase                uint8    `json:"gamePhase,omitempty"`
	PlayerName               string   `json:"playerName,omitempty"`
	AmbientTemp              float64  `json:"ambientTemp,omitempty"`
	TrackTemp                float64  `json:"trackTemp,omitempty"`
	YellowFlagState          string   `json:"yellowFlagState,omitempty"`
	SectorFlags              []string `json:"sectorFlags,omitempty"`
}
```

- [ ] **Step 4: Run model tests**

```powershell
go test ./pkg/models -v
```

Expected: PASS.

---

## Task 3: Add LMU REST Client

**Files:**
- Create: `vantare-v2/internal/telemetry/lmuapi/types.go`
- Create: `vantare-v2/internal/telemetry/lmuapi/client.go`
- Create: `vantare-v2/internal/telemetry/lmuapi/client_test.go`

- [ ] **Step 1: Create failing client tests**

Create `vantare-v2/internal/telemetry/lmuapi/client_test.go`:

```go
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
```

- [ ] **Step 2: Run failing tests**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/telemetry/lmuapi -v
```

Expected: fail because package does not exist.

- [ ] **Step 3: Create REST types**

Create `vantare-v2/internal/telemetry/lmuapi/types.go`:

```go
package lmuapi

type Vector struct {
	Velocity float64 `json:"velocity"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Z        float64 `json:"z"`
}

type StandingRow struct {
	DriverName            string  `json:"driverName"`
	CarNumber             string  `json:"carNumber"`
	CarClass              string  `json:"carClass"`
	FullTeamName          string  `json:"fullTeamName"`
	VehicleName           string  `json:"vehicleName"`
	Position              int32   `json:"position"`
	Qualification         int32   `json:"qualification"`
	Player                bool    `json:"player"`
	LapsCompleted         int16   `json:"lapsCompleted"`
	LapsBehindLeader      int32   `json:"lapsBehindLeader"`
	LapsBehindClassLeader int32   `json:"lapsBehindClassLeader"`
	LapsBehindNext        int32   `json:"lapsBehindNext"`
	TimeBehindLeader      float64 `json:"timeBehindLeader"`
	TimeBehindNext        float64 `json:"timeBehindNext"`
	LapDistance           float64 `json:"lapDistance"`
	TimeIntoLap           float64 `json:"timeIntoLap"`
	BestLapTime           float64 `json:"bestLapTime"`
	LastLapTime           float64 `json:"lastLapTime"`
	EstimatedLapTime      float64 `json:"estimatedLapTime"`
	CurrentSectorTime1    float64 `json:"currentSectorTime1"`
	CurrentSectorTime2    float64 `json:"currentSectorTime2"`
	PitState              string  `json:"pitState"`
	Pitting               bool    `json:"pitting"`
	InGarageStall         bool    `json:"inGarageStall"`
	Sector                string  `json:"sector"`
	Flag                  string  `json:"flag"`
	FinishStatus          string  `json:"finishStatus"`
	Penalties             int32   `json:"penalties"`
	Pitstops              int32   `json:"pitstops"`
	FuelFraction          float64 `json:"fuelFraction"`
	CarVelocity           Vector  `json:"carVelocity"`
}

type SessionInfo struct {
	TrackName                string   `json:"trackName"`
	Session                  string   `json:"session"`
	GamePhase                uint8    `json:"gamePhase"`
	NumberOfVehicles         int32    `json:"numberOfVehicles"`
	PlayerName               string   `json:"playerName"`
	CurrentEventTime         float64  `json:"currentEventTime"`
	TimeRemainingInGamePhase float64  `json:"timeRemainingInGamePhase"`
	YellowFlagState          string   `json:"yellowFlagState"`
	SectorFlag               []string `json:"sectorFlag"`
}
```

- [ ] **Step 4: Create REST client**

Create `vantare-v2/internal/telemetry/lmuapi/client.go`:

```go
package lmuapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 750 * time.Millisecond
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: timeout},
	}
}

func (c *Client) Standings() ([]StandingRow, error) {
	var rows []StandingRow
	if err := c.getJSON("/rest/watch/standings", &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (c *Client) SessionInfo() (*SessionInfo, error) {
	var info SessionInfo
	if err := c.getJSON("/rest/watch/sessionInfo", &info); err != nil {
		return nil, err
	}
	return &info, nil
}

func (c *Client) getJSON(path string, out any) error {
	resp, err := c.http.Get(c.baseURL + path)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("lmu api %s: HTTP %d", path, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}
```

- [ ] **Step 5: Run client tests**

```powershell
go test ./internal/telemetry/lmuapi -v
```

Expected: PASS.

---

## Task 4: Add Fusion Layer

**Files:**
- Create: `vantare-v2/internal/telemetry/fusion/fusion.go`
- Create: `vantare-v2/internal/telemetry/fusion/fusion_test.go`

- [ ] **Step 1: Write failing fusion tests**

Create `vantare-v2/internal/telemetry/fusion/fusion_test.go`:

```go
package fusion_test

import (
	"testing"

	"github.com/vantare/overlays/v2/internal/telemetry/fusion"
	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
	"github.com/vantare/overlays/v2/pkg/models"
)

func TestMergeStandingsAddsRestFieldsAndPreservesFastPlayerInputs(t *testing.T) {
	base := &models.Telemetry{
		Connected: true,
		Player: &models.PlayerTelemetry{
			ID:        31,
			Speed:     12.3,
			Gear:      2,
			EngineRPM: 4200,
			Fuel:      88,
		},
	}
	rows := []lmuapi.StandingRow{{
		DriverName:            "Isaac Albala",
		CarNumber:             "46",
		CarClass:              "LMP3",
		FullTeamName:          "ADESS Factory Racing Team 2025",
		VehicleName:           "ADESS Factory Racing Team 2025 #46:ELMS",
		Position:              12,
		Player:                true,
		LapsCompleted:         0,
		LapsBehindLeader:      6,
		LapsBehindClassLeader: 2,
		TimeBehindNext:        243.93,
		LapDistance:           165.79,
		TimeIntoLap:           3.02,
		EstimatedLapTime:      246.19,
		PitState:              "EXITING",
		Pitting:               true,
		InGarageStall:         true,
		Sector:                "SECTOR1",
	}}

	out := fusion.Merge(base, rows, nil, 0)
	if out.Player.Speed != 12.3 || out.Player.Gear != 2 {
		t.Fatalf("fast player inputs were not preserved: %#v", out.Player)
	}
	if len(out.Vehicles) != 1 {
		t.Fatalf("vehicles: got %d want 1", len(out.Vehicles))
	}
	v := out.Vehicles[0]
	if v.DriverNumber != "46" || v.TeamName != "ADESS Factory Racing Team 2025" || v.LapDistance != 165.79 {
		t.Fatalf("REST fields not merged: %#v", v)
	}
	if !v.IsPlayer || !v.Pitting || !v.InGarageStall || v.PitState != "EXITING" {
		t.Fatalf("pit/player fields not merged: %#v", v)
	}
}

func TestMergeSessionInfo(t *testing.T) {
	base := &models.Telemetry{Connected: true}
	info := &lmuapi.SessionInfo{
		TrackName:                "Circuit de la Sarthe",
		Session:                  "PRACTICE1",
		GamePhase:                5,
		NumberOfVehicles:         12,
		PlayerName:               "Isaac Albala",
		CurrentEventTime:         1587,
		TimeRemainingInGamePhase: 123.9,
		YellowFlagState:          "NONE",
		SectorFlag:               []string{"YELLOW", "YELLOW", "YELLOW"},
	}
	out := fusion.Merge(base, nil, info, 0)
	if out.Session == nil {
		t.Fatal("expected session")
	}
	if out.Session.TrackName != "Circuit de la Sarthe" || out.Session.SessionName != "PRACTICE1" {
		t.Fatalf("unexpected session: %#v", out.Session)
	}
}
```

- [ ] **Step 2: Run failing fusion tests**

```powershell
go test ./internal/telemetry/fusion -v
```

Expected: fail because package does not exist.

- [ ] **Step 3: Implement fusion**

Create `vantare-v2/internal/telemetry/fusion/fusion.go`:

```go
package fusion

import (
	"math"

	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
	"github.com/vantare/overlays/v2/pkg/models"
)

func Merge(base *models.Telemetry, standings []lmuapi.StandingRow, session *lmuapi.SessionInfo, deltaBest float64) *models.Telemetry {
	out := cloneTelemetry(base)
	if out == nil {
		out = &models.Telemetry{Connected: true}
	}
	if session != nil {
		out.Session = mergeSession(out.Session, session)
	}
	if len(standings) > 0 {
		out.Vehicles = rowsToVehicles(standings)
		if out.Player != nil {
			enrichPlayerFromRows(out.Player, standings, deltaBest)
		}
		out.PlayerHasVehicle = hasPlayer(standings)
	}
	if out.Player != nil && isValidTime(deltaBest) {
		out.Player.DeltaBest = deltaBest
	}
	return out
}

func mergeSession(existing *models.SessionInfo, src *lmuapi.SessionInfo) *models.SessionInfo {
	var s models.SessionInfo
	if existing != nil {
		s = *existing
	}
	s.TrackName = firstNonEmpty(src.TrackName, s.TrackName)
	s.SessionName = firstNonEmpty(src.Session, s.SessionName)
	s.GamePhase = src.GamePhase
	s.NumVehicles = src.NumberOfVehicles
	s.PlayerName = firstNonEmpty(src.PlayerName, s.PlayerName)
	s.SessionTime = src.CurrentEventTime
	s.TimeRemainingInGamePhase = src.TimeRemainingInGamePhase
	s.YellowFlagState = src.YellowFlagState
	s.SectorFlags = append([]string(nil), src.SectorFlag...)
	return &s
}

func rowsToVehicles(rows []lmuapi.StandingRow) []models.VehicleScoring {
	out := make([]models.VehicleScoring, 0, len(rows))
	for _, r := range rows {
		out = append(out, models.VehicleScoring{
			ID:                    r.SlotIDOrPositionID(),
			DriverName:            r.DriverName,
			DriverNumber:          r.CarNumber,
			TeamName:              r.FullTeamName,
			VehicleName:           r.VehicleName,
			Place:                 uint8(maxInt32(r.Position, 0)),
			TotalLaps:             r.LapsCompleted,
			VehicleClass:          r.CarClass,
			IsPlayer:              r.Player,
			InPits:                r.Pitting || r.InGarageStall || r.PitState != "" && r.PitState != "NONE",
			Pitting:               r.Pitting,
			InGarageStall:         r.InGarageStall,
			PitState:              r.PitState,
			Sector:                r.Sector,
			FinishStatus:          r.FinishStatus,
			TimeBehindLeader:      sanitizeTime(r.TimeBehindLeader),
			TimeBehindNext:        sanitizeTime(r.TimeBehindNext),
			LapsBehindLeader:      r.LapsBehindLeader,
			LapsBehindClassLeader: r.LapsBehindClassLeader,
			LapsBehindNext:        r.LapsBehindNext,
			LapDistance:           sanitizeTime(r.LapDistance),
			TimeIntoLap:           sanitizeTime(r.TimeIntoLap),
			BestLapTime:           r.BestLapTime,
			LastLapTime:           r.LastLapTime,
			EstimatedLapTime:      r.EstimatedLapTime,
			Pitstops:              r.Pitstops,
			Penalties:             r.Penalties,
			Qualification:         r.Qualification,
			Flag:                  r.Flag,
			FuelFraction:          r.FuelFraction,
		})
	}
	return out
}

func enrichPlayerFromRows(player *models.PlayerTelemetry, rows []lmuapi.StandingRow, deltaBest float64) {
	for _, r := range rows {
		if !r.Player {
			continue
		}
		player.VehicleName = firstNonEmpty(r.VehicleName, player.VehicleName)
		if isValidTime(deltaBest) {
			player.DeltaBest = deltaBest
		}
		return
	}
}

func hasPlayer(rows []lmuapi.StandingRow) bool {
	for _, r := range rows {
		if r.Player {
			return true
		}
	}
	return false
}

func cloneTelemetry(t *models.Telemetry) *models.Telemetry {
	if t == nil {
		return nil
	}
	c := *t
	if t.Player != nil {
		p := *t.Player
		c.Player = &p
	}
	if t.Session != nil {
		s := *t.Session
		c.Session = &s
	}
	if t.Vehicles != nil {
		c.Vehicles = append([]models.VehicleScoring(nil), t.Vehicles...)
	}
	return &c
}

func sanitizeTime(v float64) float64 {
	if !isValidTime(v) {
		return 0
	}
	return v
}

func isValidTime(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && v >= 0
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func maxInt32(v, min int32) int32 {
	if v < min {
		return min
	}
	return v
}
```

Also add this method to `StandingRow` in `types.go`:

```go
func (r StandingRow) SlotIDOrPositionID() int32 {
	if r.SlotID != 0 {
		return r.SlotID
	}
	return r.Position
}
```

And add `SlotID` field:

```go
SlotID int32 `json:"slotID"`
```

- [ ] **Step 4: Run fusion tests**

```powershell
go test ./internal/telemetry/fusion -v
```

Expected: PASS.

---

## Task 5: Add Delta Alpha Calculator

**Files:**
- Create: `vantare-v2/internal/telemetry/delta/tracker.go`
- Create: `vantare-v2/internal/telemetry/delta/tracker_test.go`

- [ ] **Step 1: Write failing delta tests**

Create `vantare-v2/internal/telemetry/delta/tracker_test.go`:

```go
package delta_test

import (
	"testing"

	"github.com/vantare/overlays/v2/internal/telemetry/delta"
	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
)

func TestAlphaDeltaUsesEstimatedMinusBestForPlayer(t *testing.T) {
	rows := []lmuapi.StandingRow{{
		DriverName:       "Isaac Albala",
		Player:           true,
		EstimatedLapTime: 246.5,
		BestLapTime:      245.2,
	}}
	got, ok := delta.AlphaDelta(rows)
	if !ok {
		t.Fatal("expected delta")
	}
	if got < 1.29 || got > 1.31 {
		t.Fatalf("delta: got %.3f want about 1.300", got)
	}
}

func TestAlphaDeltaRejectsInvalidTimes(t *testing.T) {
	rows := []lmuapi.StandingRow{{
		DriverName:       "Isaac Albala",
		Player:           true,
		EstimatedLapTime: 246.5,
		BestLapTime:      -1,
	}}
	if got, ok := delta.AlphaDelta(rows); ok {
		t.Fatalf("expected invalid delta, got %.3f", got)
	}
}
```

- [ ] **Step 2: Run failing delta tests**

```powershell
go test ./internal/telemetry/delta -v
```

Expected: fail because package does not exist.

- [ ] **Step 3: Implement alpha delta**

Create `vantare-v2/internal/telemetry/delta/tracker.go`:

```go
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
```

- [ ] **Step 4: Run delta tests**

```powershell
go test ./internal/telemetry/delta -v
```

Expected: PASS.

---

## Task 6: Build Live Enriched Source

**Files:**
- Modify: `vantare-v2/internal/app/app.go`
- Modify: `vantare-v2/internal/telemetry/service/source.go`
- Create or modify test: `vantare-v2/internal/app/app_test.go`

- [ ] **Step 1: Decide interface**

Use a wrapper `service.FuncSource` for now. The wrapper should:

1. Read shared memory every call.
2. Poll REST only every 250-500 ms.
3. Cache the latest REST standings/session.
4. Return a synthetic merged buffer is not viable because fusion works after parsing. Therefore add a new `SourceTelemetry` interface.

Add to `source.go`:

```go
type TelemetrySource interface {
	ReadTelemetry() *models.Telemetry
}
```

Import models:

```go
import "github.com/vantare/overlays/v2/pkg/models"
```

Modify service later so it prefers `TelemetrySource` over raw `Read()`.

- [ ] **Step 2: Write service test for telemetry source preference**

In `vantare-v2/internal/telemetry/service/service_test.go`, add:

```go
type directTelemetrySource struct {
	t *models.Telemetry
}

func (d directTelemetrySource) Read() []byte { return nil }
func (d directTelemetrySource) ReadTelemetry() *models.Telemetry { return d.t }

func TestServiceUsesDirectTelemetrySource(t *testing.T) {
	src := directTelemetrySource{t: &models.Telemetry{
		Connected: true,
		Player: &models.PlayerTelemetry{Speed: 12, Gear: 3, EngineRPM: 4000},
		Vehicles: []models.VehicleScoring{{ID: 1, DriverName: "Isaac", IsPlayer: true}},
		PlayerHasVehicle: true,
	}}
	svc := service.New(service.Config{ReadHz: 60, EmitHz: 30, Source: src})
	svc.ProcessReadForTest()
	ch, unsub := svc.Subscribe()
	defer unsub()
	select {
	case upd := <-ch:
		if upd.Snapshot == nil || len(upd.Snapshot.Vehicles) != 1 {
			t.Fatalf("unexpected update: %#v", upd)
		}
	default:
		t.Fatal("expected replay")
	}
}
```

If `ProcessReadForTest` does not exist, add it as an internal test helper:

```go
func (s *Service) ProcessReadForTest() {
	s.processRead()
}
```

- [ ] **Step 3: Modify service processRead**

In `service.go`, change `processRead`:

```go
func (s *Service) processRead() {
	if s.cfg.Source == nil {
		return
	}
	var raw *models.Telemetry
	if direct, ok := s.cfg.Source.(TelemetrySource); ok {
		raw = direct.ReadTelemetry()
	} else {
		buf := s.cfg.Source.Read()
		raw = s.normalizer.FromBuffer(buf)
	}
	snap, ok := s.filter.ShouldPublish(raw)
	if !ok {
		return
	}
	s.latestMu.Lock()
	s.latest = snap
	s.dirty = true
	s.latestMu.Unlock()
}
```

- [ ] **Step 4: Implement enriched source in app layer**

Create a small private type in `internal/app/app.go` or a focused file `internal/app/lmu_enriched_source.go`:

```go
type enrichedLMUSource struct {
	mmap     service.Source
	api      *lmuapi.Client
	pollEvery time.Duration
	lastPoll time.Time
	rows     []lmuapi.StandingRow
	session  *lmuapi.SessionInfo
}

func (s *enrichedLMUSource) Read() []byte {
	return s.mmap.Read()
}

func (s *enrichedLMUSource) ReadTelemetry() *models.Telemetry {
	base := normalizer.New().FromBuffer(s.mmap.Read())
	now := time.Now()
	if s.api != nil && (s.lastPoll.IsZero() || now.Sub(s.lastPoll) >= s.pollEvery) {
		if rows, err := s.api.Standings(); err == nil {
			s.rows = rows
		}
		if info, err := s.api.SessionInfo(); err == nil {
			s.session = info
		}
		s.lastPoll = now
	}
	d, ok := delta.AlphaDelta(s.rows)
	if !ok {
		d = 0
	}
	return fusion.Merge(base, s.rows, s.session, d)
}
```

Required imports:

```go
import (
	"time"
	"github.com/vantare/overlays/v2/internal/telemetry/delta"
	"github.com/vantare/overlays/v2/internal/telemetry/fusion"
	"github.com/vantare/overlays/v2/internal/telemetry/lmuapi"
	"github.com/vantare/overlays/v2/internal/telemetry/normalizer"
	"github.com/vantare/overlays/v2/pkg/models"
)
```

- [ ] **Step 5: Wire only for `-live`**

In `app.New(useLiveLMU bool)`, after opening LMU shared memory successfully, wrap source:

```go
api := lmuapi.NewClient("http://localhost:6397", 750*time.Millisecond)
src = &enrichedLMUSource{
	mmap:      s,
	api:       api,
	pollEvery: 250 * time.Millisecond,
}
```

Keep mock unchanged.

- [ ] **Step 6: Run service/app tests**

```powershell
go test ./internal/telemetry/service ./internal/app -v
```

Expected: PASS.

---

## Task 7: Update Diff and Frontend Telemetry Ref

**Files:**
- Modify: `vantare-v2/internal/telemetry/diff/diff.go`
- Modify: `vantare-v2/internal/telemetry/pipeline/filter.go`
- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.ts`
- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.test.ts`

- [ ] **Step 1: Write frontend test for extended vehicle fields**

Add to `telemetry-ref.test.ts`:

```ts
it("tracks extended standings fields", () => {
  applyTelemetryUpdate(
    parseTelemetryPayload({
      seq: 1,
      snapshot: {
        connected: true,
        vehicles: [{
          id: 31,
          driverName: "Isaac Albala",
          driverNumber: "46",
          teamName: "ADESS Factory Racing Team 2025",
          place: 12,
          vehicleClass: "LMP3",
          isPlayer: true,
          pitting: true,
          inGarageStall: true,
          pitState: "EXITING",
          lapDistance: 165.79,
          timeIntoLap: 3.02,
          lapsBehindLeader: 6,
          timeBehindNext: 243.93,
        }],
      },
    }),
  );
  const v = getTelemetryRef().vehicles[0];
  expect(v.driverNumber).toBe("46");
  expect(v.teamName).toBe("ADESS Factory Racing Team 2025");
  expect(v.lapDistance).toBe(165.79);
  expect(v.pitState).toBe("EXITING");
});
```

- [ ] **Step 2: Run failing frontend test**

```powershell
pnpm --dir frontend test -- src/lib/telemetry-ref.test.ts
```

Expected: fail because TS type lacks fields.

- [ ] **Step 3: Extend TS types**

In `telemetry-ref.ts`, extend `VehicleScoring`:

```ts
export type VehicleScoring = {
  id: number;
  driverName?: string;
  driverNumber?: string;
  teamName?: string;
  vehicleName?: string;
  place?: number;
  totalLaps?: number;
  vehicleClass?: string;
  isPlayer?: boolean;
  inPits?: boolean;
  pitting?: boolean;
  inGarageStall?: boolean;
  pitState?: string;
  sector?: string;
  finishStatus?: string;
  timeBehindLeader?: number;
  timeBehindNext?: number;
  lapsBehindLeader?: number;
  lapsBehindClassLeader?: number;
  lapsBehindNext?: number;
  lapDistance?: number;
  timeIntoLap?: number;
  bestLapTime?: number;
  lastLapTime?: number;
  estimatedLapTime?: number;
  pitstops?: number;
  penalties?: number;
  qualification?: number;
  flag?: string;
  fuelFraction?: number;
  teamBrandColor?: string;
  tireCompound?: string;
  fastestLap?: boolean;
};
```

- [ ] **Step 4: Ensure Go diff emits vehicle replacement on extended changes**

In `diff.go` and `pipeline/filter.go`, update `vehiclesChanged` to compare:

```go
if old.DriverNumber != v.DriverNumber ||
	old.TeamName != v.TeamName ||
	old.VehicleName != v.VehicleName ||
	old.PitState != v.PitState ||
	old.Pitting != v.Pitting ||
	old.InGarageStall != v.InGarageStall ||
	old.Sector != v.Sector ||
	old.LapsBehindLeader != v.LapsBehindLeader ||
	old.LapsBehindClassLeader != v.LapsBehindClassLeader ||
	old.LapsBehindNext != v.LapsBehindNext {
	return true
}
if core.ShouldEmit(old.TimeBehindNext, v.TimeBehindNext, core.ThresholdGap) ||
	core.ShouldEmit(old.LapDistance, v.LapDistance, 1.0) ||
	core.ShouldEmit(old.TimeIntoLap, v.TimeIntoLap, 0.1) ||
	core.ShouldEmit(old.EstimatedLapTime, v.EstimatedLapTime, 0.1) {
	return true
}
```

- [ ] **Step 5: Run tests**

```powershell
go test ./internal/telemetry/diff ./internal/telemetry/pipeline
pnpm --dir frontend test -- src/lib/telemetry-ref.test.ts
```

Expected: PASS.

---

## Task 8: Fix Standings Rendering Semantics

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.test.tsx`

- [ ] **Step 1: Write tests for gap formatting**

Add tests:

```tsx
it("renders laps behind and pit state from live-style standings data", () => {
  // Prefer testing extracted helpers if they are exported:
  expect(formatStandingsGap({ place: 1 })).toBe("Leader");
  expect(formatStandingsGap({ place: 5, lapsBehindLeader: 2 })).toBe("+2L");
  expect(formatStandingsGap({ place: 6, timeBehindLeader: 14.028 })).toBe("+14.028s");
  expect(formatStandingsPit({ inGarageStall: true })).toBe("GARAGE");
  expect(formatStandingsPit({ pitState: "EXITING" })).toBe("PIT");
});
```

- [ ] **Step 2: Extract helpers**

In `StandingsWidget.tsx`, export pure helpers:

```ts
export function formatStandingsGap(v: Pick<VehicleScoring, "place" | "lapsBehindLeader" | "timeBehindLeader">): string {
  if (v.place === 1) return "Leader";
  if ((v.lapsBehindLeader ?? 0) > 0) return `+${v.lapsBehindLeader}L`;
  if ((v.timeBehindLeader ?? 0) > 0) return `+${v.timeBehindLeader!.toFixed(3)}s`;
  return "--";
}

export function formatStandingsPit(v: Pick<VehicleScoring, "inGarageStall" | "pitting" | "pitState" | "inPits">): string {
  if (v.inGarageStall) return "GARAGE";
  if (v.pitting || v.inPits || (v.pitState && v.pitState !== "NONE")) return "PIT";
  return "";
}
```

- [ ] **Step 3: Use helpers in widget rows**

Replace current gap logic:

```ts
const pitLabel = formatStandingsPit(v);
const gapText = pitLabel || (v.fastestLap ? "FASTEST" : formatStandingsGap(v));
```

Keep `FASTEST` only if `pitLabel` is empty.

- [ ] **Step 4: Render car number**

Use `driverNumber` cell when present. Existing code already has a number cell; ensure it now reads the live field:

```ts
const numberCell = v.driverNumber
  ? `<div class="w-7 h-full flex items-center justify-center py-[2px] pr-[2px] shrink-0">...</div>`
  : "";
```

- [ ] **Step 5: Run widget tests**

```powershell
pnpm --dir frontend test -- src/overlay/widgets/StandingsWidget.test.tsx
```

Expected: PASS.

---

## Task 9: Fix Relative Rendering Semantics

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.test.tsx`

- [ ] **Step 1: Write tests for track-order relative**

Add helper tests:

```tsx
it("orders relative rows by lap distance around the player", () => {
  const vehicles = [
    { id: 1, driverName: "Ahead", lapDistance: 220, place: 8 },
    { id: 2, driverName: "Player", lapDistance: 200, place: 9, isPlayer: true },
    { id: 3, driverName: "Behind", lapDistance: 180, place: 10 },
    { id: 4, driverName: "Far", lapDistance: 900, place: 1 },
  ];
  const rows = selectRelativeRows(vehicles, 1, 1);
  expect(rows.map((v) => v.driverName)).toEqual(["Ahead", "Player", "Behind"]);
});
```

- [ ] **Step 2: Extract helper**

In `RelativeWidget.tsx`, export:

```ts
export function selectRelativeRows(vehicles: VehicleScoring[], rangeAhead: number, rangeBehind: number): VehicleScoring[] {
  const player = vehicles.find((v) => v.isPlayer);
  if (!player || player.lapDistance == null) {
    const sortedByPlace = [...vehicles].sort((x, y) => (x.place ?? 99) - (y.place ?? 99));
    const idx = sortedByPlace.findIndex((v) => v.isPlayer);
    if (idx < 0) return [];
    return sortedByPlace.slice(Math.max(0, idx - rangeAhead), Math.min(sortedByPlace.length, idx + rangeBehind + 1));
  }
  const playerDistance = player.lapDistance;
  const withDelta = vehicles.map((v) => ({
    vehicle: v,
    delta: (v.lapDistance ?? playerDistance) - playerDistance,
  }));
  const ahead = withDelta
    .filter((x) => x.delta > 0 && !x.vehicle.isPlayer)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, rangeAhead)
    .map((x) => x.vehicle)
    .reverse();
  const behind = withDelta
    .filter((x) => x.delta < 0 && !x.vehicle.isPlayer)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, rangeBehind)
    .map((x) => x.vehicle);
  return [...ahead, player, ...behind];
}
```

- [ ] **Step 3: Use helper in render loop**

Replace classification slicing with:

```ts
const visible = selectRelativeRows(t.vehicles, rangeAhead, rangeBehind);
const player = visible.find((v) => v.isPlayer);
```

Format gap:

```ts
const relGap = v.timeBehindNext && !v.isPlayer ? v.timeBehindNext : Math.abs((v.lapDistance ?? 0) - (player.lapDistance ?? 0));
const gapDisplay = v.isPlayer ? "—" : v.timeBehindNext && v.timeBehindNext > 0 ? `${v.timeBehindNext.toFixed(1)}s` : `${Math.round(relGap)}m`;
```

- [ ] **Step 4: Run relative tests**

```powershell
pnpm --dir frontend test -- src/overlay/widgets/RelativeWidget.test.tsx
```

Expected: PASS.

---

## Task 10: Fix Delta Rendering From Backend Value

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.test.tsx`

- [ ] **Step 1: Write delta formatting tests**

Add:

```tsx
it("formats positive and negative backend delta values", () => {
  expect(formatDelta(1.234)).toBe("+1.234s");
  expect(formatDelta(-0.456)).toBe("-0.456s");
  expect(formatDelta(0)).toBe("—");
});
```

- [ ] **Step 2: Export `formatDelta`**

Change:

```ts
function formatDelta(delta: number): string {
```

to:

```ts
export function formatDelta(delta: number): string {
```

- [ ] **Step 3: Ensure backend delta is the only runtime source**

Keep:

```ts
const t = getTelemetry();
setTextIfChanged(deltaRef.current, formatDelta(t.deltaBest));
```

Do not calculate delta in React.

- [ ] **Step 4: Run delta tests**

```powershell
pnpm --dir frontend test -- src/overlay/widgets/DeltaWidget.test.tsx
```

Expected: PASS.

---

## Task 11: Manual Validation Evidence

**Files:**
- Create: `.omo/evidence/v2-lmu-data-sources-standings-relative-delta.txt`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`

- [ ] **Step 1: Run automated verification**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected:

```text
go test ./... PASS
pnpm test PASS
pnpm build PASS
```

- [ ] **Step 2: Validate LMU API**

With LMU open:

```powershell
go run ./cmd/lmu-api-probe
```

Expected:

- `/rest/watch/standings` returns rows.
- One row has `"player": true`.
- Rows include `carNumber`, `carClass`, `lapDistance`, `timeIntoLap`.

- [ ] **Step 3: Validate Vantare SSE**

Start app:

```powershell
go run ./cmd/vantare -live -profile configs/example-racing.json
```

In another terminal:

```powershell
curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream
```

Expected telemetry contains:

```json
"driverNumber":"46"
"lapDistance":
"timeIntoLap":
"pitState":
"estimatedLapTime":
```

- [ ] **Step 4: Validate UI manually**

Checklist:

- [ ] Standings shows car numbers.
- [ ] Standings shows `Leader`, `+Xs`, `+NL`, `PIT`, or `GARAGE` correctly.
- [ ] Relative centers Isaac and shows cars by track proximity, not only nearby classification places.
- [ ] Delta changes from `—` when `estimatedLapTime` and `bestLapTime` are valid.
- [ ] Pedals/RPM/Gear still update smoothly.
- [ ] CPU/RAM remain acceptable.

- [ ] **Step 5: Write evidence**

Create `.omo/evidence/v2-lmu-data-sources-standings-relative-delta.txt`:

```text
Vantare v2 LMU data sources validation

Date:
Commands:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build
- go run ./cmd/lmu-api-probe
- curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream

Results:
- Automated:
- LMU REST:
- Vantare SSE:
- Manual Standings:
- Manual Relative:
- Manual Delta:
- Notes:
```

---

## Known Limitations After This Plan

- Alpha delta using `estimatedLapTime - bestLapTime` is useful but not a proper per-meter live delta.
- Proper delta requires a lap-distance reference tracker that stores `lapDistance -> timeIntoLap` for best/valid laps.
- REST local API availability may depend on LMU state; code must keep using cached REST data if one poll fails.
- Shared memory fields and REST fields may disagree briefly; REST standings wins for standings/relative, shared memory wins for fast vehicle inputs.

## Final Verification

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected:

```text
PASS
PASS
vite build success
```

Do not mark complete until Isaac validates LMU live visually.

