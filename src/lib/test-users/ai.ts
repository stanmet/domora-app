// Генерация текстов персон через AI. Поддерживаются несколько провайдеров:
// Anthropic (Claude, официальный SDK), OpenAI и Google Gemini (REST), а также
// "local" - встроенный генератор без внешних вызовов. Провайдер выбирается
// параметром или переменной TEST_AI_PROVIDER; ключи - в .env. Любая ошибка или
// отсутствие ключа означает мягкий откат на встроенный генератор.
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CATEGORY_PACKS, localPersonas, type GeneratedPersona, type PersonaRole } from "./personas";
import { checkAiBudget, recordAiUsage } from "./ai-usage";

interface Usage {
  input: number;
  output: number;
}

async function getAiLimits() {
  const cfg = await prisma.testBotConfig.findUnique({
    where: { id: "singleton" },
    select: { aiDailyTokenLimit: true, aiMonthlyTokenLimit: true },
  });
  return { daily: cfg?.aiDailyTokenLimit ?? 0, monthly: cfg?.aiMonthlyTokenLimit ?? 0 };
}

const AI_CHUNK = 20;
const AI_ENRICH_CAP = 80;

export type GenerationMethod = "ai" | "local";
export type TextQuality = "basic" | "ai" | "ai_high";
export type AiProvider = "anthropic" | "openai" | "gemini" | "local";

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

export interface GenerateOptions {
  role: PersonaRole;
  categorySlug: string;
  city?: string;
  categoryLabel: string;
  lang?: string;
  quality?: TextQuality;
  provider?: AiProvider; // переопределяет TEST_AI_PROVIDER
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

function resolveProvider(p?: AiProvider): AiProvider {
  const raw = (p ?? process.env.TEST_AI_PROVIDER ?? "anthropic").toLowerCase();
  return (["anthropic", "openai", "gemini", "local"] as string[]).includes(raw) ? (raw as AiProvider) : "anthropic";
}

function providerKeyPresent(provider: AiProvider): boolean {
  switch (provider) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "gemini":
      return !!process.env.GEMINI_API_KEY;
    default:
      return false;
  }
}

// Основная точка входа: строит скелеты локально и по возможности заменяет тексты
// на сгенерированные выбранным провайдером.
export async function generatePersonas(count: number, opts: GenerateOptions): Promise<GenerationResult> {
  const personas = localPersonas(count, {
    role: opts.role,
    categorySlug: opts.categorySlug,
    city: opts.city,
    lang: opts.lang,
  });

  const quality: TextQuality = opts.quality ?? "ai";
  const provider = resolveProvider(opts.provider);

  if (quality === "basic" || provider === "local") {
    return { personas, method: "local", note: "Тексты: встроенный генератор." };
  }
  if (!providerKeyPresent(provider)) {
    return { personas, method: "local", note: `Ключ ${provider} не задан - использован встроенный генератор.` };
  }

  // Аварийное отключение AI при достижении дневного/месячного лимита токенов.
  const limits = await getAiLimits();
  const budget = await checkAiBudget(limits);
  if (!budget.allowed) {
    return { personas, method: "local", note: `AI на паузе: ${budget.reason}. Использован встроенный генератор.` };
  }

  try {
    const cap = Math.min(count, AI_ENRICH_CAP);
    let enriched = 0;
    let stoppedByLimit = false;
    for (let start = 0; start < cap; start += AI_CHUNK) {
      // Перед каждым куском проверяем бюджет заново - остановимся посреди пачки.
      if (start > 0 && !(await checkAiBudget(limits)).allowed) {
        stoppedByLimit = true;
        break;
      }
      const slice = personas.slice(start, Math.min(start + AI_CHUNK, cap));
      const { texts, usage } = await enrichChunk(provider, slice, opts, quality);
      await recordAiUsage(usage.input, usage.output);
      slice.forEach((p, i) => applyText(p, texts[i], opts.role));
      enriched += slice.length;
    }
    const note = stoppedByLimit
      ? `${provider}: сгенерировано ${enriched} из ${count}, дальше сработал лимит токенов - остальные встроенным генератором.`
      : enriched < count
        ? `${provider}: сгенерировано ${enriched} из ${count}; остальные - встроенным генератором.`
        : `Тексты: ${provider}.`;
    return { personas, method: enriched > 0 ? "ai" : "local", note };
  } catch (e) {
    return {
      personas,
      method: "local",
      note: `${provider} недоступен (${e instanceof Error ? e.message : "ошибка"}) - встроенный генератор.`,
    };
  }
}

