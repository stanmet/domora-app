// Автосценарии ботов: планировщик (тик по расписанию/по кнопке), простая
// очередь действий за тик, самоотключение при появлении реального пользователя
// с теми же параметрами (категория + город), лог активности и переключатели.
// Боты действуют только между собой и никогда не касаются платежей.
import { ListingStatus, OfferStatus, Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { TASK_TTL_DAYS } from "@/lib/tasks";
import { CATEGORY_PACKS } from "./personas";

const CONFIG_ID = "singleton";

export interface BotConfig {
  enabled: boolean;
  activityLevel: number;
  provider: string;
}

export async function getBotConfig(): Promise<BotConfig> {
  const row = await prisma.testBotConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
    select: { enabled: true, activityLevel: true, provider: true },
  });
  return row;
}

export async function setBotConfig(patch: Partial<BotConfig>): Promise<void> {
  const data = {
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.activityLevel !== undefined ? { activityLevel: Math.max(0, Math.min(100, patch.activityLevel)) } : {}),
    ...(patch.provider ? { provider: patch.provider } : {}),
  };
  await prisma.testBotConfig.upsert({ where: { id: CONFIG_ID }, update: data, create: { id: CONFIG_ID, ...data } });
}

// Переключатель одного бота (только тестовый аккаунт).
export async function setBotEnabled(userId: string, enabled: boolean): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, isTest: true }, data: { botEnabled: enabled } });
}

// Включить/выключить всех ботов разом (индивидуальные флаги).
export async function setAllBotsEnabled(enabled: boolean): Promise<number> {
  const res = await prisma.user.updateMany({ where: { isTest: true }, data: { botEnabled: enabled } });
  return res.count;
}

async function log(action: string, actorId?: string, detail?: string): Promise<void> {
  await prisma.testBotActivity.create({ data: { action, actorId: actorId ?? null, detail: detail ?? null } });
}

// Самоотключение: если появился реальный исполнитель/заказчик с теми же
// параметрами (категория + город), боты-двойники выключаются и перестают
// действовать. Реальные пользователи всегда в приоритете.
export async function reconcileSelfDisable(): Promise<number> {
  let disabled = 0;

  // Параметры (категория+город), где есть реальный активный исполнитель.
  const realProviderListings = await prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, provider: { status: "ACTIVE", user: { isTest: false } } },
    select: { categoryId: true, provider: { select: { city: true } } },
  });
  const realProviderKeys = new Set(realProviderListings.map((l) => `${l.categoryId}:${l.provider.city}`));

  if (realProviderKeys.size > 0) {
    const botProviders = await prisma.user.findMany({
      where: { isTest: true, botEnabled: true, roles: { has: Role.PROVIDER } },
      select: { id: true, providerProfile: { select: { city: true, listings: { select: { id: true, categoryId: true } } } } },
    });
    for (const b of botProviders) {
      const city = b.providerProfile?.city ?? "";
      const match = b.providerProfile?.listings.some((l) => realProviderKeys.has(`${l.categoryId}:${city}`));
      if (match) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: b.id }, data: { botEnabled: false } }),
          prisma.listing.updateMany({ where: { providerId: b.id }, data: { status: ListingStatus.PAUSED } }),
        ]);
        await log("self_disabled", b.id, "появился реальный исполнитель в той же категории и городе");
        disabled++;
      }
    }
  }

  // Параметры, где есть реальный заказчик с открытой задачей.
  const realTasks = await prisma.task.findMany({
    where: { status: TaskStatus.OPEN, client: { isTest: false } },
    select: { categoryId: true, city: true },
  });
  const realTaskKeys = new Set(realTasks.map((t) => `${t.categoryId}:${t.city}`));

  if (realTaskKeys.size > 0) {
    const botClients = await prisma.user.findMany({
      where: { isTest: true, botEnabled: true, NOT: { roles: { has: Role.PROVIDER } } },
      select: { id: true, tasks: { where: { status: TaskStatus.OPEN }, select: { categoryId: true, city: true } } },
    });
    for (const b of botClients) {
      const match = b.tasks.some((t) => realTaskKeys.has(`${t.categoryId}:${t.city}`));
      if (match) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: b.id }, data: { botEnabled: false } }),
          prisma.task.updateMany({ where: { clientId: b.id, status: TaskStatus.OPEN }, data: { status: TaskStatus.EXPIRED } }),
        ]);
        await log("self_disabled", b.id, "появился реальный заказчик в той же категории и городе");
        disabled++;
      }
    }
  }

  return disabled;
}

