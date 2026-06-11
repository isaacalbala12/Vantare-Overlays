# 07 — Telemetría Le Mans Ultimate (LMU)

---

## Problema

LMU expone ~325 KB de shared memory (`LMU_Data`) con structs C++ `#pragma pack(4)`. Go **no puede** mapear el struct completo con alineación correcta de forma segura.

---

## Solución v2

1. **Build-time:** Python + ctypes (`pyLMUSharedMemory` o script en `tools/`) genera offsets.
2. **Runtime:** Go lee mmap y parsea campos por **offset fijo** (`internal/telemetry/lmu/parser.go`).
3. **Normalizer** convierte a `pkg/models` unificado.
4. **Pipeline** aplica deadband + throttle 30 Hz + diff JSON hacia frontend.

---

## Flujo

```
LMU.exe (en pista)
  → mmap "LMU_Data" (Windows)
  → Reader (60 Hz poll, zero-copy slice)
  → Parser (offsets)
  → Normalizer → TelemetrySnapshot
  → telemetry.Service.Subscribe()
  → TelemetryBridge → Wails Events → telemetry-ref.ts (frontend)
```

---

## CLI de debug

Desde `vantare-v2/`:

```powershell
# Mock (sin sim)
go run ./cmd/lmu-debug -mock -once

# Live (LMU abierto en pista)
go run ./cmd/lmu-debug -once
go run ./cmd/lmu-debug -hz 10
```

Salida mock esperada:

```
track=Spa | speed=54.0 km/h | gear=4 | rpm=7200 | fuel=45.2 L | lap=0
```

---

## App overlay con telemetría

```powershell
go run ./cmd/vantare              # mock
go run ./cmd/vantare -live       # LMU real
```

---

## Tests sin LMU

- Fixture binario: `vantare-v2/testdata/lmu-fixture.bin`
- JSON derivado: `testdata/lmu-fixture.json`
- Tests: `internal/telemetry/lmu/*_test.go`

```powershell
cd vantare-v2
go test ./internal/telemetry/...
```

---

## Frecuencias y deadband

| Capa | Detalle |
|------|---------|
| Lectura | 60 Hz goroutine dedicada |
| Deadband | Campos estables no re-emite (`internal/core/deadband.go`) |
| UI | Máx 30 Hz; widgets pueden usar menos (15 Hz standings) |
| Frontend | `telemetry-ref.ts` — merge diff, sin React state global 60 Hz |

---

## Requisitos LMU

- Windows 10/11
- Le Mans Ultimate en ejecución **en pista** (no solo menú) para live
- Shared memory plugin / API LMU según documentación del sim (ver README v2 cuando se documente 1.5)

---

## Fase 1 pendiente menor

- Ampliar parser (más campos standings/sesión) según necesidad widgets.
- Validación live checklist en miniplan `v2-f1-live-validation.md`.

---

## Referencias

- [`../V2-STACK-AND-PERFORMANCE.md`](../V2-STACK-AND-PERFORMANCE.md) §4
- [`../../vantare-v2/testdata/README.md`](../../vantare-v2/testdata/README.md)
- v1 adapter LMU en monorepo (referencia histórica)
