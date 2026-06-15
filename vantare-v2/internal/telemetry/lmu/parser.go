package lmu

import (
	"encoding/binary"
	"math"

	"github.com/vantare/overlays/v2/pkg/models"
)

// ParseLevel controls how much of the mmap block is decoded.
type ParseLevel int

const (
	ParsePlayerOnly ParseLevel = iota
	ParseScoring
	ParseFull
)

func readFloat64(buf []byte, off int) float64 {
	if off+8 > len(buf) {
		return 0
	}
	return math.Float64frombits(binary.LittleEndian.Uint64(buf[off:]))
}

func readFloat32(buf []byte, off int) float64 {
	if off+4 > len(buf) {
		return 0
	}
	return float64(math.Float32frombits(binary.LittleEndian.Uint32(buf[off:])))
}

func readByte(buf []byte, off int) byte {
	if off >= len(buf) {
		return 0
	}
	return buf[off]
}

func readInt32(buf []byte, off int) int32 {
	if off+4 > len(buf) {
		return 0
	}
	return int32(binary.LittleEndian.Uint32(buf[off:]))
}

func readInt16(buf []byte, off int) int16 {
	if off+2 > len(buf) {
		return 0
	}
	return int16(binary.LittleEndian.Uint16(buf[off:]))
}

func readString(buf []byte, off, max int) string {
	if off >= len(buf) {
		return ""
	}
	end := off + max
	if end > len(buf) {
		end = len(buf)
	}
	chunk := buf[off:end]
	for i, b := range chunk {
		if b == 0 {
			return string(chunk[:i])
		}
	}
	return string(chunk)
}

func sectorName(v byte) string {
	switch v {
	case 0:
		return "SECTOR1"
	case 1:
		return "SECTOR2"
	case 2:
		return "SECTOR3"
	default:
		return ""
	}
}

func finishStatusName(v byte) string {
	switch v {
	case 0:
		return ""
	case 1:
		return "FINISHED"
	case 2:
		return "DNF"
	case 3:
		return "DQ"
	default:
		return ""
	}
}

func pitStateName(v byte) string {
	switch v {
	case 0:
		return "NONE"
	case 1:
		return "REQUEST"
	case 2:
		return "ENTERING"
	case 3:
		return "STOPPED"
	case 4:
		return "EXITING"
	default:
		return ""
	}
}

func flagName(v byte) string {
	switch v {
	case 0:
		return "GREEN"
	case 6:
		return "BLUE"
	default:
		return ""
	}
}

// ParseSession reads LMUScoringInfo from the mmap buffer.
func ParseSession(buf []byte) *models.SessionInfo {
	if len(buf) < scoringInfoOffset+scoringInfoSize {
		return nil
	}
	return &models.SessionInfo{
		TrackName:   readString(buf, scoringTrackName, 64),
		SessionType: readInt32(buf, scoringSession),
		SessionTime: readFloat64(buf, scoringCurrentET),
		NumVehicles: readInt32(buf, scoringNumVehicles),
		GamePhase:   buf[scoringGamePhase],
		PlayerName:  readString(buf, scoringPlayerName, 32),
		AmbientTemp: readFloat64(buf, scoringAmbientTemp),
		TrackTemp:   readFloat64(buf, scoringTrackTemp),
	}
}

// ParsePlayerTelemetry reads the player's LMUVehicleTelemetry slot.
func ParsePlayerTelemetry(buf []byte, playerIdx int) *models.PlayerTelemetry {
	if len(buf) < ObjectOutSize || buf[telemetryPlayerHasVehicle] == 0 {
		return nil
	}
	po := telemetryTelemOffset + playerIdx*telemetryTelemStride

	vx := readFloat64(buf, po+vehicleTelemetryLocalVel)
	vy := readFloat64(buf, po+vehicleTelemetryLocalVel+8)
	vz := readFloat64(buf, po+vehicleTelemetryLocalVel+16)
	speed := math.Sqrt(vx*vx + vy*vy + vz*vz)

	return &models.PlayerTelemetry{
		ID:                 readInt32(buf, po+vehicleTelemetryID),
		LapNumber:          readInt32(buf, po+vehicleTelemetryLapNumber),
		Speed:              speed,
		Gear:               readInt32(buf, po+vehicleTelemetryGear),
		EngineRPM:          readFloat64(buf, po+vehicleTelemetryEngineRPM),
		Fuel:               readFloat64(buf, po+vehicleTelemetryFuel),
		FuelCap:            readFloat64(buf, po+vehicleTelemetryFuelCapacity),
		DeltaBest:          readFloat64(buf, po+vehicleTelemetryDeltaBest),
		Throttle:           readFloat64(buf, po+vehicleTelemetryFilteredThrottle),
		Brake:              readFloat64(buf, po+vehicleTelemetryFilteredBrake),
		Clutch:             readFloat64(buf, po+vehicleTelemetryFilteredClutch),
		Steering:           readFloat64(buf, po+vehicleTelemetryFilteredSteering),
		VehicleName:        readString(buf, po+vehicleTelemetryVehicleName, 64),
		TrackName:          readString(buf, po+vehicleTelemetryTrackName, 64),
		TimeGapPlaceAhead:  readFloat32(buf, po+vehicleTelemetryTimeGapPlaceAhead),
		TimeGapPlaceBehind: readFloat32(buf, po+vehicleTelemetryTimeGapPlaceBehind),
	}
}

