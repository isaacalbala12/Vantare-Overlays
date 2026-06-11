# 11 — Comandos y verificación

Todo desde PowerShell salvo indicación contraria.

---

## Requisitos

- Go 1.25+ (Wails v3)
- Node 20+
- pnpm
- Windows 10/11 (LMU mmap)

---

## Setup inicial (vantare-v2)

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Frontend deps (primera vez)
pnpm --dir frontend install

# Build frontend (requerido antes de go run vantare)
pnpm --dir frontend build
```

---

## Tests — obligatorios antes de cerrar fase

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Go (todas las suites)
go test ./...

# Frontend
pnpm --dir frontend test

# Typecheck + producción bundle
pnpm --dir frontend build
```

En PowerShell usar `;` en lugar de `&&` si encadenas:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2; go test ./...
```

---

## Ejecutar aplicación

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

# Overlay mock + Hub window
go run ./cmd/vantare

# LMU live
go run ./cmd/vantare -live

# Perfil específico
go run ./cmd/vantare -profile configs/example-racing.json

# Modo edición layout
go run ./cmd/vantare -profile configs/example-racing.json -edit

# Live + edit
go run ./cmd/vantare -live -profile configs/example-edit.json -edit
```

Abre **dos ventanas**: overlay transparente + hub 1280×800.

Hub URL interna: `/#/hub`

---

## Debug telemetría (sin Wails)

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2

go run ./cmd/lmu-debug -mock -once
go run ./cmd/lmu-debug -once          # live
go run ./cmd/lmu-debug -hz 10         # stream 10 Hz
```

---

## Tests focalizados

```powershell
# Solo hub/profile
go test ./internal/app/... -v

# Solo LMU
go test ./internal/telemetry/lmu/... -v

# Un test
go test ./internal/app/... -run TestHubServiceActivateByIDWhenFilenameDiffers -v
```

---

## Benchmarks (Fase 2+)

```powershell
go test ./internal/telemetry/... -bench=. -benchmem
```

Objetivo parse: p99 &lt; 2 ms (ver V2-STACK-AND-PERFORMANCE).

---

## Abrir referencia diseño

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
start hub_main_v5.html
```

---

## v1 Electron (legado — no confundir con v2)

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
pnpm install
pnpm dev
```

---

## Checklist pre-commit (cuando Isaac pida commit)

- [ ] `go test ./...` verde
- [ ] `pnpm --dir frontend test` verde
- [ ] `pnpm --dir frontend build` verde
- [ ] Sin secretos (.env) en staging
- [ ] Docs fase actualizados si cambió comportamiento

---

## Troubleshooting rápido

| Problema | Solución |
|----------|----------|
| `frontend/dist not found` | `pnpm --dir frontend build` |
| Hub sin perfiles | Verificar `configs/` existe; log warning configsDir |
| Activate perfil falla | Usar `file` del listado; ver 08-PERFILES |
| Live sin datos | LMU en pista, no solo menú |
| PowerShell `&&` error | Usar `;` entre comandos |
