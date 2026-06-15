# Widget FPS Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Fase 7 by enforcing per-widget update budgets and reducing unnecessary overlay DOM work while keeping telemetry transport capped at 30 Hz.

**Architecture:** Keep Go as the telemetry throttle owner and React as the layout/config owner. Add small frontend utilities for frame-rate limiting and value-change guards, then update widgets to paint only at their configured `updateHz`. Avoid React state for hot telemetry fields; widgets continue reading `telemetry-ref.ts`.

**Tech Stack:** Go telemetry service, Wails v3 events, React 19, TypeScript, Vitest, Vite.

---

## Contexto

Fase 7 no cambia el diseño visual. Su objetivo es rendimiento: menos trabajo por frame, menos escrituras DOM y una base medible para comparar consumo.

Estado actual relevante:

- Go ya emite telemetría a `EmitHz <= 30`.
- `frontend/src/lib/telemetry-ref.ts` mantiene una ref mutable global.
- `DeltaWidget` usa `requestAnimationFrame` y escribe DOM cada frame.
- `RelativeWidget` y `StandingsWidget` ordenan arrays y hacen `container.innerHTML = ...` cada frame, aunque su `updateHz` del perfil sea 15.
- Los perfiles ya tienen `widgets[].updateHz`.

## Alcance

- [ ] In scope: helper frontend para limitar loops a `updateHz`.
- [ ] In scope: helper frontend para evitar escribir DOM si el valor visible no cambió.
- [ ] In scope: `DeltaWidget` a 30 Hz por defecto.
- [ ] In scope: `RelativeWidget` y `StandingsWidget` a 15 Hz por defecto.
- [ ] In scope: pasar `WidgetConfig.updateHz` desde `CompositeApp` y `ObsOverlayApp` al componente.
- [ ] In scope: tests unitarios de los helpers.
- [ ] In scope: tests básicos de resolución de FPS por widget.
- [ ] In scope: documentación de cómo probar manualmente FPS/DOM.
- [ ] Out of scope: Web Workers.
- [ ] Out of scope: Track map / input trace nuevos.
- [ ] Out of scope: rediseño visual de widgets.
- [ ] Out of scope: cambiar el throttle global Go de 30 Hz.
- [ ] Out of scope: optimizaciones LMU parser adicionales.

## Archivos Tocables

- Create: `vantare-v2/frontend/src/lib/frame-budget.ts` — cálculo de intervalos y loop limitado por FPS.
- Create: `vantare-v2/frontend/src/lib/frame-budget.test.ts` — tests del helper.
- Create: `vantare-v2/frontend/src/lib/dom-write.ts` — escritura DOM solo si cambia valor/clase/estilo.
- Create: `vantare-v2/frontend/src/lib/dom-write.test.ts` — tests de escritura idempotente.
- Modify: `vantare-v2/frontend/src/overlay/CompositeApp.tsx` — pasar `updateHz` del perfil a cada widget.
- Modify: `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx` — pasar `updateHz` del perfil a cada widget OBS.
- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx` — limitar pintura y evitar escrituras repetidas.
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx` — limitar sort/render a 15 Hz y evitar `innerHTML` si no cambió.
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx` — limitar sort/render a 15 Hz y evitar `innerHTML` si no cambió.
- Modify: `vantare-v2/frontend/src/lib/profile.ts` — si hace falta, tipar `updateHz`.
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md` — solo al cerrar F7.
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md` — solo al cerrar F7.
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md` — añadir verificación manual F7.
- Create: `.omo/evidence/v2-f7-widget-fps.txt` — evidencia al cerrar.

## Decisiones Técnicas

- El techo global sigue siendo Go `EmitHz = 30`.
- `updateHz` por widget solo reduce trabajo de render, no aumenta la frecuencia.
- Si un widget pide `updateHz > 30`, se capará a 30.
- Si `updateHz <= 0` o falta, se usará default por tipo:
  - `delta`: 30
  - `relative`: 15
  - `standings`: 15
