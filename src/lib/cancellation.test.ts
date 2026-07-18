import { describe, it, expect } from "vitest";
import { refundCentsForCancel } from "./cancellation";

// Возврат заказчику при отмене после подтверждения (spec 4.1). Тир "standard"
// считает по часам, тир "event" - по дням. Сбор возвращается в самом позднем тире.
const base = { totalCents: 11200, clientFeeCents: 1200 };
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * 3_600_000);

describe("refundCentsForCancel - standard", () => {
  it(">48ч: полный возврат", () => {
    const r = refundCentsForCancel({ ...base, tier: "standard", dateStart: at(72) });
    expect(r).toEqual({ refundCents: 11200, label: "full" });
  });
  it("24-48ч: половина", () => {
    const r = refundCentsForCancel({ ...base, tier: "standard", dateStart: at(30) });
    expect(r).toEqual({ refundCents: 5600, label: "half" });
  });
  it("<24ч: только сбор", () => {
    const r = refundCentsForCancel({ ...base, tier: "standard", dateStart: at(2) });
    expect(r).toEqual({ refundCents: 1200, label: "fee" });
  });
  it("граница ровно 24ч считается как half", () => {
    const r = refundCentsForCancel({ ...base, tier: "standard", dateStart: at(24) });
    expect(r.label).toBe("half");
  });
});

describe("refundCentsForCancel - event", () => {
  it(">14 дней: полный возврат", () => {
    const r = refundCentsForCancel({ ...base, tier: "event", dateStart: at(24 * 20) });
    expect(r).toEqual({ refundCents: 11200, label: "full" });
  });
  it("7-14 дней: половина", () => {
    const r = refundCentsForCancel({ ...base, tier: "event", dateStart: at(24 * 10) });
    expect(r).toEqual({ refundCents: 5600, label: "half" });
  });
  it("<7 дней: только сбор", () => {
    const r = refundCentsForCancel({ ...base, tier: "event", dateStart: at(24 * 3) });
    expect(r).toEqual({ refundCents: 1200, label: "fee" });
  });
});
