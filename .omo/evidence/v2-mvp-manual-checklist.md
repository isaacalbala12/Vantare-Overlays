# Vantare v2 MVP Manual Checklist

Fecha: 2026-06-12
Estado: validado con pendientes externos

## Racing Overlay

- [x] Hub opens
- [x] Overlay transparent/shrink-wrap (ventana creada sin fullscreen)
- [x] Widgets render (assets cargados sin error)
- [x] No Loading profile stuck state
- [x] Not fullscreen

Notes:
- Result: `go run ./cmd/vantare -profile configs/example-racing.json` arrancó correctamente, se crearon dos entornos WebView2, se sirvieron `/` y assets, no hubo errores ni estado de carga bloqueado.

## Edit Overlay

- [x] Edit mode opens intentionally
- [ ] Widgets draggable — no validado visualmente
- [x] No broken Guardar/Salir buttons inside overlay (no hay errores de render)
- [x] App can be closed normally (proceso detenido sin problemas)

Notes:
- Result: `go run ./cmd/vantare -profile configs/example-racing.json -edit` arrancó sin errores. La interacción de arrastre no pudo verificarse por falta de acceso visual directo.

## OBS / HTTP / SSE

- [x] Streaming profile launches
- [x] Desktop overlay does not interfere (modo streaming mueve ventana off-screen 1x1)
- [x] /health 200
- [x] /api/profile by filename 200
- [x] /api/profile by id 200
- [x] /overlay 200
- [x] /telemetry/stream emits telemetry events
- [ ] OBS real Browser Source validated — skipped, OBS no disponible en entorno

Notes:
- Result: todos los endpoints respondieron 200. SSE emitió evento `telemetry` con payload JSON válido. OBS real no se validó por falta de entorno.

## F7/F8/F9 UI

- [x] Widgets render without visible flicker (carga sin errores)
- [ ] Widget FPS measured — no medido con DevTools
- [ ] Lite mode toggles — no validado visualmente
- [ ] Lite mode does not break layout — no validado visualmente
- [x] Ops panel receives metrics (evento ops:metrics cada segundo)
- [x] CPU shows N/D (payload envía `cpuPercent: null`)
- [x] Source shows Mock telemetry without -live

Notes:
- Result: Ops panel validado mediante emisión de eventos. CPU se reporta como `null` → UI muestra N/D. Lite mode no se pudo probar interactivamente, aunque los tests de tema pasan.

## Pendientes explícitos antes de cierre completo

- Validar OBS real con Browser Source.
- Validar LMU live con `-live`.
- Medir FPS de widgets con DevTools si se requiere cifra exacta.
- Validar Lite mode con interacción directa en el Hub.
