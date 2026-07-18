// Генерация текстов персон через AI-провайдера. По ТЗ подключается платный AI;
// сейчас реализован Anthropic (Claude). Провайдер выбирается через
// TEST_AI_PROVIDER (anthropic | local), ключ - ANTHROPIC_API_KEY в .env.
// Числовые и структурные поля (цены, языки) всегда берутся из локального
// генератора, а AI отвечает только за уникальные тексты - так исключаются
// невалидные суммы и гарантируется реалистичная структура. Любая ошибка или
// отсутствие ключа означает мягкий откат на локальный генератор.
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_PACKS, localPersonas, type GeneratedPersona, type PersonaRole } from "./personas";

// Сколько персон обогащать через AI за один запрос и всего - чтобы не упереться
// в таймаут серверного экшена и держать стоимость под контролем. Остаток берётся
// из локального генератора (тоже уникальные тексты).
const AI_CHUNK = 20;
const AI_ENRICH_CAP = 80;

export type GenerationMethod = "ai" | "local";
// Уровень качества текста: встроенный генератор, AI (стандарт), AI (высокое).
export type TextQuality = "basic" | "ai" | "ai_high";

const LANG_NAMES: Record<string, string> = {
  en: "английском",
  ru: "русском",
  uk: "украинском",
  pl: "польском",
  es: "испанском",
  pt: "португальском",
};

export interface GenerationResult {
  personas: GeneratedPersona[];
  method: GenerationMethod;
  note?: string;
}

function aiEnabled(): boolean {
  const provider = (process.env.TEST_AI_PROVIDER ?? "anthropic").toLowerCase();
  return provider === "anthropic" && !!process.env.ANTHROPIC_API_KEY;
}

export interface GenerateOptions {
  role: PersonaRole;
  categorySlug: string;
  city?: string;
  categoryLabel: string;
  lang?: string; // принудительный язык текстов ("" = разные)
  quality?: TextQuality; // basic = только встроенный генератор
}

// Основная точка входа: строит скелеты локально и по возможности заменяет тексты
// на сгенерированные Claude.
export async function generatePersonas(count: number, opts: GenerateOptions): Promise<GenerationResult> {
  const personas = localPersonas(count, {
    role: opts.role,
    categorySlug: opts.categorySlug,
    city: opts.city,
    lang: opts.lang,
  });

  const quality: TextQuality = opts.quality ?? "ai";
  if (quality === "basic" || !aiEnabled()) {
    const note =
      quality === "basic"
        ? "Выбран встроенный генератор."
        : "AI-ключ не задан - использован встроенный генератор.";
    return { personas, method: "local", note };
  }

  try {
    const client = new Anthropic();
    const limit = Math.min(count, AI_ENRICH_CAP);
    let enriched = 0;
    for (let start = 0; start < limit; start += AI_CHUNK) {
      const slice = personas.slice(start, Math.min(start + AI_CHUNK, limit));
      const texts = await enrichChunk(client, slice, opts, quality);
      slice.forEach((p, i) => applyText(p, texts[i], opts.role));
      enriched += slice.length;
    }
    const note =
      enriched < count
        ? `AI сгенерировал ${enriched} из ${count}; остальные - встроенным генератором (лимит по времени и стоимости).`
        : undefined;
    return { personas, method: "ai", note };
  } catch (e) {
    return {
      personas,
      method: "local",
      note: "AI недоступен (" + (e instanceof Error ? e.message : "ошибка") + ") - использован встроенный генератор.",
    };
  }
}

interface PersonaText {
  firstName: string;
  lastName: string;
  profession?: string;
  bio?: string;
  skills?: string[];
  listingTitle?: string;
  taskTitle?: string;
  taskDescription?: string;
}

async function enrichChunk(
  client: Anthropic,
  slice: GeneratedPersona[],
  opts: GenerateOptions,
  quality: TextQuality,
): Promise<PersonaText[]> {
  const pack = CATEGORY_PACKS[opts.categorySlug] ?? CATEGORY_PACKS.other;
  const roleWord = opts.role === "provider" ? "исполнителя услуг" : "клиента, размещающего задачу";
  const langName = opts.lang && LANG_NAMES[opts.lang] ? LANG_NAMES[opts.lang] : "русском";
  const schema =
    opts.role === "provider"
      ? {
          type: "object",
          additionalProperties: false,
          required: ["personas"],
          properties: {
            personas: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["firstName", "lastName", "profession", "bio", "skills", "listingTitle"],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  profession: { type: "string" },
                  bio: { type: "string" },
                  skills: { type: "array", items: { type: "string" } },
                  listingTitle: { type: "string" },
                },
              },
            },
          },
        }
      : {
          type: "object",
          additionalProperties: false,
          required: ["personas"],
          properties: {
            personas: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["firstName", "lastName", "taskTitle", "taskDescription"],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  taskTitle: { type: "string" },
                  taskDescription: { type: "string" },
                },
              },
            },
          },
        };

  const prompt =
    `Сгенерируй ${slice.length} РАЗНЫХ синтетических профилей ${roleWord} для маркетплейса бытовых услуг в Ирландии, ` +
    `категория "${opts.categoryLabel}". Данные вымышленные, для демо и тестов. ` +
    `Требования: имена и фамилии разной культуры (ирландские, польские, украинские, испанские и др.), ` +
    `тексты на ${langName} языке, разные по стилю и без повторов, реалистичные и короткие. ` +
    (opts.role === "provider"
      ? `Для каждого: profession (короткая профессия, например ${pack.professions.slice(0, 3).join(", ")}), ` +
        `bio (1-2 предложения), skills (3-5 навыков), listingTitle (название услуги-плашки). ` +
        `Не пиши цены и не используй длинное тире.`
      : `Для каждого: taskTitle (короткий заголовок задачи), taskDescription (1-2 предложения). ` +
        `Не пиши цены и не используй длинное тире.`);

  const resp = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema }, effort: quality === "ai_high" ? "high" : "low" },
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = resp.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("пустой ответ модели");
  const parsed = JSON.parse(textBlock.text) as { personas: PersonaText[] };
  if (!Array.isArray(parsed.personas)) throw new Error("неверный формат ответа");
  return parsed.personas;
}

function applyText(p: GeneratedPersona, t: PersonaText | undefined, role: PersonaRole): void {
  if (!t) return;
  if (t.firstName?.trim()) p.firstName = t.firstName.trim();
  if (t.lastName?.trim()) p.lastName = t.lastName.trim();
  if (role === "provider") {
    if (t.profession?.trim()) p.profession = t.profession.trim();
    if (t.bio?.trim()) p.bio = t.bio.trim();
    if (Array.isArray(t.skills) && t.skills.length) p.skills = t.skills.map((s) => s.trim()).filter(Boolean);
    if (t.listingTitle?.trim()) p.listingTitle = t.listingTitle.trim();
  } else {
    if (t.taskTitle?.trim()) p.taskTitle = t.taskTitle.trim();
    if (t.taskDescription?.trim()) p.taskDescription = t.taskDescription.trim();
  }
}
