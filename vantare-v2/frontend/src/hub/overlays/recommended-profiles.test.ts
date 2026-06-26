import { describe, expect, it } from "vitest";
import { RECOMMENDED_PROFILES, cloneRecommendedProfile } from "./recommended-profiles";

describe("recommended-profiles", () => {
  it("contains fixed read-only Vantare presets", () => {
    expect(RECOMMENDED_PROFILES.length).toBe(2);
    expect(RECOMMENDED_PROFILES.every((profile) => profile.readOnly)).toBe(true);

    expect(RECOMMENDED_PROFILES[0].id).toBe("vantare-clean-overlay");
    expect(RECOMMENDED_PROFILES[0].name).toBe("Clean Overlay");
    expect(RECOMMENDED_PROFILES[1].id).toBe("vantare-lmu-basic");
    expect(RECOMMENDED_PROFILES[1].name).toBe("Le Mans Ultimate - Basic");
  });

  it("has correct widgets per profile", () => {
    const cleanProfile = RECOMMENDED_PROFILES[0].profile;
    expect(cleanProfile.widgets.length).toBe(3);
    expect(cleanProfile.widgets.map(w => w.type)).toEqual(["delta", "relative", "standings"]);
    expect(cleanProfile.widgets.every(w => w.enabled)).toBe(true);

    const lmuProfile = RECOMMENDED_PROFILES[1].profile;
    expect(lmuProfile.widgets.length).toBe(4);
    expect(lmuProfile.widgets.map(w => w.type)).toEqual(["delta", "relative", "standings", "pedals"]);
    const pedalsWidget = lmuProfile.widgets.find(w => w.type === "pedals");
    expect(pedalsWidget).toBeDefined();
    expect(pedalsWidget?.enabled).toBe(false);
  });

  it("has valid schema version 2 and layouts", () => {
    const cleanProfile = RECOMMENDED_PROFILES[0].profile;
    expect(cleanProfile.schemaVersion).toBe(2);
    expect(cleanProfile.layouts?.general).toBeDefined();
    expect(cleanProfile.layouts?.general?.widgets.length).toBe(3);

    const lmuProfile = RECOMMENDED_PROFILES[1].profile;
    expect(lmuProfile.schemaVersion).toBe(2);
    expect(lmuProfile.layouts?.general).toBeDefined();
    expect(lmuProfile.layouts?.general?.widgets.length).toBe(4);

    const deltaW = lmuProfile.widgets.find(w => w.type === "delta");
    const relativeW = lmuProfile.widgets.find(w => w.type === "relative");
    const standingsW = lmuProfile.widgets.find(w => w.type === "standings");
    expect(deltaW?.variantId).toBeDefined();
    expect(relativeW?.variantId).toBeDefined();
    expect(standingsW?.variantId).toBeDefined();
  });

  it("only uses currently implemented widget types", () => {
    const allowed = new Set(["delta", "relative", "standings", "telemetry", "telemetry-vertical", "pedals"]);
    for (const recommended of RECOMMENDED_PROFILES) {
      for (const widget of recommended.profile.widgets) {
        expect(allowed.has(widget.type)).toBe(true);
      }
    }
  });

  it("clones a preset as an editable custom profile", () => {
    const clone = cloneRecommendedProfile(RECOMMENDED_PROFILES[0], "My Copy");

    expect(clone.name).toBe("My Copy");
    expect(clone.id?.startsWith("custom-")).toBe(true);
    expect(clone.widgets.length).toBe(RECOMMENDED_PROFILES[0].profile.widgets.length);
    expect(clone).not.toBe(RECOMMENDED_PROFILES[0].profile);
  });

  it("records the recommended preset origin without keeping read-only identity", () => {
    const original = RECOMMENDED_PROFILES[0];
    const clone = cloneRecommendedProfile(original, "My Copy");

    expect(clone.source).toEqual({
      kind: "recommended",
      profileId: original.id,
      name: original.name,
    });
    expect((clone as unknown as { readOnly?: boolean }).readOnly).toBeUndefined();
  });

  it("deep clones widgets so the original preset is not mutated", () => {
    const original = RECOMMENDED_PROFILES[0];
    const clone = cloneRecommendedProfile(original, "Mutate Test");

    clone.widgets[0].enabled = !clone.widgets[0].enabled;
    clone.widgets[0].position.x += 100;

    expect(original.profile.widgets[0].enabled).not.toBe(clone.widgets[0].enabled);
    expect(original.profile.widgets[0].position.x).not.toBe(clone.widgets[0].position.x);
  });

  it("does not mutate the original profile when cloning", () => {
    const original = RECOMMENDED_PROFILES[0];
    const originalJSON = JSON.stringify(original.profile);
    const clone = cloneRecommendedProfile(original, "Deep Equal Check");
    expect(clone.id).toBeDefined();
    expect(JSON.stringify(original.profile)).toBe(originalJSON);
  });

  it("falls back to a copy name when an empty name is provided", () => {
    const original = RECOMMENDED_PROFILES[0];
    const clone = cloneRecommendedProfile(original, "   ");

    expect(clone.name).toBe(`${original.name} Copy`);
    expect(clone.id?.startsWith("custom-")).toBe(true);
  });
});
