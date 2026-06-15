# Manual Real Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate Vantare v2 in real/manual conditions for the remaining MVP gaps: OBS Browser Source, LMU live, Lite mode, widget FPS, and edit-mode dragging.

**Architecture:** This is a validation-only plan. It creates evidence and may document bugs, but it should not implement new features. If a blocking defect is found, stop and report it with reproduction steps; only apply a code fix if Isaac explicitly asks after review.

**Tech Stack:** Windows 10/11, PowerShell, Go/Wails v3 app, React Hub, OBS Studio if available, LMU if available, WebView2/Chrome DevTools if available.

---

## Scope

In scope:

- Validate OBS real Browser Source using `example-streaming.json`.
- Validate LMU live source using `-live` if LMU is installed and can be opened in pista.
- Validate Lite mode interactively in the Hub.
- Validate widget update behavior/FPS with DevTools if available.
- Validate edit mode drag behavior.
- Record evidence and exact pending items.

Out of scope:

- New features.
- iRacing/Assetto Corsa adapters.
- Auth/cloud/Supabase.
- Hub redesign.
- Changes under `apps/desktop/`.
- Commit/push.

---

## File Map

Create:

- `.omo/evidence/v2-manual-real-validation.md` — main validation report.
- `.omo/evidence/v2-manual-real-validation-notes.txt` — raw notes, logs, endpoint output summaries.

Modify:

- `docs/proyecto/04-ESTADO-ACTUAL.md` — only if validation changes the known state.
- `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` — only if a command/checklist needs correction.

Do not modify code unless Isaac explicitly approves a bugfix after seeing the validation result.

---

## Task 1: Preflight

**Files:**
- Create: `.omo/evidence/v2-manual-real-validation.md`
- Create: `.omo/evidence/v2-manual-real-validation-notes.txt`

- [ ] **Step 1: Record git state**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
git status -sb
```

Expected:

- Working tree may contain uncommitted F6-F9/MVP closeout work.
- Do not revert anything.
- Confirm no planned edits under `apps/desktop/`.

- [ ] **Step 2: Run automatic baseline**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected:

- `go test ./...` PASS.
- `pnpm --dir frontend test` PASS.
- `pnpm --dir frontend build` PASS.

- [ ] **Step 3: Create evidence files**

Create `.omo/evidence/v2-manual-real-validation.md`:

```markdown
# Vantare v2 Manual Real Validation

Fecha: 2026-06-13
Estado: en curso

## Baseline automático

- [ ] `go test ./...`
- [ ] `pnpm --dir frontend test`
- [ ] `pnpm --dir frontend build`

## Entorno

- OBS disponible: sí/no
- LMU disponible: sí/no
- DevTools disponible: sí/no

## Resultado resumido

- OBS real:
- LMU live:
- Lite mode:
- Widget FPS:
- Edit drag:

## Bloqueos

- Ninguno / listar
```

Create `.omo/evidence/v2-manual-real-validation-notes.txt`:

```text
Vantare v2 manual real validation notes
Fecha: 2026-06-13

Raw notes:
```

---

## Task 2: OBS Real Browser Source Validation

**Files:**
- Update: `.omo/evidence/v2-manual-real-validation.md`
- Update: `.omo/evidence/v2-manual-real-validation-notes.txt`

- [ ] **Step 1: Start streaming profile**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-streaming.json
```

Expected:

- App starts.
- Hub opens.
- Streaming desktop overlay does not interfere.
- HTTP server logs OBS URL.

- [ ] **Step 2: Verify endpoints before opening OBS**

In another PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:39261/health
Invoke-WebRequest "http://127.0.0.1:39261/api/profile?profile=example-streaming.json"
Invoke-WebRequest "http://127.0.0.1:39261/overlay?profile=example-streaming.json"
```

Expected:

- `/health`: HTTP 200.
- `/api/profile`: HTTP 200.
- `/overlay`: HTTP 200 HTML.

- [ ] **Step 3: Verify SSE**

Run:

```powershell
curl.exe -N http://127.0.0.1:39261/telemetry/stream
```

Expected:

- At least one `event: telemetry`.
- At least one `data: {...}` payload.
- Stop with `Ctrl+C`.

- [ ] **Step 4: Open OBS if available**

If OBS is installed:

1. Open OBS Studio.
2. Create or select a scene.
3. Add `Browser Source`.
4. Use:

```text
URL: http://127.0.0.1:39261/overlay?profile=example-streaming.json
Width: 1920
Height: 1080
Shutdown source when not visible: enabled
Refresh browser when scene becomes active: enabled
```

Expected:

- Overlay appears in OBS.
- Background is transparent.
- Widgets render.
- No `Loading overlay...` stuck state.
- No repeated console/network errors if OBS browser logs are accessible.

If OBS is not installed/available, record:

```text
OBS real: no validado por falta de OBS. HTTP/SSE sí validado.
```

- [ ] **Step 5: Record result**

Append to `.omo/evidence/v2-manual-real-validation.md`:

```markdown
## OBS Real Browser Source

