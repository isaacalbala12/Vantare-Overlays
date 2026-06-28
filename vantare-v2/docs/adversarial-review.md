# Review adversarial (plantilla reutilizable)

Documento vivo. Cada vez que se hace un review adversarial de una tarea (release engineering, CI, seguridad, arquitectura), se **reemplaza** el contenido de la seccion "Review actual" manteniendo la cabecera y la estructura.

Instrucciones de uso:
- No cambiar la cabecera ni la estructura de secciones.
- Reemplazar solo el bloque "Review actual".
- Mover el review anterior a "Historico" (ultima entrada arriba) con un enlace de ancla al veredicto.
- Borrar el historico cuando crezca demasiado; el veredicto y los P0/P1/P2 abiertos deben quedar referenciados en `docs/current-plan.md`.

Convencion de severidades:
- **P0**: bloqueante, no se puede mergear/publicar.
- **P1**: debe corregirse antes de cerrar la tarea.
- **P2**: deberia corregirse antes de cerrar la tarea o declararse como follow-up explicito.
- **P3**: no bloqueante, mejora de robustez/higiene, puede quedar como deuda documentada.

Veredictos posibles:
- **BLOCKED**: hay P0 o riesgo inaceptable.
- **NEEDS FIXES**: hay P1 que deben corregirse.
- **ACCEPT WITH P3**: no hay P0/P1/P2 abiertos; solo P3 documentados.
- **ACCEPT**: no hay findings accionables.

---

## Review actual

### R03.H - Cierre de Release 03 tras smoke + decision firma de codigo (2026-06-28, review final)

**Reviewer:** worker senior de release engineering y documentacion.
**Tarea revisada:** R03.H - cerrar Release 03 aplicando solo fixes pequenos derivados del smoke R03.G (A: tag-guard en Discord, B: release.yml idempotente) y documentar la decision de firma de codigo.
**Nota de alcance:** no se toca Go/frontend, no se toca VERSION, no se crean tags/releases, no se envia Discord, no se hace commit/push, no se anaden secrets, no se toca Stripe/licensing.

**Archivos revisados:**
- `.github/workflows/discord-beta-progress.yml`
- `.github/workflows/discord-known-issues.yml`
- `.github/workflows/release.yml`
- `docs/current-plan.md`
- `docs/technical-debt.md`
- `docs/release-beta-operations-runbook.md`

### Veredicto: ACCEPT WITH P3 (ningun P0/P1/P2 abierto en el alcance R03.H)

Los tres hallazgos accionables del smoke R03.G quedan corregidos: tag-guard en los dos workflows de Discord no-release, `release.yml` idempotente con deteccion explicita + `gh release upload --clobber` para los 6 assets, y decision documentada de firma de codigo (beta privada sin firma + release publico requiere Authenticode). Se cierra el circulo de Release 03 a nivel de implementacion y documentacion.

### Checks ejecutados
- `git diff --check` → limpio (verificado en seccion de evidencia final).
- Validacion YAML de los 3 workflows modificados con `python -c "import yaml; yaml.safe_load(...)"` → OK en los tres.
- Dry-run estatico del bloque bash de `release.yml`: script temporal con dos ramas (existe / no existe) verifica sintaxis bash, declaracion de `ASSETS` y branching sin invocar `gh`. Script borrado despues de la verificacion (no queda en working copy).
- Lectura estatica completa de los 3 workflows, `current-plan.md`, `technical-debt.md`, `release-beta-operations-runbook.md` y `adversarial-review.md`.

### Checks no ejecutados
- Ejecucion real de los workflows en GitHub Actions (no se hace commit/push en esta tarea).
- Envio real de webhook a Discord (no se envia Discord en esta tarea).
- `gh release upload --clobber` real contra una GitHub Release existente (no se crea ninguna release en esta tarea).
- Smoke end-to-end del updater contra una release real (cubierto por R03.G).

### Findings

#### P0
Ninguno.

#### P1
Ninguno.

#### P2
Ninguno.

#### P3

##### P3-1 - `gh release upload --clobber` borra el asset previo antes de subir el nuevo (ACEPTADO, documentado)
**Archivo:** `.github/workflows/release.yml`.
**Razonamiento:** `--clobber` es el comportamiento nativo documentado de `gh release upload`: si el upload falla, el asset original se pierde. En el flujo de Vantare los assets se recalculan en cada build desde `wails3 task release:artifacts`, por lo que el riesgo es bajo (los `.sha256` siempre acompanaran al binario con su hash real). Documentado explicitamente en el runbook para que el operador lo sepa antes de re-correr el workflow.

##### P3-2 - Verificacion real de `release.yml` idempotente pendiente (ACEPTADO)
**Archivo:** `.github/workflows/release.yml`.
**Razonamiento:** el dry-run estatico cubre sintaxis bash y enumeracion de assets, pero no cubre un re-run real sobre una release ya publicada. Se valida en el primer re-run real o antes del primer tag publico. Recomendado como smoke check del primer tag `v*` post-R03.

##### P3-3 - `roadmap-execution-board.md` puede estar stale respecto a `current-plan.md` (HEREDADO)
**Archivo:** `.github/workflows/discord-beta-progress.yml`.
**Razonamiento:** P3 heredado de R03.E (P3-4 alli). El workflow mejoro en robustez (idempotencia, HTTP, tag-guard) pero sigue parseando `roadmap-execution-board.md`. Mantener la coherencia entre `current-plan.md` y `roadmap-execution-board.md` es responsabilidad del equipo/operador. Documentado en el runbook.

##### P3-4 - TD-027 (firma de codigo) sigue abierto para release publico (ACEPTADO)
**Archivo:** `docs/technical-debt.md`.
**Razonamiento:** la decision explicita es NO firmar en beta privada y firmar antes del primer release publico. TD-027 registra el gap y los pasos a seguir. Beta privada no se bloquea; release publico si.

