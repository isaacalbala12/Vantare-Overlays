# Arquitectura

## Resumen

Vantare v2 es una suite local-first para sim racing:

```text
UI React/TypeScript
-> runtime Wails
-> servicios Go
-> dominio/configuracion/telemetria
-> adaptadores: LMU shared memory, REST local LMU, filesystem, ventanas, HTTP/SSE
```

La regla principal es mantener la logica estable en Go y la experiencia visual en TypeScript.

## Vantare Suite

La app ya no debe documentarse como una app aislada de overlays. El producto visible es un Hub con modulos internos:

- `Overlays Studio`: perfiles, widgets, layouts, overlay desktop y OBS.
- `Ingeniero`: spotter/ingeniero determinista, historial y notificaciones de carrera.
- `Telemetria`: estado live/mock/demo compartido por los modulos.
- `Setup`: configuracion local.

Los modulos pueden compartir runtime Go, telemetria y servidor HTTP/SSE, pero no deben mezclar responsabilidades.

## Responsabilidades

## TypeScript / React

Vive en `frontend/`.

Debe encargarse de:

- Hub visual.
- Overlays Studio.
- Edicion visual de widgets y layouts.
- Render de overlays.
- Estados de UI.
- Tests de componentes y flujos frontend.

No debe absorber logica pesada de telemetria, procesos, filesystem o ventanas.

## Go

Vive en `cmd/`, `internal/` y `pkg/`.

Debe encargarse de:

- ciclo de vida de la app,
- puente Wails,
- servicios de perfiles/configuracion,
- telemetria LMU,
- normalizacion/diff/pipeline,
- core de Ingeniero y bus de notificaciones,
- control de ventanas overlay,
- servidor HTTP/SSE cuando aplique,
- actualizador,
- CLI/debug tools.

## Estructura principal

- `cmd/vantare/`: entrada principal de la app Wails.
- `cmd/lmu-debug/`: herramienta de debug LMU.
- `internal/app/`: servicios de app, bridge y ciclo de vida.
- `internal/telemetry/`: lectura, normalizacion y emision de telemetria.
- `internal/window/`: gestion de ventanas.
- `internal/server/`: servidor local/overlay cuando aplica.
- `internal/engineer/`: core, servicio, simulator/replay y notificaciones de Ingeniero.
- `pkg/config/`: carga/guardado/esquema de perfiles.
- `pkg/models/`: tipos compartidos de datos.
- `frontend/src/hub/`: UI del Hub.
- `frontend/src/hub/pages/EngineerPage.tsx`: seccion de Ingeniero dentro del Hub.
- `frontend/src/engineer/`: helpers frontend de Ingeniero.
- `frontend/src/hub/overlays/`: Overlays Studio.
- `frontend/src/hub/preview/`: piezas heredadas/reutilizadas del editor visual.
- `frontend/src/overlay/`: render de overlay.

## Direccion de dependencias

- UI llama a servicios por Wails/eventos.
- Go no debe depender de React.
- Dominio/configuracion no debe depender de UI.
- Adaptadores externos deben quedar en paquetes concretos, no dispersos.
- Los componentes de UI pueden reutilizar helpers, pero no duplicar reglas core.
- Ingeniero consume fuentes de telemetria existentes; no debe abrir un segundo reader LMU.
- Overlays pueden mostrar notificaciones de Ingeniero, pero no deciden logica de carrera.

## Overlays Studio

Separacion obligatoria:

- `Widgets`: edita aspecto/comportamiento del widget.
- `Mis perfiles`: entrada a perfiles propios y a `LayoutStudio`.
- `LayoutStudio`: edita posicion, tamano, orden/layout y composicion del perfil.
- `Recomendados por Vantare`: presets read-only hasta que se guarden como perfil propio.
- `Comunidad`: proximamente.
- Los controles de `Abrir overlay` / `Detener overlay` viven en `Mis perfiles` y `LayoutStudio`, no en `WidgetStudio`.

Riesgo a evitar: volver a mezclar controles de layout dentro de `Widgets`.

## Ingeniero

Responsabilidad:

- ejecutar el core determinista de ingeniero/spotter;
- exponer estado e historial en el Hub;
- emitir notificaciones para overlay desktop y OBS;
- consumir simulator/replay ahora y LMU live cuando EN6 este implementado.

No puede:

- editar perfiles, layouts o variantes de overlays;
- contener logica de carrera en React o en el widget visual;
- abrir un segundo reader LMU;
- depender de una app externa de `Vantare-Ingeniero-Go`.

El widget `engineer-notifications` es una salida visual del modulo Ingeniero. Su responsabilidad termina en mostrar notificaciones ya calculadas.

## Principios para cambios futuros

- Reutilizar componentes existentes antes de crear nuevas capas.
- No crear abstracciones "por si acaso".
- No crear servicios globales sin necesidad.
- Si una parte empieza a tocar demasiadas responsabilidades, dividir con un plan pequeno.
- Documentar decisiones importantes como ADR.
