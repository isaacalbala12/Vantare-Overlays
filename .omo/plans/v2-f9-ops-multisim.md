# Fase 9 Ops + Multi-Sim Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight Ops panel with app CPU/RAM metrics and prepare the telemetry service for future simulator adapters without changing LMU behavior.

**Architecture:** Keep runtime metrics separate from hot telemetry. Go owns process/system sampling at low frequency, Wails emits `ops:metrics` to the Hub only, and React renders a simple Hub panel. Multi-sim work is limited to explicit source metadata and simulator kind plumbing; do not implement iRacing/AC readers in this phase.

**Tech Stack:** Go 1.25, Wails v3 events, React 19, Vitest, PowerShell.

---

## Non-Negotiables

- Active codebase is `C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2`.
- Do not touch `apps/desktop/`.
- Do not commit or push unless Isaac explicitly asks.
- Do not put Ops metrics into the 30 Hz telemetry stream.
- Do not add cloud/auth/Supabase.
- Keep CPU/RAM budget in mind: sampling must be low frequency, default 1 Hz.
- Keep LMU working exactly as before.
- Use tests before production code where practical.

---

## File Map

Create:

- `vantare-v2/internal/ops/metrics.go` — data model and formatting helpers for app/system metrics.
- `vantare-v2/internal/ops/sampler.go` — low-frequency sampler interface and default runtime sampler.
- `vantare-v2/internal/ops/sampler_test.go` — tests for sampler defaults and payload shape.
- `vantare-v2/internal/app/ops_bridge.go` — Wails/event bridge for `ops:metrics`.
- `vantare-v2/internal/app/ops_bridge_test.go` — tests for bridge lifecycle and event payload.
- `vantare-v2/frontend/src/hub/components/OpsPanel.tsx` — Hub card that renders CPU/RAM/source information.
- `vantare-v2/frontend/src/hub/components/OpsPanel.test.tsx` — component tests.
- `.omo/evidence/v2-f9-ops-multisim.txt` — verification evidence.

Modify:

- `vantare-v2/internal/telemetry/service/source.go` — add simulator source metadata types.
- `vantare-v2/internal/telemetry/service/source_lmu.go` — make LMU source expose metadata.
- `vantare-v2/internal/app/app.go` — set mock source metadata and expose the configured telemetry source read-only.
- `vantare-v2/cmd/vantare/main.go` — start/stop OpsBridge and register low-frequency metrics events.
- `vantare-v2/frontend/src/hub/pages/DashboardPage.tsx` — place `OpsPanel` in the right column.
- `docs/proyecto/04-ESTADO-ACTUAL.md` — mark F9 as technical when verified.
- `docs/proyecto/05-PLAN-MAESTRO-FASES.md` — mark F9 as technical when verified.
- `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` — add F9 verification checklist.

---

## Task 1: Add Simulator Metadata Without Changing Telemetry Behavior

**Files:**
- Modify: `vantare-v2/internal/telemetry/service/source.go`
- Modify: `vantare-v2/internal/telemetry/service/source_lmu.go`
- Modify: `vantare-v2/internal/app/app.go`
- Test: existing Go telemetry/app tests

- [ ] **Step 1: Inspect current source construction**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays
rg "FuncSource|LMUSource|Source" vantare-v2\internal vantare-v2\cmd -n
```

Expected: find `Source` in `internal/telemetry/service/source.go`, LMU source in `source_lmu.go`, and mock source construction in app setup.

- [ ] **Step 2: Add source metadata types**

Edit `vantare-v2/internal/telemetry/service/source.go` so it contains this shape:

```go
package service

type SimulatorKind string

const (
	SimulatorUnknown SimulatorKind = "unknown"
	SimulatorMock    SimulatorKind = "mock"
	SimulatorLMU     SimulatorKind = "lmu"
	SimulatorIRacing SimulatorKind = "iracing"
	SimulatorAC      SimulatorKind = "assetto-corsa"
)

type SourceInfo struct {
	Kind      SimulatorKind `json:"kind"`
	Name      string        `json:"name"`
	Live      bool          `json:"live"`
	Available bool          `json:"available"`
}

type Source interface {
	Read() []byte
}

type SourceWithInfo interface {
	Source
	Info() SourceInfo
}

type FuncSource struct {
	ReadFunc func() []byte
	InfoData SourceInfo
}

func (f FuncSource) Read() []byte {
	if f.ReadFunc == nil {
		return nil
	}
	return f.ReadFunc()
}

