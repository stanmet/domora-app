// Ядро модуля тестовых пользователей: создание синтетических аккаунтов
// (исполнители и клиенты) с профилями, услугами и задачами, массовое удаление
// и статистика. Все аккаунты помечаются User.isTest=true (флаг TEST_ACCOUNT),
// поэтому исключаются из поиска, рейтингов и статистики (см. src/lib/test-visibility.ts).
// Тестовые аккаунты не участвуют в платежах: у них нет Stripe-данных и броней.
import { randomUUID } from "crypto";
import { ListingStatus, ProviderStatus, Role, TaskStatus, type PriceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { CATEGORY_ORDER } from "@/components/categories";
import { TASK_TTL_DAYS } from "@/lib/tasks";
import { generatePersonas, type GenerationMethod } from "./ai";
import { syntheticAvatar } from "./avatar";
import { TEST_CITIES, type PersonaRole } from "./personas";

export const TEST_EMAIL_DOMAIN = "testuser.domora.local";
export const MAX_TEST_USERS_PER_BATCH = 1000;
export const MIN_TEST_USERS_PER_BATCH = 10;

export type CreateRole = "provider" | "client" | "mixed";

export interface CreateOptions {
  count: number;
  role: CreateRole;
  categorySlug: string; // "" = распределить по всем категориям
  city: string; // "" = случайные города
  actorId: string;
}

export interface CreateResult {
  created: number;
  providers: number;
  clients: number;
  method: GenerationMethod;
  note?: string;
}

// Создаёт count тестовых аккаунтов. Тексты берутся у AI (с откатом на локальный
// генератор), структура и суммы - локально. Пишет запись в журнал аудита.
export async function createTestUsers(opts: CreateOptions): Promise<CreateResult> {
  const count = Math.max(MIN_TEST_USERS_PER_BATCH, Math.min(MAX_TEST_USERS_PER_BATCH, Math.floor(opts.count)));

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, nameEn: true, nameRu: true, unitDefault: true },
  });
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const slugs =
    opts.categorySlug && catBySlug.has(opts.categorySlug)
      ? [opts.categorySlug]
      : CATEGORY_ORDER.filter((s) => catBySlug.has(s));
  if (slugs.length === 0) throw new Error("Нет категорий - сначала выполните seed категорий.");

  // Раскладываем count на пары (роль, категория) по кругу.
  type Slot = { role: PersonaRole; slug: string };
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const role: PersonaRole = roleForIndex(opts.role, i);
    const slug = slugs[i % slugs.length];
    slots.push({ role, slug });
  }

  // Группируем по (роль, категория), чтобы делать пакетную генерацию текстов.
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = `${s.role}:${s.slug}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }

  let providers = 0;
  let clients = 0;
  let method: GenerationMethod = "local";
  const notes = new Set<string>();

  for (const [key, groupSlots] of groups) {
    const [role, slug] = key.split(":") as [PersonaRole, string];
    const cat = catBySlug.get(slug)!;
    const label = cat.nameRu || cat.nameEn;
    const gen = await generatePersonas(groupSlots.length, {
      role,
      categorySlug: slug,
      city: opts.city || undefined,
      categoryLabel: label,
    });
    if (gen.method === "ai") method = "ai";
    if (gen.note) notes.add(gen.note);

    // Вставляем персон пачками, чтобы не держать одну огромную транзакцию.
    const CHUNK = 25;
    for (let i = 0; i < gen.personas.length; i += CHUNK) {
      const chunk = gen.personas.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((p) => {
          if (role === "provider") {
            providers++;
            return insertProvider(p, cat);
          }
          clients++;
          return insertClient(p, cat.id);
        }),
      );
    }
  }

  const created = providers + clients;
  await prisma.testAuditLog.create({
    data: {
      action: "create",
      actorId: opts.actorId,
      count: created,
      detail: `role=${opts.role}, category=${opts.categorySlug || "all"}, city=${opts.city || "any"}, method=${method}`,
    },
  });

  return { created, providers, clients, method, note: notes.size ? Array.from(notes).join(" ") : undefined };
}

function roleForIndex(role: CreateRole, i: number): PersonaRole {
  if (role === "provider") return "provider";
  if (role === "client") return "client";
  // mixed: примерно 70% исполнителей, 30% клиентов.
  return i % 10 < 7 ? "provider" : "client";
}

function testEmail(): string {
  return `test.${randomUUID().slice(0, 12)}@${TEST_EMAIL_DOMAIN}`;
}

async function insertProvider(
  p: { firstName: string; lastName: string; city: string; profession?: string; bio?: string; bioLang: string; listingTitle?: string; priceCents?: number },
  cat: { id: string; unitDefault: PriceUnit; nameRu: string; nameEn: string },
): Promise<void> {
  const displayName = `${p.firstName} ${p.lastName}`;
  const avatar = syntheticAvatar(p.firstName, p.lastName);
  await prisma.user.create({
    data: {
      email: testEmail(),
      name: displayName,
      locale: p.bioLang,
      city: p.city,
      roles: [Role.CLIENT, Role.PROVIDER],
      isTest: true,
      providerProfile: {
        create: {
          displayName,
          customProfession: p.profession ?? cat.nameRu,
          bio: p.bio ?? null,
          bioLang: p.bioLang,
          city: p.city,
          status: ProviderStatus.ACTIVE,
          portfolioPhotos: [avatar],
          listings: {
            create: {
              categoryId: cat.id,
              professionLabel: p.profession ?? cat.nameRu,
              title: p.listingTitle ?? cat.nameRu,
              titleLang: p.bioLang,
              priceCents: p.priceCents ?? 0,
              unit: cat.unitDefault,
              photos: [avatar],
              status: ListingStatus.ACTIVE,
            },
          },
        },
      },
    },
  });
}

async function insertClient(
  p: { firstName: string; lastName: string; city: string; bioLang: string; taskTitle?: string; taskDescription?: string; budgetFromCents?: number; budgetToCents?: number },
  categoryId: string,
): Promise<void> {
  const displayName = `${p.firstName} ${p.lastName}`;
  const expiresAt = new Date(Date.now() + TASK_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.user.create({
    data: {
      email: testEmail(),
      name: displayName,
      locale: p.bioLang,
      city: p.city,
      roles: [Role.CLIENT],
      isTest: true,
      tasks: {
        create: {
          categoryId,
          title: p.taskTitle ?? "Тестовая задача",
          description: p.taskDescription ?? p.taskTitle ?? "Тестовая задача",
          city: p.city,
          addressEncrypted: encrypt(`${p.city}, test address`),
          budgetFromCents: p.budgetFromCents ?? null,
          budgetToCents: p.budgetToCents ?? null,
          status: TaskStatus.OPEN,
          expiresAt,
        },
      },
    },
  });
}

export interface TestStats {
  total: number;
  providers: number;
  clients: number;
  listings: number;
  tasks: number;
  byCategory: { slug: string; label: string; count: number }[];
}

// Сводка по тестовым данным для аналитики (всё считается только по isTest=true).
export async function testStats(locale: string): Promise<TestStats> {
  const [total, providers, listings, tasks, categories] = await Promise.all([
    prisma.user.count({ where: { isTest: true } }),
    prisma.providerProfile.count({ where: { user: { isTest: true } } }),
    prisma.listing.count({ where: { provider: { user: { isTest: true } } } }),
    prisma.task.count({ where: { client: { isTest: true } } }),
    prisma.category.findMany({ select: { slug: true, nameEn: true, nameRu: true } }),
  ]);

  const grouped = await prisma.listing.groupBy({
    by: ["categoryId"],
    where: { provider: { user: { isTest: true } } },
    _count: { _all: true },
  });
  const catById = new Map(categories.map((c) => [c.slug, c]));
  const idToSlug = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugById = new Map(idToSlug.map((c) => [c.id, c.slug]));
  const byCategory = grouped.map((g) => {
    const slug = slugById.get(g.categoryId) ?? "other";
    const c = catById.get(slug);
    return {
      slug,
      label: (locale === "ru" || locale === "uk" ? c?.nameRu : c?.nameEn) ?? slug,
      count: g._count._all,
    };
  });

  return { total, providers, clients: total - providers, listings, tasks, byCategory };
}

export interface TestUserRow {
  id: string;
  name: string;
  city: string | null;
  isProvider: boolean;
  category: string | null;
}

// Список тестовых аккаунтов для админки с фильтром по роли и категории.
export async function listTestUsers(filter: { role?: CreateRole; categorySlug?: string }): Promise<TestUserRow[]> {
  const users = await prisma.user.findMany({
    where: {
      isTest: true,
      ...(filter.role === "provider" ? { roles: { has: Role.PROVIDER } } : {}),
      ...(filter.role === "client" ? { NOT: { roles: { has: Role.PROVIDER } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      name: true,
      city: true,
      roles: true,
      providerProfile: {
        select: { listings: { select: { category: { select: { slug: true } } }, take: 1 } },
      },
      tasks: { select: { category: { select: { slug: true } } }, take: 1 },
    },
  });

  let rows: TestUserRow[] = users.map((u) => {
    const isProvider = u.roles.includes(Role.PROVIDER);
    const category = isProvider
      ? u.providerProfile?.listings[0]?.category.slug ?? null
      : u.tasks[0]?.category.slug ?? null;
    return { id: u.id, name: u.name, city: u.city, isProvider, category };
  });

  if (filter.categorySlug) rows = rows.filter((r) => r.category === filter.categorySlug);
  return rows;
}

// Массовое удаление тестовых аккаунтов и всех их данных. Если ids не заданы -
// удаляются все тестовые аккаунты. Порядок учитывает внешние ключи.
export async function deleteTestUsers(actorId: string, ids?: string[]): Promise<number> {
  const where = ids && ids.length ? { isTest: true, id: { in: ids } } : { isTest: true };
  const users = await prisma.user.findMany({ where, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return 0;

  // Задачи тестовых клиентов - нужны, чтобы почистить их отклики и просмотры
  // (у TaskView нет relation на Task, фильтруем по taskId).
  const tasks = await prisma.task.findMany({ where: { clientId: { in: userIds } }, select: { id: true } });
  const taskIds = tasks.map((t) => t.id);

  await prisma.$transaction([
    prisma.offer.deleteMany({ where: { OR: [{ providerId: { in: userIds } }, { taskId: { in: taskIds } }] } }),
    prisma.taskView.deleteMany({ where: { OR: [{ providerId: { in: userIds } }, { taskId: { in: taskIds } }] } }),
    prisma.listing.deleteMany({ where: { providerId: { in: userIds } } }),
    prisma.task.deleteMany({ where: { clientId: { in: userIds } } }),
    prisma.favorite.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { providerId: { in: userIds } }] } }),
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.providerProfile.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);

  await prisma.testAuditLog.create({
    data: { action: "delete", actorId, count: userIds.length, detail: ids ? "selected" : "all" },
  });
  return userIds.length;
}

export interface AuditRow {
  id: string;
  action: string;
  count: number;
  detail: string | null;
  createdAt: Date;
}

export async function recentAudit(limit = 15): Promise<AuditRow[]> {
  return prisma.testAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, count: true, detail: true, createdAt: true },
  });
}

export { TEST_CITIES };
