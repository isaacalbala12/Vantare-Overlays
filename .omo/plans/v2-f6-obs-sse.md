# OBS / SSE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Fase 6: an embedded localhost HTTP server that serves the overlay to OBS and streams telemetry through SSE, with `displayMode: "streaming"` avoiding the desktop overlay window.

**Architecture:** Reuse the existing Go telemetry pipeline (`internal/telemetry/service.Service`) and its `Subscribe()` API. Add a focused `internal/server` package for HTTP routes, profile loading, static assets, and SSE. Keep Wails events for the desktop overlay; SSE is an additional transport, not a replacement.

**Tech Stack:** Go `net/http`, Server-Sent Events, Wails v3, React 19, Vite, existing Vantare profile JSON.

---

## Contexto para Isaac

Fase 6 permite usar Vantare dentro de OBS como una **Browser Source**. OBS abrirá una URL local, por ejemplo `http://127.0.0.1:39261/overlay?profile=example-racing.json`, y recibirá la misma telemetría que hoy recibe la ventana Wails.

Importante: SSE significa **Server-Sent Events**. Es una conexión HTTP simple donde Go va enviando actualizaciones al navegador/OBS. Aquí encaja mejor que WebSocket porque OBS solo necesita leer datos, no mandar órdenes de vuelta.

## Alcance

- [ ] In scope: servidor HTTP localhost embebido en Go.
- [ ] In scope: `GET /health` para comprobar que el servidor vive.
- [ ] In scope: `GET /telemetry/stream` con `text/event-stream` y payload compatible con `telemetry-ref.ts`.
- [ ] In scope: `GET /overlay?profile=<file-or-id>` sirviendo la app frontend con modo OBS.
- [ ] In scope: `GET /api/profile?profile=<file-or-id>` devolviendo perfil + `layoutOrigin`.
- [ ] In scope: perfil `displayMode: "streaming"` sin ventana overlay desktop visible.
- [ ] In scope: tests Go del servidor y tests frontend del transporte SSE/profile.
- [ ] Out of scope: WebSocket.
- [ ] Out of scope: UI bonita nueva para el hub.
- [ ] Out of scope: editor de perfiles desde OBS.
- [ ] Out of scope: optimización por `updateHz` por widget, reservada para Fase 7.
- [ ] Out of scope: multi-sim/iRacing/AC.

## Archivos Tocables

- Create: `vantare-v2/internal/server/server.go` — construcción del servidor HTTP.
- Create: `vantare-v2/internal/server/sse.go` — handler SSE y serialización de eventos.
- Create: `vantare-v2/internal/server/profile.go` — resolución segura de perfiles para OBS.
- Create: `vantare-v2/internal/server/server_test.go` — `/health`, `/overlay`, `/api/profile`.
- Create: `vantare-v2/internal/server/sse_test.go` — stream SSE con una fuente de telemetría controlada.
- Modify: `vantare-v2/cmd/vantare/main.go` — arrancar/parar servidor y exponer URL en logs.
- Modify: `vantare-v2/internal/window/manager.go` — tratar `ModeStreaming` como modo sin ventana interactiva.
- Modify: `vantare-v2/internal/window/manager_test.go` — cubrir que streaming no aplica shrink-wrap normal.
- Modify: `vantare-v2/internal/app/profile_service.go` — emitir `layoutOrigin` correcto para streaming si hace falta.
- Modify: `vantare-v2/frontend/src/main.tsx` — routear `/obs` o query `?obs=1` hacia overlay OBS.
- Create: `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx` — carga perfil por HTTP y telemetría por EventSource.
- Modify: `vantare-v2/frontend/src/overlay/CompositeApp.tsx` — extraer renderer compartido si reduce duplicación.
- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.ts` — confirmar compatibilidad con string JSON de SSE.
- Create: `vantare-v2/configs/example-streaming.json` — perfil ejemplo OBS-only.
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md` — solo al cerrar F6.
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md` — solo al cerrar F6.
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` — añadir comandos manuales OBS/HTTP.

