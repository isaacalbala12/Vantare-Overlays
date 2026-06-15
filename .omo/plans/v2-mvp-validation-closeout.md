# MVP Technical Validation Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate F6-F9 manually and automatically, record evidence, and leave the v2 MVP technical state clearly documented before moving to post-MVP work.

**Architecture:** This is a closeout/QA phase, not a feature phase. It should not add product scope unless a blocking defect is found. Evidence lives under `.omo/evidence/`, canonical project state stays under `docs/proyecto/`, and fixes are limited to small correctness/doc bugs discovered during validation.

**Tech Stack:** Go 1.25, Wails v3, React 19, Vitest, Vite, PowerShell, OBS Browser Source/manual browser checks.

---

## Non-Negotiables

- Active codebase: `C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2`.
- Do not touch `apps/desktop/`.
- Do not commit or push unless Isaac explicitly asks.
- Do not start post-MVP work in this plan.
- Do not add Supabase/auth/cloud/marketplace.
- Do not implement iRacing/AC adapters here.
- If a blocking bug appears, document it and fix only the smallest safe bugfix needed to pass MVP validation.
- Keep F6-F9 statuses as `✅ técnico` unless real manual validation justifies full closure.

---

## File Map

Create:

- `.omo/evidence/v2-mvp-closeout.txt` — final technical MVP evidence log.
- `.omo/evidence/v2-mvp-manual-checklist.md` — manual checklist results for F6-F9.

Modify:

- `docs/proyecto/04-ESTADO-ACTUAL.md` — update state after closeout.
- `docs/proyecto/05-PLAN-MAESTRO-FASES.md` — clarify next phase after closeout.
- `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` — add final MVP closeout commands/checklist if missing.
- `docs/V2-MASTER-PLAN.md` — sync F7-F9 status if still stale.

Optional modify only if validation finds a small blocking bug:

- `vantare-v2/...` — smallest relevant fix with test.

Do not modify:

- `apps/desktop/`
- cloud/auth/post-MVP modules

---

## Task 1: Preflight And Scope Guard

**Files:**
- Read-only: git status and docs

- [ ] **Step 1: Check working tree**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
git status -sb
```

Expected:

- There may be uncommitted F6-F9 work.
- Do not revert unrelated files.
- Note any unexpected changes under `apps/desktop/`; do not touch them.

- [ ] **Step 2: Confirm active docs**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
Get-Content docs\proyecto\04-ESTADO-ACTUAL.md
Get-Content docs\proyecto\05-PLAN-MAESTRO-FASES.md
Get-Content docs\proyecto\11-COMANDOS-Y-VERIFICACION.md
```

Expected:

- F6-F9 are marked `✅ técnico`.
- `04-ESTADO-ACTUAL.md` says next recommended step is validation/cierre MVP.

---

## Task 2: Automatic Verification

**Files:**
- Create/update: `.omo/evidence/v2-mvp-closeout.txt`

- [ ] **Step 1: Run Go tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected: PASS for all packages.

- [ ] **Step 2: Run frontend tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test
```

Expected: PASS. Current expected baseline after F9 post-review is 28 tests across 7 files.

- [ ] **Step 3: Run production build**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
```

Expected: PASS and `frontend/dist` generated.

- [ ] **Step 4: Record automatic evidence**

Create `.omo/evidence/v2-mvp-closeout.txt` with real command results:

```text
Vantare v2 MVP technical closeout
Fecha: 2026-06-12
Estado: en validación

Automático:
- go test ./...: OK / FAIL
- pnpm --dir frontend test: OK / FAIL
- pnpm --dir frontend build: OK / FAIL

Manual:
- Racing overlay: pendiente
- Edit mode: pendiente
- OBS HTTP/SSE: pendiente
- Lite mode: pendiente
- Ops panel: pendiente

Bloqueos:
- Ninguno / listar bloqueo exacto
```

Replace `OK / FAIL` and `pendiente` with actual results as tasks complete.

---

## Task 3: Manual Validation — Racing And Edit Overlay

**Files:**
- Update: `.omo/evidence/v2-mvp-manual-checklist.md`
- Optional fix only if blocking bug appears: `vantare-v2/frontend/src/overlay/*`, `vantare-v2/internal/window/*`, `vantare-v2/internal/app/profile_service.go`

- [ ] **Step 1: Launch racing profile**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- Overlay window opens transparent/shrink-wrap.
- Widgets render.
- No `Loading profile...` stuck state.
- Overlay is not fullscreen in racing mode.

