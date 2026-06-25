# UI1 — Análisis visual del HTML de referencia para WidgetStudio

Documento de análisis, no de implementación.

- Versión objetivo: 0.3.7.X.
- Estado: `Done` (análisis).
- Worker: Minimax M3.
- Reviewer previsto: Codex.
- Fuente visual: `C:\Users\isaac\Desktop\Vantare-Overlays\overlays_mockup.html` (mockup estático, no implementación).
- Alcance: solo la experiencia de edición de widgets (`WidgetStudio`). No cubre Home de Overlays Studio, LayoutStudio, Mis perfiles, Recomendados, Comunidad ni la navegación global de la app.

Este documento compara conceptualmente el HTML de referencia con el estado actual de `WidgetStudio` y propone una arquitectura de rework en fases pequeñas para UI2/UI3.

## 1. Resumen ejecutivo

El HTML de referencia representa una idea de editor de overlays con tres paneles:

- izquierda: lista vertical de overlays/widgets con tabs `Todos` / `Activos`, búsqueda, scroll y estado `Activo`;
- centro: canvas con fondo "tipo juego", un widget centrado con `cursor-move`, handle de resize y barra inferior (`Workspace: Activo`, `Vista Navegador`, `Copiar URL`);
- derecha: panel de ajustes sticky con cabecera del widget, secciones `General` (botón `Guía de Inicio`), `Apariencia` (Tema, Opacidad, Blur) y secciones colapsables (`Visibilidad`, `Modo Objetivo`).

`WidgetStudio` actual ya tiene la misma forma conceptual (tres paneles: lista, preview aislada, ajustes). Lo que el HTML aporta como referencia es la capa de polish visual: paleta, tipografía, jerarquía tipográfica, densidad de panel, estados hover/active claros y micro-interacciones.

Decisión central: el rework UI de `WidgetStudio` debe ser un rework de **capa visual y estructura de panel**, no un rediseño de responsabilidades ni de arquitectura. No debemos copiar el editor libre tipo Figma ni el `cursor-move` con handle de resize: eso es territorio de `LayoutStudio`.

## 2. Principios visuales extraídos

1. Paleta Vantare ya está bien encaminada.
   - El HTML define `bg #080808`, `surface #0F0F0F`, `panel #141414`, `border #1E1E1E`, texto `#E8E8E8`, muted `#7A7A7A`, dim `#4A4A4A` y una escala de rojos (`red.400 #E63946`, `red.500 #C1121F`, `red.600 #9B2226`, `red.700 #800020`).
   - El frontend actual ya usa tokens similares (`vantare-bg`, `vantare-surface`, `vantare-panel`, `vantare-border`, `vantare-text`, `vantare-textMuted`, `vantare-textDim`, `vantare-red-*`).
   - Acción: alinear nombres y valores con la escala del HTML; consolidar tokens duplicados.

2. Tipografía con jerarquía clara.
   - `Inter` para UI, `Rajdhani` para display/títulos y `Space Mono` para datos numéricos y estados.
   - Uso disciplinado de `uppercase + tracking-widest` en etiquetas de sección y headers (`text-[10px] font-bold tracking-widest`).
   - El frontend actual mezcla `font-display` y `font-mono` en algunos sitios pero no de forma consistente.
   - Acción: estandarizar `font-display` para títulos de sección y nombre de widget, `font-mono` para IDs, métricas, escenarios y estados, `font-sans` para el resto.

3. Densidad visual y rhythm.
   - Padding consistente (`px-5 py-5` o `px-4 py-3`), gaps pequeños (`space-y-6` solo cuando hace falta aire).
   - Labels de sección de 10px, labels de setting de 11px, valores numéricos en mono de 10-11px.
   - Botones de filtro/tabs compactos con `py-1.5` y `tracking-widest uppercase`.
   - Acción: revisar densidad de `WidgetSettingsPanel` y `StudioWidgetList` para acercarse a este rhythm sin perder legibilidad.

4. Estados interactivos explícitos.
   - `hover`, `active`, `focus-visible`, `disabled`, todos diferenciados.
   - Hover en items de lista: fondo `bg-[#141414]` + texto blanco.
   - Activo en lista: `bg-[#1A1A1A]`, borde `#2A2A2A`, dot rojo con glow.
   - Inputs focus: borde `#4A4A4A` claro.
   - Botones primarios con `linear-gradient` rojo y glow al hover.
   - Acción: replicar el patrón de focus y de item activo; el item activo actual usa `bg-vantare-red-950/30` y borde `red.500/50`, que es coherente pero se siente más "alerta" que el HTML (que es más sobrio, con borde gris y dot rojo).