- Hot data sigue en `telemetry-ref.ts`; no introducir Zustand/Context para telemetría rápida.
- No usar `innerHTML` cada frame si el HTML resultante es idéntico.

## Task 1: Helper de FPS por widget

**Files:**
- Create: `vantare-v2/frontend/src/lib/frame-budget.ts`
- Create: `vantare-v2/frontend/src/lib/frame-budget.test.ts`

- [ ] Step 1: Escribir test de normalización de Hz.

```ts
import { describe, expect, it } from "vitest";
import { clampWidgetHz, frameIntervalMs } from "./frame-budget";

describe("frame-budget", () => {
  it("caps widget hz between 1 and 30", () => {
    expect(clampWidgetHz(60)).toBe(30);
    expect(clampWidgetHz(30)).toBe(30);
    expect(clampWidgetHz(15)).toBe(15);
    expect(clampWidgetHz(0)).toBe(1);
    expect(clampWidgetHz(-5)).toBe(1);
  });

  it("converts hz to frame interval milliseconds", () => {
    expect(frameIntervalMs(30)).toBeCloseTo(33.333, 2);
    expect(frameIntervalMs(15)).toBeCloseTo(66.666, 2);
  });
});
```

- [ ] Step 2: Ejecutar test y confirmar RED.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test -- frame-budget
```

Expected: FAIL porque `frame-budget.ts` no existe.

- [ ] Step 3: Crear implementación mínima.

```ts
export const MAX_WIDGET_HZ = 30;
export const MIN_WIDGET_HZ = 1;

export function clampWidgetHz(hz: number): number {
  if (!Number.isFinite(hz)) return MIN_WIDGET_HZ;
  return Math.max(MIN_WIDGET_HZ, Math.min(MAX_WIDGET_HZ, Math.round(hz)));
}

export function frameIntervalMs(hz: number): number {
  return 1000 / clampWidgetHz(hz);
}
```

- [ ] Step 4: Añadir helper de loop limitado.

```ts
export function startFrameBudgetLoop(hz: number, paint: (now: number) => void): () => void {
  const interval = frameIntervalMs(hz);
  let frameId = 0;
  let lastPaint = 0;
  const tick = (now: number) => {
    if (now - lastPaint >= interval) {
      lastPaint = now;
      paint(now);
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}
```

- [ ] Step 5: Reejecutar test.

```powershell
pnpm --dir frontend test -- frame-budget
```

Expected: PASS.

## Task 2: Helper de escrituras DOM idempotentes

**Files:**
- Create: `vantare-v2/frontend/src/lib/dom-write.ts`
- Create: `vantare-v2/frontend/src/lib/dom-write.test.ts`

- [ ] Step 1: Escribir tests.

```ts
import { describe, expect, it } from "vitest";
import { setClassNameIfChanged, setHTMLIfChanged, setTextIfChanged } from "./dom-write";

describe("dom-write", () => {
  it("writes text only when changed", () => {
    const el = document.createElement("span");
    setTextIfChanged(el, "A");
    expect(el.textContent).toBe("A");
    setTextIfChanged(el, "A");
    expect(el.textContent).toBe("A");
    setTextIfChanged(el, "B");
    expect(el.textContent).toBe("B");
  });

  it("writes class only when changed", () => {
    const el = document.createElement("div");
    setClassNameIfChanged(el, "a");
    expect(el.className).toBe("a");
    setClassNameIfChanged(el, "b");
    expect(el.className).toBe("b");
  });

  it("writes html only when changed", () => {
    const el = document.createElement("div");
    setHTMLIfChanged(el, "<p>A</p>");
    expect(el.innerHTML).toBe("<p>A</p>");
    setHTMLIfChanged(el, "<p>B</p>");
    expect(el.innerHTML).toBe("<p>B</p>");
  });
});
```

- [ ] Step 2: Ejecutar test y confirmar RED.

```powershell
pnpm --dir frontend test -- dom-write
```

Expected: FAIL porque `dom-write.ts` no existe.

- [ ] Step 3: Implementar helper.

```ts
export function setTextIfChanged(el: HTMLElement, value: string) {
  if (el.textContent !== value) {
    el.textContent = value;
  }
}

export function setClassNameIfChanged(el: HTMLElement, value: string) {
  if (el.className !== value) {
    el.className = value;
  }
}

export function setHTMLIfChanged(el: HTMLElement, value: string) {
  if (el.innerHTML !== value) {
    el.innerHTML = value;
  }
}

export function setStylePropIfChanged(el: HTMLElement, prop: keyof CSSStyleDeclaration, value: string) {
  const style = el.style as unknown as Record<string, string>;
  if (style[prop as string] !== value) {
    style[prop as string] = value;
  }
}
```

- [ ] Step 4: Reejecutar test.

```powershell
pnpm --dir frontend test -- dom-write
```

Expected: PASS.

## Task 3: Pasar `updateHz` a widgets

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/CompositeApp.tsx`
- Modify: `vantare-v2/frontend/src/overlay/ObsOverlayApp.tsx`
- Modify: widget prop types in:
  - `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`
  - `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
  - `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`

- [ ] Step 1: Cambiar tipo compartido en `CompositeApp.tsx`.

```ts
type WidgetProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};
```

- [ ] Step 2: Pasar `updateHz` en `CompositeApp`.

```tsx
<Component editMode={editMode} updateHz={w.updateHz} props={w.props} />
```

- [ ] Step 3: Repetir en `ObsOverlayApp`.

```tsx
<Component editMode={false} updateHz={w.updateHz} props={w.props} />
```

- [ ] Step 4: Actualizar tipos de widgets.

```ts
type DeltaProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};
```

- [ ] Step 5: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 4: Optimizar DeltaWidget

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/DeltaWidget.tsx`

