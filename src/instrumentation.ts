// Next.js вызывает register() один раз при старте сервера, ДО обработки первого
// запроса. Досоздаём здесь схему новых возможностей (колонки/таблицы), чтобы к
// моменту рендера страниц все нужные поля уже существовали. Иначе главная и
// каталог рендерятся параллельно с ensureSchema в layout и могут запросить
// новую колонку раньше, чем она добавлена, - это роняло страницу на свежей базе.
export async function register() {
  // Только в серверной среде Node (не в edge-рантайме middleware).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureSchema } = await import("@/lib/ensure-schema");
    await ensureSchema();
  } catch (e) {
    // Не мешаем старту сервера: layout всё равно повторит ensureSchema.
    console.error("instrumentation ensureSchema failed", e);
  }
}