func (f FuncSource) Info() SourceInfo {
	if f.InfoData.Kind == "" {
		return SourceInfo{
			Kind:      SimulatorMock,
			Name:      "Mock telemetry",
			Live:      false,
			Available: true,
		}
	}
	return f.InfoData
}

func InfoForSource(src Source) SourceInfo {
	if src == nil {
		return SourceInfo{Kind: SimulatorUnknown, Name: "No source", Live: false, Available: false}
	}
	if withInfo, ok := src.(SourceWithInfo); ok {
		return withInfo.Info()
	}
	return SourceInfo{Kind: SimulatorUnknown, Name: "Unknown source", Live: false, Available: true}
}
```

- [ ] **Step 3: Update LMU metadata**

Add this method to `vantare-v2/internal/telemetry/service/source_lmu.go`:

```go
func (s *LMUSource) Info() SourceInfo {
	return SourceInfo{
		Kind:      SimulatorLMU,
		Name:      "Le Mans Ultimate",
		Live:      true,
		Available: s != nil && s.reader != nil,
	}
}
```

- [ ] **Step 4: Update app source storage and mock source construction**

In `vantare-v2/internal/app/app.go`, add a generic source field to `App`:

```go
type App struct {
	Telemetry *service.Service
	source    service.Source
	lmuSource *service.LMUSource
	cancel    context.CancelFunc
	wg        sync.WaitGroup
}
```

Change the mock construction from function-style to struct-style. For the current code, replace:

```go
src = service.FuncSource(func() []byte { return buf })
```

with:

```go
src = service.FuncSource{
	ReadFunc: func() []byte { return buf },
	InfoData: service.SourceInfo{
		Kind:      service.SimulatorMock,
		Name:      "Mock telemetry",
		Live:      false,
		Available: true,
	},
}
```

Return the source from `New`:

```go
return &App{Telemetry: svc, source: src, lmuSource: lmuSrc}
```

Add a read-only accessor:

```go
func (a *App) TelemetrySource() service.Source {
	if a == nil {
		return nil
	}
	return a.source
}
```

- [ ] **Step 5: Run focused Go tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/telemetry/service ./internal/app -v
```

Expected: PASS. If compile fails because of old `FuncSource(...)` usage, update each usage to the struct form.

---

## Task 2: Add Low-Frequency Ops Metrics Sampler

**Files:**
- Create: `vantare-v2/internal/ops/metrics.go`
- Create: `vantare-v2/internal/ops/sampler.go`
- Create: `vantare-v2/internal/ops/sampler_test.go`

- [ ] **Step 1: Write sampler tests first**

Create `vantare-v2/internal/ops/sampler_test.go`:

```go
package ops

import (
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

func TestDefaultSamplerReturnsProcessMetrics(t *testing.T) {
	sampler := NewRuntimeSampler(service.SourceInfo{
		Kind:      service.SimulatorMock,
		Name:      "Mock telemetry",
		Live:      false,
		Available: true,
	})

	snapshot := sampler.Sample()

	if snapshot.Timestamp.IsZero() {
		t.Fatal("expected timestamp")
	}
	if snapshot.App.MemoryMB <= 0 {
		t.Fatalf("expected positive memory usage, got %.2f", snapshot.App.MemoryMB)
	}
	if snapshot.App.Goroutines <= 0 {
		t.Fatalf("expected positive goroutine count, got %d", snapshot.App.Goroutines)
	}
	if snapshot.Source.Kind != service.SimulatorMock {
		t.Fatalf("expected mock source, got %q", snapshot.Source.Kind)
	}
}

func TestDefaultIntervalIsOneSecond(t *testing.T) {
	if DefaultInterval != time.Second {
		t.Fatalf("expected 1s interval, got %s", DefaultInterval)
	}
}
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/ops -v
```

Expected: FAIL because package/files do not exist yet or functions are undefined.

- [ ] **Step 3: Add metrics model**

Create `vantare-v2/internal/ops/metrics.go`:

```go
package ops

import (
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

type ProcessMetrics struct {
	MemoryMB   float64 `json:"memoryMb"`
	CPUPercent float64 `json:"cpuPercent"`
	Goroutines int     `json:"goroutines"`
}

type SystemMetrics struct {
	MemoryMB float64 `json:"memoryMb"`
}

type MetricsSnapshot struct {
	Timestamp time.Time          `json:"timestamp"`
	App       ProcessMetrics     `json:"app"`
	System    SystemMetrics      `json:"system"`
	Source    service.SourceInfo `json:"source"`
}
```