5. Fondo del canvas con pista visual.
   - El HTML usa una imagen Unsplash + overlay oscuro + `backdrop-blur` para sugerir "esto va sobre un juego".
   - El frontend actual usa checkerboard liso.
   - Acción: mantener checkerboard como opción por defecto (sigue siendo la representación fiel del overlay real), pero considerar añadir un toggle `Modo juego / Modo limpio` solo si aporta valor real. No es prioridad.

6. Iconografía minimalista y consistente.
   - Iconos `stroke-width="2"` simples, tamaño `w-3.5 h-3.5` o `w-4 h-4`.
   - Acciones inline representadas con iconos (`copy`, `external-link`, `chevron-down`, `search`).
   - Acción: mantener librería de iconos actual y revisar tamaño/color para alinearse con `text-vantare-textDim` o `text-vantare-textMuted`.

7. Sticky panel header en el panel de ajustes.
   - El HTML mantiene `sticky top-0` la cabecera del widget en el panel derecho.
   - El frontend actual no tiene cabecera específica en `WidgetSettingsPanel`; el header vive en `WidgetStudio` arriba de todo.
   - Acción: mover el nombre y estado del widget al header del panel derecho (sticky) y dejar el header global de `WidgetStudio` para acciones (guardar, volver).

## 3. Decisiones que sí adoptar para WidgetStudio

### 3.1 Lista de widgets (panel izquierdo)

- Tabs `Todos` / `Activos` con estilo pill compacto (`py-1`, `text-[10px] font-bold uppercase`).
- Búsqueda con icono lupa a la izquierda, placeholder `Buscar widget...`, borde neutro, focus claro.
- Cada item con:
  - nombre legible del widget (`name` si existe, si no `id`);
  - tipo en `font-mono text-[10px] text-vantare-textDim`;
  - estado `Activo` / `Oculto` en `text-[10px] font-bold` con color semántico (`emerald-400` activo, dim oculto);
  - dot a la izquierda solo cuando está seleccionado, en `vantare-red-500` con glow.
- Hover: ligero fondo `bg-white/[0.02]` + translate-x sutil, borde `white/[0.05]`.
- Activo: fondo `bg-white/[0.04]` con borde izquierdo de 2px en `vantare-red-500` (HTML) o bien el patrón actual `bg-vantare-red-950/30 border-vantare-red-500/50` (frontend). Decisión recomendada: replicar HTML sobrio y dejar el rojo como acento, no como relleno.

### 3.2 Preview aislada (panel central)

- El HTML muestra el widget sobre fondo "tipo juego" con overlay oscuro y `backdrop-blur`.
- El frontend actual muestra el widget sobre checkerboard, que es la representación fiel del overlay real. No cambiar.
- Mantener `WidgetRenderer` + `PreviewScaler` + `WidgetSandboxPreview` tal como están (reglas de `docs/widget-preview-bug-log.md`).
- El selector de escenario mock (`Práctica` / `Qualy` / `Carrera`) actual va encima del panel central. El HTML no tiene equivalente directo. Recomendación: mantenerlo como está, pero mejorar su estilo para acercarlo al rhythm del HTML (texto más pequeño, mayúsculas, tracking).
- Considerar en el rework un indicador `Modo Edición` arriba a la derecha como el HTML, pero solo si aporta información real al usuario; no añadir ruido.

### 3.3 Panel de ajustes (panel derecho)

- Cabecera sticky con:
  - nombre del widget en `font-display text-xl font-bold uppercase tracking-wide`;
  - estado del widget (`Activo` / `Oculto`) en `font-mono text-[10px] uppercase tracking-widest text-vantare-textMuted`;
  - opcionalmente un dot rojo con glow cuando hay cambios sin guardar.
- Secciones con header `text-[10px] font-bold uppercase tracking-widest text-vantare-textMuted`.
- Settings agrupados en bloques de 1 a 3 inputs con `space-y-6` entre bloques, `space-y-3` dentro.
- Controles:
  - `select` con icono chevron a la derecha;
  - `range` con valor numérico a la derecha en pill `font-mono text-[10px]`;
  - `toggle` con knob de 5x5 y track de 5x9 (coincide con tamaño del HTML);
  - `checkbox` simple cuando no se justifica toggle.
- Secciones colapsables (`Visibilidad`, `Modo Objetivo` en HTML) con `accordion-header` y chevron. Recomendación: usar este patrón solo si una sección tiene más de 4-5 settings y rara vez se toca.

### 3.4 Header global de WidgetStudio

