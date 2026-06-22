# Plan actual

Ultima actualizacion: 2026-06-21.

## Estado actual

Vantare v2 es una app local de overlays para sim racing construida con Go/Wails y React/TypeScript.

Base de schema v2 para perfiles preparada:
- `schemaVersion: 2` permite layouts por sesion y variantes de widgets.
- `layouts.general.widgets` existe como layout obligatorio en perfiles v2.
- `widgets` se mantiene como espejo de compatibilidad durante la transicion.
- Los perfiles legacy sin `schemaVersion` siguen cargando sin migracion silenciosa.

La Fase A de `Overlays Studio` se encuentra completada:
- La navegacion visible unifica `Overlays` y `Preview` bajo `Overlays Studio`.
- `Overlays Studio` sustituye la antigua entrada visible a `Preview` como flujo principal de edicion.
- `WidgetStudio` permite editar aspecto/comportamiento de widgets.
- `LayoutStudio` contiene la edicion de layout, colocacion y tamano.
- `Widgets` no expone posicion/tamano/eliminar (responsabilidad exclusiva de `LayoutStudio`).

Fase A2 de Overlays Studio completada:
- Home convertida en cuatro paneles grandes clicables: `Widgets`, `Mis perfiles`, `Recomendados por Vantare`, `Comunidad`.
- Cada panel es un `button` con aria-label, hover/focus states y toda la tarjeta como target de click.
- `Widgets` panel abre el editor de widgets existente.
- `Mis perfiles` abre una subpantalla propia con perfiles y previews reales renderizadas.
- `Recomendados por Vantare` abre una subpantalla propia con previews reales y guardado como perfil propio.
- `Comunidad` abre una pantalla dedicada de `Proximamente`.
- Todas las subpantallas usan `← Volver a Overlays Studio`.
- `ProfilePreview` reutiliza `PreviewWidgetFrame` existente para renderizar widgets reales en miniatura de forma responsive.
- Backend `hub:list` ahora incluye `Profile` completo en cada `ProfileEntry` para permitir previews de perfiles propios.

Fase B de Overlays Studio (Widget Previews) completada:
- Se implementó la preview aislada en `WidgetPreviewPanel.tsx`.
- Se usa `ResizeObserver` para ajustar el tamaño relativo sin desbordar.
- Se agregó el fondo "checkerboard" para visibilidad.
- Se corrigieron los rastros de renderizado (dirty rects de Chromium) aplicando GPU acceleration en `PreviewWidgetFrame`.

Controles live restaurados dentro de Overlays Studio:
- `Mis perfiles` muestra `Abrir overlay` / `Detener overlay` por perfil.
- `LayoutStudio` muestra `Abrir overlay` / `Detener overlay` para el perfil activo.
- `WidgetStudio` no muestra controles live de forma intencionada.
- El inicio y parada reutilizan los eventos Wails existentes: `overlay:start`, `overlay:stop`, `overlay:status`.
- `Abrir overlay` se deshabilita mientras el layout tiene cambios sin guardar o se está guardando.

## Objetivo actual

La siguiente tarea no esta cerrada todavia a nivel de feature. El siguiente paso recomendado es:

1. hacer comprobaciones manuales completas de la app,
2. cerrar cualquier bug funcional visible,
3. definir un roadmap corto para una primera alpha/beta en 7-10 dias.

### Reconexión live-first aprobada para overlays

- Al pulsar `Abrir overlay`, la app intenta reconectar con LMU antes de abrir la ventana.
- Si LMU no está disponible, el overlay sigue abriendo con datos mock como fallback visual.
- `-live=false` queda como modo explícito de desarrollo/testing.
- La barra superior muestra el estado de la fuente (`LMU conectado`, `Esperando LMU` o `Mock`).

## Proximas tareas pequenas

1. Ejecutar la verificacion manual completa de `Overlays Studio`, incluyendo `Widgets`, `Mis perfiles`, `Recomendados por Vantare` y controles live.
2. Verificar que el overlay desktop abre y cierra correctamente desde `Mis perfiles` y `LayoutStudio`.
3. Confirmar que no quedan regresiones visibles del antiguo flujo `Preview`.
4. Tras esa validacion, definir roadmap corto de alpha/beta con prioridades reales.
5. Revisar el contrato schema v2 antes de implementar la primera UI persistente de `Relative`.
6. Crear el miniplan de catalogo/template inicial de `Relative` usando `bestLap` y `lastLap` como primeras columnas opcionales persistentes.

## Riesgos actuales

- Hay cambios abiertos en git de otros agentes; no mezclar tareas nuevas con ellos sin revisar.
- El README principal puede estar desactualizado respecto a `Overlays Studio`.
- Parte de la documentacion historica vive fuera de `vantare-v2`.
- Los agentes pueden confundir `Widgets` con `LayoutStudio`; mantener separacion estricta.
- Modificar `PreviewWidgetFrame` puede impactar a los mini-previews de perfiles creados en la Fase A2 si no se maneja bien la propiedad de "aislamiento" o "escala".
- La app ya tiene el flujo principal de edicion, pero todavia no hay roadmap de lanzamiento documentado para alpha/beta.

## Decisiones pendientes

- Si los planes externos deben copiarse, moverse o archivarse dentro de `vantare-v2/docs`.
- Cuando convertir `Perfiles recomendados por Vantare` en perfiles propios editables.
- Si la antigua ruta/pagina `Preview` debe eliminarse definitivamente o mantenerse como compatibilidad interna.
- Que alcance exacto debe tener la primera alpha/beta de 7-10 dias.

## No cambiar sin aprobacion

- Stack principal Go + Wails + React/TypeScript.
- Separacion `Widgets` vs `LayoutStudio`.
- Configuracion de build/package.
- Dependencias.
- Formato de perfiles JSON.
- Arquitectura de telemetria LMU.
