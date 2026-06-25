# EN6 — Análisis técnico: Adapter live LMU para Vantare Ingeniero

> **Tipo:** investigación / documentación (analysis-only).
> **No edita código de producción.** No realiza commit, push, tag ni staging.
> Creado por worker de análisis técnico el 2026-06-25.
> Contexto: `AGENTS.md`, `docs/current-plan.md` y `docs/superpowers/plans/2026-06-25-vantare-suite-ingeniero-integration.md` (EN6).

Este documento responde las 10 preguntas planteadas y define un miniplan recomendado para implementar EN6 en tareas pequeñas y seguras.

---

## 1. Campos que necesita `internal/engineer/telemetry.Frame` para que el spotter funcione

A partir de la lectura del spotter (`internal/engineer/spotter/geometry.go`, `alignment.go`, `overlap.go`, `state.go`, `debug.go`) y de `internal/engineer/core/runtime.go`, los campos realmente consumidos por la lógica del spotter son:

**Por cada vehículo en `frame.Vehicles` (`telemetry.VehicleScoring`):**

| Campo | Tipo | Uso en spotter |
|---|---|---|
| `ID` | `int32` | Identidad del oponente y del jugador; filtrado para no comparar al jugador consigo mismo. |
| `IsPlayer` | `bool` | Localización del jugador dentro del slice de vehículos. |
| `InPits` | `bool` | Si el jugador está en pits, el spotter se desactiva (`geometry.go:81-83`). Los oponentes en pits se ignoran (`geometry.go:111-113`). |
| `LapDistance` | `float64` | Filtra oponentes con `LapDistance < 0` (vehículos no válidos todavía, `geometry.go:114-116`). |
| `Position` | `Vec3` | **Crítico.** Posición mundial del coche. Se usa para proyectar al oponente al sistema del jugador (`AlignOpponentXZ`). |
| `Orientation` | `Orientation` (matriz 3x3) | **Crítico.** Solo se usa `Row2.X` y `Row2.Z` para calcular el yaw del jugador (`YawFromRF2Orientation`, `alignment.go:14-20`). |

**Desde `frame.Player` (`telemetry.PlayerTelemetry`), como fallback preferente (`geometry.go:88-96`):**

| Campo | Tipo | Uso |
|---|---|---|
| `Position` | `Vec3` | Sobrescribe `playerPos` si no es cero. Preferido sobre el scoring para el jugador. |
| `Orientation` | `Orientation` | Sobrescribe `playerYaw` si `Row2` no es cero. Preferido sobre el scoring para el jugador. |

**Otros campos del frame:**

- `frame.Connected` y `frame.PlayerHasVehicle`: usados por `Runtime.ProcessFrame` para decidir si procesar.
- `frame.TimestampUnixMS`: actualmente no lo consume el spotter (el runtime recibe `nowMS` externo), pero está en el modelo.

**Campos del modelo que NO usa el spotter hoy:**

- `LocalVelocity` (Vec3): no se referencia en `spotter/`. Solo se usa en el parser de Overlays para calcular `Speed` (magnitud). El spotter no necesita velocidad local para la detección de overlap lateral/longitudinal actual.
- `PathLateral`, `TrackEdge` (`VehicleScoring`): existen en el modelo `internal/engineer/telemetry/model.go:56-57` y se prueban en `model_test.go` solo como round-trip JSON. Ningún archivo de `spotter/` los referencia. Son campos reservados para futuras mejoras de geometría de pista, pero **no son bloqueantes para EN6**.

**Conclusión P1:** Para que el spotter funcione en vivo, la fuente LMU debe entregar por vehículo: `Position` (Vec3) y `Orientation` (matriz 3x3), además de `ID`, `IsPlayer`, `InPits`, `LapDistance` (estos cuatro ya se leen en Overlays). Para el jugador, `Position` y `Orientation` del slot `VehicleTelemetry` son preferibles y se usan como fallback preferente.

---

## 2. Campos que ya existen en `pkg/models.Telemetry`

`pkg/models/telemetry.go` define:

- `PlayerTelemetry`: `ID`, `LapNumber`, `Speed`, `Gear`, `EngineRPM`, `Fuel`, `FuelCap`, `DeltaBest`, `Throttle`, `Brake`, `Clutch`, `Steering`, `VehicleName`, `TrackName`, `TimeGapPlaceAhead`, `TimeGapPlaceBehind`. **No** expone `Position`, `LocalVelocity` ni `Orientation`.
- `SessionInfo`: `TrackName`, `SessionType`, `SessionName`, `SessionTime`, `TimeRemainingInGamePhase`, `NumVehicles`, `GamePhase`, `PlayerName`, `AmbientTemp`, `TrackTemp`, `YellowFlagState`, `SectorFlags`. **No** expone `TrackLength`.
- `VehicleScoring`: `ID`, `DriverName`, `DriverNumber`, `TeamName`, `VehicleName`, `Place`, `TotalLaps`, `VehicleClass`, `IsPlayer`, `InPits`, `Pitting`, `InGarageStall`, `PitState`, `Sector`, `FinishStatus`, `TimeBehindLeader`, `TimeBehindNext`, `LapsBehindLeader`, `LapsBehindClassLeader`, `LapsBehindNext`, `LapDistance`, `TimeIntoLap`, `BestLapTime`, `LastLapTime`, `EstimatedLapTime`, `Pitstops`, `Penalties`, `Qualification`, `Flag`, `FuelFraction`, `TimeGapToPlayer`. **No** expone `Position`, `LocalVelocity`, `Orientation`, `PathLateral` ni `TrackEdge`.
- `Telemetry`: `Connected`, `Player`, `Session`, `Vehicles`, `PlayerHasVehicle`, `SessionEpoch`, `SessionKey`, `SessionState`.