- [ ] **Step 2: Launch edit profile**

Stop the previous app, then run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json -edit
```

Expected:

- Overlay enters edit/fullscreen mode intentionally.
- Widgets are draggable.
- Removed overlay `Guardar`/`Salir` buttons are not present.
- App can be closed normally from the window/taskbar without trapping the user.

- [ ] **Step 3: Record results**

Create or update `.omo/evidence/v2-mvp-manual-checklist.md`:

```markdown
# Vantare v2 MVP Manual Checklist

## Racing Overlay

- [ ] Hub opens
- [ ] Overlay transparent/shrink-wrap
- [ ] Widgets render
- [ ] No Loading profile stuck state
- [ ] Not fullscreen

Notes:
- Result:

## Edit Overlay

- [ ] Edit mode opens intentionally
- [ ] Widgets draggable
- [ ] No broken Guardar/Salir buttons inside overlay
- [ ] App can be closed normally

Notes:
- Result:
```

---

## Task 4: Manual Validation — OBS / HTTP / SSE

**Files:**
- Update: `.omo/evidence/v2-mvp-manual-checklist.md`
- Optional fix only if blocking bug appears: `vantare-v2/internal/server/*`, `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx`

- [ ] **Step 1: Launch streaming profile**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-streaming.json
```

Expected:

- HTTP server starts on `127.0.0.1:39261`.
- Desktop overlay window does not interfere; streaming mode moves it off-screen 1x1.

- [ ] **Step 2: Verify HTTP endpoints**

In a second PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=default-streaming"
Invoke-WebRequest "http://127.0.0.1:39261/overlay?profile=example-streaming.json"
```

Expected:

- `/health` returns 200 and `{"ok":true}`.
- `/api/profile` works by filename and id.
- `/overlay` returns HTML.

- [ ] **Step 3: Verify SSE**

Run:

```powershell
curl.exe -N http://127.0.0.1:39261/telemetry/stream
```

Expected:

- Response includes SSE events named `telemetry`.
- Stop with `Ctrl+C` after confirming at least one event.

- [ ] **Step 4: Optional OBS real check**

If OBS is installed and available, add a Browser Source:

```text
URL: http://127.0.0.1:39261/overlay?profile=example-streaming.json
Width: 1920
Height: 1080
Shutdown source when not visible: enabled
Refresh browser when scene becomes active: enabled
```

Expected:

- Overlay appears in OBS.
- Transparent background works.
- Widgets render.

If OBS is not available, record: `OBS real no validado; HTTP/SSE sí validado`.

- [ ] **Step 5: Record results**

Append to `.omo/evidence/v2-mvp-manual-checklist.md`:

```markdown
## OBS / HTTP / SSE

- [ ] Streaming profile launches
- [ ] Desktop overlay does not interfere
- [ ] /health 200
- [ ] /api/profile by filename 200
- [ ] /api/profile by id 200
- [ ] /overlay 200
- [ ] /telemetry/stream emits telemetry events
- [ ] OBS real Browser Source validated or explicitly skipped

Notes:
- Result:
```

---

## Task 5: Manual Validation — F7/F8/F9 UI State

**Files:**
- Update: `.omo/evidence/v2-mvp-manual-checklist.md`
- Optional fix only if blocking bug appears: relevant frontend file with focused test

- [ ] **Step 1: Verify widget stability**

With `go run ./cmd/vantare -profile configs/example-racing.json` running:

Expected:

- Delta, Relative, and Standings render.
- Widgets do not visibly flicker.
- No rapid full React tree re-render should be obvious.

If DevTools/Performance is available, record whether callbacks roughly respect:

```text
Delta: <= 30 Hz
Relative: <= 15 Hz
Standings: <= 15 Hz
```

- [ ] **Step 2: Verify Lite mode**

In Hub:

- Click `Lite OFF`.
- Confirm it changes to `Lite ON`.
- Confirm `<html>` has `data-theme="vantare-lite"` and `data-visual-mode="lite"` if DevTools are available.
- Confirm layout does not break.
- Confirm topbar blur/effects are reduced.

- [ ] **Step 3: Verify Ops panel**

Expected:

- Hub Dashboard shows `Ops`.
- It transitions from `Esperando métricas` to values.
- RAM app is shown in MB.
- CPU app shows `N/D`.
- Goroutines shows an integer.
- Fuente shows `Mock telemetry` when not using `-live`.

- [ ] **Step 4: Record results**

Append to `.omo/evidence/v2-mvp-manual-checklist.md`:

```markdown
## F7/F8/F9 UI

- [ ] Widgets render without visible flicker
- [ ] Widget FPS measured or noted as not measured
- [ ] Lite mode toggles
- [ ] Lite mode does not break layout
- [ ] Ops panel receives metrics
- [ ] CPU shows N/D
- [ ] Source shows Mock telemetry without -live

Notes:
- Result:
```

---

## Task 6: Documentation Sync

**Files:**
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
- Modify: `docs/V2-MASTER-PLAN.md`

- [ ] **Step 1: Sync master plan status**

In `docs/V2-MASTER-PLAN.md`, update the phase table to match current reality:

```markdown
| **6** | OBS / SSE | HTTP embebido, modo streaming-only | Browser source + SSE localhost | ✅ Técnico |
| **7** | Optimización UI | FPS por widget + diff payload | Standings 15 Hz, delta 30 Hz | ✅ Técnico |
| **8** | Temas | CSS variables + Lite mode | Swap tema en runtime | ✅ Técnico |
| **9** | Ops + multi-sim | Ops panel + multi-sim foundation | RAM/goroutines + metadata fuente | ✅ Técnico |
```

- [ ] **Step 2: Add closeout section to current state**

In `docs/proyecto/04-ESTADO-ACTUAL.md`, add a short section after the phase table:

```markdown
## Cierre técnico MVP

Estado: en validación manual F6-F9.

Pendiente antes de post-MVP:

- Validar OBS real o dejar constancia explícita de que solo HTTP/SSE fue validado.
- Registrar medición manual F7/F8 si DevTools está disponible.
- Confirmar Ops panel en Hub.
- Mantener F6-F9 como `✅ técnico` hasta validación completa de experiencia.
```

If all manual validations pass, change `Estado: en validación manual F6-F9.` to:

```markdown
Estado: MVP técnico validado manualmente, con pendientes externos documentados.
```

- [ ] **Step 3: Add closeout verification commands**

In `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`, add:

```markdown
## Verificación cierre MVP técnico

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-racing.json
go run ./cmd/vantare -profile configs/example-streaming.json
```

Evidencia:

- `.omo/evidence/v2-mvp-closeout.txt`
- `.omo/evidence/v2-mvp-manual-checklist.md`
```

- [ ] **Step 4: Update evidence final status**

Update `.omo/evidence/v2-mvp-closeout.txt`:

```text
Estado: validado / validado con pendientes / bloqueado

Bloqueos:
- Ninguno
```

Use `validado con pendientes` if OBS real or LMU live could not be tested.

---

## Task 7: Blocking Bug Policy

**Files:**
- Only files directly related to a blocking bug

If a blocking bug appears during manual validation:

- [ ] **Step 1: Write a failing test when the bug is testable**

Examples:

```powershell
go test ./internal/server -run TestName -v
pnpm --dir frontend test src/path/file.test.tsx
```

- [ ] **Step 2: Apply the smallest fix**

Allowed fixes:

- endpoint regression
- profile loading regression
- overlay stuck on loading
- broken Lite mode state
- Ops payload crash
- window mode regression

Not allowed in this closeout:

- new widgets
- new adapters
- auth/cloud
- redesign
- refactor unrelated modules

- [ ] **Step 3: Re-run full verification**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: PASS.

---

## Acceptance Criteria

- `go test ./...` passes.
- `pnpm --dir frontend test` passes.
- `pnpm --dir frontend build` passes.
- Racing overlay manually validated.
- Edit mode manually validated enough to confirm no user-trap regression.
- HTTP/SSE OBS flow manually validated.
- OBS real either validated or explicitly marked unavailable.
- Lite mode manually validated.
- Ops panel manually validated.
- `docs/V2-MASTER-PLAN.md` no longer shows F7-F9 as stale pending.
- `.omo/evidence/v2-mvp-closeout.txt` created with real results.
- `.omo/evidence/v2-mvp-manual-checklist.md` created with real results.
- No changes under `apps/desktop/`.
- No commit or push.

---

## Self-Review

- Spec coverage: validates F6 OBS/SSE, F7 widget FPS behavior, F8 Lite mode, F9 Ops panel, docs sync, and evidence.
- Placeholder scan: no `TBD`/`TODO`; all pending states are instructions to replace with real validation results.
- Type consistency: no new runtime types introduced; this plan is mostly verification and documentation.
