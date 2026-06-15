# 12 — Fuentes de telemetria LMU

> Objetivo: evitar que volvamos a confundir datos visualmente "presentes" con datos correctos. Esta pagina documenta de donde sale cada dato, que frecuencia conviene usar y que fuente debe alimentar cada overlay.

---

## Resumen ejecutivo

Vantare no debe depender de una unica fuente para todos los overlays.

| Fuente | Uso correcto | Frecuencia recomendada | Estado |
|---|---|---:|---|
| LMU shared memory | Inputs rapidos: velocidad, marcha, RPM, pedal, volante, fuel basico | 60 Hz lectura / 30 Hz UI | Activa |
| LMU REST local | Standings, relative, gaps, clases, pit state, lap timing, delta base | 2-5 Hz (poll 250 ms) | Integrada |
| Vantare telemetry service | Snapshot unificado consumido por Wails y SSE | <=30 Hz | Activo |
| Wails event `telemetry:update` | Overlay desktop runtime | <=30 Hz | Activo |
| HTTP/SSE Vantare | OBS Browser Source | <=30 Hz | Activo |
| Mock telemetry | Preview Hub y tests visuales | local | Activo |

Regla: el frontend no debe llamar directamente a LMU. Go debe fusionar fuentes y emitir un `models.Telemetry` unificado.

---

## Fuente 1 — LMU shared memory

### Que es

LMU expone un bloque de memoria compartida de Windows. Vantare lo lee desde Go para obtener datos rapidos sin pasar por HTTP.

Codigo actual:

| Archivo | Rol |
|---|---|
| `vantare-v2/internal/telemetry/lmu/reader.go` | Abre y lee shared memory |
| `vantare-v2/internal/telemetry/lmu/parser.go` | Convierte bytes en modelos Go |
| `vantare-v2/internal/telemetry/lmu/offsets.go` | Offsets generados |
| `tools/generate-lmu-offsets.py` | Generador desde `pyLMUSharedMemory` |
| `vantare-v2/internal/telemetry/normalizer/normalizer.go` | Limpieza/normalizacion basica |

### Comandos de diagnostico

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/lmu-debug -once
go run ./cmd/lmu-debug -hz 10
```

Si falla con un error de compilacion tipo `undefined: vehicleTelemetryFilteredClutch`, significa que el parser referencia un offset no generado. Corregir offsets antes de seguir.

### Campos que ya se leen

`PlayerTelemetry`:

| Campo Vantare | Fuente shared memory | Uso |
|---|---|---|
| `id` | `LMUVehicleTelemetry.mID` | relacionar player con scoring |
| `lapNumber` | `mLapNumber` | delta/fases |
| `speed` | `mLocalVel` | telemetria/pedales |
| `gear` | `mGear` | telemetria |
| `engineRPM` | `mEngineRPM` | RPM |
| `fuel` | `mFuel` | fuel basico |
| `fuelCap` | `mFuelCapacity` | fuel basico |
| `deltaBest` | `mDeltaBest` | no fiable aun |
| `throttle` | `mFilteredThrottle` | pedales |
| `brake` | `mFilteredBrake` | pedales |
| `steering` | `mFilteredSteering` | pedales/telemetry |
| `vehicleName` | `mVehicleName` | contexto |
| `trackName` | `mTrackName` | contexto |

`VehicleScoring` actual:

| Campo Vantare | Fuente shared memory | Problema actual |
|---|---|---|
| `id` | `LMUVehicleScoring.mID` | OK |
| `driverName` | `mDriverName` | OK |
| `place` | `mPlace` | OK para standings overall |
| `totalLaps` | `mTotalLaps` | OK |
| `vehicleClass` | `mVehicleClass` | OK |
| `isPlayer` | `mIsPlayer` | OK |
| `inPits` | `mInPits` | demasiado basico |
| `timeBehindLeader` | `mTimeBehindLeader` | no suficiente / a veces 0 |

### Campos shared memory que deberiamos generar y parsear

El generador ya conoce estos nombres en `VS_MAP`, pero Go no los emite todos en `GO_VS_MAP`.

| Campo LMU | Necesario para | Campo Vantare propuesto |
|---|---|---|
| `mVehicleName` | standings completo | `vehicleName` |
| `mSector` | delta/relative/contexto | `sector` |
| `mFinishStatus` | standings | `finishStatus` |
| `mLapDist` | relative real / delta real | `lapDistance` |
| `mBestLapTime` | delta alpha | `bestLapTime` |
| `mLastLapTime` | standings/delta | `lastLapTime` |
| `mCurSector1` | delta/sector | `currentSectorTime1` |
| `mCurSector2` | delta/sector | `currentSectorTime2` |
| `mNumPitstops` | standings | `pitstops` |
| `mNumPenalties` | standings | `penalties` |
| `mTimeBehindNext` | relative/standings | `timeBehindNext` |
| `mLapsBehindNext` | relative/standings | `lapsBehindNext` |
| `mLapsBehindLeader` | standings | `lapsBehindLeader` |
| `mPitState` | pit/garage labels | `pitState` |
| `mQualification` | quali standings | `qualification` |
| `mEstimatedLapTime` | delta alpha | `estimatedLapTime` |
| `mPitGroup` | pit context | `pitGroup` |
| `mFlag` | flags | `flag` |
| `mFuelFraction` | fuel | `fuelFraction` |

---

## Fuente 2 — LMU REST local

### Que es

LMU tambien expone una API HTTP local. En el entorno probado responde en:

```text
http://localhost:6397
```

Comando de diagnostico:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/lmu-api-probe
```

