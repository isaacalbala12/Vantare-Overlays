# Relative Current Inventory

## Resumen

Inventario técnico del `Relative` actual de Vantare v2 antes de implementar personalización beta. Cubre el componente, datos, persistencia, tests y dependencias.

## Archivos revisados

### Frontend
| Archivo | Rol |
|---|---|
| `frontend/src/overlay/widgets/RelativeWidget.tsx` | Componente principal que renderiza el Relative |
| `frontend/src/overlay/widgets/RelativeWidget.test.tsx` | Tests del Relative |
| `frontend/src/overlay/widgets/mock-telemetry.ts` | Mock data para edit/preview |
| `frontend/src/overlay/widgets/widget-appearance.ts` | Resuelve apariencia (colores) del widget |
| `frontend/src/lib/telemetry-ref.ts` | Tipos `VehicleScoring`, `TelemetryRefState` y parseo |
| `frontend/src/lib/profile.ts` | Tipos `WidgetConfig`, `ProfileConfig`, `WidgetAppearance` |
| `frontend/src/hub/state/style-catalog.ts` | Valores por defecto de apariencia por widget |
| `frontend/src/hub/preview/PreviewWidgetFrame.tsx` | Frame que renderiza widgets en preview |
| `frontend/src/hub/preview/PreviewInspector.tsx` | Inspector de propiedades (usa AppearanceEditor) |
| `frontend/src/hub/overlays/WidgetStudio.tsx` | Studio que orquesta preview + settings |
| `frontend/src/hub/overlays/WidgetSettingsPanel.tsx` | Panel de settings (usa PreviewInspector) |

### Backend (Go)
| Archivo | Rol |
|---|---|
| `pkg/config/profile.go` | Schema `WidgetConfig`, `ProfileConfig`, persistencia JSON |
| `pkg/models/telemetry.go` | `VehicleScoring` (Go) con campos de telemetría |
| `internal/telemetry/service/service.go` | Pipeline de telemetría (llama `gap.ComputeTimeGaps`) |
| `internal/telemetry/gap/gap.go` | Cálculo de `TimeGapToPlayer` |
| `internal/telemetry/fusion/fusion.go` | Merge de shared memory + REST API → `VehicleScoring` |
| `internal/telemetry/lmuapi/types.go` | Tipos de la REST API de LMU (`StandingRow`) |
| `internal/telemetry/lmuapi/client.go` | Cliente REST (`GET /rest/watch/standings`) |
| `internal/app/lmu_enriched_source.go` | Fuente enriquecida shared memory + REST |
| `internal/app/hub_service.go` | CRUD de perfiles |
| `internal/app/profile_service.go` | `SaveLayout`, gestión de perfil activo |

### Config
| Archivo | Rol |
|---|---|
| `configs/example-racing.json` | Perfil de ejemplo con un `relative` configurado |

## Render actual

El Relative actual es un componente que se renderiza completo a HTML plano (sin React virtual DOM después del mount) mediante `setHTMLIfChanged` y `startFrameBudgetLoop`.

Estructura visual:
```
┌──────────────────────────────┐
│         VANTARE              │  ← header con brand
├──────────────────────────────┤
│         RELATIVE             │  ← sub-header con clase
├──────────────────────────────┤
│  1  █  36  ALPINE      +4.6 │  ← filas de pilotos
│  2  █  5   PORSCHE     +3.1 │
│  3  █  51  FERRARI AF  +2.4 │
│  4  █  8   TOYOTA GAZOO  —  │  ← player
│  5  █  94  PEUGEOT     -1.0 │
│  6  █  83  AF CORSE    -1.6 │
└──────────────────────────────┘
```

## Columnas actuales

El Relative renderiza **5 columnas** por fila:

| # | Elemento | Dato | Visible siempre | Notas |
|---|---|---|---|---|
| 1 | **Posición** | `v.place` | Sí | Número, ancho fijo 1.5rem, color gris `#9CA3AF` |
| 2 | **Indicador de clase** | `v.vehicleClass` | Sí | Barra vertical 1.5px, color según clase (Hypercar, LMP2, LMP3, GT3) |
| 3 | **Número de coche** | `v.driverNumber` | Sí | Cuadrado 1.75rem con `teamBrandColor` de fondo. **`teamBrandColor` solo disponible en mock, NO en datos reales de LMU** |
| 4 | **Nombre de piloto** | `v.driverName` | Sí | Flexible, truncado a 18 caracteres con `…` |
| 5 | **Gap** | `v.timeGapToPlayer` | Sí | Firmado (`+2.4` / `-1.0`), color diferenciado (adelante/atrás). `—` para player o sin dato |

