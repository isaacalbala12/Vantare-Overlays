import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Events } from "@wailsio/runtime";
import { OverlaysStudioPage } from "./OverlaysStudioPage";

const listeners = new Map<string, (event: { data: unknown }) => void>();

afterEach(() => {
  cleanup();
});

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn((name: string, cb: (event: { data: unknown }) => void) => {
      listeners.set(name, cb);
      return vi.fn();
    }),
    Emit: vi.fn(),
  },
}));

describe("OverlaysStudioPage", () => {
  beforeEach(() => {
    listeners.clear();
    vi.clearAllMocks();
  });

  it("requests profiles on mount", () => {
    render(<OverlaysStudioPage />);
    expect(Events.Emit).toHaveBeenCalledWith("hub:list");
  });

  it("renders the Overlays Studio library shell after profiles load", async () => {
    render(<OverlaysStudioPage />);

    listeners.get("hub:profiles")?.({
      data: {
        profiles: [
          { id: "default-racing", file: "example-racing.json", name: "Default Racing", displayMode: "racing", widgets: 3 },
        ],
      },
    });

    expect(await screen.findByRole("heading", { name: "Overlays Studio" })).toBeTruthy();
    expect(screen.getByText("Mis perfiles")).toBeTruthy();
    expect(screen.getByText("Recomendados por Vantare")).toBeTruthy();
    expect(screen.getByText("Comunidad")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
    expect(screen.getByText("Default Racing")).toBeTruthy();
  });

  it("opens Widget Studio after profiles and active profile load", async () => {
    render(<OverlaysStudioPage />);

    listeners.get("hub:profiles")?.({
      data: {
        profiles: [
          { id: "default-racing", file: "example-racing.json", name: "Default Racing", displayMode: "racing", widgets: 2 },
        ],
      },
    });

    listeners.get("profile:loaded")?.({
      data: {
        profile: {
          id: "default-racing",
          name: "Default Racing",
          displayMode: "racing",
          monitorIndex: 0,
          widgets: [
            { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
            { id: "relative", type: "relative", enabled: false, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
          ],
        },
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: /Abrir widgets/i }));

    expect(await screen.findAllByRole("heading", { name: "Widgets" })).toBeTruthy();
    expect(screen.getByText("Estos cambios se guardan en el perfil activo.")).toBeTruthy();
  });
});