**Conclusión P2:** El modelo público de Overlays **no** contiene los campos geométricos que necesita el spotter. No hay `Vec3` ni `Orientation` en `pkg/models`.

---

## 3. Campos que existen en `Vantare-Ingeniero-Go` pero no en Overlays

Comparando `C:\Users\isaac\Desktop\Vantare-Ingeniero-Go\internal\telemetry\model.go` con `pkg/models/telemetry.go`:

**En `PlayerTelemetry` de Ingeniero, no presentes en Overlays:**

- `Position` (`Vec3`)
- `LocalVelocity` (`Vec3`)
- `Orientation` (`Orientation`)

**En `VehicleScoring` de ingeniero, no presentes en Overlays:**

- `Position` (`Vec3`)
- `LocalVelocity` (`Vec3`)
- `Orientation` (`Orientation`)
- `PathLateral` (`float64`)
- `TrackEdge` (`float64`)

**En `SessionInfo` de ingeniero, no presentes en Overlays:**

- `TrackLength` (`float64`)

**En el paquete `telemetry` de ingeniero (no existe en Overlays):**

- `Vec3` (`vector.go`): struct con `X`, `Y`, `Z` y métodos `Sub`, `Dot`, `Len`.
- `Orientation` (`vector.go`): matriz 3x3 como `Row0`, `Row1`, `Row2` (cada uno `Vec3`), con métodos `LocalX`, `LocalZ`, `Forward`, `Left`.

**Nota importante:** Estos tipos ya existen dentro de `internal/engineer/telemetry/` en Overlays (fueron copiados en EN1). El gap es de **offsets y parser**, no de definición de tipos. El modelo `internal/engineer/telemetry/model.go` ya tiene `Position`, `LocalVelocity`, `Orientation`, `PathLateral`, `TrackEdge` y `TrackLength`.

---

## 4. ¿Los offsets actuales de Overlays permiten leer `Position`, `LocalVelocity` y `Orientation`?

**No.** Comparando `internal/telemetry/lmu/offsets.go` (Overlays) con `C:\Users\isaac\Desktop\Vantare-Ingeniero-Go\internal\sim\lmu\offsets.go`:

**Offsets presentes en ingeniero pero ausentes en Overlays — bloque `vehicleTelemetry*`:**

| Offset | Valor | Campo |
|---|---|---|
| `vehicleTelemetryPosition` | `160` | `Position` (Vec3, 24 bytes) |
| `vehicleTelemetryLocalAccel` | `208` | Aceleración local (no usada por spotter) |
| `vehicleTelemetryOrientation` | `232` | `Orientation` (matriz 3x3, 72 bytes) |

**Offsets presentes en ingeniero pero ausentes en Overlays — bloque `vehicleScoring*`:**

| Offset | Valor | Campo |
|---|---|---|
| `vehicleScoringPathLateral` | `112` | `PathLateral` (float64) |
| `vehicleScoringTrackEdge` | `120` | `TrackEdge` (float64) |
| `vehicleScoringPosition` | `264` | `Position` (Vec3, 24 bytes) |
| `vehicleScoringLocalVel` | `288` | `LocalVelocity` (Vec3, 24 bytes) |
| `vehicleScoringLocalAccel` | `312` | Aceleración local (no usada) |
| `vehicleScoringOrientation` | `336` | `Orientation` (matriz 3x3, 72 bytes) |

**Offsets presentes en ingeniero pero ausentes en Overlays — bloque `scoring*`:**

| Offset | Valor | Campo |
|---|---|---|
| `scoringTrackLength` | `1720` | `TrackLength` (float64) |

**Offsets que Overlays ya tiene y son válidos para geometría:**

- `vehicleTelemetryLocalVel = 184`: ya se usa para calcular `Speed` del jugador. El valor de `LocalVelocity` del jugador **ya está accesible** en el buffer; simplemente no se expone como Vec3 en `pkg/models.PlayerTelemetry`.

**Conclusión P4:** Los offsets necesarios para `Position` y `Orientation` del jugador y de los oponentes **no existen** en `internal/telemetry/lmu/offsets.go`. El offset de `LocalVelocity` del jugador ya existe, pero los de `LocalVelocity` de oponentes no. Para EN6 hay que añadir al menos: `vehicleTelemetryPosition`, `vehicleTelemetryOrientation`, `vehicleScoringPosition`, `vehicleScoringOrientation`. Opcionalmente `vehicleScoringLocalVel`, `vehicleScoringPathLateral`, `vehicleScoringTrackEdge`, `scoringTrackLength` (no bloqueantes para spotter, pero útiles para futuras mejoras).