### Columnas NO visibles actualmente pero disponibles en datos

Datos presentes en `VehicleScoring` (Go) que NO se muestran en Relative:
- `bestLapTime`
- `lastLapTime`
- `estimatedLapTime`
- `inPits`/`pitting`/`pitState`
- `timeBehindLeader` / `timeBehindNext`
- `totalLaps`
- `fuelFraction`
- `tireCompound` (solo en mock, NO en Go)
- `fastestLap` (solo en mock, NO en Go)

## Datos por columna

| Columna | Fuente | Disponible en live | Disponible en mock |
|---|---|---|---|
| `place` | REST API `StandingRow.Position` | ✅ | ✅ |
| `vehicleClass` | REST API `StandingRow.CarClass` | ✅ | ✅ |
| `driverNumber` | REST API `StandingRow.CarNumber` | ✅ | ✅ |
| `driverName` | REST API `StandingRow.DriverName` | ✅ | ✅ |
| `timeGapToPlayer` | `gap.ComputeTimeGaps()` (calculado en backend) | ✅ | ✅ (hardcoded en mock) |
| `teamBrandColor` | solo mock | ❌ No existe en Go ni REST API | ✅ |
| `tireCompound` | solo mock | ❌ No existe en Go ni REST API | ✅ |
| `fastestLap` | solo mock | ❌ No existe en Go ni REST API | ✅ |
| `bestLapTime` | REST API `StandingRow.BestLapTime` | ✅ | ✅ |
| `lastLapTime` | REST API `StandingRow.LastLapTime` | ✅ | ✅ |
| `estimatedLapTime` | REST API `StandingRow.EstimatedLapTime` | ✅ | ✅ |
| `inPits` | REST API `StandingRow.Pitting/InGarageStall/PitState` | ✅ | ✅ |

### Gap crucial: `teamBrandColor`, `tireCompound`, `fastestLap` no existen en Go

Ni `VehicleScoring` (Go) ni `StandingRow` (LMU API) tienen campos para `teamBrandColor`, `tireCompound` o `fastestLap`. Estos existen solo en:
- `frontend/src/lib/telemetry-ref.ts` (`VehicleScoring` TS type)
- `frontend/src/overlay/widgets/mock-telemetry.ts` (mock data)

Si se usan en el Relative actual con datos live, `teamBrandColor` será `undefined` y el fondo del número será `transparent` (cae a `#9CA3AF` para texto). Esto significa que **el número de coche se muestra sin el fondo de color del equipo en live**, solo en mock.

## Formatos actuales

| Valor | Formato | Código |
|---|---|---|
| Gap | `+1.2` / `-2.5` / `—` | `formatSignedGap()`: `seconds.toFixed(1)` con signo. `0` o `null` → `—` |
| Nombre | Truncado a 18 chars + `…` | `truncate(name, 18)` |
| Número de coche | Raw string en cuadrado de color | `escapeHTML(v.driverNumber)` |
| Posición | Número raw | `v.place` |
| Clase | Color por clase: Hypercar→rojo, LMP2→azul, LMP3→ámbar, GT3→verde | `resolveClassColor()` |
| Gap colors | Adelante→`gapAheadColor` (defecto `#f87171`), Atrás→`gapBehindColor` (defecto `#4ade80`) | Prop de appearance |

## Estilos relevantes

- **Fondo panel**: `linear-gradient(180deg, #3a050a 0%, #0d0102 100%)` (hardcoded)
- **Fondo header**: `linear-gradient(180deg, #9b2226 0%, #3a050a 100%)` (hardcoded)
- **Fondo "RELATIVE"**: `linear-gradient(90deg, #111 0%, #222 50%, #111 100%)` (hardcoded)
- **Fondo player**: `linear-gradient(90deg, rgba(230,57,70,0.2) 0%, rgba(155,34,38,0.4) 100%)` (hardcoded)
- **Alternancia filas**: `rgba(255,255,255,0.06)` par / `rgba(0,0,0,0.3)` impar
- **Borde filas**: `border-b border-black/20`
- **Altura fila**: dinámica: `Math.max(20, Math.floor((containerHeight - 8) / rowCount))`
- **Indicador player**: `box-shadow: inset 3px 0 0 0 ${accentColor}`
- **Contenedor**: `rounded-lg`, `font-display`, sombra exterior, borde configurable por `appearance.borderColor`
- **Opacidad**: configurable por `appearance.opacity`
- **Clases CSS**: Tailwind (`flex`, `items-center`, `font-mono`, `truncate`, etc.)