### Endpoints confirmados

| Endpoint | Uso |
|---|---|
| `/rest/watch/standings` | Fuente mas completa para standings, relative, gaps y delta base |
| `/rest/watch/sessionInfo` | Pista, fase, sesion, numero de vehiculos, tiempo restante |
| `/navigation/state` | Estado de navegacion/juego, coche seleccionado, metadata de pista |

### Campos utiles de `/rest/watch/standings`

Ejemplo real observado para el jugador:

```json
{
  "driverName": "Isaac Albala",
  "carNumber": "46",
  "carClass": "LMP3",
  "fullTeamName": "ADESS Factory Racing Team 2025",
  "position": 12,
  "player": true,
  "lapsBehindLeader": 6,
  "lapsBehindClassLeader": 2,
  "timeBehindNext": 243.9303436279297,
  "lapDistance": 165.79299926757812,
  "timeIntoLap": 3.023747444152832,
  "bestLapTime": -1,
  "lastLapTime": 0,
  "estimatedLapTime": 246.19961547851562,
  "pitState": "EXITING",
  "pitting": true,
  "inGarageStall": true,
  "sector": "SECTOR1"
}
```

Campos recomendados:

| Campo REST | Campo Vantare | Overlay |
|---|---|---|
| `driverName` | `driverName` | standings/relative |
| `carNumber` | `driverNumber` | standings/relative |
| `carClass` | `vehicleClass` | standings/relative |
| `fullTeamName` | `teamName` | standings |
| `position` | `place` | standings |
| `player` | `isPlayer` | relative |
| `lapsCompleted` | `totalLaps` | standings/relative |
| `lapsBehindLeader` | `lapsBehindLeader` | standings |
| `lapsBehindClassLeader` | `lapsBehindClassLeader` | standings clase |
| `timeBehindLeader` | `timeBehindLeader` | standings |
| `timeBehindNext` | `timeBehindNext` | relative |
| `lapsBehindNext` | `lapsBehindNext` | relative |
| `lapDistance` | `lapDistance` | relative/delta |
| `timeIntoLap` | `timeIntoLap` | relative/delta |
| `bestLapTime` | `bestLapTime` | delta |
| `lastLapTime` | `lastLapTime` | standings/delta |
| `estimatedLapTime` | `estimatedLapTime` | delta alpha |
| `pitState` | `pitState` | standings/relative |
| `pitting` | `pitting` | standings/relative |
| `inGarageStall` | `inGarageStall` | standings/relative |
| `sector` | `sector` | relative/delta |
| `carVelocity.velocity` | `speed` | relative estimacion |

