# 04 — Estado actual del proyecto

> **Fecha de corte:** 2026-06-15
> Verificar siempre con `go test ./...` y git status antes de confiar en este doc.

---

## Fases v2 completadas

| Fase | Nombre | Estado | Notas |
|------|--------|--------|-------|
| 0 | Entorno | ✅ | Go, scaffold, mmap Windows |
| 1 | LMU reader + parser | 🟡 Casi | Live validado; offsets codegen OK; ampliar parser si hace falta |
| 2 | Pipeline telemetría | ✅ | Normalizer, deadband, 30 Hz, diff |
| 3 | Wails overlay mínimo | ✅ | Ventana transparente, bridge telemetría |
| 4 | Layout + modos | ✅ | JSON perfil, racing/edit, 3 widgets, SaveLayout |
| 5 | Hub React | ✅ | Dashboard v5 + CRUD perfiles + segunda ventana |
| 6 | OBS / SSE | ✅ técnico | HTTP localhost, `/overlay`, `/api/profile`, SSE; pendiente validación visual OBS real |
| 7 | Optimización UI | ✅ técnico | FPS por widget: delta 30 Hz, relative/standings 15 Hz, DOM idempotente; pendiente medición FPS/CPU real |
| 8 | Temas | ✅ técnico | Tokens v5 exportados a JSON, CSS variables runtime, Lite mode toggle; pendiente comparación visual pixel-perfect |
| 9 | Ops + multi-sim | ✅ técnico | Ops panel 1 Hz con RAM/goroutines + metadata de fuente; CPU queda N/D; iRacing/AC quedan como foundation, no adapters completos |

**Siguiente fase recomendada:** preparación de alpha `v0.1.0-alpha.1` y cierre del único hueco funcional principal: Delta live (`deltaBest`) real.

---

## Cierre técnico MVP

Estado: MVP técnico validado manualmente, con pendientes externos documentados.

## Alpha 0.1

Estado: candidata a `v0.1.0-alpha.1`.

Validado manualmente por Isaac:

- Hub abre solo.
- Preview Workbench usable.
- Overlay desktop abre bajo demanda.
- Overlay desktop fullscreen transparente y click-through.
- Rendimiento percibido correcto.
- LMU live funciona.
- Relative y Standings muestran datos reales.
- Diseño visual inicial de widgets cargado.

Limitación principal de alpha:

- `Delta` todavía no está conectado a un `deltaBest` live fiable. No falsificar este dato.

Pendiente antes de post-MVP:

- Validar OBS real o dejar constancia explícita de que solo HTTP/SSE fue validado.
- Registrar medición manual F7/F8 si DevTools está disponible.
- Confirmar Ops panel en Hub (validado mediante emisión de eventos; UI visual pendiente de confirmación directa).
- Mantener F6-F9 como `✅ técnico` hasta validación completa de experiencia.

Evidencia:

- `.omo/evidence/v2-mvp-closeout.txt`
- `.omo/evidence/v2-mvp-manual-checklist.md`

---

## Qué funciona hoy

### Overlay (`/`)

- Perfil JSON carga widgets delta, relative, standings, telemetry y pedals según el perfil.
- Modo **racing desktop**: ventana fullscreen transparente, click-through y always-on-top.
- La edición ya no se hace en la ventana desktop; se hace en Preview dentro del Hub.
- Modo **streaming**: OBS usa Browser Source HTTP; no requiere ventana desktop.
- Telemetría mock por defecto; `-live` con LMU en pista.

### Hub (`/#/hub`)

- **Dashboard**: hero, banner evento, ratings, gráfico iRating (canvas), carreras recientes, sidebar Pro — datos mayormente **mock** (OK para MVP F5).
- **Overlays (perfiles)**: listar, crear, seleccionar y abrir en Preview.
- **Preview Workbench**: selector de perfil, canvas real, lista de widgets, inspector, guardar, iniciar/detener overlay.
- **Ops**: RAM, goroutines y fuente de telemetría a baja frecuencia.
- Diseño portado desde `hub_main_v5.html` (tokens en `frontend/src/index.css`).