- [ ] Streaming profile starts
- [ ] `/health` 200
- [ ] `/api/profile` 200
- [ ] `/overlay` 200
- [ ] `/telemetry/stream` emits telemetry
- [ ] OBS Browser Source displays overlay
- [ ] Transparent background confirmed
- [ ] No Loading overlay stuck state

Result:
- PASS / FAIL / NOT AVAILABLE

Notes:
-
```

---

## Task 3: LMU Live Validation

**Files:**
- Update: `.omo/evidence/v2-manual-real-validation.md`
- Update: `.omo/evidence/v2-manual-real-validation-notes.txt`

- [ ] **Step 1: Confirm LMU availability**

Check manually:

- LMU installed.
- LMU can launch.
- Player can enter a track/session, not only main menu.

If LMU is unavailable, record:

```text
LMU live: no validado por falta de LMU abierto/en pista.
```

Stop this task if LMU is unavailable.

- [ ] **Step 2: Run LMU debug once**

With LMU open and in pista:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/lmu-debug -once
```

Expected:

- Command prints real track/speed/gear/rpm/fuel/lap values.
- Values should not all be zero unless the car is stationary and telemetry still reports session info.

- [ ] **Step 3: Run app live**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -live -profile configs/example-racing.json
```

Expected:

- App starts.
- Overlay widgets render.
- Hub Ops source shows `Le Mans Ultimate`.
- No crash if LMU is closed after startup; if it crashes, record as bug.

- [ ] **Step 4: Record result**

Append to `.omo/evidence/v2-manual-real-validation.md`:

```markdown
## LMU Live

- [ ] LMU installed/open
- [ ] LMU in pista/session
- [ ] `go run ./cmd/lmu-debug -once` returns live-looking values
- [ ] `go run ./cmd/vantare -live -profile configs/example-racing.json` starts
- [ ] Hub Ops source shows `Le Mans Ultimate`
- [ ] Overlay widgets render with live source

Result:
- PASS / FAIL / NOT AVAILABLE

Notes:
-
```

---

## Task 4: Lite Mode Interactive Validation

**Files:**
- Update: `.omo/evidence/v2-manual-real-validation.md`

- [ ] **Step 1: Start racing profile**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- Dashboard visible.

- [ ] **Step 2: Toggle Lite mode**

In the Hub topbar:

1. Find `Lite OFF`.
2. Click it.
3. Confirm it changes to `Lite ON`.
4. Click again.
5. Confirm it changes back to `Lite OFF`.

Expected:

- No layout break.
- No blank page.
- No console/runtime error visible.
- Visual effects reduce in Lite mode.

- [ ] **Step 3: Confirm DOM state if DevTools available**

If DevTools are available, inspect `<html>`:

Expected with Lite ON:

```text
data-theme="vantare-lite"
data-visual-mode="lite"
```

Expected with Lite OFF:

```text
data-theme="vantare-v5"
data-visual-mode="full"
```

- [ ] **Step 4: Confirm persistence**

With Lite ON:

1. Close app.
2. Reopen:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Theme remains Lite ON if localStorage persisted.
- If not persisted, record exact behavior.

- [ ] **Step 5: Record result**

Append to `.omo/evidence/v2-manual-real-validation.md`:

```markdown
## Lite Mode

- [ ] Toggle OFF → ON
- [ ] Toggle ON → OFF
- [ ] Layout remains usable
- [ ] Effects reduced
- [ ] `<html>` data attributes confirmed or DevTools unavailable
- [ ] Persistence checked

Result:
- PASS / FAIL

Notes:
-
```

---

## Task 5: Widget FPS / Update Behavior Validation

**Files:**
- Update: `.omo/evidence/v2-manual-real-validation.md`

- [ ] **Step 1: Start app**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Widgets render.
- No visible flicker.

- [ ] **Step 2: Visual validation without DevTools**

Observe for at least 30 seconds:

- Delta widget stable.
- Relative widget stable.
- Standings widget stable.
- No obvious flicker.
- No visible UI freeze.

- [ ] **Step 3: DevTools Performance validation if available**

If DevTools are available:

1. Open Performance panel.
2. Record 10 seconds.
3. Check widget update cadence.

Expected:

```text
DeltaWidget: <= 30 Hz
RelativeWidget: <= 15 Hz
StandingsWidget: <= 15 Hz
```

If exact measurement is not practical, record:

```text
FPS exacto no medido; validación visual sin flicker completada.
```

- [ ] **Step 4: Record result**

Append to `.omo/evidence/v2-manual-real-validation.md`:

```markdown
## Widget FPS / Update Behavior