### Confirmacion por dimension

**1. Tag-guard Discord no-release - PASS**
- `discord-beta-progress.yml`: job-level `if: github.ref_type != 'tag'` + step explicativo `::notice::` con referencia a `Discord release announcement` / `Discord build available`.
- `discord-known-issues.yml`: mismo patron, mismo mensaje.
- `workflow_dispatch` sigue funcionando: en un dispatch `github.ref_type` es `branch` (no `tag`), por lo que el job se ejecuta.
- Push normal a `master` sigue funcionando: `github.ref_type` es `branch`, el job se ejecuta y el filtro de `paths` decide si hay anuncio.

**2. `release.yml` idempotente - PASS**
- Detecta existencia con `gh release view "$TAG" >/dev/null 2>&1` (exit code, sin grep fragile).
- Rama "existe": `gh release edit --title --notes-file` + 6 `gh release upload --clobber` (uno por asset, sin glob).
- Rama "no existe": `gh release create` con los 6 assets enumerados explicitamente (cierra TD-004 ademas).
- Verificacion previa de los 6 assets con `::error::` claro si falta alguno.
- Verificacion final imprime `assets=<count>` para confirmar.

**3. Documentacion coherente - PASS**
- `current-plan.md`: anadido bloque R03.G (smoke) + bloque R03.H (cierre con fixes).
- `technical-debt.md`: TD-003 y TD-004 cerrados con fecha y resumen del fix; TD-027 (firma) y TD-028 (releases historicas sin sha256) abiertos con motivo, release objetivo y riesgo.
- `release-beta-operations-runbook.md`: secciones nuevas para tag-guard, politica "no release por commit", `release.yml` idempotente, releases historicas y firma de codigo.

**4. Restricciones respetadas - PASS**
- No se toco Go/frontend.
- No se toco `VERSION`.
- No se crearon tags ni releases.
- No se envio Discord.
- No se hizo commit/push.
- No se anadieron secrets.
- No se toco Stripe/licensing.

### Riesgos restantes
1. **Smoke real pendiente:** no se ejecutaron los workflows en GitHub Actions ni `gh release upload --clobber` contra una release real. Recomendado un smoke test del primer tag `v*` post-R03.
2. **Firma de codigo ausente en beta privada:** los testers veran el aviso de SmartScreen. Aceptado y documentado.
3. **Releases historicas sin `.sha256`:** el updater cae al flujo sin verificacion contra esos tags. Documentado como TD-028; los testers que vengan de un tag legacy no tendran verificacion de checksum hasta el siguiente update.
4. **`gh` CLI no disponible o sin permisos:** si el runner no tiene `gh` o el token no puede escribir releases, el job `release` falla. El job `build` sigue completandose y deja los artefactos como GitHub Actions artifact.

### Conclusion
R03 puede cerrarse a nivel de implementacion y documentacion. Los 4 hallazgos del smoke R03.G quedan resueltos: tag-guard en Discord, `release.yml` idempotente, documentacion de firma de codigo y de releases historicas, y politica explicita de "no release por commit". No quedan P0/P1/P2 abiertos en el alcance. Se recomienda un smoke real del primer tag `v*` post-R03 antes de promover a beta privada distribuida a mas testers.

---

## Historico

### R03.E - Discord release notification hardening (2026-06-28, review final)
**Veredicto:** [ACCEPT WITH P3](#review-actual). P0/P1/P2 cerrados; P3-1 (idempotencia limitada a re-runs), P3-2 (dependencia de `gh` CLI), P3-3 (validacion real de webhooks pendiente) y P3-4 (coherencia de roadmap) documentados. Sustituida por la review de R03.H (ver `## Review actual`).

### R03.D - Updater runtime hardening (2026-06-28, review final)
**Veredicto:** ACCEPT WITH P3. P1-1, P2-1, P2-2 y P2-3 corregidos. Sin P0/P1/P2 abiertos en el alcance R03.D-updater. Los P2/P3 heredados de UX/portable zip se mantuvieron fuera de alcance para R03.E/F. Sustituido por la review de R03.E (ver `## Review actual`).

### R03.D - Updater runtime hardening (2026-06-28, P1/P2 de segunda pasada abiertos)
**Veredicto:** segunda revision del runtime del updater encontro P1-1 (startup check sin cancelar HTTP), P2-1 (URL sin validar esquema), P2-2 (race en settings) y P2-3 (veredicto documental incoherente). Sustituida por la review final del 2026-06-28 (ver `## Review actual`), que cierra P1-1, P2-1, P2-2 y P2-3. Los P2/P3 heredados de UX/portable zip se mantuvieron fuera de alcance para R03.E/F.

### R03.D - Updater runtime hardening (2026-06-27, P1 activos)
**Veredicto:** review inicial con P1 activos (URL hardcodeada, goroutine sin context, sin cache/rate-limit, checksum no obligatorio). Resuelto en el cierre del worker senior Go/updater/runtime; los P1 fueron subsumidos en los P1/P2 de la segunda pasada (2026-06-28).

### R03.C - GitHub Actions release build (2026-06-27)
**Veredicto:** [ACCEPT WITH P3](#review-actual). P2-1 (gate de tests ausente) corregido el 2026-06-27 anadiendo 4 steps de gate al job `build` antes de `Build release artifacts`: `go test ./...`, `pnpm install`, `pnpm test`, `pnpm lint`. Quedan tres P3 de robustez no bloqueantes (P3-1 release idempotente, P3-2 glob amplio en `gh release create`, P3-3 verificacion de version NSIS, P3-4 nota doc de `SHA256SUMS.txt`).