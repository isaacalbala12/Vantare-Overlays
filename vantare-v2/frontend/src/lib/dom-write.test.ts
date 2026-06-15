import { describe, expect, it } from "vitest";
import {
  setClassNameIfChanged,
  setHTMLIfChanged,
  setStylePropertyIfChanged,
  setTextIfChanged,
} from "./dom-write";

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
    setHTMLIfChanged(el, "<p>A</p>");
    expect(el.innerHTML).toBe("<p>A</p>");
    setHTMLIfChanged(el, "<p>B</p>");
    expect(el.innerHTML).toBe("<p>B</p>");
  });

  it("writes style property only when changed", () => {
    const el = document.createElement("div");
    setStylePropertyIfChanged(el, "width", "50%");
    expect(el.style.width).toBe("50%");
    setStylePropertyIfChanged(el, "width", "50%");
    expect(el.style.width).toBe("50%");
    setStylePropertyIfChanged(el, "width", "75%");
    expect(el.style.width).toBe("75%");
  });
});
