# Alpha Private Checklist

Auditoria de preparacion para alpha privada de Vantare Suite / Overlays Studio.

Fecha: 2026-06-25.

## Veredicto

Estado: `PASS`.

La alpha privada puede considerarse preparada a nivel tecnico automatizado. Queda pendiente la verificacion manual de humo en entorno real antes de distribuir a testers cercanos.

## Alcance evaluado

Se auditaron las areas necesarias para la alpha privada:

| Area | Estado |
|---|---|
| Hub / navegacion general | PASS |
| Overlays Studio Home | PASS |
| WidgetStudio | PASS |
| LayoutStudio | PASS |
| Relative configurable | PASS |
| Standings configurable | PASS |
| Preview aislada de WidgetStudio | PASS |
| Preview / layout / profile previews | PASS |
| Overlay desktop | PASS |
| OBS basico | PASS |
| Perfiles propios | PASS |
| Recomendados -> copia editable | PASS |
| Guardado explicito | PASS |
| Mock/live/demo UX | PASS |
| Versionado / changelog / Discord | PASS |
| Separacion WidgetStudio / LayoutStudio | PASS |
| Bugs conocidos documentados | PASS |
| Riesgos pendientes para alpha | PASS |

## Evidencia automatizada

Checks reportados por el worker A8:

- `pnpm --dir frontend exec tsc -b`: PASS.
- `pnpm --dir frontend test`: PASS, 65 suites / 407 tests.
- `go test ./pkg/config ./internal/app ./internal/server`: PASS.
- `pnpm --dir frontend build`: PASS.
- `git diff --check`: PASS.

## Riesgos no bloqueantes

- No se hizo prueba live con LMU real.
- JSDOM no cubre layout visual real; las previews necesitan smoke manual en la app.
- `__previewFillHost` debe seguir siendo un flag interno de render y nunca persistirse en schema.
- Ingeniero live LMU real queda aparcado hasta EN6.

## Smoke test manual recomendado

### Overlays Studio

- Abrir la app.
- Entrar en `Overlays Studio`.
- Confirmar que las tarjetas principales responden a hover/focus.
- Entrar en `Widgets -> relative`.
- Activar/desactivar columnas opcionales.
- Confirmar que la preview se ajusta de ancho sin espacio vacio a la derecha.
- Confirmar que un cambio real activa el boton `Guardar`.
- Entrar en `Widgets -> standings`.
- Cambiar mock scenario entre `Practica`, `Qualy` y `Carrera`.
- Confirmar que cambiar scenario no activa `Guardar`.

### Perfiles y layout

- Entrar en `Mis perfiles`.
- Abrir overlay del perfil activo.
- Confirmar que la ventana transparente aparece sin clipping evidente.
- Entrar en `Editar layout`.
- Mover y redimensionar widgets.
- Guardar layout.
- Confirmar que el overlay abierto refleja cambios.

### Ingeniero

- Entrar en la seccion `Ingeniero`.
- Probar simulator/replay si esta disponible.
- Confirmar que el historial del Hub recibe mensajes.
- Confirmar que el widget `engineer-notifications` no rompe previews ni runtime cuando no hay mensajes.

## Decision

La alpha privada queda aceptada a nivel de auditoria automatizada.

Siguiente paso recomendado:

- pasar a `B1 - Build compartible e instrucciones`;
- preparar distribucion y guia minima para testers cercanos;
- no iniciar EN6 hasta poder validar LMU live.