// ParseVehicleScoring decodes up to maxCount vehicle scoring slots.
func ParseVehicleScoring(buf []byte, count int) []models.VehicleScoring {
	if count <= 0 {
		return nil
	}
	maxCount := count
	if maxCount > 104 {
		maxCount = 104
	}

	out := make([]models.VehicleScoring, 0, maxCount)
	for i := 0; i < maxCount; i++ {
		off := vehicleScoringOffset + i*vehicleScoringStride
		if off+vehicleScoringStride > len(buf) {
			break
		}
		id := readInt32(buf, off+vehicleScoringID)
		name := readString(buf, off+vehicleScoringDriverName, 32)
		if id < 0 || name == "" {
			continue
		}
		pitState := pitStateName(readByte(buf, off+vehicleScoringPitState))
		out = append(out, models.VehicleScoring{
			ID:               id,
			DriverName:       name,
			VehicleName:      readString(buf, off+vehicleScoringVehicleName, 64),
			Place:            readByte(buf, off+vehicleScoringPlace),
			TotalLaps:        readInt16(buf, off+vehicleScoringTotalLaps),
			VehicleClass:     readString(buf, off+vehicleScoringVehicleClass, 32),
			IsPlayer:         readByte(buf, off+vehicleScoringIsPlayer) != 0,
			InPits:           readByte(buf, off+vehicleScoringInPits) != 0 || pitState != "" && pitState != "NONE",
			PitState:         pitState,
			Sector:           sectorName(readByte(buf, off+vehicleScoringSector)),
			FinishStatus:     finishStatusName(readByte(buf, off+vehicleScoringFinishStatus)),
			TimeBehindLeader: readFloat64(buf, off+vehicleScoringTimeBehindLeader),
			TimeBehindNext:   readFloat64(buf, off+vehicleScoringTimeBehindNext),
			LapsBehindLeader: readInt32(buf, off+vehicleScoringLapsBehindLeader),
			LapsBehindNext:   readInt32(buf, off+vehicleScoringLapsBehindNext),
			LapDistance:      readFloat64(buf, off+vehicleScoringLapDistance),
			BestLapTime:      readFloat64(buf, off+vehicleScoringBestLapTime),
			LastLapTime:      readFloat64(buf, off+vehicleScoringLastLapTime),
			EstimatedLapTime: readFloat64(buf, off+vehicleScoringEstimatedLapTime),
			Pitstops:         int32(readInt16(buf, off+vehicleScoringPitstops)),
			Penalties:        int32(readInt16(buf, off+vehicleScoringPenalties)),
			Qualification:    readInt32(buf, off+vehicleScoringQualification),
			Flag:             flagName(readByte(buf, off+vehicleScoringFlag)),
			FuelFraction:     float64(readByte(buf, off+vehicleScoringFuelFraction)),
		})
	}
	return out
}

// Parse decodes the mmap buffer at the requested level.
func Parse(buf []byte, level ParseLevel) *models.Telemetry {
	if len(buf) < ObjectOutSize {
		return nil
	}

	playerIdx := int(buf[telemetryPlayerVehicleIdx])
	t := &models.Telemetry{
		Connected:        true,
		PlayerHasVehicle: buf[telemetryPlayerHasVehicle] != 0,
		Player:           ParsePlayerTelemetry(buf, playerIdx),
	}

	if level == ParsePlayerOnly {
		return t
	}

	t.Session = ParseSession(buf)
	if t.Session != nil {
		t.Vehicles = ParseVehicleScoring(buf, int(t.Session.NumVehicles))
	}
	return t
}