Ambos `offsets.go` están generados por `tools/generate-lmu-offsets.py` y declaran el mismo `ObjectOutSize = 324820`, la misma `vehicleScoringStride = 584` y la misma `telemetryTelemStride = 1888`. Por tanto los offsets de ingeniero son compatibles con el mismo buffer de mmap que ya lee Overlays.

---

## 5. Mejor punto de integración

### Opción evaluada A: nuevo parser `internal/telemetry/lmu/engineer_parser.go`

Consiste en un parser dedicado en el paquete `lmu` existente que decodifica un `*engineertelemetry.Frame` directamente desde el buffer mmap, usando offsets adicionales.

- **Ventajas:** no toca `parser.go` existente (que alimenta widgets); no toca `pkg/models`; reutiliza los helpers de lectura (`readFloat64`, `readVec3`, `readOrientation`) del paquete `lmu` o los duplica en el nuevo archivo; mantiene separación clara entre parser público (widgets) y parser de ingeniero (geometría).
- **Desventajas:** requiere importar `internal/engineer/telemetry` desde `internal/telemetry/lmu`, lo que crea una dependencia `internal/telemetry/lmu -> internal/engineer/telemetry`. Esto puede ser aceptable pero cruza la frontera habitual del paquete `lmu` (que hoy solo importa `pkg/models`).

### Opción evaluada B: método `ReadEngineerFrame()` en `EnrichedLMUSource`

Consiste en añadir a `internal/app/lmu_enriched_source.go` un método que devuelva `*engineertelemetry.Frame` parseado desde `s.mmap.Read()`.

- **Ventajas:** `EnrichedLMUSource` ya es el owner del mmap; no abre un segundo reader; el ciclo de vida ya está gestionado por `TelemetrySourceManager`; expone de forma natural el frame de ingeniero al `EngineerService` via `EngineerFrameSource`.
- **Desventajas:** `internal/app` pasa a depender de `internal/engineer/telemetry` y del nuevo parser. Es una dependencia razonable porque el puente ya existe (`internal/app/engineer_bridge.go` ya importa `internal/engineer/service`).

### Opción evaluada C: adapter en `internal/engineer/service`

Consiste en un `overlays_live_adapter.go` dentro de `internal/engineer/service` que envuelve un `service.Source` (de Overlays) y expone `telemetry.Source` (de ingeniero). El adapter pide el buffer al source de Overlays y lo parsea internamente.

- **Ventajas:** mantiene la lógica de parseo de geometría dentro del módulo engineer; `internal/app` no necesita conocer `engineertelemetry.Frame`; el `EngineerService` ya sabe cómo consumir un `telemetry.Source` (su loop actual usa `telemetryservice.New`).
- **Desventajas:** el adapter necesita acceso al `service.Source` subyacente, lo que obliga a exponer el buffer del `TelemetrySourceManager` o del `EnrichedLMUSource` (ya existe `Read() []byte` en la interfaz `service.Source`). Requiere que el adapter sepa qué offsets usar; lo más limpio es que el adapter importe un paquete de offsets/parser de ingeniero dentro de `internal/engineer`.

### Decisión recomendada

**Combinación de B + C, con parser en `internal/engineer` (no en `internal/telemetry/lmu`).**

Estructura recomendada:

1. **Parser de geometría en `internal/engineer/telemetry/lmu/` (paquete nuevo dentro de engineer):** un archivo `parser.go` (o `engineer_parser.go`) dentro de `internal/engineer/telemetry/lmu/` que contenga los offsets adicionales y las funciones `ParseEngineerFrame(buf []byte) *telemetry.Frame`. Esto evita que `internal/telemetry/lmu` dependa de `internal/engineer/telemetry` y mantiene la dependencia en el sentido natural (`engineer` depende de `telemetry/lmu` de Overlays solo para helpers de lectura de bytes, o bien duplica los helpers triviales).

   Alternativa más limpia: poner offsets y parser en `internal/engineer/service/overlays_live_adapter.go` o en un subpaquete `internal/engineer/lmu/`, para no ensuciar `internal/engineer/telemetry` (que es el modelo de tipos).

2. **Método `ReadEngineerFrame()` en `EnrichedLMUSource`** (`internal/app/lmu_enriched_source.go`): devuelve `*engineertelemetry.Frame` usando el parser del paso 1 sobre `s.mmap.Read()`. Este método es el único punto donde el buffer crudo se convierte en frame de ingeniero.

3. **Adapter en `internal/engineer/service/overlays_live_adapter.go`:** implementa `telemetry.Source` (la interfaz de ingeniero, `ReadFrame() *Frame`). El adapter se construye con un `func() []byte` (o con `*EnrichedLMUSource`) y en cada `ReadFrame()` llama al parser de geometría. Esto permite que el `EngineerService` consuma live LMU con el mismo código que hoy consume simulator/replay, sin saber que el origen es un mmap.

4. **`EngineerService.SetSource("lmu")`** añade un tercer caso válido en `telemetryLoop`, que construye el adapter a partir del buffer provider expuesto por `internal/app`. Si no hay source live disponible, cae a simulator/replay con status claro.

