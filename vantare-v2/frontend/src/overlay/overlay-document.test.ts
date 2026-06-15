import { afterEach, describe, expect, it } from "vitest";
import { applyOverlayDocumentMode } from "./overlay-document";

describe("overlay document mode", () => {
  afterEach(() => {
    document.documentElement.className = "";
    document.body.className = "";
  });

  it("marks html and body as desktop overlay", () => {
    const cleanup = applyOverlayDocumentMode();

    expect(document.documentElement.classList.contains("desktop-overlay")).toBe(true);
    expect(document.body.classList.contains("desktop-overlay")).toBe(true);

    cleanup();
    expect(document.documentElement.classList.contains("desktop-overlay")).toBe(false);
    expect(document.body.classList.contains("desktop-overlay")).toBe(false);
  });
});
