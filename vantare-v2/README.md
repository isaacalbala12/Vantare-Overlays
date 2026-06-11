# Vantare Overlays v2

Reinicio del proyecto con **Go + Wails + React**. Esta carpeta es el scaffold inicial (Fase 1).

Documentación: [`../docs/V2-STACK-AND-PERFORMANCE.md`](../docs/V2-STACK-AND-PERFORMANCE.md) · Plan maestro: [`../docs/V2-MASTER-PLAN.md`](../docs/V2-MASTER-PLAN.md) · **Guía completa:** [`../docs/proyecto/README.md`](../docs/proyecto/README.md)

## Requisitos

- Go 1.25+ (Wails v3) · Node 20+ · pnpm
- Windows 10/11 (shared memory LMU)
- Le Mans Ultimate en ejecución (para modo live)

## Estructura

```
vantare-v2/
├── cmd/vantare/            # Wails overlay app (Fase 3-4)
├── cmd/lmu-debug/          # CLI de telemetría LMU
├── configs/                # perfiles JSON (racing, edit)
├── frontend/               # React 19 + Vite + Tailwind v4
│   └── src/
│       ├── lib/            # telemetry-ref.ts, profile.ts
│       └── overlay/        # CompositeApp, WidgetHost, widgets/
├── internal/
│   ├── app/                # lifecycle + bridge + profile service
│   ├── core/               # deadband, utilidades
│   ├── telemetry/
│   │   ├── lmu/            # mmap reader + parser
│   │   ├── normalizer/     # raw bytes → snapshot
│   │   ├── pipeline/       # deadband filter
│   │   ├── diff/           # JSON diff payload
│   │   └── service/        # 60Hz read / 30Hz emit + Subscribe
│   └── window/             # bounds + mode manager
├── pkg/
│   ├── config/             # profile schema + load/save
│   └── models/             # tipos unificados
└── tools/                  # generador offsets (desde repo v1)
```

## Comandos

```bash
cd vantare-v2

# Tests (sin LMU)
go test ./...

# Debug con buffer sintético
go run ./cmd/lmu-debug -mock -once

# Debug en vivo (LMU abierto en pista)
go run ./cmd/lmu-debug -once
go run ./cmd/lmu-debug -hz 10
```

## Salida esperada (mock)

```
track=Spa | speed=54.0 km/h | gear=4 | rpm=7200 | fuel=45.2 L | lap=0
```

## Wails overlay (Fase 3)

```bash
pnpm --dir frontend install
pnpm --dir frontend test           # vitest: wire format + diff merge
pnpm --dir frontend build
go run ./cmd/vantare              # mock telemetry
go run ./cmd/vantare -live        # LMU must be running
```

## Composite overlay (Fase 4)

Un solo ventana overlay con 3 widgets (delta, relative, standings) driven by profile JSON.

### Comandos

```bash
go test ./...                     # Go tests
pnpm --dir frontend test          # Frontend tests
pnpm --dir frontend build         # Build frontend

# Modo racing (shrink-wrap, click-through)
go run ./cmd/vantare -profile configs/example-racing.json

# Modo edit (fullscreen, draggable widgets)
go run ./cmd/vantare -profile configs/example-racing.json -edit

# Live con LMU
go run ./cmd/vantare -live -profile configs/example-racing.json
go run ./cmd/vantare -live -profile configs/example-racing.json -edit
```

### Perfil JSON

Los perfiles definen widgets con posiciones, tipo y props:

```json
{
  "id": "default-racing",
  "displayMode": "racing",
  "monitorIndex": 0,
  "widgets": [
    { "id": "delta", "type": "delta", "enabled": true, "position": { "x": 760, "y": 40, "w": 400, "h": 48 } },
    { "id": "relative", "type": "relative", "enabled": true, "position": { "x": 40, "y": 600, "w": 320, "h": 280 } },
    { "id": "standings", "type": "standings", "enabled": true, "position": { "x": 1560, "y": 40, "w": 340, "h": 420 } }
  ]
}
```

## Hub Dashboard (Fase 5)

Segunda ventana Wails (normal, con marco) para gestión visual de perfiles y dashboard de telemetría.

```bash
go run ./cmd/vantare                 # Abre overlay + hub window
go run ./cmd/vantare -live           # Con LMU en vivo
```

### Hub features

- **Dashboard**: Hero VANTARE cinematográfico, panel coche/circuito/sesión, banner evento, ratings driver + safety, gráfico iRating (canvas), carreras recientes, sidebar Pro + ecosistema
- **Overlays (Perfiles)**: Lista, crear, activar, eliminar perfiles JSON
- **Diseño**: Portado fiel desde `hub_main_v5.html` — Tailwind v4, glass-panel, card-sleek, paleta `vantare-*`

### Modos

- **Racing**: Ventana shrink-wrap al bbox de widgets, click-through (`SetIgnoreMouseEvents`)
- **Edit**: Ventana fullscreen, widgets arrastrables, guarda posiciones a JSON

## Próximos pasos

1. ~~Offsets generados desde Python~~ → `python tools/generate-lmu-offsets.py`
2. ~~Fixtures binarios + tests (`testdata/lmu-fixture.bin`)~~ → ver `testdata/README.md`
3. ~~Normalizer + deadband en pipeline (Fase 2)~~ ✅
4. ~~Wails v3 + ventana overlay (Fase 3)~~ ✅
5. ~~Composite layout + perfiles (Fase 4)~~ ✅
6. ~~Hub dashboard + CRUD perfiles (Fase 5)~~ ✅