**Razón de la decisión:** mantiene `internal/telemetry/lmu` (paquete público de widgets) intacto, no toca `pkg/models`, no abre un segundo mmap, y el `EngineerService` sigue consumiendo su propia interfaz `telemetry.Source` — solo cambia la procedencia del frame.

---

## 6. Cómo evitar abrir un segundo mmap reader

El `TelemetrySourceManager` (`internal/app/telemetry_source_manager.go`) ya es el único owner del `service.Source` activo. El `EnrichedLMUSource` ya posee el `mmap service.Source` (líneas 22-29 de `lmu_enriched_source.go`) y expone `Read() []byte` (líneas 31-33) y `ReadTelemetry()` (líneas 35-45).

Para EN6:

- **No** crear un nuevo `lmu.OpenSource()` desde Ingeniero.
- **No** copiar `internal/sim/lmu` como source owner activo (regla explícita del plan EN6).
- **Sí** reutilizar `s.mmap.Read()` dentro de `EnrichedLMUSource.ReadEngineerFrame()` para obtener el mismo buffer que ya alimenta los widgets, y pasarlo por el parser de geometría de ingeniero.
- El `TelemetrySourceManager` sigue siendo el único punto de apertura/cierre del mmap. El `EngineerService` recibe el buffer vía una dependencia inyectada (un `BufferProvider` o el propio `EnrichedLMUSource`), nunca abre el mmap.

Resultado: un solo mmap reader, dos parseos independientes del mismo buffer (uno para widgets con `pkg/models.Telemetry`, otro para spotter con `engineertelemetry.Frame`).

---

## 7. Cómo mantener intacto el JSON público de widgets

El JSON público de widgets se genera a partir de `pkg/models.Telemetry` mediante `ReadTelemetry()` (en `TelemetrySourceManager` o `EnrichedLMUSource`).

Para mantenerlo intacto:

- **No modificar `pkg/models/telemetry.go`** en EN6 (regla del plan). No añadir `Position`, `Orientation`, `LocalVelocity`, `PathLateral` ni `TrackEdge` al modelo público.
- **No modificar `internal/telemetry/lmu/parser.go`** ni `internal/telemetry/lmu/offsets.go` existentes. El parser público de widgets sigue produciendo exactamente el mismo `*models.Telemetry`.
- **No modificar `internal/telemetry/normalizer/normalizer.go`** ni `internal/telemetry/fusion/*`.
- El frame de ingeniero se produce por una cadena paralela: `EnrichedLMUSource.ReadEngineerFrame()` -> parser de geometría -> `*engineertelemetry.Frame`. Este frame nunca se serializa al JSON de widgets; solo lo consume el `Runtime.ProcessFrame` del spotter.
- El `TelemetryService` (de Overlays) y el SSE `/telemetry/stream` siguen emitiendo `pkg/models.Telemetry` sin cambios.
- El `EngineerService` emite notificaciones por `engineer:notification` y `/engineer/stream`, no por el canal de telemetría de widgets.

Verificación: un test de regresión que compare el JSON de `ReadTelemetry()` antes y después de EN6 sobre un buffer sintetico idéntico debe ser byte-igual.

---

## 8. Tests exactos que habría que crear

### 8.1 Tests del parser de geometría (paquete nuevo dentro de `internal/engineer`)

- **T1 — `TestParseEngineerFrame_PlayerGeometry`**: buffer sintético con un slot `VehicleTelemetry` cuyo `Position` y `Orientation` Known-values; el parser devuelve `frame.Player.Position` y `frame.Player.Orientation.Row2` correctos.
- **T2 — `TestParseEngineerFrame_VehicleScoringGeometry`**: buffer sintético con N vehículos en `VehicleScoring`; el parser devuelve `frame.Vehicles[i].Position`, `Orientation` y `LapDistance` correctos para cada uno.
- **T3 — `TestParseEngineerFrame_BufferTooSmall`**: buffer con `len < ObjectOutSize` devuelve `nil` sin panic.
- **T4 — `TestParseEngineerFrame_PlayerIdxOutOfBounds`**: `telemetryPlayerVehicleIdx` apunta fuera de rango; el parser devuelve `frame.Player == nil` sin panic y sin leer fuera del buffer.
- **T5 — `TestParseEngineerFrame_ZeroOrientation`**: slot con orientation todo ceros; el parser devuelve `Orientation{}` y no paniquea (el spotter ya maneja este caso en `geometry.go:90`).
- **T6 — `TestParseEngineerFrame_TimestampUnixMS`**: el frame lleva `TimestampUnixMS` coherente con el instante de lectura (o cero si se decide delegar al runtime).

### 8.2 Tests de `EnrichedLMUSource.ReadEngineerFrame`

- **T7 — `TestEnrichedLMUSource_ReadEngineerFrame_ReturnsFrame`**: usando un `FuncSource` que devuelva un buffer sintético, `ReadEngineerFrame()` devuelve un frame no nil con geometría correcta.
- **T8 — `TestEnrichedLMUSource_ReadEngineerFrame_NilBuffer`**: si `mmap.Read()` devuelve nil o buffer corto, `ReadEngineerFrame()` devuelve nil sin panic.
- **T9 — `TestEnrichedLMUSource_ReadEngineerFrame_DoesNotAffectReadTelemetry`**: tras llamar `ReadEngineerFrame()`, `ReadTelemetry()` sigue devolviendo el mismo `*models.Telemetry` que antes (regresión de JSON público). Comparar con `reflect.DeepEqual` o marshalling JSON.

