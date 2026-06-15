# 11 — Comandos y verificación

Todo desde PowerShell salvo indicación contraria.

---

## Requisitos

- Go 1.25+ (Wails v3)
- Node 20+
- pnpm
- Windows 10/11 (LMU mmap)

---

## Setup inicial (vantare-v2)

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Frontend deps (primera vez)
pnpm --dir frontend install

# Build frontend (requerido antes de go run vantare)
pnpm --dir frontend build
```

---

## Tests — obligatorios antes de cerrar fase

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Go (todas las suites)
go test ./...

# Frontend
pnpm --dir frontend test

# Typecheck + producción bundle
pnpm --dir frontend build
```

En PowerShell usar `;` en lugar de `&&` si encadenas:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2; go test ./...
```

---

## Ejecutar aplicación

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Overlay mock + Hub window
go run ./cmd/vantare

# LMU live
go run ./cmd/vantare -live

# Perfil específico
go run ./cmd/vantare -profile configs/example-racing.json

# Modo edición layout
go run ./cmd/vantare -profile configs/example-racing.json -edit

# Live + edit
go run ./cmd/vantare -live -profile configs/example-edit.json -edit

# OBS / streaming (Fase 6)
go run ./cmd/vantare -profile configs/example-streaming.json

# OBS / streaming en otro puerto
go run ./cmd/vantare -profile configs/example-streaming.json -http 127.0.0.1:4000
```

Abre **solo el Hub** 1280×800. El overlay transparente se crea al pulsar `Iniciar`.

Hub URL interna: `/#/hub`

---

## OBS / HTTP / SSE (Fase 6)

Con la app corriendo:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Healthcheck del servidor embebido
Invoke-WebRequest http://127.0.0.1:39261/health

# Perfil usado por OBS
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"

# También funciona por id JSON
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=default-streaming"

# Stream de telemetría SSE
curl.exe -N http://127.0.0.1:39261/telemetry/stream
```

OBS Browser Source:

```text
URL: http://127.0.0.1:39261/overlay?profile=example-streaming.json
Width: 1920
Height: 1080
Shutdown source when not visible: enabled
Refresh browser when scene becomes active: enabled
```

En modo `displayMode: "streaming"` no se crea ventana overlay desktop; OBS muestra el overlay vía HTTP.

---

## Verificación Fase 7 — FPS por widget

Objetivo: confirmar que los widgets respetan su `updateHz` y no reescriben DOM si los valores no cambian.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Racing overlay con mock data
go run ./cmd/vantare -profile configs/example-racing.json

# OBS / streaming overlay
go run ./cmd/vantare -profile configs/example-streaming.json
```

Checklist manual:

- [ ] El overlay racing carga sin quedarse en `Loading profile...`.
- [ ] Los tres widgets (`Delta`, `Relative`, `Standings`) se renderizan.
- [ ] El overlay OBS responde en `http://127.0.0.1:39261/overlay?profile=example-streaming.json`.
- [ ] Los widgets no parpadean ni se sienten más lentos que antes.

Con DevTools (Chrome/Electron/OBS Browser Source):

- [ ] En Performance > Record, `DeltaWidget` ejecuta su callback de pintura como máximo a 30 Hz.
- [ ] `RelativeWidget` y `StandingsWidget` ejecutan su callback de pintura como máximo a 15 Hz.
- [ ] Si la telemetría está quieta, `innerHTML`/`textContent`/`className` no cambian entre frames.

Nota: los valores por defecto son `delta: 30 Hz`, `relative: 15 Hz`, `standings: 15 Hz`. El techo global sigue siendo la emisión Go a ≤ 30 Hz.

---

## Verificación Fase 8 — Temas runtime y Lite mode

Objetivo: confirmar que los tokens v5 se aplican como variables CSS y que Lite mode reduce efectos caros sin romper layout.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-racing.json
```

Checklist manual:

- [ ] El Hub abre con diseño v5 (fondo oscuro, tipografías, glass topbar).
- [ ] En DevTools, `<html>` tiene `data-theme="vantare-v5"` y las variables `--v-*` están definidas.
- [ ] El botón "Lite OFF" en la topbar cambia a "Lite ON" al hacer clic.
- [ ] Con Lite ON, `<html>` pasa a `data-theme="vantare-lite"` y `data-visual-mode="lite"`.
- [ ] En Lite mode, el blur del topbar desaparece (`backdrop-filter: none`) y las sombras/transiciones se desactivan.
- [ ] El layout no se rompe al cambiar entre full y lite.
- [ ] Overlay racing sigue transparente y los widgets renderizan.
- [ ] OBS `/overlay?profile=example-streaming.json` sigue sirviendo assets.
- [ ] `localStorage.getItem("vantare.theme")` persiste como `vantare-v5` o `vantare-lite`.

Nota: Lite mode no rediseña; solo reduce blur, sombras y motion. `hub_main_v5.html` sigue siendo la referencia visual.

---

## Debug telemetría (sin Wails)

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

go run ./cmd/lmu-debug -mock -once
go run ./cmd/lmu-debug -once          # live
go run ./cmd/lmu-debug -hz 10         # stream 10 Hz
```

---

## Tests focalizados

```powershell
# Solo hub/profile
go test ./internal/app/... -v

# Solo LMU
go test ./internal/telemetry/lmu/... -v

# Un test
go test ./internal/app/... -run TestHubServiceActivateByIDWhenFilenameDiffers -v
```

