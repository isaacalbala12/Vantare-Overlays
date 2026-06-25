package telemetry

type PlayerTelemetry struct {
	ID                 int32       `json:"id,omitempty"`
	LapNumber          int32       `json:"lapNumber,omitempty"`
	Speed              float64     `json:"speed"`
	Gear               int32       `json:"gear"`
	EngineRPM          float64     `json:"engineRPM"`
	Fuel               float64     `json:"fuel,omitempty"`
	FuelCap            float64     `json:"fuelCap,omitempty"`
	DeltaBest          float64     `json:"deltaBest,omitempty"`
	Throttle           float64     `json:"throttle,omitempty"`
	Brake              float64     `json:"brake,omitempty"`
	Clutch             float64     `json:"clutch,omitempty"`
	Steering           float64     `json:"steering,omitempty"`
	VehicleName        string      `json:"vehicleName,omitempty"`
	TrackName          string      `json:"trackName,omitempty"`
	TimeGapPlaceAhead  float64     `json:"timeGapPlaceAhead,omitempty"`
	TimeGapPlaceBehind float64     `json:"timeGapPlaceBehind,omitempty"`
	Position           Vec3        `json:"position"`
	LocalVelocity      Vec3        `json:"localVelocity"`
	Orientation        Orientation `json:"orientation"`
}

type SessionInfo struct {
	TrackName                string   `json:"trackName,omitempty"`
	SessionType              int32    `json:"sessionType,omitempty"`
	SessionName              string   `json:"sessionName,omitempty"`
	SessionTime              float64  `json:"sessionTime,omitempty"`
	TimeRemainingInGamePhase float64  `json:"timeRemainingInGamePhase,omitempty"`
	TrackLength              float64  `json:"trackLength,omitempty"`
	NumVehicles              int32    `json:"numVehicles,omitempty"`
	GamePhase                uint8    `json:"gamePhase,omitempty"`
	PlayerName               string   `json:"playerName,omitempty"`
	AmbientTemp              float64  `json:"ambientTemp,omitempty"`
	TrackTemp                float64  `json:"trackTemp,omitempty"`
	YellowFlagState          string   `json:"yellowFlagState,omitempty"`
	SectorFlags              []string `json:"sectorFlags,omitempty"`
}

type VehicleScoring struct {
	ID               int32       `json:"id"`
	DriverName       string      `json:"driverName,omitempty"`
	DriverNumber     string      `json:"driverNumber,omitempty"`
	TeamName         string      `json:"teamName,omitempty"`
	VehicleName      string      `json:"vehicleName,omitempty"`
	VehicleClass     string      `json:"vehicleClass,omitempty"`
	Place            uint8       `json:"place,omitempty"`
	TotalLaps        int16       `json:"totalLaps,omitempty"`
	IsPlayer         bool        `json:"isPlayer,omitempty"`
	InPits           bool        `json:"inPits,omitempty"`
	PitState         string      `json:"pitState,omitempty"`
	Sector           string      `json:"sector,omitempty"`
	FinishStatus     string      `json:"finishStatus,omitempty"`
	LapDistance      float64     `json:"lapDistance,omitempty"`
	PathLateral      float64     `json:"pathLateral,omitempty"`
	TrackEdge        float64     `json:"trackEdge,omitempty"`
	Position         Vec3        `json:"position"`
	LocalVelocity    Vec3        `json:"localVelocity"`
	Orientation      Orientation `json:"orientation"`
	TimeBehindLeader float64     `json:"timeBehindLeader,omitempty"`
	TimeBehindNext   float64     `json:"timeBehindNext,omitempty"`
	LapsBehindLeader int32       `json:"lapsBehindLeader,omitempty"`
	LapsBehindNext   int32       `json:"lapsBehindNext,omitempty"`
	BestLapTime      float64     `json:"bestLapTime,omitempty"`
	LastLapTime      float64     `json:"lastLapTime,omitempty"`
	EstimatedLapTime float64     `json:"estimatedLapTime,omitempty"`
	Pitstops         int32       `json:"pitstops,omitempty"`
	Penalties        int32       `json:"penalties,omitempty"`
	Qualification    int32       `json:"qualification,omitempty"`
	Flag             string      `json:"flag,omitempty"`
	FuelFraction     float64     `json:"fuelFraction,omitempty"`
}

type Frame struct {
	Connected        bool             `json:"connected"`
	PlayerHasVehicle bool             `json:"playerHasVehicle,omitempty"`
	Player           *PlayerTelemetry `json:"player,omitempty"`
	Session          *SessionInfo     `json:"session,omitempty"`
	Vehicles         []VehicleScoring `json:"vehicles,omitempty"`
	TimestampUnixMS  int64            `json:"timestampUnixMs"`
}
