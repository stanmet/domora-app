// Простое ограничение частоты запросов в памяти процесса (fixed window).
// В serverless счётчик живёт в пределах инстанса, поэтому это не абсолютная
// защита, но заметно осложняет спам и перебор с одного клиента. Для строгих
// глобальных лимитов позже можно подключить Redis/Upstash тем же интерфейсом.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Периодическая чистка, чтобы карта не росла бесконечно.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

// Возвращает true, если запрос разрешён; false - если лимит превышен.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
