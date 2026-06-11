# 02 — Arquitectura v2 (Go + Wails + React)

> Código: [`vantare-v2/`](../../vantare-v2/)  
> Detalle extendido: [`../V2-STACK-AND-PERFORMANCE.md`](../V2-STACK-AND-PERFORMANCE.md)

---

## Stack

| Capa | Tecnología | Rol |
|------|------------|-----|
| Shell desktop | **Wails v3** | WebView2 nativo Windows, ventanas, eventos Go↔JS |
| Backend | **Go 1.25+** | Telemetría, perfiles, ventanas, (futuro) HTTP/SSE |
| Frontend | **React 19 + TS + Vite** | Hub + overlay compuesto |
| Estilos | **Tailwind CSS v4** | Tokens `@theme` en `frontend/src/index.css` |
| Build-time LMU | **Python ctypes** | Genera offsets; no corre en carrera |

**Descartado en v2:** Electron, Node en runtime, React state a 60 Hz para RPM/delta.

---

## Diagrama de capas

```
┌─────────────────────────────────────────────────────────────┐
│ CAPA 1 — EXTRACCIÓN                                         │
│  LMU shared memory "LMU_Data" → mmap (Windows)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ CAPA 2 — LÓGICA (Go)                                        │
│  parser (offsets) → normalizer → deadband → diff → 30 Hz    │
│  pkg/models.TelemetrySnapshot unificado                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   Ventana overlay   Ventana Hub      HTTP+SSE (F6)
   (transparente)    (1280×800)       OBS Browser Source
   /                 /#/hub
```

---

## Procesos y ventanas

Al ejecutar `go run ./cmd/vantare` se abren **dos ventanas Wails** compartiendo el mismo bundle frontend:

| Ventana | URL | Características |
|---------|-----|-----------------|
| **Overlay** | `/` → `CompositeApp` | Frameless, transparente, always-on-top, shrink-wrap en racing |
| **Hub** | `/#/hub` → `HubApp` | Con marco, 1280×800, fondo sólido, CRUD perfiles |

Routing: hash router en [`frontend/src/main.tsx`](../../vantare-v2/frontend/src/main.tsx).

---

## Paquetes Go principales

```
vantare-v2/
├── cmd/vantare/           # Entrada Wails, flags, event handlers hub:*
├── cmd/lmu-debug/         # CLI debug telemetría (mock / live)
├── internal/app/          # App lifecycle, TelemetryBridge, ProfileService, HubService
├── internal/telemetry/
│   ├── lmu/               # Reader mmap + parser por offsets
│   ├── normalizer/        # Bytes → snapshot
│   ├── pipeline/          # Filtro deadband
│   ├── diff/              # Payload diff para JS
│   └── service/           # Subscribe @ 30 Hz
├── internal/window/       # Manager: bounds, racing/edit, click-through
├── pkg/config/            # ProfileConfig, load/save JSON
└── pkg/models/            # Tipos telemetría unificados
```

---

## Frontend

```
frontend/src/
├── main.tsx               # Router hash: hub vs overlay
├── index.css              # Tokens v5 (vantare-*, glass-panel, etc.)
├── overlay/
│   ├── CompositeApp.tsx   # Shell overlay + modos
│   ├── WidgetHost.tsx     # Posiciona widgets según perfil
│   └── widgets/           # Delta, Relative, Standings
├── hub/
│   ├── HubApp.tsx         # Shell hub + secciones
│   ├── pages/             # DashboardPage, ProfilesPage
│   └── components/        # Hero, chart, ratings, etc.
└── lib/
    ├── telemetry-ref.ts   # Ref mutable (no React state 60 Hz)
    └── profile.ts         # Helpers perfil en overlay
```

---

## Modos de display (perfil)

| Modo | Ventana | Input | Uso |
|------|---------|-------|-----|
| `racing` | Shrink-wrap al bbox de widgets | Click-through | En pista |
| `edit` | Fullscreen monitor | Drag widgets, guardar layout | Configurar posiciones |
| `streaming` | (Fase 6) Sin ventana overlay | OBS only | Stream |

---

## Frecuencias (no negociables)

| Etapa | Hz |
|-------|-----|
| Lectura mmap | 60 |
| Parse + normalize | 60 (p99 &lt; 2 ms) |
| Broadcast a UI | ≤ 30 |
| Widget standings/relative | 15 (configurable por widget) |
| Widget delta | 30 |

---

## Servicios registrados en Wails

- **ProfileService** — Load, SaveLayout, SetDisplayMode, EmitLoaded
- **HubService** — ListProfiles, CreateProfile, DeleteProfile, ActivateProfile

Eventos custom vía `wailsApp.Event` (ver [09-EVENTOS-IPC.md](./09-EVENTOS-IPC.md)).

---

## Flags CLI (`cmd/vantare`)

| Flag | Efecto |
|------|--------|
| `-live` | Telemetría LMU real (requiere sim en pista) |
| `-profile path` | JSON inicial (default `configs/example-racing.json`) |
| `-edit` | Fuerza modo edit aunque el perfil diga racing |