---

## Benchmarks (Fase 2+)

```powershell
go test ./internal/telemetry/... -bench=. -benchmem
```

Objetivo parse: p99 &lt; 2 ms (ver V2-STACK-AND-PERFORMANCE).

---

## Abrir referencia diseño

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
start hub_main_v5.html
```

---

## v1 Electron (legado — no confundir con v2)

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
pnpm install
pnpm dev
```

---

## Checklist pre-commit (cuando Isaac pida commit)

- [ ] `go test ./...` verde
- [ ] `pnpm --dir frontend test` verde
- [ ] `pnpm --dir frontend build` verde
- [ ] Sin secretos (.env) en staging
- [ ] Docs fase actualizados si cambió comportamiento

---

## Verificación alpha 0.1

Antes de crear tag `v0.1.0-alpha.1`:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Smoke mock:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Checklist:

- [ ] Hub abre solo.
- [ ] Preview Workbench permite seleccionar perfil.
- [ ] Guardar confirma solo tras `layout:saved`.
- [ ] `Iniciar` abre overlay fullscreen transparente.
- [ ] `Detener` cierra overlay y deja Hub vivo.
- [ ] Activar/desactivar widget en Preview se refleja en runtime.

Smoke LMU live:

```powershell
go run ./cmd/lmu-debug -once
go run ./cmd/vantare -live -profile configs/example-racing.json
```

Checklist:

- [ ] `lmu-debug` muestra pista/speed/rpm reales.
- [ ] Hub Ops muestra fuente `Le Mans Ultimate`.
- [ ] Relative muestra pilotos reales.
- [ ] Standings muestra clasificación real.
- [ ] Delta puede seguir en `—`; `deltaBest` live es limitación conocida de alpha.

OBS técnico:

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
curl.exe -N --max-time 5 http://127.0.0.1:39261/telemetry/stream
```

Esperado:

- `/health` devuelve `{"ok":true}`.
- `/api/profile` devuelve JSON de perfil.
- SSE emite `event: telemetry`.

---

## Troubleshooting rápido

| Problema | Solución |
|----------|----------|
| `frontend/dist not found` | `pnpm --dir frontend build` |
| OBS queda en blanco | Verificar que `/assets/...` responde 200 y que la URL sea `/overlay?profile=example-streaming.json` |
| `/api/profile` devuelve 404 | Usar filename (`example-streaming.json`) o id JSON (`default-streaming`) |
| Hub sin perfiles | Verificar `configs/` existe; log warning configsDir |
| Activate perfil falla | Usar `file` del listado; ver 08-PERFILES |
| Live sin datos | LMU en pista, no solo menú |
| PowerShell `&&` error | Usar `;` entre comandos |

---

## Verificación Preview Workbench

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Checklist:

- [ ] Hub abre solo.
- [ ] Overlays muestra perfiles y botón Preview.
- [ ] Preview muestra selector de perfiles.
- [ ] Elegir `Default Racing` carga canvas, lista de widgets e inspector.
- [ ] Desactivar `standings`, guardar, iniciar.
- [ ] Runtime no muestra `standings`.
- [ ] Detener, reactivar `standings`, guardar, iniciar.
- [ ] Runtime vuelve a mostrar `standings`.
- [ ] Con overlay iniciado, Preview bloquea edición.
- [ ] LMU live: `go run ./cmd/vantare -live -profile configs/example-racing.json` muestra datos reales en Relative/Standings.

---

## Verificación Fase 9 — Ops + multi-sim foundation

Objetivo: confirmar que el Hub recibe métricas de app a baja frecuencia y que la fuente de telemetría expone metadata sin romper LMU/mock.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-racing.json
```

Checklist manual:

- [ ] El Hub muestra panel `Ops`.
- [ ] El panel pasa de `Esperando métricas` a valores reales.
- [ ] RAM app aparece en MB.
- [ ] Goroutines aparece como número entero.
- [ ] Fuente muestra `Mock telemetry` sin `-live`.
- [ ] Con `-live`, si LMU está disponible, fuente muestra `Le Mans Ultimate`.
- [ ] Las métricas no actualizan a 30/60 Hz; deben sentirse como 1 Hz.
- [ ] Overlay racing sigue cargando widgets.

---

## Verificación cierre MVP técnico

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-racing.json
go run ./cmd/vantare -profile configs/example-streaming.json
```

Checklist manual:

- [ ] Racing overlay carga widgets y no queda en `Loading profile...`.
- [ ] Racing overlay no queda fullscreen.
- [ ] Edit mode abre intencionalmente.
- [ ] No hay botones rotos `Guardar`/`Salir` dentro del overlay.
- [ ] HTTP responde `/health`, `/api/profile`, `/overlay`.
- [ ] SSE `/telemetry/stream` emite eventos `telemetry`.
- [ ] Lite mode cambia `data-theme` a `vantare-lite` sin romper layout.
- [ ] Ops panel pasa de `Esperando métricas` a valores reales.
- [ ] CPU en Ops panel aparece como `N/D`.
- [ ] Fuente sin `-live` muestra `Mock telemetry`.

Evidencia:

- `.omo/evidence/v2-mvp-closeout.txt`
- `.omo/evidence/v2-mvp-manual-checklist.md`