// Схема ответа под роль.
function schemaFor(role: PersonaRole): Record<string, unknown> {
  const item =
    role === "provider"
      ? {
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
        }
      : {
          type: "object",
          additionalProperties: false,
          required: ["firstName", "lastName", "taskTitle", "taskDescription"],
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            taskTitle: { type: "string" },
            taskDescription: { type: "string" },
          },
        };
  return {
    type: "object",
    additionalProperties: false,
    required: ["personas"],
    properties: { personas: { type: "array", items: item } },
  };
}

function buildPrompt(slice: GeneratedPersona[], opts: GenerateOptions): string {
  const pack = CATEGORY_PACKS[opts.categorySlug] ?? CATEGORY_PACKS.other;
  const roleWord = opts.role === "provider" ? "исполнителя услуг" : "клиента, размещающего задачу";
  const langName = opts.lang && LANG_NAMES[opts.lang] ? LANG_NAMES[opts.lang] : "русском";
  return (
    `Сгенерируй ${slice.length} РАЗНЫХ синтетических профилей ${roleWord} для маркетплейса бытовых услуг в Ирландии, ` +
    `категория "${opts.categoryLabel}". Данные вымышленные, для демо и тестов. ` +
    `Требования: имена и фамилии разной культуры (ирландские, польские, украинские, испанские и др.), ` +
    `тексты на ${langName} языке, разные по стилю и без повторов, реалистичные и короткие. ` +
    (opts.role === "provider"
      ? `Для каждого: profession (короткая профессия, например ${pack.professions.slice(0, 3).join(", ")}), ` +
        `bio (1-2 предложения), skills (3-5 навыков), listingTitle (название услуги-плашки). ` +
        `Не пиши цены и не используй длинное тире.`
      : `Для каждого: taskTitle (короткий заголовок задачи), taskDescription (1-2 предложения). ` +
        `Не пиши цены и не используй длинное тире.`) +
    ` Верни строго JSON вида {"personas":[...]}.`
  );
}

async function enrichChunk(
  provider: AiProvider,
  slice: GeneratedPersona[],
  opts: GenerateOptions,
  quality: TextQuality,
): Promise<{ texts: PersonaText[]; usage: Usage }> {
  const prompt = buildPrompt(slice, opts);
  const schema = schemaFor(opts.role);
  if (provider === "anthropic") return callAnthropic(prompt, schema, quality);
  if (provider === "openai") return callOpenAI(prompt, schema);
  if (provider === "gemini") return callGemini(prompt, schema);
  return { texts: [], usage: { input: 0, output: 0 } };
}

async function callAnthropic(
  prompt: string,
  schema: Record<string, unknown>,
  quality: TextQuality,
): Promise<{ texts: PersonaText[]; usage: Usage }> {
  const client = new Anthropic();
  const resp = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema }, effort: quality === "ai_high" ? "high" : "low" },
    messages: [{ role: "user", content: prompt }],
  });
  const block = resp.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) throw new Error("пустой ответ");
  return {
    texts: parsePersonas(block.text),
    usage: { input: resp.usage?.input_tokens ?? 0, output: resp.usage?.output_tokens ?? 0 },
  };
}

async function callOpenAI(prompt: string, schema: Record<string, unknown>): Promise<{ texts: PersonaText[]; usage: Usage }> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "personas", strict: false, schema },
      },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("нет содержимого");
  return {
    texts: parsePersonas(text),
    usage: { input: data?.usage?.prompt_tokens ?? 0, output: data?.usage?.completion_tokens ?? 0 },
  };
}

async function callGemini(prompt: string, schema: Record<string, unknown>): Promise<{ texts: PersonaText[]; usage: Usage }> {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: geminiSchema(schema) },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("нет содержимого");
  return {
    texts: parsePersonas(text),
    usage: {
      input: data?.usageMetadata?.promptTokenCount ?? 0,
      output: data?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

// Gemini не принимает additionalProperties - убираем рекурсивно.
function geminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === "additionalProperties") continue;
      out[k] = geminiSchema(v);
    }
    return out;
  }
  return schema;
}

function parsePersonas(text: string): PersonaText[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as { personas?: PersonaText[] };
  if (!Array.isArray(parsed.personas)) throw new Error("неверный формат");
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