export interface TickResult {
  ran: boolean;
  reason?: string;
  selfDisabled: number;
  tasksCreated: number;
  offersMade: number;
  offersAccepted: number;
  messagesSent: number;
}

// Один тик планировщика. Вызывается из cron и из кнопки в админке.
export async function runBotTick(): Promise<TickResult> {
  const cfg = await getBotConfig();
  const result: TickResult = { ran: false, selfDisabled: 0, tasksCreated: 0, offersMade: 0, offersAccepted: 0, messagesSent: 0 };
  if (!cfg.enabled) {
    result.reason = "боты выключены";
    return result;
  }
  result.ran = true;

  // Всегда сначала уступаем место реальным пользователям.
  result.selfDisabled = await reconcileSelfDisable().catch(() => 0);

  // Бюджет действий за тик по ползунку интенсивности (0..100 -> ~0..6).
  const budget = Math.max(1, Math.min(6, Math.round(cfg.activityLevel / 16)));

  for (let i = 0; i < budget; i++) {
    try {
      await createBotTask();
      result.tasksCreated++;
    } catch (e) {
      console.error("bot createTask", e);
    }
  }
  for (let i = 0; i < budget; i++) {
    try {
      if (await makeBotOffer()) result.offersMade++;
    } catch (e) {
      console.error("bot offer", e);
    }
  }
  for (let i = 0; i < Math.ceil(budget / 2); i++) {
    try {
      const r = await acceptBotOffer();
      if (r) {
        result.offersAccepted++;
        if (await sendBotMessage(r.taskId, r.clientId, r.providerId)) result.messagesSent++;
      }
    } catch (e) {
      console.error("bot accept", e);
    }
  }

  await log("tick", undefined, `создано задач ${result.tasksCreated}, откликов ${result.offersMade}, принято ${result.offersAccepted}, самоотключено ${result.selfDisabled}`);
  return result;
}

function rand<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

