// Ядро модуля тестовых пользователей: создание синтетических аккаунтов
// (исполнители и клиенты) с профилями, услугами и задачами, массовое удаление
// и статистика. Все аккаунты помечаются User.isTest=true (флаг TEST_ACCOUNT),
// поэтому исключаются из поиска, рейтингов и статистики (см. src/lib/test-visibility.ts).
// Тестовые аккаунты не участвуют в платежах: у них нет Stripe-данных и броней.
import { randomUUID } from "crypto";
import { ListingStatus, ProviderStatus, Role, TaskStatus, type PriceUnit, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { purgeUsers } from "@/lib/purge-user";
import { encrypt } from "@/lib/crypto";
import { CATEGORY_ORDER } from "@/components/categories";
import { TASK_TTL_DAYS } from "@/lib/tasks";
import { generatePersonas, type GenerationMethod, type TextQuality } from "./ai";
import { portraitUrl, serviceKeyword, servicePhotos } from "./photos";
import { prefetchPools, realPhotos } from "./photoPool";
import { richBio, richListingDesc, richStats } from "./richProfile";
import { pickListingTitles, TEST_CITIES, type PersonaRole } from "./personas";

export const TEST_EMAIL_DOMAIN = "testuser.domora.local";
export const MAX_TEST_USERS_PER_BATCH = 1000;
export const MIN_TEST_USERS_PER_BATCH = 10;

export type CreateRole = "provider" | "client" | "mixed";

export interface CreateOptions {
  count: number;
  role: CreateRole;
  categorySlug: string; // "" = распределить по всем категориям
  city: string; // "" = случайные города
  lang: string; // "" = разные языки
  quality: TextQuality; // basic | ai | ai_high
  listingsPerProvider: number; // 1..5 услуг на профиль исполнителя
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
      lang: opts.lang || undefined,
      quality: opts.quality,
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
            return insertProvider(p, cat, opts.listingsPerProvider);
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
      detail:
        `role=${opts.role}, category=${opts.categorySlug || "all"}, city=${opts.city || "any"}, ` +
        `lang=${opts.lang || "mixed"}, quality=${opts.quality}, listings/pro=${opts.listingsPerProvider}, method=${method}`,
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
  cat: { id: string; slug: string; unitDefault: PriceUnit; nameRu: string; nameEn: string },
  listingsPerProvider: number,
): Promise<void> {
  const displayName = `${p.firstName} ${p.lastName}`;
  // Стабильный seed бота: одинаковый набор фото для аватара, портфолио и услуг.
  const seed = randomUUID();
  const profession = p.profession ?? cat.nameRu;
  const n = Math.max(1, Math.min(5, listingsPerProvider || 1));
  const stats = richStats(seed);

  // Первая услуга - из персоны (её текст мог сгенерировать AI); остальные - из
  // набора категории, без повторов, с небольшой вариацией цены.
  const base = p.priceCents ?? 0;
  const titles = [p.listingTitle, ...pickListingTitles(cat.slug, n + 2).filter((t) => t !== p.listingTitle)]
    .filter((t): t is string => !!t)
    .slice(0, n);
  // Прогреваем пулы фото по темам этого исполнителя, затем собираем услуги.
  await prefetchPools(titles.map((tt) => serviceKeyword(tt, cat.slug)));
  const listings = await Promise.all(
    titles.map(async (title, i) => {
      const kw = serviceKeyword(title, cat.slug);
      const photos = (await realPhotos(kw, `${seed}:${i}`, 3)) ?? servicePhotos(kw, `${seed}:${i}`, 3);
      return {
        categoryId: cat.id,
        professionLabel: profession,
        title,
        titleLang: "ru",
        description: richListingDesc({ title, city: p.city, seed, index: i }),
        priceCents: i === 0 ? base : Math.round((base * (0.85 + i * 0.15)) / 50) * 50,
        unit: cat.unitDefault,
        photos,
        status: ListingStatus.ACTIVE,
      };
    }),
  );
  const primaryKeyword = serviceKeyword(titles[0] ?? profession, cat.slug);
  const portfolioPhotos = (await realPhotos(primaryKeyword, seed, 4)) ?? servicePhotos(primaryKeyword, seed, 4);

  await prisma.user.create({
    data: {
      email: testEmail(),
      name: displayName,
      locale: p.bioLang,
      city: p.city,
      avatarUrl: portraitUrl(seed),
      roles: [Role.CLIENT, Role.PROVIDER],
      isTest: true,
      providerProfile: {
        create: {
          displayName,
          customProfession: profession,
          bio: richBio({ profession, city: p.city, years: stats.years, categorySlug: cat.slug, seed }),
          bioLang: "ru",
          city: p.city,
          status: ProviderStatus.ACTIVE,
          travelRadiusKm: stats.travelRadiusKm,
          ratingCached: stats.rating,
          jobsCount: stats.jobsCount,
          responseMinutes: stats.responseMinutes,
          acceptanceRate: stats.acceptanceRate,
          portfolioPhotos,
          listings: { create: listings },
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
      avatarUrl: portraitUrl(randomUUID()),
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
  botEnabled: boolean;
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
      botEnabled: true,
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
    return { id: u.id, name: u.name, city: u.city, isProvider, category, botEnabled: u.botEnabled };
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

  // Полный каскад удаления (общий с админским удалением реальных пользователей).
  await purgeUsers(userIds);

  await prisma.testAuditLog.create({
    data: { action: "delete", actorId, count: userIds.length, detail: ids ? "selected" : "all" },
  });
  return userIds.length;
}

// Заполнить уже созданных ботов реалистичными фото и описаниями: аватары людей,
// тематические фото услуг и портфолио, описания услуг (где пусто). Детерминировано
// по id, поэтому можно запускать повторно - результат стабильный.
export async function backfillTestUserMedia(): Promise<{ updated: number }> {
  const users = await prisma.user.findMany({
    where: { isTest: true },
    select: {
      id: true,
      city: true,
      locale: true,
      providerProfile: {
        select: {
          userId: true,
          customProfession: true,
          city: true,
          bioLang: true,
          listings: { select: { id: true, title: true, categoryId: true, description: true } },
        },
      },
    },
  });

  const cats = await prisma.category.findMany({ select: { id: true, slug: true, nameRu: true } });
  const catById = new Map(cats.map((c) => [c.id, c]));

  // Заранее прогреваем пулы настоящих фото Pexels по всем нужным темам (если задан
  // ключ). Без ключа пулы пустые - тогда ниже используются тематические плитки.
  const allKeywords: string[] = [];
  for (const u of users) {
    const pp = u.providerProfile;
    if (!pp) continue;
    const slug = (pp.listings[0] ? catById.get(pp.listings[0].categoryId)?.slug : undefined) ?? "other";
    allKeywords.push(serviceKeyword(pp.listings[0]?.title ?? pp.customProfession ?? "", slug));
    for (const l of pp.listings) allKeywords.push(serviceKeyword(l.title, catById.get(l.categoryId)?.slug ?? slug));
  }
  await prefetchPools(allKeywords);

  let updated = 0;
  for (const u of users) {
    const seed = u.id;
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.user.update({ where: { id: u.id }, data: { avatarUrl: portraitUrl(seed) } }),
    ];

    const pp = u.providerProfile;
    if (pp) {
      const firstCat = pp.listings[0] ? catById.get(pp.listings[0].categoryId) : undefined;
      const slug = firstCat?.slug ?? "other";
      const profession = pp.customProfession ?? firstCat?.nameRu ?? "Мастер";
      const city = pp.city ?? u.city ?? "Ireland";
      const stats = richStats(seed);
      const primaryKeyword = serviceKeyword(pp.listings[0]?.title ?? profession, slug);
      const portfolio = (await realPhotos(primaryKeyword, seed, 4)) ?? servicePhotos(primaryKeyword, seed, 4);

      ops.push(
        prisma.providerProfile.update({
          where: { userId: pp.userId },
          data: {
            bio: richBio({ profession, city, years: stats.years, categorySlug: slug, seed }),
            bioLang: "ru",
            travelRadiusKm: stats.travelRadiusKm,
            ratingCached: stats.rating,
            jobsCount: stats.jobsCount,
            responseMinutes: stats.responseMinutes,
            acceptanceRate: stats.acceptanceRate,
            portfolioPhotos: portfolio,
          },
        }),
      );
      for (let i = 0; i < pp.listings.length; i++) {
        const l = pp.listings[i];
        const kw = serviceKeyword(l.title, catById.get(l.categoryId)?.slug ?? slug);
        const photos = (await realPhotos(kw, `${seed}:${i}`, 3)) ?? servicePhotos(kw, `${seed}:${i}`, 3);
        ops.push(
          prisma.listing.update({
            where: { id: l.id },
            data: {
              photos,
              description: richListingDesc({ title: l.title, city, seed, index: i }),
              titleLang: "ru",
            },
          }),
        );
      }
    }

    await prisma.$transaction(ops);
    updated++;
  }
  return { updated };
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