## Fuentes de datos

### Pipeline de datos live

```
LMU Shared Memory (333 Hz)
    → normalizer.FromBuffer() (parsea shared memory → Telemetry)
    → fusion.Merge() (mergea REST standings + session)
        → REST API GET /rest/watch/standings (cada ~250ms)
        → REST API GET /rest/watch/sessionInfo (cada ~250ms)
    → gap.ComputeTimeGaps() (calcula TimeGapToPlayer)
    → filter.ShouldPublish() (diff + publish)
    → TelemetryBridge → Wails event "telemetry:update"
    → frontend parseTelemetryPayload() + applyTelemetryUpdate()
    → RelativeWidget usa getTelemetryRef()
```

### Fuentes de datos por campo

| Campo | Origen compartido (shared memory) | Origen REST (LMU API) | Cálculo |
|---|---|---|---|
| `place` | ❌ | `StandingRow.Position` | — |
| `driverName` | ❌ | `StandingRow.DriverName` | — |
| `driverNumber` | ❌ | `StandingRow.CarNumber` | — |
| `vehicleClass` | ❌ | `StandingRow.CarClass` | — |
| `isPlayer` | ❌ | `StandingRow.Player` | — |
| `timeGapToPlayer` | ❌ | `StandingRow.LapDistance` (usado en gap) | `gap.ComputeTimeGaps()` |
| `bestLapTime` | ❌ | `StandingRow.BestLapTime` | — |
| `lastLapTime` | ❌ | `StandingRow.LastLapTime` | — |
| `estimatedLapTime` | ❌ | `StandingRow.EstimatedLapTime` | — |
| `inPits` | ❌ | `StandingRow.Pitting/InGarageStall/PitState` | fusión lógica |
| `teamBrandColor` | ❌ | ❌ No disponible | Solo mock |
| `tireCompound` | ❌ | ❌ No disponible | Solo mock |
| `fastestLap` | ❌ | ❌ No disponible | Solo mock |

**Todas las columnas actuales del Relative dependen de la REST API de LMU**, no de shared memory. Sin LMU corriendo, no hay datos de standings.

### Estado mock

En edit/preview mode, `getMockTelemetry()` devuelve 16 vehículos con datos fijos. Los gaps están hardcoded, no calculados.

## Persistencia actual

### Formato de perfil (JSON)

```json
{
  "id": "default-racing",
  "name": "Default Racing",
  "displayMode": "racing",
  "monitorIndex": 0,
  "widgets": [
    {
      "id": "relative",
      "type": "relative",
      "enabled": true,
      "updateHz": 15,
      "position": { "x": 40, "y": 40, "w": 300, "h": 250 },
      "props": {
        "appearance": { ... colores ... },
        "rangeAhead": 3,
        "rangeBehind": 3,
        "style": "vantare-racing"
      }
    }
  ]
}
```

### Schema Go

```go
type WidgetConfig struct {
    ID       string         `json:"id"`
    Type     string         `json:"type"`
    Enabled  bool           `json:"enabled"`
    UpdateHz int            `json:"updateHz,omitempty"`
    Position Rect           `json:"position"`
    Props    map[string]any `json:"props,omitempty"`
}

type ProfileConfig struct {
    ID           string         `json:"id,omitempty"`
    Name         string         `json:"name,omitempty"`
    DisplayMode  DisplayMode    `json:"displayMode"`
    MonitorIndex int            `json:"monitorIndex"`
    Widgets      []WidgetConfig `json:"widgets"`
}
```

### ¿Se puede guardar configuración avanzada sin schema v2?

**No limpiamente.** El campo `Props` es `map[string]any`, que técnicamente permite guardar cualquier cosa, pero:

1. No hay campo `template` para elegir entre múltiples templates de Relative.
2. No hay campo `variantId` para variantes reutilizables.
3. No hay `slots`, `columns` o `columnGroups` — tendrían que ir dentro de `props` como keys arbitrarias.
4. No hay separación entre config de template, variante y datos del widget.
5. El spec dice explícitamente: _"No guardar configuración avanzada en campos genéricos opacos para evitar migraciones difíciles"_.

**Lo que SÍ se puede guardar hoy sin schema nuevo:**
- `rangeAhead` / `rangeBehind` (ya funcionan, ya se guardan en `props`)
- `appearance` (colores, ya funciona)
- `style` (ya funciona)

**Lo que NO se puede guardar sin schema v2 o extensión controlada:**
- Columnas activas/desactivadas (p.ej. `bestLap`, `lastLap`)
- Column groups opcionales
- Template seleccionado
- Variante seleccionada
- Formato por columna (decimales, ocultar minutos, etc.)
- Filtros (delante/detras/misma clase)
- Anchos por columna

## Tests existentes

### `RelativeWidget.test.tsx`

| Test | Tipo | Lo que cubre |
|---|---|---|
| `resolves class colors` | Unit (helper) | `resolveClassColor()` para Hypercar, LMP2, LMP3, GT3, unknown |
| `formats signed gaps` | Unit (helper) | `formatSignedGap()` con undefined, 0, positivo, negativo |
| `orders cars 3rd ahead at top, 1st ahead just above player` | Unit (helper) | `selectRelativeRowsByGap()` verifica orden: ahead desc → player → behind asc |
| `renders player and surrounding drivers in edit mode` | Integration | Renderiza `RelativeWidget` con mock, busca "VANTARE" y "TOYOTA GAZOO" |
| `displays signed time gaps to the player` | Integration | Verifica que se muestren `+2.4` y `-1.0` |
| `uses ahead color for cars ahead on track` | Integration | Verifica que `gapAheadColor` se aplique via prop `appearance` |

### Tests faltantes

- No hay tests para `teamBrandColor` fallback cuando es undefined
- No hay tests de render con datos live (solo mock)
- No hay tests de fingerprint / `setHTMLIfChanged`
- No hay tests de columna de clase (barra de color)
- No hay tests de columna de posición
- No hay tests de columna de número de coche
- No hay tests de persistencia de config del Relative
- No hay tests de `resolveWidgetAppearance` para Relative

### Tests relacionados en backend

| Archivo | Relevancia |
|---|---|
| `internal/telemetry/gap/gap_test.go` | Tests de `ComputeTimeGaps`: mismo lap, lapped car, player row, sin player |
| `internal/telemetry/diff/diff_test.go` | Tiene test de diff con `TimeGapToPlayer` |
| `internal/app/hub_service_test.go` | CRUD de perfiles (no específico de Relative) |
| `pkg/models/telemetry_test.go` | Test de que `VehicleScoring` tiene `TimeGapToPlayer` |

## Huecos detectados

### 1. `teamBrandColor` solo existe en mock

El número de coche se renderiza con fondo `teamBrandColor`. En live, este campo no sepuebla nunca porque ni `VehicleScoring` (Go) ni `StandingRow` (LMU API) lo tienen. En live, el número se muestra sin color de equipo (fondo `transparent`).

### 2. `tireCompound` solo existe en mock

No disponible para columnas opcionales futuras sin modificar backend o confirmar disponibilidad por REST API.

### 3. `fastestLap` solo existe en mock

No disponible para indicador visual de vuelta rápida en live.

### 4. No hay slot/column/template/variant en schema

El formato actual no puede persistir columnas opcionales, column groups, ni templates sin usar `props` como contenedor opaco (hack).

### 5. Gap de datos vs spec

El spec (`beta-widget-system-spec.md`) dice que `bestLap` y `lastLap` deben estar disponibles desde el primer Relative configurable. Los datos existen en la REST API (`StandingRow.BestLapTime`, `StandingRow.LastLapTime`) y en el Go `VehicleScoring`, pero el Relative actual no los muestra.

### 6. Sin filtros

No existe filtro "misma clase", "delante/detrás configurable desde UI", ni "incluir jugador". `rangeAhead`/`rangeBehind` existen como props pero no tienen UI de edición.

### 7. Sin columnas opcionales

No existe activación/desactivación de columnas desde UI. Todas las columnas actuales son fijas.

## Riesgos

