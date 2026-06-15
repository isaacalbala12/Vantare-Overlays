import { describe, expect, it } from "vitest";
import {
  isRunningProfile,
  profileLabel,
  profileTarget,
  type OverlayStatus,
  type ProfileEntry,
} from "./overlay-workbench";

describe("overlay-workbench", () => {
  const profile: ProfileEntry = {
    id: "default-racing",
    file: "example-racing.json",
    name: "Default Racing",
    displayMode: "racing",
    widgets: 3,
  };

  it("uses display name when available", () => {
    expect(profileLabel(profile)).toBe("Default Racing");
    expect(profileLabel({ ...profile, name: "" })).toBe("default-racing");
  });

  it("builds event target with id and file", () => {
    expect(profileTarget(profile)).toEqual({
      id: "default-racing",
      file: "example-racing.json",
    });
  });

  it("detects the currently running profile", () => {
    const status: OverlayStatus = {
      running: true,
      profileId: "default-racing",
      mode: "racing",
    };
    expect(isRunningProfile(profile, status)).toBe(true);
    expect(isRunningProfile({ ...profile, id: "other" }, status)).toBe(false);
    expect(isRunningProfile(profile, { ...status, running: false })).toBe(false);
  });
});
