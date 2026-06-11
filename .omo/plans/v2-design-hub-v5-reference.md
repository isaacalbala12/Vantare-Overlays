# v2-design-hub-v5-reference

Referencia visual completa: [`docs/V2-DESIGN-REFERENCE.md`](../../docs/V2-DESIGN-REFERENCE.md)

**Fuente HTML:** [`hub_main_v5.html`](../../hub_main_v5.html) (raíz repo)

**Estado:** aprobado · **Aplica a:** Fase 5 (Hub), Fase 8 (temas), re-skin Fase 4 widgets

## Objetivo

Portar la estética del mockup **Hub Principal v5** a React + Tailwind v4 en `vantare-v2/frontend/` — sin improvisar diseño.

## Alcance Fase 5 (cuando toque)

- [ ] Tokens Tailwind v4 (`vantare.*` colors, fonts Inter/Rajdhani/Space Mono)
- [ ] `frontend/src/styles/vantare-v5.css` — glass-panel, card-sleek, buttons
- [ ] Layout: Topbar → Hero → Event banner → Grid 12 col
- [ ] Componentes: ratings, chart (Chart.js o Recharts), carreras, Pro sidebar
- [ ] Validación: screenshot diff vs `hub_main_v5.html` en viewport 1920×1080

## Nota Fase 4 (executor actual)

**No bloquear closeout F4 por visuals.** Widgets funcionales con Tailwind mínimo; re-skin con tokens v5 en tarea posterior (F5/F8).

## Out of scope

- Lógica backend hub / auth / Supabase (Fase 5 funcional)
- Chart.js en overlay in-game
