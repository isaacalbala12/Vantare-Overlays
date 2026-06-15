# F7 Post-Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Fase 7 code-review findings before treating widget FPS optimization as complete.

**Architecture:** Keep the F7 optimization approach: widgets read from `telemetry-ref.ts`, paint through FPS-limited loops, and avoid React state for hot telemetry. Add safe HTML escaping for string interpolation, remove or justify unused instrumentation, and correct documentation status so it reflects actual validation.

**Tech Stack:** React 19, TypeScript, Vitest, Go/Wails v3, Vite.

---

## Fixes Primero

Estos son bloqueantes o casi bloqueantes antes de continuar:

1. **P1 seguridad:** escapar nombres de piloto antes de meterlos en `innerHTML`.
2. **P2 documentación:** F7 no debe figurar como cerrada total si no hay medición real de FPS/CPU/GPU.
3. **P2 limpieza:** decidir `render-meter`: integrarlo con uso claro o eliminarlo.
4. **P3 test:** cubrir `startFrameBudgetLoop` con `requestAnimationFrame` falso.
5. **P3 tipo CSS:** estrechar o simplificar `setStylePropIfChanged`.

## Alcance

- [ ] In scope: fix XSS en `RelativeWidget` y `StandingsWidget`.
- [ ] In scope: tests de escaping HTML.
- [ ] In scope: test de `startFrameBudgetLoop`.
- [ ] In scope: eliminar `render-meter` si no se usa.
- [ ] In scope: ajustar docs F7 a `✅ técnico` o `🟡 pendiente medición`.
- [ ] In scope: actualizar evidencia F7 con los fixes post-review.
- [ ] Out of scope: Fase 8 temas.
- [ ] Out of scope: medición CPU/GPU automatizada.
- [ ] Out of scope: rediseño visual.
- [ ] Out of scope: reemplazar `innerHTML` por nodos DOM completos. Eso puede ser un follow-up si queremos endurecer más.

## Archivos Tocables

- Create: `vantare-v2/frontend/src/lib/html-escape.ts`
- Create: `vantare-v2/frontend/src/lib/html-escape.test.ts`
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`
- Modify: `vantare-v2/frontend/src/lib/frame-budget.test.ts`
- Modify: `vantare-v2/frontend/src/lib/dom-write.ts`
- Modify: `vantare-v2/frontend/src/lib/dom-write.test.ts`
- Delete or modify: `vantare-v2/frontend/src/lib/render-meter.ts`
- Delete or modify: `vantare-v2/frontend/src/lib/render-meter.test.ts`
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md`
- Modify: `.omo/evidence/v2-f7-widget-fps.txt`

## Task 1: Escapar HTML de strings de telemetría

**Files:**
- Create: `vantare-v2/frontend/src/lib/html-escape.ts`
- Create: `vantare-v2/frontend/src/lib/html-escape.test.ts`

- [ ] Step 1: Crear test RED.

```ts
import { describe, expect, it } from "vitest";
import { escapeHTML } from "./html-escape";

describe("escapeHTML", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHTML(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;",
    );
  });

  it("leaves normal driver names readable", () => {
    expect(escapeHTML("Isaac Albala")).toBe("Isaac Albala");
  });
});
```

- [ ] Step 2: Ejecutar test y confirmar que falla.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
pnpm --dir frontend test -- html-escape
```

Expected: FAIL porque `html-escape.ts` no existe.

- [ ] Step 3: Implementar helper.

```ts
export function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

- [ ] Step 4: Reejecutar test.

```powershell
pnpm --dir frontend test -- html-escape
```

Expected: PASS.

## Task 2: Aplicar escaping en Relative y Standings

**Files:**
- Modify: `vantare-v2/frontend/src/overlay/widgets/RelativeWidget.tsx`
- Modify: `vantare-v2/frontend/src/overlay/widgets/StandingsWidget.tsx`

- [ ] Step 1: Importar helper en ambos widgets.

```ts
import { escapeHTML } from "../../lib/html-escape";
```

- [ ] Step 2: En `RelativeWidget`, reemplazar interpolación de nombre.

```ts
<span class="flex-1 truncate">${escapeHTML(truncate(v.driverName ?? "?", 14))}</span>
```

- [ ] Step 3: En `StandingsWidget`, reemplazar interpolación de nombre.

```ts
<span class="flex-1 truncate">${escapeHTML(truncate(v.driverName ?? "?", 16))}</span>
```

- [ ] Step 4: Ejecutar build.

```powershell
pnpm --dir frontend build
```

Expected: PASS.

## Task 3: Testear `startFrameBudgetLoop`

**Files:**
- Modify: `vantare-v2/frontend/src/lib/frame-budget.test.ts`