## Decisiones Técnicas

- Puerto por defecto: `39261`, configurable con flag `-http :39261`.
- Bind: `127.0.0.1` solamente, no `0.0.0.0`, para no exponer telemetría en la red local.
- Endpoints:
  - `GET /health` → `{"ok":true}`
  - `GET /overlay?profile=example-racing.json` → sirve `index.html`; frontend entra en modo OBS.
  - `GET /api/profile?profile=example-racing.json` → perfil JSON + `layoutOrigin`.
  - `GET /telemetry/stream` → SSE con evento `telemetry`.
- Payload SSE: mismo shape que `app.UpdateWire`:

```json
{
  "seq": 1,
  "snapshot": {
    "connected": true,
    "player": {
      "speed": 54,
      "gear": 4,
      "engineRPM": 7200
    }
  },
  "diff": {
    "t": 1234567890,
    "d": {
      "player": {
        "speed": 54
      }
    }
  }
}
```

## Tareas

### Task 1: Servidor HTTP mínimo

**Files:**
- Create: `vantare-v2/internal/server/server.go`
- Create: `vantare-v2/internal/server/server_test.go`

- [ ] Step 1: Escribir test de `/health`.

```go
func TestHealth(t *testing.T) {
	srv := New(ServerConfig{})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()

	srv.Handler().ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.JSONEq(t, `{"ok":true}`, rr.Body.String())
}
```

- [ ] Step 2: Ejecutar test y verificar que falla porque `internal/server` todavía no existe.

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/server/... -run TestHealth -v
```

Expected: FAIL por paquete o símbolo inexistente.

- [ ] Step 3: Implementar `Server`, `ServerConfig`, `Handler()` y ruta `/health`.
- [ ] Step 4: Reejecutar el test hasta PASS.
- [ ] Step 5: Añadir test para método no permitido o ruta inexistente si el mux devuelve comportamiento inesperado.

### Task 2: Endpoint SSE reutilizando telemetry.Service

**Files:**
- Create: `vantare-v2/internal/server/sse.go`
- Create: `vantare-v2/internal/server/sse_test.go`
- Modify: `vantare-v2/internal/server/server.go`

- [ ] Step 1: Escribir test que conecte a `/telemetry/stream` y lea al menos un evento `telemetry`.
- [ ] Step 2: Usar una fuente mock de telemetría o un `service.Service` real con `service.FuncSource`.
- [ ] Step 3: Implementar headers SSE:

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

- [ ] Step 4: Serializar cada update como:

```text
event: telemetry
data: {"seq":1,"snapshot":{...},"diff":{...}}

```

- [ ] Step 5: Cancelar correctamente al cerrar `request.Context()` y llamar `unsubscribe()`.
- [ ] Step 6: Reejecutar:

```powershell
go test ./internal/server/... -run TestTelemetryStream -v
```

Expected: PASS.

### Task 3: Perfil OBS por HTTP

**Files:**
- Create: `vantare-v2/internal/server/profile.go`
- Modify: `vantare-v2/internal/server/server.go`
- Modify: `vantare-v2/internal/server/server_test.go`

- [ ] Step 1: Escribir tests de `GET /api/profile?profile=example-racing.json`.
- [ ] Step 2: Cubrir seguridad: rechazar `../secret.json`, rutas absolutas y perfil inexistente.
- [ ] Step 3: Reutilizar la lógica conceptual de `HubService.findProfilePath`: preferir `file`, permitir `id` interno, resolver dentro de `configs/`.
- [ ] Step 4: Responder:

```json
{
  "profile": {
    "id": "default-racing",
    "displayMode": "racing",
    "widgets": []
  },
  "layoutOrigin": {
    "x": 32,
    "y": 32
  }
}
```

- [ ] Step 5: Verificar:

```powershell
go test ./internal/server/... -run "TestProfile|TestReject" -v
```

Expected: PASS.

### Task 4: Servir overlay estático para OBS

**Files:**
- Modify: `vantare-v2/internal/server/server.go`
- Modify: `vantare-v2/internal/server/server_test.go`
- Modify: `vantare-v2/frontend/src/main.tsx`

- [ ] Step 1: Añadir test de `GET /overlay?profile=example-racing.json` que devuelve HTML.
- [ ] Step 2: Servir `index.html` desde el mismo `frontend/dist` usado por Wails.
- [ ] Step 3: En `main.tsx`, detectar ruta OBS:

```ts
const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);
const isObs = path.startsWith("/overlay") || params.get("obs") === "1";
```

- [ ] Step 4: Renderizar `ObsOverlayApp` si `isObs` es true.
- [ ] Step 5: Mantener `/#/hub` y `/` Wails sin regresiones.