### 8.3 Tests del adapter live

- **T10 — `TestOverlaysLiveAdapter_ReadFrame_DelegatesToBufferProvider`**: el adapter llama al buffer provider y devuelve un frame válido.
- **T11 — `TestOverlaysLiveAdapter_Info_LiveAvailable`**: `Info()` devuelve `Kind: lmu`, `Live: true`, `Available: true` cuando el provider está disponible.
- **T12 — `TestOverlaysLiveAdapter_Info_NotAvailableWhenBufferNil`**: si el provider devuelve nil, `Available: false`.
- **T13 — `TestOverlaysLiveAdapter_Close_NoOp`**: `Close()` no cierra el mmap subyacente (responsabilidad del `TelemetrySourceManager`).

### 8.4 Tests de integración del `EngineerService` con live

- **T14 — `TestEngineerService_SetSource_LMU_BuildsAdapter`**: al setear `source = "lmu"`, el servicio construye el adapter sin error y `Status().Source == "lmu"`.
- **T15 — `TestEngineerService_Loop_LMU_ProcessesFrame`**: con un buffer sintético inyectado, el loop de telemetría procesa al menos un frame y el spotter no paniquea (usa un fixture de replay conocido que produzca un `car_left` o `car_right`).
- **T16 — `TestEngineerService_LMU_FallsBackWhenNoLiveSource`**: si el provider live no está disponible, el servicio cae a simulator con `LastError` informativo y `Connected: false`.

### 8.5 Test de regresión de JSON público

- **T17 — `TestWidgetJSON_UnchangedAfterEngineerAdapter`**: toma un buffer sintético, llama `ReadTelemetry()`, marshal a JSON; luego llama `ReadEngineerFrame()`; vuelve a llamar `ReadTelemetry()` y marshal; los dos JSON deben ser idénticos. Protege contra que el parser de geometría mute el buffer o el estado del source.

### 8.6 Tests de geometría/signos con fixtures

- **T18 — `TestSpotter_LiveLMU_FixtureCarLeft`**: carga un fixture de replay (`testdata/engineer-replay/spotter-left-basic.jsonl` ya existe) adaptado a formato LMU (o un buffer sintético con un oponente a +X del jugador mirando a +Z) y verifica que `Classify` devuelve `Zone{Side: SideLeft}`.
- **T19 — `TestSpotter_LiveLMU_FixtureCarRight`**: simétrico, oponente a -X, verifica `SideRight`.
- **T20 — `TestSpotter_LiveLMU_YawConsistency`**: jugador con orientación no identidad; oponente colocado en mundo de forma que tras alinear quede a la izquierda; el spotter reporta `SideLeft`. Valida que `YawFromRF2Orientation` + `AlignOpponentXZ` son consistentes con el sistema de coordenadas LMU (X = izquierda del coche, Z = atrás).

**Total: 20 tests** cubriendo parser, source, adapter, servicio, regresión de JSON y geometría.

---

## 9. Riesgos de geometría/signos y cómo validarlos

### Riesgo 9.1 — Sistema de coordenadas LMU/rFactor

`internal/engineer/telemetry/vector.go:29-47` documenta:
- Local +X apunta a la **izquierda** del conductor.
- Local +Z apunta **hacia atrás**.
- `Forward()` devuelve `-LocalZ`.
- `Left()` devuelve `LocalX`.

`YawFromRF2Orientation` (`alignment.go:14-20`) calcula `yaw = atan2(Row2.X, Row2.Z)` y lo normaliza a `[0, 2π)`. Esto es coherente con rFactor2/LMU donde la fila 2 de la matriz de orientación corresponde al eje Z local expresado en mundo.

**Riesgo:** si el adapter live produce `Orientation` con las filas en orden distinto al esperado (por ejemplo, si la convención del mmap fuera columna-mayor en vez de fila-mayor), el yaw sería erróneo y todos los lados se invertirían.

**Validación:** T20 usa un fixture con orientación no identidad para confirmar que la alineación produce el lado esperado. Idealmente, validar contra un fixture grabado de una sesión real de LMU con un coche a la izquierda conocido. Si no se dispone de grabación real, al menos el fixture sintético debe respetar la convención `Row2 = eje Z local en mundo`.

### Riesgo 9.2 — Signo de lateral X

`sideFromAlignedX` (`alignment.go:33-41`) declara `x > 0 → SideLeft`, `x < 0 → SideRight`. Esto es coherente con `AlignOpponentXZ` que rota el vector `opponent - player` por el yaw del jugador. Si el yaw se calcula con signo opuesto, los lados se invierten.

**Validación:** T18 y T19 cubren ambos lados con la misma orientación del jugador, de forma que un fallo de signo se manifiesta como inversión de lado en al menos un test.

### Riesgo 9.3 — Offset de `Position` del slot `VehicleScoring` vs `VehicleTelemetry`

