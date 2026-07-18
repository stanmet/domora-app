import { describe, it, expect } from "vitest";
import { isWithinSchedule, minToHHMM, hhmmToMin, type WorkSchedule } from "./availability";

const weekdays: WorkSchedule = { workDays: [1, 2, 3, 4, 5], workStartMin: 540, workEndMin: 1200 }; // Пн-Пт 09:00-20:00
const noBlocks = new Set<string>();

// Даты в UTC. 2026-07-20 - понедельник, 2026-07-19 - воскресенье.
describe("isWithinSchedule", () => {
  it("рабочий день в окне - доступен", () => {
    expect(isWithinSchedule(weekdays, new Date("2026-07-20T10:00:00.000Z"), noBlocks)).toBe(true);
  });
  it("выходной день недели - недоступен", () => {
    expect(isWithinSchedule(weekdays, new Date("2026-07-19T10:00:00.000Z"), noBlocks)).toBe(false);
  });
  it("до начала окна - недоступен", () => {
    expect(isWithinSchedule(weekdays, new Date("2026-07-20T08:00:00.000Z"), noBlocks)).toBe(false);
  });
  it("после конца окна - недоступен", () => {
    expect(isWithinSchedule(weekdays, new Date("2026-07-20T21:00:00.000Z"), noBlocks)).toBe(false);
  });
  it("граница окна включительно", () => {
    expect(isWithinSchedule(weekdays, new Date("2026-07-20T09:00:00.000Z"), noBlocks)).toBe(true);
    expect(isWithinSchedule(weekdays, new Date("2026-07-20T20:00:00.000Z"), noBlocks)).toBe(true);
  });
  it("заблокированный день (отпуск) - недоступен даже в рабочее окно", () => {
    const blocked = new Set(["2026-07-20"]);
    expect(isWithinSchedule(weekdays, new Date("2026-07-20T10:00:00.000Z"), blocked)).toBe(false);
  });
});

describe("формат времени", () => {
  it("минуты в HH:MM", () => {
    expect(minToHHMM(540)).toBe("09:00");
    expect(minToHHMM(1200)).toBe("20:00");
    expect(minToHHMM(0)).toBe("00:00");
  });
  it("HH:MM в минуты", () => {
    expect(hhmmToMin("09:00")).toBe(540);
    expect(hhmmToMin("20:30")).toBe(1230);
  });
});