- [ ] **Step 4: Add runtime sampler**

Create `vantare-v2/internal/ops/sampler.go`:

```go
package ops

import (
	"runtime"
	"time"

	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

const DefaultInterval = time.Second

type Sampler interface {
	Sample() MetricsSnapshot
}

type RuntimeSampler struct {
	source service.SourceInfo
}

func NewRuntimeSampler(source service.SourceInfo) *RuntimeSampler {
	return &RuntimeSampler{source: source}
}

func (s *RuntimeSampler) Sample() MetricsSnapshot {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	memoryMB := float64(mem.Alloc) / 1024 / 1024

	return MetricsSnapshot{
		Timestamp: time.Now(),
		App: ProcessMetrics{
			MemoryMB:   memoryMB,
			CPUPercent: 0,
			Goroutines: runtime.NumGoroutine(),
		},
		System: SystemMetrics{
			MemoryMB: memoryMB,
		},
		Source: s.source,
	}
}
```

Note: CPU percent can stay `0` in this phase unless a reliable Windows-safe implementation already exists in the repo. Do not add a heavy dependency just for CPU.

- [ ] **Step 5: Run ops tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/ops -v
```

Expected: PASS.

---

## Task 3: Emit Ops Metrics To The Hub At 1 Hz

**Files:**
- Create: `vantare-v2/internal/app/ops_bridge.go`
- Create: `vantare-v2/internal/app/ops_bridge_test.go`
- Modify: `vantare-v2/cmd/vantare/main.go`

- [ ] **Step 1: Write bridge lifecycle test first**

Create `vantare-v2/internal/app/ops_bridge_test.go`:

```go
package app

import (
	"sync"
	"testing"
	"time"

	"github.com/vantare/overlays/v2/internal/ops"
	"github.com/vantare/overlays/v2/internal/telemetry/service"
)

type fixedOpsSampler struct{}

func (fixedOpsSampler) Sample() ops.MetricsSnapshot {
	return ops.MetricsSnapshot{
		Timestamp: time.Now(),
		App: ops.ProcessMetrics{
			MemoryMB:   42,
			CPUPercent: 0,
			Goroutines: 7,
		},
		Source: service.SourceInfo{
			Kind:      service.SimulatorMock,
			Name:      "Mock telemetry",
			Available: true,
		},
	}
}

type captureEmitter struct {
	mu     sync.Mutex
	events []string
	data   []any
}

func (e *captureEmitter) Emit(name string, data any) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.events = append(e.events, name)
	e.data = append(e.data, data)
}

func TestOpsBridgeEmitsMetrics(t *testing.T) {
	emitter := &captureEmitter{}
	bridge := NewOpsBridge(fixedOpsSampler{}, emitter, 10*time.Millisecond)

	bridge.Start()
	time.Sleep(35 * time.Millisecond)
	bridge.Stop()

	emitter.mu.Lock()
	defer emitter.mu.Unlock()
	if len(emitter.events) == 0 {
		t.Fatal("expected at least one emitted event")
	}
	for _, name := range emitter.events {
		if name != "ops:metrics" {
			t.Fatalf("expected ops:metrics, got %q", name)
		}
	}
}
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/app -run TestOpsBridgeEmitsMetrics -v
```

Expected: FAIL because `NewOpsBridge` does not exist.

- [ ] **Step 3: Add OpsBridge**

Create `vantare-v2/internal/app/ops_bridge.go`:

```go
package app

import (
	"sync"
	"time"

	"github.com/vantare/overlays/v2/internal/ops"
)

type OpsBridge struct {
	sampler  ops.Sampler
	emitter  EventEmitter
	interval time.Duration
	stop     chan struct{}
	done     chan struct{}
	once     sync.Once
}

func NewOpsBridge(sampler ops.Sampler, emitter EventEmitter, interval time.Duration) *OpsBridge {
	if interval <= 0 {
		interval = ops.DefaultInterval
	}
	return &OpsBridge{
		sampler:  sampler,
		emitter:  emitter,
		interval: interval,
		stop:     make(chan struct{}),
		done:     make(chan struct{}),
	}
}

func (b *OpsBridge) Start() {
	go func() {
		defer close(b.done)
		ticker := time.NewTicker(b.interval)
		defer ticker.Stop()

		b.emit()
		for {
			select {
			case <-ticker.C:
				b.emit()
			case <-b.stop:
				return
			}
		}
	}()
}

func (b *OpsBridge) Stop() {
	b.once.Do(func() {
		close(b.stop)
		<-b.done
	})
}