- [ ] Step 1: Añadir test con `vi.stubGlobal`.

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { clampWidgetHz, frameIntervalMs, startFrameBudgetLoop } from "./frame-budget";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("paints only when enough frame time has elapsed", () => {
  const callbacks: FrameRequestCallback[] = [];
  const paint = vi.fn();

  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    callbacks.push(cb);
    return callbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  const stop = startFrameBudgetLoop(10, paint);
  callbacks.shift()?.(0);
  callbacks.shift()?.(50);
  callbacks.shift()?.(100);
  callbacks.shift()?.(150);
  callbacks.shift()?.(200);
  stop();

  expect(paint).toHaveBeenCalledTimes(2);
});
```

- [ ] Step 2: Ejecutar test.

```powershell
pnpm --dir frontend test -- frame-budget
```

Expected: PASS.

## Task 4: Simplificar `setStylePropIfChanged`

**Files:**
- Modify: `vantare-v2/frontend/src/lib/dom-write.ts`
- Modify: `vantare-v2/frontend/src/lib/dom-write.test.ts`

- [ ] Step 1: Cambiar función a una firma más segura basada en CSS property names.

```ts
export function setStylePropertyIfChanged(el: HTMLElement, prop: string, value: string) {
  if (el.style.getPropertyValue(prop) !== value) {
    el.style.setProperty(prop, value);
  }
}
```

- [ ] Step 2: Actualizar tests.

```ts
setStylePropertyIfChanged(el, "width", "50%");
expect(el.style.width).toBe("50%");
```

- [ ] Step 3: Actualizar `DeltaWidget`.

```ts
setStylePropertyIfChanged(fillRef.current, "width", `${barWidth(t.deltaBest)}%`);
```

- [ ] Step 4: Ejecutar tests frontend.

```powershell
pnpm --dir frontend test
```

Expected: PASS.

## Task 5: Resolver `render-meter`

**Files:**
- Delete: `vantare-v2/frontend/src/lib/render-meter.ts`
- Delete: `vantare-v2/frontend/src/lib/render-meter.test.ts`

- [ ] Step 1: Confirmar si `render-meter` se usa.

```powershell
rg "createRenderMeter|render-meter" vantare-v2/frontend/src
```

Expected: solo aparecen los dos archivos de helper/test.

- [ ] Step 2: Eliminar helper y test si está sin uso.

```powershell
Remove-Item .\frontend\src\lib\render-meter.ts
Remove-Item .\frontend\src\lib\render-meter.test.ts
```

- [ ] Step 3: Ejecutar tests frontend.

```powershell
pnpm --dir frontend test
```

Expected: PASS con 4 archivos de test, no 5.

## Task 6: Corregir estado documental F7

**Files:**
- Modify: `docs/proyecto/04-ESTADO-ACTUAL.md`
- Modify: `docs/proyecto/05-PLAN-MAESTRO-FASES.md`
- Modify: `.omo/evidence/v2-f7-widget-fps.txt`

- [ ] Step 1: Cambiar estado de F7 a `✅ técnico` o `🟡 pendiente medición`.

Recomendado:

```md
| 7 | Optimización UI | ✅ técnico | updateHz por widget, DOM idempotente; pendiente medición FPS/CPU real |
```

- [ ] Step 2: En evidencia, añadir sección `Post-review fixes`.

```text
Post-review fixes:
- Escaping HTML aplicado a driverName en Relative/Standings.
- render-meter eliminado por estar sin uso.
- frame-budget loop cubierto con test de RAF falso.
- F7 queda como técnico hasta medición real DevTools/CPU.
```

- [ ] Step 3: No marcar F7 como cerrado total hasta medir.

## Task 7: Verificación final

**Files:**
- No nuevos archivos.

- [ ] Step 1: Ejecutar verificación completa.

```powershell
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build
```

Expected:

```text
go test ./... PASS
frontend tests PASS
frontend build PASS
```

- [ ] Step 2: Verificación manual mínima.

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Comprobar:

- Hub abre.
- Overlay no queda en `Loading profile...`.
- `Default Racing` muestra widgets.
- `Default Streaming` sigue sirviendo:

```text
http://127.0.0.1:39261/overlay?profile=example-streaming.json
```

## Criterios de Aceptación

- [ ] `driverName` se escapa antes de entrar en `innerHTML`.
- [ ] Hay test de `escapeHTML`.
- [ ] Hay test de `startFrameBudgetLoop`.
- [ ] `setStylePropIfChanged` queda reemplazado por una API más clara o justificada.
- [ ] `render-meter` no queda como código muerto.
- [ ] Docs no dicen que F7 está totalmente cerrada sin medición real.
- [ ] `go test ./...` pasa.
- [ ] `pnpm --dir frontend test` pasa.
- [ ] `pnpm --dir frontend build` pasa.

## Prompt Para Ejecutor Externo

```text
Trabaja en C:\Users\isaac\Desktop\Vantare-Overlays.

Código activo: vantare-v2/ solamente. No tocar apps/desktop/.

Implementa los fixes post-review de Fase 7 siguiendo:
.omo/plans/v2-f7-post-review-fixes.md

Prioridades:
1. P1: escapar driverName antes de usar innerHTML en RelativeWidget y StandingsWidget.
2. P2: ajustar docs para no cerrar F7 totalmente sin medición real.
3. P2: eliminar render-meter si está sin uso.
4. P3: testear startFrameBudgetLoop.
5. P3: simplificar la API de style writes.

No commit/push.

Comandos obligatorios:
cd C:\Users\isaac\Desktop\Vantare-Overlays\vantare-v2
go test ./...
pnpm --dir frontend test
pnpm --dir frontend build

Entrega:
- Archivos modificados.
- Resultado de comandos.
- Estado final de F7: técnico o pendiente medición.
```