### Task 5: Frontend OBS overlay

**Files:**
- Create: `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx`
- Modify: `vantare-v2/frontend/src/overlay/CompositeApp.tsx`
- Modify: `vantare-v2/frontend/src/lib/telemetry-ref.ts`
- Add tests only if existing frontend test setup supports component tests cleanly.

- [ ] Step 1: Extraer el render puro de widgets si evita duplicación:

```tsx
type OverlayRendererProps = {
  widgets: WidgetConfig[];
  layoutOrigin: LayoutOrigin;
  editMode: boolean;
  onDragEnd?: (id: string, newPos: Rect) => void;
};
```

- [ ] Step 2: En `ObsOverlayApp`, leer `profile` de la query string.
- [ ] Step 3: Fetch a `/api/profile?profile=<value>`.
- [ ] Step 4: Crear `new EventSource("/telemetry/stream")`.
- [ ] Step 5: En `message` o evento `telemetry`, llamar:

```ts
applyTelemetryUpdate(parseTelemetryPayload(event.data));
```

- [ ] Step 6: Cerrar EventSource en cleanup.
- [ ] Step 7: No usar drag/save ni eventos Wails en modo OBS.

### Task 6: Integración en `cmd/vantare`

**Files:**
- Modify: `vantare-v2/cmd/vantare/main.go`
- Modify: `vantare-v2/internal/window/manager.go`
- Modify: `vantare-v2/internal/window/manager_test.go`

- [ ] Step 1: Añadir flag:

```go
httpAddr := flag.String("http", "127.0.0.1:39261", "HTTP/SSE address for OBS Browser Source")
```

- [ ] Step 2: Crear servidor después de inicializar `vapp.Telemetry`, `distFS` y `cfgDir`.
- [ ] Step 3: Arrancarlo con `ListenAndServe` en goroutine y cerrarlo con `Shutdown(ctx)` al salir.
- [ ] Step 4: Loguear URL:

```text
OBS overlay: http://127.0.0.1:39261/overlay?profile=example-racing.json
```

- [ ] Step 5: Para `displayMode: "streaming"`, evitar que la ventana overlay desktop quede visible/interactiva. La solución aceptable para F6 es ocultar/minimizar la ventana overlay si Wails v3 lo permite; si no, aplicar bounds mínimos fuera de pantalla y documentar el workaround.
- [ ] Step 6: Añadir tests de `window.Manager.ApplyProfile` para `ModeStreaming`.

### Task 7: Perfil ejemplo y documentación

**Files:**
- Create: `vantare-v2/configs/example-streaming.json`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md`

- [ ] Step 1: Crear `example-streaming.json` con los mismos widgets base y `displayMode: "streaming"`.
- [ ] Step 2: Añadir comandos manuales:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-streaming.json
Invoke-WebRequest http://127.0.0.1:39261/health
```

- [ ] Step 3: Añadir instrucción OBS:

```text
Browser Source URL: http://127.0.0.1:39261/overlay?profile=example-streaming.json
Width: 1920
Height: 1080
Shutdown source when not visible: enabled
Refresh browser when scene becomes active: enabled
```