func (b *OpsBridge) emit() {
	if b == nil || b.sampler == nil || b.emitter == nil {
		return
	}
	b.emitter.Emit("ops:metrics", b.sampler.Sample())
}
```

- [ ] **Step 4: Run app bridge test**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./internal/app -run TestOpsBridgeEmitsMetrics -v
```

Expected: PASS.

- [ ] **Step 5: Wire bridge in main.go**

In `vantare-v2/cmd/vantare/main.go`, add import:

```go
"github.com/vantare/overlays/v2/internal/ops"
"github.com/vantare/overlays/v2/internal/telemetry/service"
```

After telemetry service setup and before `wailsApp.Run()`, create and start the bridge:

```go
sourceInfo := service.InfoForSource(vapp.TelemetrySource())
opsBridge := app.NewOpsBridge(ops.NewRuntimeSampler(sourceInfo), emitter, ops.DefaultInterval)
opsBridge.Start()
defer opsBridge.Stop()
```

`vapp.TelemetrySource()` is added in Task 1. Keep the accessor read-only.

- [ ] **Step 6: Run full Go tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected: PASS.

---

## Task 4: Add Hub Ops Panel

**Files:**
- Create: `vantare-v2/frontend/src/hub/components/OpsPanel.tsx`
- Create: `vantare-v2/frontend/src/hub/components/OpsPanel.test.tsx`
- Modify: `vantare-v2/frontend/src/hub/pages/DashboardPage.tsx`

- [ ] **Step 1: Add component test first**

Create `vantare-v2/frontend/src/hub/components/OpsPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpsPanel, type OpsMetrics } from "./OpsPanel";

const metrics: OpsMetrics = {
  timestamp: "2026-06-12T10:00:00Z",
  app: {
    memoryMb: 42.4,
    cpuPercent: 0,
    goroutines: 8,
  },
  system: {
    memoryMb: 42.4,
  },
  source: {
    kind: "mock",
    name: "Mock telemetry",
    live: false,
    available: true,
  },
};

describe("OpsPanel", () => {
  it("renders metrics snapshot", () => {
    render(<OpsPanel metrics={metrics} />);

    expect(screen.getByText("Ops")).toBeTruthy();
    expect(screen.getByText("42.4 MB")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("Mock telemetry")).toBeTruthy();
  });

  it("renders waiting state without metrics", () => {
    render(<OpsPanel metrics={null} />);

    expect(screen.getByText("Esperando métricas")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test src/hub/components/OpsPanel.test.tsx
```

Expected: FAIL because `OpsPanel` does not exist.

- [ ] **Step 3: Implement OpsPanel**

Create `vantare-v2/frontend/src/hub/components/OpsPanel.tsx`:

```tsx
export type OpsMetrics = {
  timestamp: string;
  app: {
    memoryMb: number;
    cpuPercent: number;
    goroutines: number;
  };
  system: {
    memoryMb: number;
  };
  source: {
    kind: string;
    name: string;
    live: boolean;
    available: boolean;
  };
};

type OpsPanelProps = {
  metrics: OpsMetrics | null;
};

function formatMB(value: number): string {
  return `${value.toFixed(1)} MB`;
}

export function OpsPanel({ metrics }: OpsPanelProps) {
  return (
    <section className="glass-panel rounded-xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-semibold text-lg text-white">Ops</h3>
        <span className="text-[10px] uppercase tracking-widest text-vantare-textDim">
          1 Hz
        </span>
      </div>

      {!metrics ? (
        <p className="text-sm text-vantare-textMuted font-mono">Esperando métricas</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">RAM app</p>
            <p className="font-mono text-lg text-white">{formatMB(metrics.app.memoryMb)}</p>
          </div>
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">CPU app</p>
            <p className="font-mono text-lg text-white">{metrics.app.cpuPercent.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">Goroutines</p>
            <p className="font-mono text-lg text-white">{metrics.app.goroutines}</p>
          </div>
          <div className="rounded-lg bg-vantare-surface border border-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-vantare-textDim mb-1">Fuente</p>
            <p className="font-mono text-sm text-white truncate">{metrics.source.name}</p>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run component test**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test src/hub/components/OpsPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Subscribe in DashboardPage**

Modify `vantare-v2/frontend/src/hub/pages/DashboardPage.tsx` to listen for Wails events and pass metrics to `OpsPanel`.

Use existing event helper patterns from `ProfilesPage.tsx`. The shape should be:

```tsx
const [opsMetrics, setOpsMetrics] = useState<OpsMetrics | null>(null);