El spotter prefiere `frame.Player.Position` (del slot `VehicleTelemetry`) sobre `player.Position` (del slot `VehicleScoring`). Si los offsets de `Position` difieren entre scoring y telemetría (en ingeniero: `vehicleScoringPosition = 264`, `vehicleTelemetryPosition = 160`), un bug de copy-paste de offsets mezclaría coordenadas de un slot con otro y produciría posiciones absurdas.

**Validación:** T1 y T2 usan buffers sintéticos con valores distintos y comprobables en cada slot, de forma que un offset equivocado produce un valor numéricamente distinto y el test falla.

### Riesgo 9.4 — `LapDistance` negativo o cero en oponentes

`geometry.go:114-116` filtra oponentes con `LapDistance < 0`. En vivo, al inicio de una sesión algunos oponentes pueden tener `LapDistance == 0` (válidos) o `< 0` (no spawned). El filtro es correcto; el riesgo es que el parser de ingeniero devuelva `LapDistance` con signo o escala distinta a la de Overlays.

**Mitigación:** el offset `vehicleScoringLapDistance = 104` ya existe en Overlays y funciona; el parser de ingeniero debe usar el mismo offset. T2 verifica el valor.

### Riesgo 9.5 — Mutación del buffer compartido

Si el parser de geometría escribiera sobre el buffer (no debería, solo lee), corrompería el parseo posterior de widgets.

**Validación:** T9 y T17 verifican que `ReadTelemetry()` produce el mismo resultado antes y después de `ReadEngineerFrame()`.

### Riesgo 9.6 — `playerIdx` fuera de rango

En LMU, `telemetryPlayerVehicleIdx` es un byte en offset 128465. Si el juego no ha asignado vehículo, el índice puede ser 0 o basura. El parser de Overlays ya comprueba `buf[telemetryPlayerHasVehicle] == 0` (`parser.go:147`); el parser de ingeniero debe hacer lo mismo y además comprobar `po+telemetryTelemStride <= len(buf)` (ingeniero ya lo hace en `parser.go:169`).

**Validación:** T4 cubre este caso.

### Riesgo 9.7 — Frame nulo o desconectado

Si LMU no está disponible, `s.mmap.Read()` puede devolver nil o un buffer corto. `ReadEngineerFrame()` debe devolver nil sin panic, y el `EngineerService` debe caer a simulator/replay con `Connected: false`.

**Validación:** T8, T12 y T16.

---

## 10. Miniplan recomendado para implementar EN6 en tareas pequeñas

Cada tarea es un PR/commit pequeño, testeado y con checks verdes antes de avanzar.

### EN6.1 — Offsets y parser de geometría (sin tocar app)

- **Archivos a crear:**
  - `internal/engineer/lmu/offsets.go` (o ampliar los constants en `internal/engineer/lmu/parser.go`): offsets adicionales `vehicleTelemetryPosition`, `vehicleTelemetryOrientation`, `vehicleScoringPosition`, `vehicleScoringLocalVel`, `vehicleScoringOrientation`, `vehicleScoringPathLateral`, `vehicleScoringTrackEdge`, `scoringTrackLength`.
  - `internal/engineer/lmu/parser.go`: funciones `ParseEngineerFrame(buf []byte) *telemetry.Frame`, `ParsePlayerEngineerTelemetry(buf, idx)`, `ParseVehicleEngineerScoring(buf, count)`, `ParseSessionEngineer(buf)`, y helpers `readVec3`/`readOrientation` (pueden duplicarse del parser de ingeniero o importarse si se extraen a un helper compartido dentro de `internal/engineer/lmu`).
  - `internal/engineer/lmu/parser_test.go`: tests T1–T6.
- **Archivos a NO tocar:** `internal/telemetry/lmu/*`, `pkg/models/*`, `internal/app/*`, `internal/engineer/service/*`, `internal/engineer/spotter/*`, `internal/engineer/telemetry/model.go`.
- **Checks:** `go test ./internal/engineer/lmu/...`, `go test ./...`, `gofmt`, `git diff --check`.
- **Criterio:** el parser devuelve frames correctos sobre buffers sintéticos sin depender de `internal/app`.

### EN6.2 — `ReadEngineerFrame()` en `EnrichedLMUSource`

- **Archivos a modificar:**
  - `internal/app/lmu_enriched_source.go`: añadir `func (s *EnrichedLMUSource) ReadEngineerFrame() *engineertelemetry.Frame` que llama a `engineerlmu.ParseEngineerFrame(s.mmap.Read())`. Importar `internal/engineer/lmu` y `engineertelemetry "github.com/vantare/overlays/v2/internal/engineer/telemetry"`.
  - `internal/app/lmu_enriched_source_test.go` (crear o ampliar): tests T7, T8, T9, T17.
- **Archivos a NO tocar:** `internal/telemetry/lmu/*`, `pkg/models/*`, `internal/engineer/service/*`, `internal/engineer/spotter/*`.
- **Checks:** `go test ./internal/app/...`, `go test ./...`, `gofmt`, `git diff --check`.
- **Criterio:** `ReadEngineerFrame()` funciona y `ReadTelemetry()` no cambia su salida.

### EN6.3 — Adapter live en `internal/engineer/service`

