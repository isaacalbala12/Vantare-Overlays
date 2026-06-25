# Vantare Suite Architecture

Vantare es una suite local de apps para sim racing. La app actual ya no debe tratarse solo como "Vantare Overlays"; el producto visible debe entenderse como un Hub con modulos internos.

## Modulos actuales

### Overlays Studio

Responsabilidad:

- crear, editar y probar overlays;
- gestionar perfiles, recomendados y layouts;
- renderizar widgets en overlay desktop y OBS;
- configurar widgets visuales como `relative`, `standings`, `pedals` y futuros data blocks.

Reglas:

- `WidgetStudio` edita apariencia, columnas, filtros, formatos y comportamiento interno.
- `LayoutStudio` edita posicion y tamano.
- No debe contener logica de ingeniero/spotter salvo el widget visual que muestra notificaciones.

### Ingeniero

Responsabilidad:

- ejecutar el core determinista de ingeniero/spotter;
- consumir simulator/replay ahora y LMU live cuando EN6 este implementado;
- emitir notificaciones de carrera como eventos de producto;
- alimentar el Hub, overlay desktop y OBS con esas notificaciones.

Reglas:

- El core vive en Go bajo `internal/engineer`.
- La UI vive en `frontend/src/hub/pages/EngineerPage.tsx` y helpers `frontend/src/engineer`.
- Las notificaciones se emiten por Wails para Hub/desktop y por SSE `/engineer/stream` para OBS.
- El widget `engineer-notifications` solo muestra mensajes. No reproduce audio ni decide carrera.
- Ingeniero no debe abrir un segundo reader LMU.
- LMU live se debe conectar reutilizando el buffer/fuente actual de Overlays.

## Fronteras de arquitectura

```text
Vantare Hub
  Overlays Studio
  Ingeniero
  Telemetria
  Setup

Go runtime unico
  TelemetrySourceManager
  Profile/Layout services
  EngineerService
  EngineerNotificationStore
  HTTP/SSE server
```

## Reglas para workers

- No copiar el frontend de `Vantare-Ingeniero-Go`.
- No copiar el shell Wails ni `cmd` de `Vantare-Ingeniero-Go`.
- No crear microservicios ni procesos secundarios para Ingeniero.
- No mezclar configuracion de Ingeniero dentro de perfiles de overlay salvo que un plan futuro lo apruebe.
- No cambiar `pkg/models.Telemetry` para EN6 salvo aprobacion explicita.
- Usar skills Go obligatorias en cualquier tarea que toque `internal/engineer`, `internal/app`, `internal/server`, telemetria o lifecycle:
  - `golang-error-handling`;
  - `golang-testing`;
  - `golang-code-style`;
  - `golang-concurrency` y `golang-context` si hay goroutines, SSE, loops o lifecycle;
  - `golang-safety` si hay filesystem, I/O, procesos o config.

## Estado actual

- EN0-EN5 integran Ingeniero como modulo interno inicial.
- La seccion `Ingeniero` existe en el Hub.
- El widget `engineer-notifications` existe y esta registrado en desktop/OBS/previews.
- `/engineer/stream` existe para OBS.
- LMU live real para spotter queda pendiente de EN6.
- Audio/TTS real queda pendiente de una fase posterior.

