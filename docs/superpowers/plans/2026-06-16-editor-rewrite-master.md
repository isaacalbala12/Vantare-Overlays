# Editor Rewrite — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Preview Workbench canvas with a per-widget WYSIWYG preview inside the Hub, and move real drag/resize editing to the desktop overlay window.

**Architecture:**
- The **Hub** shows one widget at a time in a scaled, real-component preview. Each widget can be edited (appearance, enabled state, visible-when rules) from the inspector next to it. Changes are local until the user saves; a single-level undo is available.
- A new **Profiles** page lets the user activate a profile and toggle which widgets are enabled. It keeps the existing create/delete/activate features.
- The **desktop overlay** gets an `/overlay/edit` route where all enabled widgets are rendered with drag handles. Moving/resizing there saves widget positions immediately via the existing `layout:save` event.
- The **OBS/streaming overlay** (`/overlay?profile=...`) remains untouched and clean.

**Tech Stack:** Go 1.22+, Wails v3 alpha, React 19, TypeScript, Tailwind CSS.

---

## Why this is split into three plans

This refactor touches three mostly independent subsystems. Each sub-plan produces a working, testable release on its own so the codebase never stays broken between phases.

| Plan | Focus | Result |
|------|-------|--------|
| [Plan A: Hub refactor](./2026-06-16-editor-rewrite-plan-a-hub.md) | New navigation, per-widget preview, Profiles page toggles, dirty state + undo. | v0.3.0-alpha.1 |
| [Plan B: Overlay edit mode](./2026-06-16-editor-rewrite-plan-b-overlay.md) | `/overlay/edit` route, desktop edit window, drag/resize real positions. | v0.3.1-alpha.1 |
| [Plan C: Backend save wiring](./2026-06-16-editor-rewrite-plan-c-backend.md) | Persist Hub appearance changes, open edit window from Hub, sync profile state. | v0.3.2-alpha.1 |

**Execution order:** Plan A → Plan B → Plan C. Do not run them in parallel.

**Critical constraint from the user:** leave no trace of the old preview canvas implementation. Old files are deleted only at the end of Plan A, after the new pages compile and pass tests.

---

## Shared decisions locked in

1. **Guardado**: automático con indicador "sin guardar" y **un solo nivel de deshacer**. El dirty state vive solo en el frontend.
2. **Selección de widget en el overlay**: independiente; el Hub no intenta seguir la selección del overlay.
3. **URLs del overlay**:
   - `/overlay?profile=...` → OBS/streaming limpio.
   - `/overlay/edit` → modo edición desktop (con handles).
4. **Preview en el Hub**: escalada (`scale=0.5`) dentro de un contenedor fijo.
5. **Telemetry en preview**: `telemetryMode="mock"`.
6. **Guardado de posiciones**: reutiliza el evento Wails existente `layout:save`.
7. **Guardado de apariencia/habilitación/etc.**: nuevo evento Wails `profile:save` con el perfil completo.

---

## Execution handoff

**Plan complete and saved.**

Start with **Plan A**. Do not begin Plan B until Plan A is merged and tagged.