- [ ] Delta visible/stable
- [ ] Relative visible/stable
- [ ] Standings visible/stable
- [ ] No visible flicker
- [ ] DevTools measurement completed or explicitly skipped

Measured:
- Delta:
- Relative:
- Standings:

Result:
- PASS / FAIL / PARTIAL

Notes:
-
```

---

## Task 6: Edit Mode Drag Validation

**Files:**
- Update: `.omo/evidence/v2-manual-real-validation.md`

- [ ] **Step 1: Back up profile before drag**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
Copy-Item configs\example-racing.json configs\example-racing.validation-backup.json -Force
```

Expected:

- Backup file created.

- [ ] **Step 2: Start edit mode**

Run:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json -edit
```

Expected:

- Edit mode opens intentionally.
- Widgets visible.
- No broken `Guardar`/`Salir` buttons inside overlay.

- [ ] **Step 3: Drag one widget**

Manual:

1. Drag the Delta widget a small distance.
2. Wait at least 1 second for debounce/save.
3. Close app.

Expected:

- Widget moves.
- App does not freeze.
- No fullscreen trap beyond intentional edit mode.

- [ ] **Step 4: Confirm JSON changed**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
git diff -- configs\example-racing.json
```

Expected:

- Widget position changed.
- If no diff, record that drag/save did not persist.

- [ ] **Step 5: Restore backup after validation**

Run:

```powershell
Copy-Item configs\example-racing.validation-backup.json configs\example-racing.json -Force
Remove-Item configs\example-racing.validation-backup.json -Force
```

Expected:

- Profile restored.
- No permanent example config mutation remains.

- [ ] **Step 6: Record result**

Append to `.omo/evidence/v2-manual-real-validation.md`:

```markdown
## Edit Mode Drag

- [ ] Backup created
- [ ] Edit mode opens
- [ ] Widget dragged
- [ ] Position persisted to JSON
- [ ] Backup restored
- [ ] No broken overlay Guardar/Salir buttons

Result:
- PASS / FAIL / PARTIAL

Notes:
-
```

---

## Task 7: Final Documentation Update

**Files:**
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` only if commands/checklists changed
- Update: `.omo/evidence/v2-manual-real-validation.md`

- [ ] **Step 1: Set final evidence status**

At the top of `.omo/evidence/v2-manual-real-validation.md`, set:

```markdown
Estado: validado
```

or:

```markdown
Estado: validado con pendientes
```

or:

```markdown
Estado: bloqueado
```

Use `validado con pendientes` if OBS/LMU/DevTools are not available.

- [ ] **Step 2: Update current state doc**

In `docs/proyecto/04-ESTADO-ACTUAL.md`, update the `Cierre técnico MVP` section.

If all validations pass:

```markdown
Estado: MVP técnico validado manualmente.
```

If some external tools were unavailable:

```markdown
Estado: MVP técnico validado con pendientes externos documentados.

Pendientes externos:

- OBS real: validado / no disponible
- LMU live: validado / no disponible
- FPS DevTools: medido / no disponible
- Edit drag: validado / parcial
```

- [ ] **Step 3: Run final automatic verification**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected:

- All PASS.

---

## Acceptance Criteria

- Automatic baseline passes.
- OBS real is validated or explicitly marked unavailable.
- LMU live is validated or explicitly marked unavailable.
- Lite mode is validated interactively.
- Widget stability/FPS is validated visually or measured with DevTools.
- Edit drag is validated and example profile is restored.
- Evidence files created and filled with real results.
- `docs/proyecto/04-ESTADO-ACTUAL.md` reflects true validation state.
- No code changes unless Isaac explicitly asks for a fix.
- No changes under `apps/desktop/`.
- No commit or push.

---

## Self-Review

- Spec coverage: covers every unresolved manual gap from MVP closeout: OBS real, LMU live, Lite mode, FPS/widgets, drag edit.
- Placeholder scan: no TBD/TODO placeholders; PASS/FAIL/NOT AVAILABLE entries are explicit result slots for the validator to fill.
- Type consistency: no new code contracts introduced.
