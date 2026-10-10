import { describe, expect, it } from "vitest";
import { chroma, deltaE, hueAngle, rgbToHsv, rgbToLab } from "@/lib/vision/colour";
import { classifyLab, requiredChroma } from "@/lib/vision/classify";
import { DEFAULT_THRESHOLDS, resolveConfig, validateThresholds } from "@/lib/vision/config";

const T = DEFAULT_THRESHOLDS;
const classifyRgb = (r: number, g: number, b: number, t = T) => {
  const [L, a, bb] = rgbToLab(r, g, b);
  return classifyLab(L, a, bb, t);
};

describe("colour-space conversion", () => {
  it("matches reference CIELAB values (D65)", () => {
    const white = rgbToLab(255, 255, 255);
    expect(white[0]).toBeCloseTo(100, 1);
    expect(Math.abs(white[1])).toBeLessThan(0.5);
    expect(Math.abs(white[2])).toBeLessThan(0.5);
    expect(rgbToLab(0, 0, 0)[0]).toBeCloseTo(0, 5);
    const red = rgbToLab(255, 0, 0);
    expect(red[0]).toBeCloseTo(53.24, 1);
    expect(red[1]).toBeCloseTo(80.09, 0);
    expect(red[2]).toBeCloseTo(67.2, 0);
    const grey = rgbToLab(119, 119, 119);
    expect(grey[0]).toBeCloseTo(50, 0);
    expect(chroma(grey[1], grey[2])).toBeLessThan(0.5);
  });

  it("computes hue angle, chroma, ΔE and HSV", () => {
    expect(hueAngle(1, 0)).toBeCloseTo(0);
    expect(hueAngle(0, 1)).toBeCloseTo(90);
    expect(hueAngle(-1, 0)).toBeCloseTo(180);
    expect(hueAngle(0, -1)).toBeCloseTo(270);
    expect(chroma(3, 4)).toBe(5);
    expect(deltaE(50, 0, 0, 50, 3, 4)).toBe(5);
    expect(rgbToHsv(255, 0, 0)).toEqual([0, 1, 1]);
    expect(rgbToHsv(0, 0, 0)).toEqual([0, 0, 0]);
  });
});

describe("pixel colour categorisation", () => {
  it("classifies typical container-glass colours", () => {
    expect(classifyRgb(170, 175, 172)).toBe("clear");
    expect(classifyRgb(40, 120, 60)).toBe("green");
    expect(classifyRgb(130, 70, 20)).toBe("brown");
    expect(classifyRgb(40, 80, 200)).toBe("otherColour");
    expect(classifyRgb(200, 30, 60)).toBe("otherColour"); // crimson, e.g. a red cap
  });

  it("treats near-white low-chroma pixels as glare", () => {
    expect(classifyRgb(250, 250, 250)).toBe("glare");
  });

  it("marks too-dark, dark-neutral and weakly tinted pixels as uncertain", () => {
    expect(classifyRgb(5, 5, 5)).toBe("uncertain"); // L* < darkMax
    expect(classifyRgb(70, 70, 70)).toBe("uncertain"); // neutral but L* < neutralMin
    // Light, weakly tinted (C* between clearMax and colourMin).
    const [L, a, b] = rgbToLab(180, 196, 178);
    const C = chroma(a, b);
    expect(C).toBeGreaterThanOrEqual(T.clearMaxChroma);
    expect(C).toBeLessThan(T.colourMinChroma);
    expect(classifyLab(L, a, b, T)).toBe("uncertain");
  });

  it("classifies dark but saturated glass by relative chroma", () => {
    // Dark green: L* 10, C* ≈ 11.7 (below colourMinChroma) but C* ÷ L* ≈ 1.2.
    expect(classifyLab(10, -10, 6, T)).toBe("green");
    // Same chroma at normal lightness is only a weak tint → uncertain.
    expect(classifyLab(60, -10, 6, T)).toBe("uncertain");
    // Dark and nearly neutral → uncertain.
    expect(classifyLab(10, -2, 1, T)).toBe("uncertain");
  });

  it("requires full chroma at normal lightness and a floor at low lightness", () => {
    expect(requiredChroma(80, T)).toBe(T.colourMinChroma);
    expect(requiredChroma(10, T)).toBeCloseTo(T.lowLightMinSaturation * 10);
    expect(requiredChroma(2, T)).toBe(T.minChroma);
  });

  it("marks hues near a class boundary as uncertain", () => {
    const h = T.brownHue[1]; // brown/green boundary
    const rad = (h * Math.PI) / 180;
    expect(classifyLab(50, 30 * Math.cos(rad), 30 * Math.sin(rad), T)).toBe("uncertain");
    const inside = ((T.greenHue[0] + 30) * Math.PI) / 180;
    expect(classifyLab(50, 30 * Math.cos(inside), 30 * Math.sin(inside), T)).toBe("green");
  });

  it("respects configurable thresholds", () => {
    const loose = { ...T, clearMaxChroma: 15, colourMinChroma: 20 };
    const [L, a, b] = rgbToLab(180, 196, 178);
    expect(classifyLab(L, a, b, loose)).toBe("clear");
  });

  it("rejects inconsistent thresholds", () => {
    expect(() => validateThresholds({ ...T, colourMinChroma: 5, clearMaxChroma: 10 })).toThrow();
    expect(() => validateThresholds({ ...T, brownHue: [100, 20] })).toThrow();
    expect(() => validateThresholds(resolveConfig().thresholds)).not.toThrow();
  });
});
