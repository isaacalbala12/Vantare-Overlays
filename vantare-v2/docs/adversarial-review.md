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

### R03.C - GitHub Actions release build (2026-06-27)

**Reviewer:** GLM (modo review adversarial senior, review-only).
**Tarea revisada:** R03.C - GitHub Actions release build.
**Archivos revisados:**
- `.github/workflows/release.yml`
- `vantare-v2/docs/release-artifacts.md`
- `vantare-v2/docs/release-beta-operations-runbook.md`
- `vantare-v2/docs/current-plan.md`
- `vantare-v2/Taskfile.yml`
- `vantare-v2/build/windows/Taskfile.yml`
- `vantare-v2/tools/release_artifacts.ps1`
- `vantare-v2/tools/build_nsis.ps1`
- `vantare-v2/go.mod`
- `vantare-v2/VERSION`

**Objetivo del workflow:**
- `workflow_dispatch`: construir artefactos oficiales y subirlos como GitHub Actions artifacts.
- Tag `v*`: construir artefactos y crear GitHub Release automaticamente con los 6 archivos oficiales (3 artefactos + 3 `.sha256`).
- No tocar VERSION. No imprimir secretos. No publicar release desde ramas normales.

### Veredicto: ACCEPT WITH P3 (P2-1 corregido 2026-06-27)

R03.C puede cerrarse. No hay P0/P1/P2 abiertos. El P2-1 original (gate de tests ausente) fue corregido anadiendo 4 steps de gate al job `build` antes de `Build release artifacts`: `go test ./...`, `pnpm install`, `pnpm test`, `pnpm lint`. Quedan tres P3 de robustez no bloqueantes.

### Checks ejecutados
- `git status --short` → cambios sin commit identificados (R03.B/C + trabajo ajeno).
- `git diff --check` → limpio.
- `git log --oneline -10` → contexto de commits revisado.
- Validacion YAML con `python3 + pyyaml` → YAML OK.
- Inspeccion programatica de `permissions`, `needs`, `if`, jobs → coincide con la doc.
- Lectura estatica completa de `release.yml`, ambos `Taskfile.yml`, `release_artifacts.ps1`, `build_nsis.ps1`, `go.mod`, `VERSION`, `changelog.md`, `release-artifacts.md`, runbook, `current-plan.md`.
- Toolchain local sanity: node v24, pnpm 9.1, go 1.26.4 (host; el CI usa los pinned del workflow).

### Checks no ejecutados
- Ejecucion real del workflow en GitHub Actions (requiere push de tag o `workflow_dispatch` en el repo remoto).
- `wails3 task release:artifacts` en CI (windows-latest + NSIS via Chocolatey). Solo validado localmente segun `current-plan.md`.
- `gh release create` real con `GITHUB_TOKEN`.
- Comportamiento de `actions/cache@v4` para `wails3.exe` en Windows.
- Lint/test del frontend y `go test ./...` (ejecutados localmente en el fix del P2-1; ver "Fix P2-1" mas abajo).

### Findings

#### P2-1 - Gate de tests/lint/build ausente antes de release (CORREGIDO 2026-06-27)
**Archivo:** `.github/workflows/release.yml` (job `build`).
**Estado:** Corregido. Se anadieron 4 steps de gate despues del setup de Go/pnpm/Node/Wails y antes de `Build release artifacts`:
- `Gate - Go tests` → `go test ./...`
- `Gate - Frontend deps` → `pnpm install` (sin `--frozen-lockfile` porque el repo no tiene `pnpm-lock.yaml` commiteado)
- `Gate - Frontend tests` → `pnpm test`
- `Gate - Frontend lint` → `pnpm lint`

Si cualquier gate falla, el job `build` falla antes de generar artefactos, y el job `release` (que tiene `needs: build`) no se ejecuta. No se duplica `pnpm build` porque ya corre indirectamente dentro de `wails3 task release:artifacts` via `common:build:frontend`.

Verificacion local ejecutada por el worker:
- `go test ./...` → OK (cached, todos los paquetes en verde).
- `pnpm --dir frontend test` → 568 tests pasan (85 archivos).
- `pnpm --dir frontend lint` → pasa (solo un warning de ESLint sobre `.eslintignore` deprecado, no un error).

Riesgo residual menor: al no existir `pnpm-lock.yaml` en el repo, `pnpm install` en CI no es reproducible bit-exacta. Si se commitea un lockfile en el futuro, conviene cambiar a `--frozen-lockfile`. No bloquea R03.C.

