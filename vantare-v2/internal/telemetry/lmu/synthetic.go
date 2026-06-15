package lmu

import (
	"encoding/binary"
	"math"
)

// BuildSyntheticBuffer returns a valid-sized buffer with known test values.
func BuildSyntheticBuffer() []byte {
	buf := make([]byte, ObjectOutSize)

	writeString(buf, scoringTrackName, "Spa", 64)
	binary.LittleEndian.PutUint32(buf[scoringSession:], uint32(10))
	binary.LittleEndian.PutUint32(buf[scoringNumVehicles:], 3)
	buf[scoringGamePhase] = 5
	writeString(buf, scoringPlayerName, "TestDriver", 32)

	v0 := vehicleScoringOffset
	binary.LittleEndian.PutUint32(buf[v0+vehicleScoringID:], 0)
	writeString(buf, v0+vehicleScoringDriverName, "TestDriver", 32)
	buf[v0+vehicleScoringPlace] = 1
	buf[v0+vehicleScoringIsPlayer] = 1

	buf[telemetryPlayerVehicleIdx] = 0
	buf[telemetryPlayerHasVehicle] = 1

	po := telemetryTelemOffset

	v1 := vehicleScoringOffset + vehicleScoringStride
	binary.LittleEndian.PutUint32(buf[v1+vehicleScoringID:], 1)
	writeString(buf, v1+vehicleScoringDriverName, "CarTwo", 32)
	buf[v1+vehicleScoringPlace] = 2
	buf[v1+vehicleScoringIsPlayer] = 0
	binary.LittleEndian.PutUint64(buf[v1+vehicleScoringLapDistance:], math.Float64bits(950))
	binary.LittleEndian.PutUint64(buf[v1+vehicleScoringEstimatedLapTime:], math.Float64bits(120))

	v2 := vehicleScoringOffset + 2*vehicleScoringStride
	binary.LittleEndian.PutUint32(buf[v2+vehicleScoringID:], 2)
	writeString(buf, v2+vehicleScoringDriverName, "CarThree", 32)
	buf[v2+vehicleScoringPlace] = 3
	buf[v2+vehicleScoringIsPlayer] = 0
	binary.LittleEndian.PutUint64(buf[v2+vehicleScoringLapDistance:], math.Float64bits(1050))
	binary.LittleEndian.PutUint64(buf[v2+vehicleScoringEstimatedLapTime:], math.Float64bits(120))
	setPlayerSpeedMPS(buf, po, 15)
	binary.LittleEndian.PutUint32(buf[po+vehicleTelemetryGear:], 4)
	binary.LittleEndian.PutUint64(buf[po+vehicleTelemetryEngineRPM:], math.Float64bits(7200))
	binary.LittleEndian.PutUint64(buf[po+vehicleTelemetryFuel:], math.Float64bits(45.2))

	return buf
}

// SetPlayerSpeedMPS overwrites the player slot local velocity X (m/s) for tests.
func SetPlayerSpeedMPS(buf []byte, speedMPS float64) {
	if len(buf) < ObjectOutSize {
		return
	}
	setPlayerSpeedMPS(buf, telemetryTelemOffset, speedMPS)
}

func setPlayerSpeedMPS(buf []byte, po int, speedMPS float64) {
	binary.LittleEndian.PutUint64(buf[po+vehicleTelemetryLocalVel:], math.Float64bits(speedMPS))
}

func writeString(buf []byte, off int, s string, max int) {
	if off >= len(buf) {
		return
	}
	end := off + max
	if end > len(buf) {
		end = len(buf)
	}
	copy(buf[off:end], s)
}
