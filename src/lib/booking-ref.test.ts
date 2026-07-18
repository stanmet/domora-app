import { describe, it, expect } from "vitest";
import { genBookingRef, bookingRef } from "./booking-ref";

describe("booking-ref", () => {
  it("генерирует читаемый номер DM-XXXXXX без похожих символов", () => {
    for (let i = 0; i < 200; i++) {
      const ref = genBookingRef();
      expect(ref).toMatch(/^DM-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
      expect(ref).not.toMatch(/[01OIL]/); // 0,1,O,I,L исключены
    }
  });

  it("bookingRef отдаёт сохранённый ref, если он есть", () => {
    expect(bookingRef({ ref: "DM-ABC234", id: "clxyz" })).toBe("DM-ABC234");
  });

  it("bookingRef строит запасной вариант из id, если ref пуст", () => {
    expect(bookingRef({ ref: null, id: "clabc123def456" })).toBe("DM-DEF456");
  });
});