### Perfiles

- Ejemplo: `configs/example-racing.json` — id `default-racing`, archivo `example-racing.json`.
- Ejemplo OBS: `configs/example-streaming.json` — id `default-streaming`, archivo `example-streaming.json`.
- Activar desde hub emite `profile:loaded` al overlay.

### OBS / HTTP (Fase 6)

- Servidor embebido por defecto: `http://127.0.0.1:39261`.
- Healthcheck: `GET /health`.
- Overlay OBS: `GET /overlay?profile=example-streaming.json`.
- Perfil OBS: `GET /api/profile?profile=example-streaming.json` o por id JSON (`default-streaming`).
- Telemetría SSE: `GET /telemetry/stream`.
- Assets Vite (`/assets/...`) servidos desde `frontend/dist`.

---

## Fixes post code-review Fase 5 (aplicados)

Estos bugs se encontraron en review y **deben estar corregidos** en el código local:

1. **ID ≠ filename** — `ActivateProfile`/`DeleteProfile` resuelven por `file` o `id` JSON (`findProfilePath`).
2. **Save path tras activar** — `LoadActiveProfile(path)` actualiza destino de `SaveLayout`.
3. **Errores al hub** — evento `hub:error` + UI en ProfilesPage.
4. **Path traversal** — rechazo de `..` en IDs.
5. **Create duplicado** — error si el perfil ya existe.
6. **RatingChart** — `ResizeObserver` para redimensionar canvas.
7. **Delete** — confirmación antes de eliminar.
8. **Activate success** — evento `hub:profile-activated`.

Tests añadidos: `hub_service_test.go` (activate by id, save path, traversal, duplicate).

---

### Preview Workbench

Estado: implementado como flujo principal de edición/control de perfiles. El diseño visual inicial por widget ya se ha empezado a portar desde HTML/mockups externos.

## Pendiente / deuda conocida

| Item | Fase | Prioridad |
|------|------|-----------|
| Hero hub con telemetría live | 5+ | Media |
| Rename perfil desde UI | 5+ | Baja |
| Páginas Telemetría / Setup (nav stub) | 5+ | Media |
| Validación visual en OBS real | 6 | Alta |
| Delta live real (`deltaBest`) | alpha | Alta |
| FPS por widget con medición formal | 7 | Media |
| Temas runtime + Lite mode con comparación visual formal | 8 | Media |
| iRacing / AC adapters | 9 | Media |
| Auth Supabase / freemium | post-MVP | Baja |
| Mover `hub_main_v5.html` → `docs/reference/` | docs | Baja |

---

## Evidencia y miniplanes

| Fase | Miniplan | Evidencia |
|------|----------|-----------|
| F4 | `docs/superpowers/plans/2026-06-11-v2-f4-composite-layout.md` | tests + manual |
| F5 | `docs/superpowers/plans/2026-06-11-v2-f5-hub-dashboard.md` | `.omo/evidence/v2-f5-hub.txt` |
| F6 | `.omo/plans/v2-f6-obs-sse.md` | `.omo/evidence/v2-f6-obs-sse.txt` |
| F4 closeout | `docs/superpowers/plans/2026-06-11-v2-f4-closeout.md` | — |

---

## Git / ramas

- Trabajo habitual en **`master`** (Isaac prefiere flujo simple).
- Commit F4 closeout referenciado: `f59074b` (puede haber cambios F5 sin commit).
- **Antes de continuar:** `git status` — F5 + review fixes pueden estar sin commitear.

---

## Criterio “fase cerrada”

- [ ] Checklist del miniplan completa
- [ ] `go test ./...` verde desde `vantare-v2/`
- [ ] `pnpm --dir frontend test` + `build` verde
- [ ] Manual mínimo documentado (flags, screenshots si UI)
- [ ] `V2-MASTER-PLAN.md` actualizado
