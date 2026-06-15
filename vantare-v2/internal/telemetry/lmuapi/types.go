package lmuapi

type Vector struct {
	Velocity float64 `json:"velocity"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Z        float64 `json:"z"`
}

type StandingRow struct {
	SlotID                int32   `json:"slotID"`
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

func (r StandingRow) SlotIDOrPositionID() int32 {
	if r.SlotID != 0 {
		return r.SlotID
	}
	return r.Position
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