- [ ] Step 1: Importar helpers.

```ts
import { setClassNameIfChanged, setStylePropIfChanged, setTextIfChanged } from "../../lib/dom-write";
import { startFrameBudgetLoop } from "../../lib/frame-budget";
```

- [ ] Step 2: Cambiar props.

```ts
type DeltaProps = {
  editMode: boolean;
  updateHz?: number;
};

export function DeltaWidget({ updateHz = 30 }: DeltaProps) {
```

- [ ] Step 3: Sustituir loop actual.

```ts
useEffect(() => {
  return startFrameBudgetLoop(updateHz, () => {
    const t = getTelemetryRef();
    if (deltaRef.current) {
      setTextIfChanged(deltaRef.current, formatDelta(t.deltaBest));
      setClassNameIfChanged(deltaRef.current, `font-mono text-sm font-bold ${deltaColor(t.deltaBest)}`);
    }
    if (fillRef.current) {
      setStylePropIfChanged(fillRef.current, "width", `${barWidth(t.deltaBest)}%`);
      setClassNameIfChanged(fillRef.current, `h-full ${barColor(t.deltaBest)} transition-all duration-75`);
    }
  });
}, [updateHz]);
```

- [ ] Step 4: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 5: Optimizar StandingsWidget

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`

- [ ] Step 1: Importar helpers.

```ts
import { setHTMLIfChanged } from "../../lib/dom-write";
import { startFrameBudgetLoop } from "../../lib/frame-budget";
```

- [ ] Step 2: Actualizar props.

```ts
type StandingsProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};