useEffect(() => {
  const off = EventsOn("ops:metrics", (payload: OpsMetrics) => {
    setOpsMetrics(payload);
  });
  return () => {
    off?.();
  };
}, []);
```

Place `<OpsPanel metrics={opsMetrics} />` in the right column above `<ProSidebar />`.

- [ ] **Step 6: Run frontend tests**

Run:

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test
```

Expected: PASS.

---

## Task 5: Documentation And Evidence

**Files:**
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md`
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
- Create: `.omo/evidence/v2-f9-ops-multisim.txt`

- [ ] **Step 1: Update project state**

In `docs/proyecto/04-ESTADO-ACTUAL.md`, add F9 to the phases table as:

```markdown
| 9 | Ops + multi-sim | ✅ técnico | Ops panel 1 Hz con RAM/CPU/goroutines + metadata de fuente; iRacing/AC quedan como foundation, no adapters completos |
```

Update “Siguiente fase recomendada” to:

```markdown
**Siguiente fase recomendada:** Validación manual F6-F9 y cierre MVP técnico antes de post-MVP.
```

- [ ] **Step 2: Update master phase plan**

In `docs/proyecto/05-PLAN-MAESTRO-FASES.md`, change F9 status to:

```markdown
| 9 | Ops + multi-sim | CPU/RAM widget, iRacing/AC foundation | ✅ técnico |
```

- [ ] **Step 3: Add F9 verification docs**

Append to `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`:

```markdown
## Verificación Fase 9 — Ops + multi-sim foundation

Objetivo: confirmar que el Hub recibe métricas de app a baja frecuencia y que la fuente de telemetría expone metadata sin romper LMU/mock.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
go run ./cmd/vantare -profile configs/example-racing.json
```

Checklist manual:

- [ ] El Hub muestra panel `Ops`.
- [ ] El panel pasa de `Esperando métricas` a valores reales.
- [ ] RAM app aparece en MB.
- [ ] Goroutines aparece como número entero.
- [ ] Fuente muestra `Mock telemetry` sin `-live`.
- [ ] Con `-live`, si LMU está disponible, fuente muestra `Le Mans Ultimate`.
- [ ] Las métricas no actualizan a 30/60 Hz; deben sentirse como 1 Hz.
- [ ] Overlay racing sigue cargando widgets.
```

- [ ] **Step 4: Create evidence file**

After all verification commands are run, create `.omo/evidence/v2-f9-ops-multisim.txt` with the actual results:

```text
Fase 9 — Ops + multi-sim foundation
Fecha: 2026-06-12
Estado: ✅ técnico

Comandos ejecutados:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build

Resultados:
- go test ./...: OK
- pnpm --dir frontend test: OK
- pnpm --dir frontend build: OK

Validación manual:
- Hub Ops panel: indicar resultado real observado
- Mock source metadata: indicar resultado real observado
- LMU source metadata: indicar resultado real observado o "no validado sin LMU abierto"

Notas:
- F9 no implementa iRacing/AC completos. Solo deja metadata/tipos para adapters futuros.
- Ops metrics no forman parte del pipeline caliente de telemetría.
```

Do not write this evidence file before running the verification commands.

---

## Task 6: Final Verification

**Files:**
- All files touched in F9

- [ ] **Step 1: Run Go tests**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 4: Run app manually**

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens.
- Ops panel appears in Dashboard right column.
- Ops panel receives values after about one second.
- Overlay window still loads widgets.
- No `Loading profile...` regression.

---

## Acceptance Criteria

- `go test ./...` passes.
- `pnpm --dir frontend test` passes.
- `pnpm --dir frontend build` passes.
- Hub Dashboard shows an Ops panel.
- Ops panel updates at low frequency, not telemetry frequency.
- Mock source identifies as `Mock telemetry`.
- LMU source metadata exists and does not break current `-live` flow.
- No iRacing/AC fake implementation is added.
- Docs and evidence reflect the real state.
- No changes under `apps/desktop/`.
- No commit or push.

---

## Self-Review

- Spec coverage: includes Ops panel, app RAM/CPU/goroutines, low-frequency bridge, simulator metadata foundation, docs, evidence, and verification.
- Placeholder scan: no implementation step uses undefined placeholders; evidence is written only after verification with real results.
- Type consistency: `SourceInfo`, `SimulatorKind`, `OpsMetrics`, `MetricsSnapshot`, and event name `ops:metrics` are used consistently across Go and React.
