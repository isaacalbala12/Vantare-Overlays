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