- **Archivos a crear:**
  - `internal/engineer/service/overlays_live_adapter.go`: struct `OverlaysLiveAdapter` que implementa `telemetry.Source` (`ReadFrame() *Frame`, `Info() SourceInfo`, `Close() error`). Se construye con un `BufferProvider` (interfaz local o `func() []byte`) y un `Info() SourceInfo` provider. `ReadFrame()` llama a `engineerlmu.ParseEngineerFrame(buf)`.
  - `internal/engineer/service/overlays_live_adapter_test.go`: tests T10–T13.
- **Archivos a NO tocar:** `internal/app/*` (salvo exponer el tipo si es estrictamente necesario), `internal/telemetry/lmu/*`, `pkg/models/*`.
- **Checks:** `go test ./internal/engineer/...`, `go test ./...`, `gofmt`, `git diff --check`.
- **Criterio:** el adapter pasa los tests de interfaz sin abrir mmap.

### EN6.4 — Conectar `EngineerService` a live LMU

- **Archivos a modificar:**
  - `internal/engineer/service/engineer_service.go`: añadir `"lmu"` como tercer valor válido en `SetSource` y en `telemetryLoop`. Cuando `source == "lmu"`, construir `OverlaysLiveAdapter` a partir de un `BufferProvider` inyectado (campo nuevo del servicio, seteado desde `internal/app` al registrar el servicio).
  - `internal/engineer/service/engineer_service_test.go`: tests T14–T16.
  - `internal/app/app.go` (o `cmd/vantare/main.go` si el plan lo permite — **verificar con GLM**): inyectar el `BufferProvider` en `NewEngineerService`. Si el plan prohíbe tocar `cmd/vantare/main.go`, exponer el provider desde `internal/app` vía el `EngineerBridge` existente o un nuevo método de `App`.
- **Archivos a NO tocar:** `internal/telemetry/lmu/*`, `pkg/models/*`, `internal/engineer/spotter/*`, `internal/engineer/telemetry/model.go`, `frontend/**`, `go.mod`.
- **Checks:** `go test ./internal/engineer/... ./internal/app`, `go test ./...`, `gofmt`, `git diff --check`.
- **Criterio:** `SetSource("lmu")` funciona con un buffer sintético inyectado; el spotter procesa frames; si no hay live, cae a simulator con status claro.

### EN6.5 — Tests de geometría/signos con fixtures

- **Archivos a crear:**
  - `internal/engineer/service/overlays_live_adapter_geometry_test.go` (o ampliar el test del adapter): tests T18–T20 con fixtures sintéticos que cubran izquierda, derecha y orientación no identidad.
  - Opcional: `testdata/engineer-live/` con un fixture de buffer sintético serializado (binario o JSON del frame) para reproducibilidad.
- **Archivos a NO tocar:** código de producción salvo ajustes menores de fixtures.
- **Checks:** `go test ./internal/engineer/...`, `go test ./...`, `gofmt`, `git diff --check`.
- **Criterio:** los tests de geometría pasan y documentan la convención de signos LMU.

### EN6.6 — Documentación y verificación manual

- **Archivos a crear/modificar:**
  - `docs/engineer-live-lmu-adapter.md` (guía de verificación manual).
  - `docs/current-plan.md`: actualizar estado de EN6.
- **Checks:** `git diff --check`.
- **Criterio:** checklist manual: abrir app, activar Ingeniero con LMU corriendo, verificar que el spotter emite `car_left`/`car_right` correctos y que los widgets de overlay no cambian su JSON.

---

## Resumen de decisión recomendada

Implementar EN6 como una cadena paralela de parseo que reutiliza el mismo buffer mmap de `EnrichedLMUSource`:

1. Parser de geometría en `internal/engineer/lmu/` con offsets adicionales.
2. `ReadEngineerFrame()` en `EnrichedLMUSource` que alimenta el parser.
3. `OverlaysLiveAdapter` en `internal/engineer/service` que implementa `telemetry.Source` (de ingeniero) usando el buffer provider.
4. `EngineerService` acepta `source = "lmu"` e inyecta el adapter en su loop existente.

Esto cumple todas las restricciones del plan EN6: no abre segundo reader, no toca `pkg/models.Telemetry`, no cambia el JSON de widgets, no copia `internal/sim/lmu` como source owner, no introduce dependencias nuevas.

---

## Archivos que una futura implementación debería tocar

| Archivo | Acción |
|---|---|
| `internal/engineer/lmu/offsets.go` | Crear. Offsets de geometría adicionales. |
| `internal/engineer/lmu/parser.go` | Crear. `ParseEngineerFrame` y helpers. |
| `internal/engineer/lmu/parser_test.go` | Crear. Tests T1–T6. |
| `internal/app/lmu_enriched_source.go` | Modificar. Añadir `ReadEngineerFrame()`. |
| `internal/app/lmu_enriched_source_test.go` | Crear o ampliar. Tests T7–T9, T17. |
| `internal/engineer/service/overlays_live_adapter.go` | Crear. Adapter `telemetry.Source`. |
| `internal/engineer/service/overlays_live_adapter_test.go` | Crear. Tests T10–T13. |
| `internal/engineer/service/engineer_service.go` | Modificar. Añadir caso `source = "lmu"`. |
| `internal/engineer/service/engineer_service_test.go` | Ampliar. Tests T14–T16. |
| `internal/app/app.go` o `internal/app/engineer_bridge.go` | Modificar (mínimo). Inyectar `BufferProvider` en `EngineerService`. |
| `internal/engineer/service/overlays_live_adapter_geometry_test.go` | Crear. Tests T18–T20. |
| `docs/engineer-live-lmu-adapter.md` | Crear. Verificación manual. |
| `docs/current-plan.md` | Modificar. Estado de EN6. |