#### P3-1 - `gh release create` no maneja release ya existente
**Archivo:** `release.yml:180`.
**Impacto:** Si el job `release` se re-ejecuta (re-run failed job) sobre un tag donde la Release ya se creo, `gh release create` falla con exit !=0. No duplica ni corrompe, pero deja el workflow en rojo y obliga a `gh release delete` + re-run.
**Fix recomendado:** anadir `--clobber` o pre-check:
```yaml
- name: Create or update GitHub Release
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    if gh release view "${{ github.ref_name }}" >/dev/null 2>&1; then
      echo "::warning::Release ${{ github.ref_name }} already exists; skipping creation."
      gh release upload "${{ github.ref_name }}" ${{ env.VANTARE_DIR }}/bin/* --clobber
    else
      gh release create "${{ github.ref_name }}" --title "..." --notes-file changelog_body.md ${{ env.VANTARE_DIR }}/bin/*
    fi
```

#### P3-2 - `gh release create ... bin/*` sube por globo cualquier archivo en `bin/`
**Archivo:** `release.yml:182`.
**Impacto:** El job `release` descarga el artifact en `${{ env.VANTARE_DIR }}/bin` y luego hace `gh release create ... ${{ env.VANTARE_DIR }}/bin/*`. El artifact contiene exactamente los 6 archivos hoy, asi que el globo es seguro. Pero si en el futuro alguien anade un archivo al artifact (p.ej. `SHA256SUMS.txt` mencionado como "futuro" en `release-artifacts.md:17`), se publicaria sin filtrar. Fragilidad latente, no bug actual.
**Fix recomendado:** enumerar los 6 archivos explicitos en el `gh release create` (igual que el step de upload), o validar con un `Test-Path` count antes.

#### P3-3 - `choco install nsis` sin `--pin` y sin validacion de version instalada
**Archivo:** `release.yml:67`.
**Impacto:** `choco install nsis --version=3.12.0 --no-progress --yes` instala la version pinned, pero si una version posterior ya esta instalada en la imagen `windows-latest`, Chocolatey puede no downgradear sin `--force`. El script `build_nsis.ps1` usa `Resolve-MakeNsis` que busca en Program Files (x86) primero, asi que si Chocolatey instala ahi, funciona. Riesgo bajo, pero no se verifica que `makensis` responda `v3.12.0` despues del install.
**Fix recomendado (opcional):** anadir un step de verificacion `& makensis /VERSION` y fallar si no empieza con `3.12`.

#### P3-4 - Doc `release-artifacts.md:17` promete `SHA256SUMS.txt` "en R03.C"
**Archivo:** `vantare-v2/docs/release-artifacts.md:17`.
**Impacto:** R03.C esta completado y no anade `SHA256SUMS.txt`. La fila de la tabla dice "(futuro) Se anade en R03.C si la publicacion a GitHub Releases lo necesita." Esto es contradictorio con el estado cerrado de R03.C.
**Fix recomendado:** cambiar la nota a: "(futuro) No incluido en R03.C: los `.sha256` sidecar por archivo cubren la verificacion. `SHA256SUMS.txt` global queda como opcion para un release publico posterior."

#### P3-5 - `setup-go` con `go-version-file` + `cache-dependency-path` apuntando a subdirectorio
**Archivo:** `release.yml:44-45`.
**Impacto:** `actions/setup-go@v5` con `go-version-file: vantare-v2/go.mod` y `cache-dependency-path: vantare-v2/go.sum` es correcto y soportado. Funciona. Solo nota: el `working-directory` del job es `vantare-v2`, pero `setup-go` corre antes con cwd raiz, y las rutas son relativas a la raiz del checkout - coincide. Sin accion requerida; confirmado como valido.

### Confirmacion por dimension

**1. Triggers y condiciones - PASS**
- Push de tags `v*` → build + release automaticos.
- `workflow_dispatch` con `create_release` (default false) → release solo si `startsWith(github.ref, 'refs/tags/v')`.
- No puede crear release desde rama no tag: el `if` del job `release` exige `refs/tags/v` en ambos branches del OR.
- El job `release` tiene `needs: build`: si `build` falla (falta archivo, verify falla, upload `if-no-files-found: error`), `release` no se ejecuta.

**2. Seguridad - PASS**
- `permissions: contents: read` a nivel workflow; solo el job `release` eleva a `contents: write` (job-level permission).
- `persist-credentials: false` en ambos checkouts.
- `GITHUB_TOKEN` solo en el job `release`, via `env: GH_TOKEN`, no expuesto en logs.
- No se imprimen secretos.
- No hay descarga/ejecucion remota insegura: todo es `actions/*` oficiales o `choco`/`go install` con version pinned.
- Pinning: Go via `go-version-file` (go.mod dice `go 1.25.0`), Wails `v3.0.0-alpha.98-tui` (coincide con `go.mod`), Node 22, pnpm 10, NSIS 3.12.0.
- `setup-go` con `go-version-file: vantare-v2/go.mod` puede instalar Go 1.25.0.

**3. Toolchain - PASS con nota**
- Node 22 + pnpm 10: `package.json` no fuerza version; `@wailsio/runtime 3.0.0-alpha.79` y React 19 compatibles con Node 22.
- Wails CLI `v3.0.0-alpha.98-tui` coincide exactamente con `go.mod` require.
- NSIS 3.12.0 via Chocolatey viable en `windows-latest`; `build_nsis.ps1` busca en Program Files (x86) primero, que es donde Chocolatey instala NSIS.
- Go 1.25.0: `setup-go` puede instalarlo.

