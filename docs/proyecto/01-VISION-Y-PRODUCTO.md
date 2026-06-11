# 01 — Visión y producto

## Qué es Vantare Overlays

**Vantare Overlays** es una aplicación de escritorio para **simracing** que muestra **overlays de telemetría en tiempo real** sobre la sesión de juego o en un stream (OBS). El piloto ve delta, relative, standings, alertas y más — con estética premium, personalizable y bajo consumo de recursos.

El producto compite con **RaceLabs**, **SimHub** e **iOverlay**, diferenciándose por:

- Soporte **multi-sim** (objetivo: LMU, iRacing, Assetto Corsa).
- **Una ventana overlay compuesta** por perfil (no una ventana por widget).
- **Hub de configuración** visual (sin editar JSON a mano).
- **Modo OBS/streaming** (futuro): telemetría por HTTP+SSE sin ventana desktop.
- Modelo **freemium** (Free / Pro / Ultimate) con auth Supabase (post-MVP v2).

---

## Problemas que resuelve

| Problema | Solución Vantare |
|----------|------------------|
| Herramientas fragmentadas | Hub + overlay + (futuro) OBS en un solo producto |
| Overlays genéricos o pesados | UI moderna + optimización Go/WebView2 |
| Configuración técnica | Perfiles JSON + CRUD desde hub |
| Latencia en telemetría | Pipeline Go 60 Hz lectura → 30 Hz UI con deadband/diff |
| Streaming | Browser Source OBS apuntando a localhost (Fase 6) |

---

## Público objetivo

1. **Streamers de simracing** — overlays legibles en cámara, alertas de adelantamiento.
2. **Pilotos recreativos** — delta y relative para mejorar tiempos.
3. **Equipos / esports** — dashboards configurables por perfil (práctica vs carrera).
4. **Creadores de contenido** — temas y personalización visual (Fase 8).

Isaac (product owner) prioriza **calidad visual** (referencia hub v5) y **funcionamiento estable con LMU** antes de expandir sims.

---

## Overlays principales (MVP v2)

| Widget | Descripción | UpdateHz típico |
|--------|-------------|-----------------|
| **Delta** | Diferencia vs mejor vuelta, barra visual | 30 Hz |
| **Relative** | Coches delante/detrás con gaps | 15 Hz |
| **Standings** | Clasificación de sesión | 15 Hz |
| **Stream alerts** | (v1 / futuro v2) Overtake, pole, fastest lap | event-driven |

---

## Modelo de negocio (objetivo)

| Plan | Overlays | Temas | Alerts | Precio orientativo |
|------|----------|-------|--------|-------------------|
| Free | 2 | 1 | No | Gratis |
| Pro | Todos | Todos | Sí | ~$9.99/mes |
| Ultimate | Todos + custom | Todos + custom | Sí | ~$19.99/mes |

Auth y licencias están en el roadmap v1 (`docs/AUTH-GUIDE.md`); **v2 aún no integra Supabase** — es trabajo post-Fase 9 o paralelo cuando el core esté estable.

---

## Principios de producto

1. **Privacidad** — Telemetría local; no sale de la máquina salvo sync explícito del usuario.
2. **Rendimiento como feature** — Presupuesto: &lt;120 MB RAM hub+overlay, &lt;2% CPU en pista.
3. **No improvisar diseño** — Hub y tokens derivados de `hub_main_v5.html`.
4. **Incremental** — Fases 0–9; cada una cierra con tests y evidencia.
5. **Isaac valida visualmente** — Screenshots vs mockup antes de marcar fase UI como hecha.

---

## Referencias

- README general: [`../../README.md`](../../README.md)
- Roadmap v1 (histórico): [`../ROADMAP.md`](../ROADMAP.md)
- Arquitectura v1 (Electron): [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