## Archivos que no debe tocar la implementación

| Archivo | Motivo |
|---|---|
| `pkg/models/telemetry.go` | Regla explícita de EN6: no exponer geometría en el modelo público. |
| `internal/telemetry/lmu/parser.go` | Parser público de widgets; debe seguir produciendo el mismo JSON. |
| `internal/telemetry/lmu/offsets.go` | Offsets públicos; los de geometría viven en `internal/engineer/lmu`. |
| `internal/telemetry/normalizer/normalizer.go` | No cambia. |
| `internal/telemetry/fusion/*` | No cambia. |
| `internal/engineer/spotter/*` | La geometría del spotter ya funciona; no cambiar signos por intuición. |
| `internal/engineer/telemetry/model.go` | Ya tiene los campos; no hace falta tocarlo. |
| `internal/engineer/telemetry/vector.go` | Idem. |
| `internal/engineer/core/runtime.go` | No cambia; ya procesa frames de ingeniero. |
| `frontend/**` | EN6 es backend Go. |
| `go.mod` | No introduce dependencias nuevas. |
| `configs/**` | No cambia configuración en EN6. |
| `schema/perfiles/**` | No cambia schema de perfiles. |
| `cmd/vantare/main.go` | Solo si es estrictamente necesario para inyectar el `BufferProvider`; preferir hacerlo desde `internal/app`. |

---

## Riesgos resumidos

1. **Geometría/coordenadas:** convención LMU (X=izquierda, Z=atrás) ya documentada en `vector.go`; riesgo principal es inversión de yaw si los offsets de `Orientation` se copian mal. Mitigación: T18–T20 y fixture con orientación no identidad.
2. **Mutación de buffer:** el parser de geometría solo lee; riesgo de corrupción si escribiese. Mitigación: T9 y T17.
3. **`playerIdx` fuera de rango:** ya manejado en el parser de ingeniero; replicar la misma guarda. Mitigación: T4.
4. **Dependencia cruzada `internal/app` -> `internal/engineer/telemetry`:** ya existe vía `engineer_bridge.go`; añadir `ReadEngineerFrame` es coherente.
5. **Ciclo de vida del mmap:** `ReadEngineerFrame` no abre ni cierra el mmap; responsabilidad sigue en `TelemetrySourceManager`. El adapter `Close()` es no-op.
6. **Ausencia de LMU en máquinas de test:** el `EngineerService` debe caer a simulator/replay con `Connected: false` y `LastError` informativo. Mitigación: T16.
7. **Fixture real de LMU:** si no se dispone de una grabación real de mmap, los fixtures sintéticos deben respetar estrictamente la convención documentada. Recomendable capturar un buffer real de mmap de una sesión de prueba conocida y serializarlo como fixture binario en `testdata/engineer-live/`.

---

## ¿EN6 está listo para plan de implementación?

**Sí.** El análisis confirma que:

- Los offsets necesarios existen en `Vantare-Ingeniero-Go` y son compatibles con el mismo `ObjectOutSize` y strides de Overlays.
- El modelo `internal/engineer/telemetry.Frame` ya tiene todos los campos necesarios (copiados en EN1).
- El spotter solo necesita `Position`, `Orientation` (y `LapDistance`, `InPits`, `IsPlayer`, `ID` ya disponibles) por vehículo; no necesita `PathLateral`, `TrackEdge` ni `LocalVelocity` para el corte actual.
- La integración no requiere segundo reader, no toca `pkg/models` ni el JSON de widgets.
- Los riesgos son identificables y validables con tests sintéticos y fixtures.
- El miniplan EN6.1–EN6.6 descompone el trabajo en tareas pequeñas, testeables y reversibles.

**Prerrequisito antes de ejecutar EN6:** resolver con GLM si la inyección del `BufferProvider` al `EngineerService` se hace desde `internal/app/app.go` (preferido) o desde `cmd/vantare/main.go` (evitar si es posible), y confirmar que no hay cambios abiertos en `internal/app` que choquen con EN6 (revisar `git status --short` antes de empezar).

---

## Verificación manual sugerida (post-implementación)

1. Iniciar LMU y cargar una sesión con al menos un oponente.
2. Abrir Vantare, ir a `Ingeniero`, seleccionar fuente `lmu`.
3. Confirmar que `Status().Source == "lmu"` y `Connected == true`.
4. Con un oponente a la izquierda del jugador, verificar que el spotter emite `car_left`.
5. Con un oponente a la derecha, verificar `car_right`.
6. Abrir un overlay con widgets de `Relative` o `Standings` y confirmar que su JSON no ha cambiado.
7. Detener LMU y verificar que `EngineerService` cae a `Connected: false` sin panic.