**4. Build steps - PASS**
- Working directory `vantare-v2/` correcto via `defaults.run.working-directory`.
- Secuencia: `release:clean` → `release:artifacts` → `release:verify` coincide con la doc y con `Taskfile.yml`.
- Verificacion explicita de los 6 archivos con `Test-Path` y `throw` si falta.
- Upload artifact con `name: release-artifacts-${{ github.ref_name }}`: funciona en tag y en rama.
- No depende de rutas locales de Isaac: todo es relativo a `vantare-v2/` o a `{{ env.VANTARE_DIR }}`.

**5. Release creation - PASS con P3-1/P3-2**
- `gh release create` correcto sintacticamente.
- No maneja release ya existente (P3-1): re-run fallaria. No bloquea, pero fragil.
- Body desde `docs/changelog.md`: el script Python busca `## v<tag>` con regex multiline, extrae hasta el siguiente `## v` o EOF. Fallback seguro a `Release <tag>` con `::warning::` si no encuentra seccion o archivo. Probado contra `changelog.md` actual: la seccion `## v0.3.10.0` existe y el regex la capturaria.
- Solo se suben los 6 assets esperados hoy (P3-2: globo `bin/*` es seguro porque el artifact trae exactamente 6).
- Checksums corresponden a los artefactos actuales: los `.sha256` se generan en el mismo job `build` via `release_artifacts.ps1 sha256` dentro de `release:artifacts`, sobre los artefactos recien construidos. El job `release` no regenera hashes, solo los descarga del artifact. Coherente.

**6. Gate de tests - P2-1 (ver arriba)**
- Hoy se publica sin `go test`, `pnpm test`, `pnpm lint`. `pnpm build` si corre indirectamente via `wails3 task release:artifacts`.
- Aceptable para beta privada con runbook obligando tests locales. Deberia cerrarse antes de release publica estable. Propuesta de gate minimo en P2-1 (3 steps, no megaworkflow).

**7. Docs - PASS con P3-4**
- `release-artifacts.md` seccion 4.1 describe exactamente el workflow (triggers, pasos, permisos, fallback de changelog).
- No promete firma de codigo (seccion 6 dice explicitamente "sin firma", gap documentado).
- No promete updater automatico desde la Release: menciona que el updater busca el asset por nombre literal, pero no afirma que R03.C active el updater.
- Explica como dispararlo manualmente (runbook seccion 4 opcion B: `git tag` + push, y `workflow_dispatch` sin `create_release` para probar build).
- `release-beta-operations-runbook.md` seccion 4 cubre flujo local (opcion A) y flujo CI (opcion B).
- `current-plan.md` registra R03.C completado con detalles.
- Unico hueco doc: `SHA256SUMS.txt` "futuro en R03.C" (P3-4).

### Riesgos restantes
1. Sin firma de codigo (heredado de R03.B, fuera de R03.C): SmartScreen "Editor desconocido". Mitigado por checksums + canal de distribucion controlado. Se cierra en R03.H/14.
2. No reproducibilidad bit-exacta de Go: dos builds del mismo commit dan `vantare.exe` con SHA256 distinto (timestamps/paths embebidos). `-trimpath -buildvcs=false` ya aplicado. Esperado; los `.sha256` identifican el artefacto concreto, no el commit.
3. ~~Gate de tests ausente en CI (P2-1)~~ → Corregido 2026-06-27. El job `build` ahora ejecuta `go test ./...`, `pnpm install`, `pnpm test`, `pnpm lint` antes de generar artefactos.
4. Re-run de job `release` falla si la Release ya existe (P3-1): operativamente manejable pero molesto.
5. NSIS version drift en imagen `windows-latest` (P3-3): bajo riesgo, no verificado en CI real.
6. Sin ejecucion real del workflow en GitHub Actions: toda esta review es estatica. La primera vez que se pushee un tag `v*` sera el smoke test real del workflow (incluyendo los gates nuevos).
7. Sin `pnpm-lock.yaml` commiteado: `pnpm install` en CI no es reproducible bit-exacta. Si se commitea un lockfile, cambiar a `--frozen-lockfile`. No bloquea R03.C.

### Conclusion
R03.C puede cerrarse. El P2-1 (gate de tests en CI) quedo corregido el 2026-06-27. Los P3 restantes son mejoras de robustez opcionales (recomendado aplicar P3-1 y P3-2 antes del primer tag publico estable, P3-4 ya por higiene doc). No hay P0 ni P1; el workflow cumple los 7 objetivos declarados, la separacion de permisos es correcta y ahorafalla antes de generar/publicar artefactos si tests o lint fallan.

---

## Historico

(vacio - los reviews anteriores se mueven aqui cuando se reemplaza el bloque "Review actual")