// Активный тестовый клиент публикует новую задачу.
async function createBotTask(): Promise<void> {
  const clients = await prisma.user.findMany({
    where: { isTest: true, botEnabled: true, NOT: { roles: { has: Role.PROVIDER } } },
    select: { id: true, city: true, tasks: { select: { categoryId: true }, take: 1 } },
    take: 100,
  });
  const client = rand(clients);
  if (!client) return;
  // Категория берётся из уже существующей задачи клиента (стабильные параметры).
  const categoryId = client.tasks[0]?.categoryId;
  if (!categoryId) return;
  const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
  const pack = CATEGORY_PACKS[cat?.slug ?? "other"] ?? CATEGORY_PACKS.other;
  const title = rand(pack.tasks) ?? "Тестовая задача";
  const from = pack.budget[0];
  const to = Math.round((from + (pack.budget[1] - pack.budget[0]) * 0.6) / 100) * 100;
  await prisma.task.create({
    data: {
      clientId: client.id,
      categoryId,
      title,
      description: `${title}. Демо-задача бота.`,
      city: client.city ?? "Dublin",
      addressEncrypted: encrypt(`${client.city ?? "Dublin"}, test address`),
      budgetFromCents: from,
      budgetToCents: to,
      status: TaskStatus.OPEN,
      expiresAt: new Date(Date.now() + TASK_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  await log("task_created", client.id, title);
}

const MAX_OFFERS = 5;

// Активный тестовый исполнитель откликается на открытую тестовую задачу.
async function makeBotOffer(): Promise<boolean> {
  const tasks = await prisma.task.findMany({
    where: { status: TaskStatus.OPEN, client: { isTest: true }, expiresAt: { gt: new Date() } },
    select: { id: true, categoryId: true, city: true, _count: { select: { offers: true } } },
    take: 50,
  });
  const open = tasks.filter((t) => t._count.offers < MAX_OFFERS);
  const task = rand(open);
  if (!task) return false;

  // Кандидаты: активные тестовые исполнители с услугой в этой категории,
  // ещё не откликавшиеся на эту задачу.
  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      categoryId: task.categoryId,
      provider: { status: "ACTIVE", user: { isTest: true, botEnabled: true } },
    },
    select: { priceCents: true, providerId: true },
    take: 100,
  });
  const existing = new Set(
    (await prisma.offer.findMany({ where: { taskId: task.id }, select: { providerId: true } })).map((o) => o.providerId),
  );
  const candidates = listings.filter((l) => !existing.has(l.providerId));
  const chosen = rand(candidates);
  if (!chosen) return false;

  await prisma.offer.create({
    data: {
      taskId: task.id,
      providerId: chosen.providerId,
      priceCents: chosen.priceCents || 3000,
      message: "Готов взяться, есть опыт в этой категории.",
      status: OfferStatus.PENDING,
    },
  });
  await log("offer_made", chosen.providerId, `отклик на задачу ${task.id}`);
  return true;
}

// Тестовый заказчик принимает один из откликов (смена статуса, без оплаты).
async function acceptBotOffer(): Promise<{ taskId: string; clientId: string; providerId: string } | null> {
  const task = await prisma.task.findFirst({
    where: {
      status: TaskStatus.OPEN,
      client: { isTest: true },
      offers: { some: { status: OfferStatus.PENDING } },
    },
    select: { id: true, clientId: true, offers: { where: { status: OfferStatus.PENDING }, select: { id: true, providerId: true }, take: 5 } },
  });
  if (!task) return null;
  const offer = rand(task.offers);
  if (!offer) return null;

  await prisma.$transaction([
    prisma.offer.update({ where: { id: offer.id }, data: { status: OfferStatus.ACCEPTED } }),
    prisma.offer.updateMany({ where: { taskId: task.id, NOT: { id: offer.id } }, data: { status: OfferStatus.REJECTED } }),
    prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.OFFER_ACCEPTED } }),
  ]);
  await log("offer_accepted", task.clientId, `принят отклик исполнителя ${offer.providerId}`);
  return { taskId: task.id, clientId: task.clientId, providerId: offer.providerId };
}

// Обмен сообщением между двумя тестовыми аккаунтами (история активности).
// Тред не привязан к брони (bookingId=null) и виден только в логе ботов.
async function sendBotMessage(taskId: string, clientId: string, providerId: string): Promise<boolean> {
  const thread = await prisma.thread.create({ data: {} });
  await prisma.message.create({
    data: {
      threadId: thread.id,
      authorId: clientId,
      textOriginal: "Здравствуйте! Когда сможете приступить?",
      langOriginal: "ru",
    },
  });
  await prisma.message.create({
    data: {
      threadId: thread.id,
      authorId: providerId,
      textOriginal: "Добрый день! Готов обсудить детали.",
      langOriginal: "ru",
    },
  });
  await log("message_sent", clientId, `диалог по задаче ${taskId}`);
  return true;
}

export interface BotActivityRow {
  id: string;
  action: string;
  detail: string | null;
  createdAt: Date;
}

export async function recentBotActivity(limit = 25): Promise<BotActivityRow[]> {
  return prisma.testBotActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, detail: true, createdAt: true },
  });
}
