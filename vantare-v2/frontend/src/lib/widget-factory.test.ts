import { describe, expect, it } from "vitest";
import { createDefaultWidget, WIDGET_TYPES } from "./widget-factory";
import type { WidgetConfig } from "./profile";

describe("widget-factory", () => {
  it("crea pedals con 90x100 y 30Hz", () => {
    const widget = createDefaultWidget("pedals");
    expect(widget.id).toBe("pedals");
    expect(widget.type).toBe("pedals");
    expect(widget.enabled).toBe(true);
    expect(widget.updateHz).toBe(30);
    expect(widget.position).toEqual({ x: 40, y: 40, w: 90, h: 100 });
  });

  it("crea standings con 340x420 y 15Hz", () => {
    const widget = createDefaultWidget("standings");
    expect(widget.id).toBe("standings");
    expect(widget.type).toBe("standings");
    expect(widget.enabled).toBe(true);
    expect(widget.updateHz).toBe(15);
    expect(widget.position).toEqual({ x: 40, y: 40, w: 340, h: 420 });
  });

  it("genera id único incremental si el tipo ya existe", () => {
    const existing: WidgetConfig[] = [
      { id: "pedals", type: "pedals", enabled: true, position: { x: 0, y: 0, w: 90, h: 100 } },
      { id: "pedals-2", type: "pedals", enabled: true, position: { x: 0, y: 0, w: 90, h: 100 } },
    ];

    const widget = createDefaultWidget("pedals", existing);
    expect(widget.id).toBe("pedals-3");
    expect(widget.type).toBe("pedals");
  });

  it("ofrece un fallback seguro para un tipo desconocido", () => {
    // Decisión de diseño: Para tipos de widgets desconocidos que no estén en WIDGET_TYPES,
    // el factory no debe crashear, sino retornar un widget con dimensiones genéricas seguras (200x100).
    const widget = createDefaultWidget("unknown-type");
    expect(widget.id).toBe("unknown-type");
    expect(widget.type).toBe("unknown-type");
    expect(widget.enabled).toBe(true);
    expect(widget.updateHz).toBe(30);
    expect(widget.position).toEqual({ x: 40, y: 40, w: 200, h: 100 });
  });

  it("contiene todos los tipos de widgets esperados", () => {
    expect(WIDGET_TYPES).toContain("delta");
    expect(WIDGET_TYPES).toContain("relative");
    expect(WIDGET_TYPES).toContain("standings");
    expect(WIDGET_TYPES).toContain("telemetry");
    expect(WIDGET_TYPES).toContain("telemetry-vertical");
    expect(WIDGET_TYPES).toContain("pedals");
    expect(WIDGET_TYPES).toContain("engineer-notifications");
  });
});