- Reducir a lo mínimo: `← Volver a Overlays Studio`, `Widgets`, estado de guardado, botón `Guardar`.
- Mover el nombre del widget al panel derecho.
- Mantener la nota "Estos cambios se guardan en el perfil activo" pero solo si no satura; el HTML no la tiene.

### 3.5 Guardado

- Mantener patrón actual: estado textual (`Guardando...`, `Guardado`, `Error al guardar`, `Cambios sin guardar`) + botón `Guardar` deshabilitado cuando no hay cambios o se está guardando.
- Opcional: añadir dot rojo con glow al lado del texto cuando hay cambios sin guardar (coherente con patrón HTML).
- Botón `Guardar` en estilo `btn-secondary` con `text-xs font-bold uppercase tracking-widest`. No usar gradiente rojo: el guardado no debe competir con el item activo.

## 4. Decisiones que evitar

- **No copiar `cursor-move` ni handle de resize.** Esos son affordances de `LayoutStudio`. En `WidgetStudio` el widget es solo una preview para editar apariencia interna; el usuario no debe sentir que puede arrastrarlo.
- **No copiar el botón `Copiar URL` ni `Vista Navegador` del footer del canvas.** Esos son de overlay/runtime, no de edición de widgets.
- **No introducir imagen Unsplash ni `backdrop-blur` en el fondo del canvas** sin decisión de producto. La preview aislada debe parecerse al overlay real, no a un escaparate.
- **No añadir panel de `LMU Conectado` en la parte inferior del panel izquierdo.** Ese estado ya vive en la barra superior global de la app; duplicarlo confunde.
- **No copiar el navbar superior (`Hub`, `Overlays`, `Telemetría`, `Setup`, `En Directo`).** La navegación global de la app ya está definida y no entra en este alcance.
- **No usar el `list-item.active` con `border-left: 2px solid red` si rompe con componentes accesibles.** El patrón actual del frontend (borde completo `red.500/50` + fondo `red.950/30`) ya pasa accesibilidad; mantenerlo o ajustarlo solo si se gana legibilidad.
- **No usar `linear-gradient` rojo en botones de filtro/tabs de la lista.** Esos deben ser sobrios; el rojo se reserva para "acción destructiva" o "estado activo crítico".
- **No añadir selector de tema en `WidgetStudio`.** El tema es global de la app, no por widget. El HTML lo muestra como ejemplo de `select` pero no debe trasladarse como feature.
- **No mezclar el patrón de acordeón con todas las secciones.** Si todo es colapsable, nada es encontrable. Usar acordeón solo para secciones grandes o raramente usadas.
- **No copiar la `glass-panel` con `backdrop-filter: blur(24px)` en el header global** si ya tenemos un header sólido y simple que cumple su función.

## 5. Impacto por zona

### 5.1 Lista de widgets

- Mejoras: alineación con rhythm del HTML, jerarquía tipográfica, estados de item más sobrios, búsqueda más visible.
- Archivos objetivo: `frontend/src/hub/overlays/StudioWidgetList.tsx`.
- Sin impacto en schema, backend ni renderer.

### 5.2 Preview aislada

- Mejoras: pequeño ajuste de estilo del selector de escenario mock, posible indicador `Modo Edición` arriba.
- Archivos objetivo: `frontend/src/hub/overlays/WidgetStudio.tsx`, `frontend/src/hub/overlays/WidgetPreviewPanel.tsx`, `frontend/src/hub/overlays/WidgetSandboxPreview.tsx` (solo wrapper si hace falta; no tocar `WidgetRenderer`/`PreviewScaler` sin plan).
- Sin tocar reglas de `docs/widget-preview-bug-log.md`.

### 5.3 Panel de ajustes

- Mejoras: cabecera sticky, secciones con jerarquía visual, accordion opcional, estandarización de controles.
- Archivos objetivo: `frontend/src/hub/overlays/WidgetSettingsPanel.tsx`, `frontend/src/hub/overlays/RelativeSettingsSection.tsx`, `frontend/src/hub/overlays/StandingsSettingsSection.tsx`, `frontend/src/hub/preview/PreviewInspector.tsx` (solo si necesitamos mover secciones).
- Riesgo: si movemos `PreviewInspector`, podemos romper tests focales y separación de responsabilidades. Recomendación: mantener `PreviewInspector` como está y envolverlo con cabecera sticky nueva en `WidgetSettingsPanel`.

### 5.4 Secciones de Relative/Standings

