import { describe, it, expect } from "vitest";
import { calcBooking } from "./stripe";

// Денежная математика брони (spec: клиент платит subtotal + сбор клиента,
// исполнитель получает subtotal - сбор исполнителя). Всё в центах.
describe("calcBooking", () => {
  it("считает суммы для одной единицы", () => {
    const m = calcBooking(10000, 1, 12, 10);
    expect(m.subtotal).toBe(10000);
    expect(m.clientFee).toBe(1200);
    expect(m.providerFee).toBe(1000);
    expect(m.total).toBe(11200); // платит клиент
    expect(m.providerNet).toBe(9000); // получает исполнитель
  });

  it("умножает на количество", () => {
    const m = calcBooking(4500, 3, 12, 10);
    expect(m.subtotal).toBe(13500);
    expect(m.total).toBe(13500 + Math.round(13500 * 0.12));
    expect(m.providerNet).toBe(13500 - Math.round(13500 * 0.1));
  });

  it("округляет сборы до цента (банковское округление Math.round)", () => {
    const m = calcBooking(333, 1, 12, 10);
    expect(m.clientFee).toBe(Math.round(333 * 0.12)); // 40
    expect(m.providerFee).toBe(Math.round(333 * 0.1)); // 33
    expect(m.total).toBe(333 + m.clientFee);
    expect(m.providerNet).toBe(333 - m.providerFee);
  });

  it("нулевая цена (услуга по смете) даёт нулевые суммы", () => {
    const m = calcBooking(0, 1, 12, 10);
    expect(m.subtotal).toBe(0);
    expect(m.total).toBe(0);
    expect(m.providerNet).toBe(0);
  });

  it("total всегда >= providerNet (платформа не уходит в минус)", () => {
    for (const price of [100, 999, 4500, 25000]) {
      const m = calcBooking(price, 2, 12, 10);
      expect(m.total).toBeGreaterThanOrEqual(m.providerNet);
    }
  });
});
