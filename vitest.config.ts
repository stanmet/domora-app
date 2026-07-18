import { defineConfig } from "vitest/config";
import path from "path";

// Юнит-тесты чистой логики (деньги, отмены, номера заказов). База и Stripe
// не требуются: тестируем только детерминированные функции.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