- Mejoras: estandarizar headers de sección, agrupar bloques por dominio (columnas, formatos, filtros, decoraciones), aplicar el patrón accordion si una sección pasa de 5 settings.
- Archivos objetivo: `frontend/src/hub/overlays/RelativeSettingsSection.tsx`, `frontend/src/hub/overlays/StandingsSettingsSection.tsx`.
- Sin cambios funcionales: solo visual/estructura interna. Las props (`profile`, `widget`, `onChangeProfile`) no cambian.

### 5.5 Guardado

- Mejoras: estado textual, dot rojo cuando hay cambios, botón `Guardar` con estilo consistente.
- Archivos objetivo: `frontend/src/hub/overlays/WidgetStudio.tsx`.
- Sin cambios funcionales: ya hay `SaveState` y `dirty`.

## 6. Riesgos

1. Mezclar `WidgetStudio` con affordances de `LayoutStudio`.
   - Mitigación: repaso explícito de `docs/feature-architecture-map.md` antes de cada miniplan. Cualquier elemento que sugiera mover/redimensionar/eliminar se rechaza.

2. Romper la separación visual entre header global y panel derecho.
   - Mitigación: header global mínimo (volver, título, estado, guardar) y nombre de widget en sticky del panel derecho.

3. Romper tests focales existentes.
   - Mitigación: cambios puramente visuales deben mantener `data-testid`, `aria-pressed` y la jerarquía DOM que los tests esperan. Si hay que mover algo, ajustar el test en el mismo miniplan.

4. Introducir tokens nuevos que no estén en `tailwind.config`/`index.css`.
   - Mitigación: revisar primero la paleta Vantare existente en `frontend/tailwind.config.*` y `frontend/src/index.css` antes de proponer cualquier color nuevo.

5. Añadir dependencias (librerías de sliders, iconos, glassmorphism).
   - Mitigación: usar solo lo ya disponible (Tailwind, React, tokens actuales). No añadir dependencias en este rework.

6. Densidad visual si se activan muchas columnas en `Relative`/`Standings`.
   - Mitigación: el panel de ajustes debe tener scroll interno sin recortar el header sticky. Mantener `overflow-y-auto` en `WidgetSettingsPanel`.

7. Accesibilidad (foco visible, contraste, navegación por teclado).
   - Mitigación: usar `focus-visible` consistente, validar contraste en la nueva paleta, y mantener roles `button` con `aria-label`/`aria-pressed` cuando proceda.

8. Cambios CSS sin impacto funcional pero con impacto en regresiones visuales no detectadas por JSDOM.
   - Mitigación: registrar el rework en `docs/widget-preview-bug-log.md` como sección de polish visual y diferir la validación browser/Playwright al miniplan RC2 del roadmap.

## 7. Propuesta de minifases para UI2/UI3

Pensadas para `Minimax M3` como worker y `Codex` como reviewer, sin saltos grandes.

### UI2 — Miniplan rework UI Overlays Studio (0.3.8.X)

Documento de plan, sin código, alineado con este análisis.

Bloques del miniplan:

- Mapa de cambios por archivo y por zona (lista, preview, panel de ajustes, secciones Relative/Standings, guardado, header global).
- Lista de componentes nuevos a extraer (si los hay): `StudioPanelHeader`, `StudioSection`, `StudioSettingRow`, `StudioToggle`, `StudioSelect`, `StudioRange`, `StudioAccordion`.
- Lista explícita de archivos a NO tocar: `WidgetRenderer`, `PreviewScaler`, `WidgetSandboxPreview`, `PreviewWidgetFrame` (excepto lo ya justificado), backend, schema, configs.
- Plan de tests: actualizar tests focales que dependen de clases o de estructura que cambie; añadir tests de accesibilidad básicos para focus y accordion.
- Plan de verificación manual: capturas de Relative y Standings con columnas opcionales activas y mock `Carrera`/`Práctica`/`Qualy`.

### UI3 — Implementar rework UI en cortes pequeños (0.3.9.X)

Cortes propuestos (cada uno es un miniplan ejecutable y reversible):

1. **Tokens y tipografía.**
   - Alinear nombres y valores con la paleta del HTML.
   - Estandarizar uso de `font-display`, `font-mono`, `font-sans`.
   - Sin cambios funcionales, sin tests nuevos (tests existentes deben seguir pasando).
   - Dependencias: ninguna.

2. **Header global mínimo.**
   - Reducir `WidgetStudio` header a `← Volver`, `Widgets`, estado, `Guardar`.
   - Mover nombre y estado del widget al panel derecho.
   - Actualizar tests focales de `WidgetStudio.test.tsx` si cambian `data-testid`.

3. **Lista de widgets.**
   - Reestilar `StudioWidgetList` con rhythm del HTML.
   - Mejorar búsqueda y tabs.
   - Mantener lógica de filtrado y props.