export function StandingsWidget({ props, updateHz = 15 }: StandingsProps) {
```

- [ ] Step 3: Cambiar `requestAnimationFrame` directo por loop limitado.

```ts
useEffect(() => {
  return startFrameBudgetLoop(updateHz, () => {
    const t = getTelemetryRef();
    const container = containerRef.current;
    if (!container) return;

    const sorted = [...t.vehicles]
      .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
      .slice(0, maxRows);

    const rows = sorted.map((v) => {
      const isP = v.isPlayer;
      const bgColor = isP ? "bg-white/10" : "";
      const textColor = isP ? "text-white" : "text-white/60";
      const gap = v.timeBehindLeader ?? 0;
      return `<div class="flex items-center gap-2 px-2 py-0.5 ${bgColor} ${textColor} text-xs font-mono">
        <span class="w-5 text-right text-white/40">${v.place ?? ""}</span>
        <span class="flex-1 truncate">${truncate(v.driverName ?? "?", 16)}</span>
        <span class="w-14 text-right text-white/40">${formatGap(gap)}</span>
      </div>`;
    });

    setHTMLIfChanged(container, rows.join(""));
  });
}, [maxRows, updateHz]);
```

- [ ] Step 4: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 6: Optimizar RelativeWidget

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`

- [ ] Step 1: Importar helpers.

```ts
import { setHTMLIfChanged } from "../../lib/dom-write";
import { startFrameBudgetLoop } from "../../lib/frame-budget";
```

- [ ] Step 2: Actualizar props.

```ts
type RelativeProps = {
  editMode: boolean;
  updateHz?: number;
  props?: Record<string, unknown>;
};

export function RelativeWidget({ props, updateHz = 15 }: RelativeProps) {
```

- [ ] Step 3: Cambiar loop.

```ts
useEffect(() => {
  return startFrameBudgetLoop(updateHz, () => {
    const t = getTelemetryRef();
    const container = containerRef.current;
    if (!container) return;

    const sorted = [...t.vehicles].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
    const playerIdx = sorted.findIndex((v) => v.isPlayer);
    if (playerIdx === -1) {
      setHTMLIfChanged(container, '<div class="text-white/30 text-xs font-mono p-2">No player</div>');
      return;
    }

    const start = Math.max(0, playerIdx - rangeAhead);
    const end = Math.min(sorted.length, playerIdx + rangeBehind + 1);
    const visible = sorted.slice(start, end);

    const rows = visible.map((v) => {
      const isP = v.isPlayer;
      const bgColor = isP ? "bg-white/10" : "";
      const textColor = isP ? "text-white" : "text-white/60";
      const gap = v.timeBehindLeader ?? 0;
      return `<div class="flex items-center gap-2 px-2 py-0.5 ${bgColor} ${textColor} text-xs font-mono">
        <span class="w-5 text-right text-white/40">${v.place ?? ""}</span>
        <span class="flex-1 truncate">${truncate(v.driverName ?? "?", 14)}</span>
        <span class="w-14 text-right text-white/40">${formatGap(gap)}</span>
      </div>`;
    });

    setHTMLIfChanged(container, rows.join(""));
  });
}, [rangeAhead, rangeBehind, updateHz]);
```

- [ ] Step 4: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 7: Añadir medición simple de render en desarrollo

**Files:**
- Create: `vantare-v2/frontend/src/lib/render-meter.ts`
- Create: `vantare-v2/frontend/src/lib/render-meter.test.ts`
- Modify: widgets only if useful after helper is tested.

- [ ] Step 1: Crear test de contador.

```ts
import { describe, expect, it } from "vitest";
import { createRenderMeter } from "./render-meter";

describe("render-meter", () => {
  it("counts paints per key", () => {
    const meter = createRenderMeter();
    meter.mark("delta");
    meter.mark("delta");
    meter.mark("relative");
    expect(meter.snapshot()).toEqual({ delta: 2, relative: 1 });
  });
});
```

- [ ] Step 2: Ejecutar test RED.

```powershell
pnpm --dir frontend test -- render-meter
```

Expected: FAIL porque no existe el helper.

- [ ] Step 3: Implementar helper sin side effects.

```ts
export function createRenderMeter() {
  const counts: Record<string, number> = {};
  return {
    mark(key: string) {
      counts[key] = (counts[key] ?? 0) + 1;
    },
    snapshot() {
      return { ...counts };
    },
    reset() {
      for (const key of Object.keys(counts)) {
        delete counts[key];
      }
    },
  };
}
```

- [ ] Step 4: Decidir en code review si se integra en widgets o queda como helper de test/dev. No añadir logs por tick.

## Task 8: Verificación manual de Fase 7

**Files:**
- Modify: `docs/proyecto/11-COMANDOS-Y-VERIFICACION.md`
- Create: `.omo/evidence/v2-f7-widget-fps.txt`

- [ ] Step 1: Ejecutar suites completas.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected: PASS en los tres comandos.

- [ ] Step 2: Ejecutar app.

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

- [ ] Step 3: Validar manualmente:
  - Hub abre.
  - Overlay no muestra `Loading profile...` permanente.
  - `Default Racing` muestra widgets.
  - `Default Streaming` sigue sirviendo OBS URL.
  - Los widgets no parpadean.
  - Relative/Standings no se sienten más lentos que antes.

- [ ] Step 4: Si se usa DevTools/Performance:
  - Confirmar que Relative/Standings no escriben HTML cada animation frame.
  - Confirmar que Delta pinta como máximo a 30 Hz.
  - Confirmar que Relative/Standings pintan como máximo a 15 Hz.

- [ ] Step 5: Guardar evidencia en `.omo/evidence/v2-f7-widget-fps.txt` con:

```text
Fecha:
Comandos:
- go test ./...
- pnpm --dir frontend test
- pnpm --dir frontend build
Validación manual:
- Racing:
- Streaming/OBS:
- Observaciones FPS:
Limitaciones:
```

## Criterios de Aceptación

- [ ] `widgets[].updateHz` se pasa a todos los widgets del overlay Wails.
- [ ] `widgets[].updateHz` se pasa a todos los widgets del overlay OBS.
- [ ] `DeltaWidget` no pinta por encima de 30 Hz.
- [ ] `RelativeWidget` no pinta por encima de 15 Hz por defecto.
- [ ] `StandingsWidget` no pinta por encima de 15 Hz por defecto.
- [ ] Relative/Standings no reescriben `innerHTML` si el HTML calculado no cambió.
- [ ] No se introduce React state para telemetría hot.
- [ ] No se sube el throttle global de Go por encima de 30 Hz.
- [ ] `go test ./...` pasa.
- [ ] `pnpm --dir frontend test` pasa.
- [ ] `pnpm --dir frontend build` pasa.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Widgets cold se ven demasiado lentos | Defaults conservadores: delta 30 Hz, relative/standings 15 Hz; permitir `updateHz` por perfil. |
| Helper de FPS depende demasiado de tiempo real y tests son frágiles | Testear funciones puras (`clampWidgetHz`, `frameIntervalMs`) y validar loop manualmente/build. |
| `innerHTML` puede ser vector XSS si nombres vienen del sim | F7 no debe empeorar esto. Como follow-up, reemplazar `innerHTML` por nodos DOM o escapar nombres antes de interpolar. |
| Se optimiza sin medir | Añadir evidencia manual y evitar claims de CPU/RAM sin medición real. |
| Se rompe OBS | `ObsOverlayApp` debe recibir los mismos props que `CompositeApp`; verificar `/overlay?profile=example-streaming.json`. |

## Prompt Para Ejecutor Externo

```text
Trabaja en C:\Users\isaac\Desktop\Vantare-Overlays.

Código activo: vantare-v2/ solamente. No tocar apps/desktop/ porque es v1 legado Electron.

Implementa Fase 7 siguiendo:
.omo/plans/v2-f7-widget-fps.md

Objetivo:
Optimizar el render de widgets del overlay usando updateHz por widget. Mantener Go telemetry EmitHz <= 30 y evitar React state para campos hot.

Reglas:
- No cambiar diseño visual.
- No introducir Zustand/Context para telemetría rápida.
- No subir frecuencia global Go.
- Delta por defecto 30 Hz.
- Relative y Standings por defecto 15 Hz.
- Evitar reescribir innerHTML/text/class/style si el valor no cambió.
- Mantener OBS overlay funcionando.
- No tocar apps/desktop/.
- No commit/push.

Comandos obligatorios:
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build

Entrega:
- Archivos modificados.
- Resultado de comandos.
- Confirmación de que racing y OBS siguen funcionando.
- Cualquier limitación de medición real.
```