- [ ] Step 4: No marcar F6 como ✅ hasta que todos los comandos de verificación pasen.

## Criterios de Aceptación

- [ ] `GET /health` responde `200` con `{"ok":true}`.
- [ ] `GET /telemetry/stream` mantiene una conexión SSE y emite payloads compatibles con `telemetry-ref.ts`.
- [ ] `GET /overlay?profile=example-streaming.json` sirve la app frontend.
- [ ] `GET /api/profile?profile=example-streaming.json` devuelve perfil y `layoutOrigin`.
- [ ] `profile=../...` y rutas absolutas se rechazan.
- [ ] Un perfil con `displayMode: "streaming"` no deja una ventana overlay desktop normal encima del sim.
- [ ] El hub sigue abriendo en `/#/hub`.
- [ ] El overlay Wails normal sigue funcionando en `racing` y `edit`.
- [ ] No se toca `apps/desktop/`.

## Comandos de Verificación

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Verificación manual HTTP:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-streaming.json
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
```

Verificación manual SSE:

```powershell
curl.exe -N http://127.0.0.1:39261/telemetry/stream
```

Expected: aparecen bloques `event: telemetry` y `data: ...`.

Verificación OBS:

```text
OBS > Sources > Browser
URL: http://127.0.0.1:39261/overlay?profile=example-streaming.json
Width: 1920
Height: 1080
```

Expected: se ven los widgets del perfil y cambian con telemetría mock o live.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Wails obliga a crear la ventana overlay aunque el perfil sea streaming | Para F6, ocultar/minimizar si API disponible; si no, bounds mínimos fuera de pantalla y documentarlo. Fase posterior puede crear ventanas condicionalmente más limpio. |
| El frontend importa `@wailsio/runtime` y falla fuera de Wails | `ObsOverlayApp` no debe importar runtime Wails. Si se extrae renderer compartido, mantener los imports Wails solo en `CompositeApp`. |
| SSE filtra datos fuera del PC | Bind fijo a `127.0.0.1` por defecto. No usar `0.0.0.0`. |
| `id` de perfil difiere del filename | Resolver por filename o `id` interno, igual que HubService. |
| Tests SSE quedan inestables | Usar contexto con timeout corto y una fuente mock deterministicamente actualizable. |

## Evidencia al Cerrar

- Guardar resumen en `.omo/evidence/v2-f6-obs-sse.txt`.
- Incluir output resumido de:
  - `go test ./...`
  - `pnpm --dir frontend test`
  - `pnpm --dir frontend build`
  - `/health`
  - `/api/profile`
  - una muestra de `curl.exe -N /telemetry/stream`
- Si se valida en OBS, anotar URL usada y resolución.

## Prompt Para Ejecutor Externo

```text
Trabaja en C:\Users\isaac\Desktop\Vantare-Overlays.

Código activo: vantare-v2/ solamente. No tocar apps/desktop/ porque es v1 legado Electron.

Implementa Fase 6 OBS/SSE siguiendo este miniplan:
.omo/plans/v2-f6-obs-sse.md

Reglas:
- No improvisar diseño hub.
- No reemplazar el pipeline de telemetría existente.
- SSE debe reutilizar internal/telemetry/service.Service.Subscribe().
- Bind HTTP por defecto a 127.0.0.1:39261.
- Rechazar path traversal en profile query.
- Mantener Wails overlay racing/edit funcionando.
- Perfil streaming debe evitar ventana overlay desktop normal.

Comandos obligatorios al final:
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build

También verifica manualmente:
go run ./cmd/vantare -profile configs/example-streaming.json
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
curl.exe -N http://127.0.0.1:39261/telemetry/stream

Entrega:
- Lista de archivos modificados.
- Resultado de comandos.
- Cualquier limitación de Wails para ocultar ventana streaming.
```
