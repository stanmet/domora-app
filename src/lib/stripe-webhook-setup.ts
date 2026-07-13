// Самонастройка вебхуков Stripe: приложение само создает через API два
// классических (snapshot) endpoint'а, вручную в дашборде ничего делать не надо.
// Destination в новом формате thin payload (Accounts v2) не подходит: платежные
// события payment_intent.* и charge.* в thin-формате не существуют.
//
// Endpoint'а два, потому что в Stripe это разные scope:
// 1) "Your account": платежные события платформы (холды, отказы, возвраты, чарджбеки)
// 2) "Connected accounts" (connect: true): account.updated исполнителей после онбординга
//
// Секрет подписи, который Stripe возвращает при создании, нигде не сохраняем:
// вебхук проверяет подлинность события, перечитывая его из Stripe API по id
// (см. src/app/api/stripe/webhook/route.ts).
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const WEBHOOK_PATH = "/api/stripe/webhook";
const MANAGED_KEY = "domora"; // метка в metadata: по ней узнаем свои endpoint'ы
// Версия совпадает с версией SDK в src/lib/stripe.ts: payload соответствует типам
const API_VERSION = "2025-02-24.acacia";

const PLATFORM_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "payment_intent.amount_capturable_updated",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
];

let ensured: Promise<void> | null = null;

// Вызывается перед созданием холда и перед онбордингом исполнителя.
// Выполняется один раз на инстанс сервера; ошибки не роняют основной флоу,
// при следующем вызове попытка повторится.
export function ensureStripeWebhooks(fallbackOrigin?: string): Promise<void> {
  ensured ??= createMissingEndpoints(fallbackOrigin).catch((e) => {
    ensured = null;
    console.error("stripe webhook auto-setup failed", e);
  });
  return ensured;
}

async function createMissingEndpoints(fallbackOrigin?: string): Promise<void> {
  const origin = process.env.APP_URL || fallbackOrigin;
  // Stripe принимает только публичные https-адреса: локальную разработку
  // пропускаем, там события доставляет stripe CLI (stripe listen).
  if (!origin || !origin.startsWith("https://")) return;
  const url = new URL(WEBHOOK_PATH, origin).toString();

  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const mine = existing.data.filter((e) => e.url === url && e.status === "enabled");

  if (!mine.some((e) => e.metadata?.[MANAGED_KEY] === "platform")) {
    await stripe.webhookEndpoints.create(
      {
        url,
        enabled_events: PLATFORM_EVENTS,
        api_version: API_VERSION,
        description: "Domora: платежные события платформы (создан автоматически)",
        metadata: { [MANAGED_KEY]: "platform" },
      },
      { idempotencyKey: `domora-webhook-platform-${url}` },
    );
  }

  if (!mine.some((e) => e.metadata?.[MANAGED_KEY] === "connect")) {
    await stripe.webhookEndpoints.create(
      {
        url,
        connect: true,
        enabled_events: ["account.updated"],
        api_version: API_VERSION,
        description: "Domora: онбординг исполнителей (создан автоматически)",
        metadata: { [MANAGED_KEY]: "connect" },
      },
      { idempotencyKey: `domora-webhook-connect-${url}` },
    );
  }
}
