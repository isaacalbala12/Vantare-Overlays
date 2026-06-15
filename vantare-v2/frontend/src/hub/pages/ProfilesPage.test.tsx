import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilesPage } from "./ProfilesPage";

type Handler = (event: { data: unknown }) => void;

const runtimeMock = vi.hoisted(() => ({
  handlers: new Map<string, Handler[]>(),
  emit: vi.fn(),
}));

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: (name: string, handler: Handler) => {
      runtimeMock.handlers.set(name, [...(runtimeMock.handlers.get(name) ?? []), handler]);
      return () =>
        runtimeMock.handlers.set(
          name,
          (runtimeMock.handlers.get(name) ?? []).filter((h) => h !== handler),
        );
    },
    Emit: runtimeMock.emit,
  },
}));

function dispatch(name: string, data: unknown) {
  act(() => {
    for (const handler of runtimeMock.handlers.get(name) ?? []) {
      handler({ data });
    }
  });
}

describe("ProfilesPage", () => {
  beforeEach(() => {
    runtimeMock.handlers.clear();
    runtimeMock.emit.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("navigates to Preview when Preview button is clicked", () => {
    const onOpenPreview = vi.fn();
    render(<ProfilesPage onOpenPreview={onOpenPreview} />);

    dispatch("hub:profiles", {
      profiles: [
        {
          id: "default-racing",
          file: "example-racing.json",
          name: "Default Racing",
          displayMode: "racing",
          widgets: 3,
        },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(runtimeMock.emit).toHaveBeenCalledWith("hub:activate", {
      id: "default-racing",
      file: "example-racing.json",
    });
    expect(onOpenPreview).toHaveBeenCalled();
  });
});