### Campos utiles de `/rest/watch/sessionInfo`

Ejemplo real observado:

```json
{
  "trackName": "Circuit de la Sarthe",
  "session": "PRACTICE1",
  "gamePhase": 5,
  "numberOfVehicles": 12,
  "playerName": "Isaac Albala",
  "currentEventTime": 1587,
  "timeRemainingInGamePhase": 123.9625,
  "yellowFlagState": "NONE",
  "sectorFlag": ["YELLOW", "YELLOW", "YELLOW"]
}
```

Uso recomendado:

| Campo REST | Campo Vantare |
|---|---|
| `trackName` | `session.trackName` |
| `session` | `session.sessionName` |
| `gamePhase` | `session.gamePhase` |
| `numberOfVehicles` | `session.numVehicles` |
| `playerName` | `session.playerName` |
| `currentEventTime` | `session.sessionTime` |
| `timeRemainingInGamePhase` | `session.timeRemaining` |
| `yellowFlagState` | `session.yellowFlagState` |
| `sectorFlag` | `session.sectorFlags` |

---

## Fuente 3 — Vantare telemetry service

### Que es

Es el stream interno que ya consume el frontend. Debe convertirse en la unica API de datos para React/OBS.

Archivos:

| Archivo | Rol |
|---|---|
| `vantare-v2/internal/telemetry/service/service.go` | Lee source, filtra, emite snapshots |
| `vantare-v2/internal/telemetry/pipeline/filter.go` | Deadband y `sessionEpoch` |
| `vantare-v2/internal/telemetry/diff/diff.go` | Diffs para UI |
| `vantare-v2/internal/app/telemetry_bridge.go` | Wails event `telemetry:update` |
| `vantare-v2/internal/server/sse.go` | SSE `/telemetry/stream` |
| `vantare-v2/frontend/src/lib/telemetry-ref.ts` | Estado mutable frontend |

### Eventos y endpoints

| Canal | Consumidor | URL/evento |
|---|---|---|
| Wails | Overlay desktop | `telemetry:update` |
| SSE | OBS/browser | `/telemetry/stream` |
| HTTP debug | humano/agente | `curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream` |

---

## Fuente 4 — Mock telemetry

Archivo:

```text
vantare-v2/frontend/src/overlay/widgets/mock-telemetry.ts
```

Uso correcto:

- Preview del Hub.
- Tests visuales de widgets.
- Modo sin LMU cuando se ejecuta sin `-live`.

Uso incorrecto:

- Runtime real con LMU.
- OBS live.
- Cualquier medicion de correctness de standings/relative/delta.

---

## Matriz de responsabilidad por overlay

| Overlay | Fuente primaria | Fallback | Observaciones |
|---|---|---|---|
| Delta | REST standings + tracker Go | shared memory `deltaBest` solo si se valida | calcular en Go, no React |
| Relative | REST standings `lapDistance/timeIntoLap` | shared memory scoring extendido | ordenar por distancia en pista, no por `place` |
| Standings | REST standings | shared memory scoring extendido | gaps/laps/pits/clases |
| Pedals | shared memory telemetry | mock en preview | 30 Hz |
| Telemetry RPM/Gear/Speed | shared memory telemetry | mock en preview | 30 Hz |
| Ops | Go runtime | ninguno | 1 Hz |

---

## Reglas para evitar regresiones

1. No declarar que un overlay usa "datos reales" si solo muestra `driverName/place`.
2. Antes de tocar widgets, validar el snapshot de `/telemetry/stream`.
3. Antes de tocar offsets, regenerar y revisar `offsets.go`.
4. La API REST LMU se consulta en Go, nunca desde React.
5. REST no debe ejecutarse a 60 Hz; usar 2-5 Hz.
6. Shared memory sigue siendo fuente rapida para inputs.
7. `relative` debe ordenar por pista (`lapDistance`), no por clasificacion (`place`).
8. `standings` debe distinguir gaps por tiempo, vueltas y pit/garage.
9. `delta` debe tener una fase alpha simple y una fase real por referencia de vuelta.