4. **Componentes base de panel (`StudioPanelHeader`, `StudioSection`, `StudioSettingRow`, `StudioToggle`, `StudioSelect`, `StudioRange`).**
   - Extraer componentes reutilizables sin meter librerías nuevas.
   - Añadir tests focales.

5. **Panel de ajustes (cabecera sticky + secciones).**
   - Envolver `PreviewInspector` con cabecera sticky.
   - Reestilizar headers de sección y rhythm interno.
   - Validar accesibilidad de focus y de accordion (si se introduce).

6. **Secciones Relative/Standings.**
   - Aplicar los componentes base del bloque 4.
   - Agrupar settings por dominio si está justificado.
   - Sin cambios funcionales ni en props.

7. **Guardado y estados de cambio.**
   - Reestilar estado textual + dot rojo cuando hay cambios.
   - Botón `Guardar` consistente.

8. **Polish final y bug log.**
   - Añadir entrada en `docs/widget-preview-bug-log.md` con cambios visuales y reglas a no romper.
   - Verificación manual completa.

Cada corte:

- 1 miniplan ejecutable.
- 1 worker Minimax M3.
- 1 review Codex (o GLM si toca arquitectura).
- Checks: `pnpm --dir frontend test`, `pnpm --dir frontend lint`, `pnpm --dir frontend build`, `git diff --check`.
- Sin cambios de schema, backend, configs ni dependencias.

## 8. Preguntas abiertas para Isaac

1. **Densidad del panel de ajustes.** ¿Prefieres densidad alta (más settings visibles, scroll mínimo) o densidad baja (más aire, secciones separadas)? El HTML se inclina por densidad media-alta. El frontend actual tiende a densidad media.

2. **Acordeón en secciones.** ¿Quieres que algunas secciones (`Visibilidad`, `Modo Objetivo`, filtros de `Relative`/`Standings`) sean colapsables como en el HTML, o que estén siempre expandidas para que se vea todo de un vistazo?

3. **Cabecera del widget en el panel derecho.** ¿Mover el nombre y estado del widget del header global a la cabecera sticky del panel derecho? Es lo que recomienda el HTML, pero cambia la jerarquía visual actual.

4. **Estado de cambios sin guardar.** ¿Añadir dot rojo con glow al lado del texto `Cambios sin guardar`? El HTML lo usa como patrón; el frontend actual solo usa texto.

5. **Indicador `Modo Edición`.** ¿Vale la pena añadir un chip arriba a la derecha del canvas indicando `Modo Edición`? Aporta claridad pero puede ser ruido.

6. **Selector de tema dentro de `WidgetStudio`.** El HTML lo muestra, pero el tema es global. ¿Lo dejamos fuera del rework por responsabilidad, o abrimos un debate para permitir override por widget en el futuro?

7. **Fondo del canvas.** ¿Mantenemos checkerboard liso o exploramos un modo "juego" opcional con imagen de fondo? Recomiendo mantener checkerboard para que la preview sea fiel al overlay real.

8. **Componentes nuevos.** ¿Prefieres extraer componentes base (`StudioToggle`, `StudioSelect`, etc.) en este rework o reutilizar los actuales con clases? Recomiendo extraer solo los necesarios para no inflar el cambio.

9. **Harness visual.** ¿Quieres que el miniplan incluya dejar marcada la necesidad de un harness Playwright para detectar regresiones visuales, o lo dejamos solo para RC2?

10. **Cambios sin guardar al navegar.** Hoy el botón `Volver` no avisa si hay cambios sin guardar. ¿Quieres que el rework UI incluya esta safeguards, o lo dejamos para otro miniplan?

## 9. Notas finales

- Este análisis NO propone implementación. Cualquier código nuevo debe pasar por un miniplan UI2 y por cortes UI3 separados.
- Las decisiones de UI no deben afectar a la separación `WidgetStudio` / `LayoutStudio` ni a la arquitectura de previews descrita en `docs/feature-architecture-map.md` y `docs/widget-preview-bug-log.md`.
- El HTML de referencia se trata como inspiración de diseño, no como especificación de implementación. Elementos como `cursor-move`, `Copiar URL`, `Vista Navegador`, `LMU Conectado` y la navegación global quedan explícitamente fuera del alcance de `WidgetStudio`.
- Si en el futuro el rework se extiende a `LayoutStudio`, `Mis perfiles`, `Recomendados` o `Comunidad`, este análisis no debe usarse como referencia directa: cada zona tiene su propio contexto y su propio miniplan.