1. **Mock ciego a `teamBrandColor`**: El Relative se ve bien en edit/preview porque el mock tiene `teamBrandColor`, pero en live el número se muestra sin color de equipo. Esto crea una diferencia visual no documentada entre edit y live.

2. **Dependencia total de REST API**: El Relative no funciona sin LMU REST API (`http://localhost:6397`). Si la API no responde, no hay datos de vehicles (solo shared memory que no tiene standings).

3. **Fingerprint frágil**: El fingerprint que evita re-render incluye `teamBrandColor` que siempre es `undefined` en live, lo que hace que cualquier cambio en cualquier otro campo dispare re-render completo.

4. **Altura de fila dinámica**: La altura de fila se recalcula contra `container.clientHeight`, lo que puede diferir entre preview y overlay real.

5. **HTML plano sin React después del mount**: El uso de `setHTMLIfChanged` y manipulación directa del DOM significa que las herramientas de testing de React (`screen.getByText`) funcionan pero no hay forma fácil de testear estado interno.

6. **Schema actual frágil para extensión**: Si se empieza a guardar config de columnas en `props` como hack, luego será difícil migrar a schema v2.

7. **Contradicción doc vs código**: El spec dice que `teamBrandColor` debería existir en la REST API de LMU (basado en las columnas actuales del producto), pero el código Go no lo mapea. Esto sugiere que el Relative actual funcionaba originalmente con mock, o que `teamBrandColor` se perdió en alguna refactor.

8. **Sin `timeGapToPlayer` en shared memory**: El gap se calcula desde `LapDistance` con estimación de velocidad. Pequeños errores de estimación pueden causar gaps inconsistentes.

## Recomendación

### Schema v2 necesario antes de persistencia de columnas

Se necesita schema v2 (o al menos una extensión controlada de `WidgetConfig`) antes de implementar UI persistente que guarde columnas opcionales, column groups, templates o variantes.

El formato actual puede soportar el primer corte **no persistente** (cambiar columnas en memoria, preview) sin schema v2, pero el spec exige que el primer corte guarde cambios.

### Alternativa: corte mínimo sin schema v2

Si se aprueba un corte mínimo que solo exponga:
- `rangeAhead` / `rangeBehind` (ya existen en `props`)
- Colores de appearance (ya existen)
- Activación de `bestLap` y `lastLap` como columnas **sin persistencia** (solo preview en memoria)

...entonces se podría diferir schema v2. Pero el spec dice que el primer corte real debe guardar cambios, así que esta alternativa requeriría aprobación explícita.

### Recomendación concreta

**Hacer schema v2 antes del primer corte de Relative configurable persistente.** El schema actual solo permite guardar colores y rangos. Para columnas, column groups y templates se necesita extensión.

## Siguiente miniplan recomendado

### Miniplan: Schema v2 para widgets

Objetivo: Extender `WidgetConfig` para soportar template, variant, columns, columnGroups sin hacks en `props`.

Archivos a tocar:
- `pkg/config/profile.go` — `WidgetConfig`: añadir `TemplateID`, `VariantID`, `Columns []ColumnConfig`, `ColumnGroups []ColumnGroupConfig`
- `frontend/src/lib/profile.ts` — tipos TS sincronizados
- `internal/app/hub_service.go` — `CreateProfile` para que use nuevos campos con defaults
- `internal/app/profile_service.go` — `SaveLayout` sin cambios (ya salva `Widgets` completo)
- `internal/app/hub_service_test.go`, `internal/app/profile_service_test.go` — tests de persistencia con nuevo schema

Contenido del schema:
```go
type ColumnConfig struct {
    MetricID string `json:"metricId"`
    Enabled  bool   `json:"enabled"`
    Width    int    `json:"width,omitempty"`
    Format   map[string]any `json:"format,omitempty"`
}

type ColumnGroupConfig struct {
    ID      string         `json:"id"`
    Enabled bool           `json:"enabled"`
    Columns []ColumnConfig `json:"columns"`
}
```

No tocar:
- RelativeWidget.tsx (es el corte siguiente)
- Pipeline de telemetría
- Perfiles existentes (migración en miniplan separado si es necesario)
- LayoutStudio

Riesgo: Migración de perfiles existentes. Si se añaden campos nuevos con `omitempty`, los perfiles viejos cargan sin esos campos y el código debe aplicar defaults al leer.

---

*Informe generado el 2026-06-21. Worker: inventario técnico.*
