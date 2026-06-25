# Changelog

Changelog publico para testers y Discord.

Solo se publican versiones funcionales confirmadas. Planes, reviews, analisis y cambios puramente documentales no requieren entrada propia salvo que se agrupen en una version funcional.

## v0.3.10.0

**Nuevo**

- Vantare queda consolidado como suite local con modulo `Ingeniero`, historial de mensajes y widget de notificaciones para overlays.
- Documentacion para testers privados: instrucciones de build, known issues, proceso de feedback y setup local de OBS.
- Hardening inicial de hotkeys globales en Windows con stubs seguros para otras plataformas.

**Mejorado**

- La URL de OBS en Ajustes usa un perfil real activo o el fallback seguro `example-racing.json`.
- El widget Delta usa datos live reales para `Target` y `Lap`.
- El backend prioriza el `DeltaBest` nativo de LMU cuando llega desde Shared Memory.

**Corregido**

- Los deltas negativos ya no se descartan en la fusion de telemetria.
- `DeltaBest == 0` se trata como dato no disponible para no pisar un delta valido previo.
- Tests de delta usan helpers de fixtures en lugar de offsets hardcodeados.

**Para testers**

- Probad Delta en LMU live: valores negativos deben mostrarse en verde al mejorar y positivos en rojo al perder tiempo.
- Probad la URL de OBS desde Ajustes y confirmad que carga el perfil correcto.
- Ingeniero esta disponible como modulo de prueba, pero el adaptador live LMU de Ingeniero sigue pendiente.

## v0.3.9.2

**Nuevo**

- Flujo inicial de changelog publico y publicacion automatica en Discord al crear tags `v*`.
- Documento de UX mock/live/demo para alpha testers.

**Mejorado**

- El indicador global de fuente de telemetria en la barra superior ahora incluye `title` y `aria-label`.
- Los tests del selector mock de `Standings` usan `aria-pressed` en lugar de clases visuales.

**Corregido**

- Menor riesgo de regresion visual en el selector `Práctica` / `Qualy` / `Carrera`.

**Para testers**

- Sin LMU abierto, comprobad que la fuente se entiende como `Mock` o fallback.
- En `Widgets` -> `Standings`, cambiad `Práctica` / `Qualy` / `Carrera` y confirmad que no activa `Guardar`.
- En una release taggeada, Discord deberia recibir automaticamente esta entrada del changelog.

## v0.3.9.1

**Nuevo**

- Los perfiles recomendados de Vantare pueden guardarse como copia propia editable.

**Mejorado**

- `Relative` y `Standings` redimensionan proporcionalmente en el editor de layout, overlay desktop y OBS.
- Los perfiles legacy con cajas deformadas se muestran con el aspecto correcto desde el primer render.
- La version visible de la app pasa a `v0.3.9.1`.

**Corregido**

- Guardar un recomendado como copia propia genera IDs unicos y convierte a schema v2.
- Guardar una copia recomendada ya no muta el perfil original.
- `Standings` ya no queda ligeramente recortado al redimensionar.

**Para testers**

- Probad `Mis perfiles` -> `Editar layout` con `Relative` y `Standings`.
- Probad resize horizontal, vertical y diagonal.
- Probad `Recomendados por Vantare` -> guardar como perfil propio.
- Reportad si algun overlay queda cortado, deformado o con espacio vacio raro.
