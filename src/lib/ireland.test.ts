import { describe, it, expect } from "vitest";
import { distanceKm, reachable, findTown } from "./ireland";

describe("distanceKm", () => {
  it("Dublin - Cork около 220 км", () => {
    const d = distanceKm(findTown("Dublin")!, findTown("Cork")!);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(260);
  });
  it("одинаковая точка = 0", () => {
    expect(distanceKm({ lat: 53, lng: -6 }, { lat: 53, lng: -6 })).toBe(0);
  });
});

describe("reachable", () => {
  it("малый радиус: Cork не достаёт до Dublin", () => {
    expect(reachable("Cork", 50, "Dublin")).toBe(false);
  });
  it("большой радиус (вся страна): Cork достаёт до Dublin", () => {
    expect(reachable("Cork", 500, "Dublin")).toBe(true);
  });
  it("сосед в радиусе: Dublin достаёт до Bray (~20 км)", () => {
    expect(reachable("Dublin", 30, "Bray")).toBe(true);
  });
  it("тот же город - всегда достаёт", () => {
    expect(reachable("Galway", 1, "Galway")).toBe(true);
  });
  it("цель не задана (вся страна) - показываем всех", () => {
    expect(reachable("Cork", 10, null)).toBe(true);
    expect(reachable("Cork", 10, "")).toBe(true);
  });
  it("неизвестный город - откат на точное совпадение", () => {
    expect(reachable("Neverland", 500, "Dublin")).toBe(false);
    expect(reachable("Neverland", 500, "neverland")).toBe(true);
  });
});
