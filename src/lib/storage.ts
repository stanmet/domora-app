// Загрузка фото портфолио в Supabase Storage.
// Используется в серверных действиях кабинета исполнителя. Для загрузки нужен
// сервисный ключ (SUPABASE_SERVICE_ROLE_KEY): он обходит RLS и не попадает в браузер.
// Бакет "portfolio" должен быть создан публичным (см. supabase-navigation-ux.sql / README).
import { createClient } from "@supabase/supabase-js";

export const PORTFOLIO_BUCKET = "portfolio";
export const MAX_PORTFOLIO_PHOTOS = 20; // на профиль
export const MAX_LISTING_PHOTOS = 10; // на услугу
const MAX_BYTES = 6 * 1024 * 1024; // 6 МБ на файл
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function storageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

// Бакет создаётся автоматически при первом обращении, если его ещё нет.
// Никаких ручных шагов в Supabase не требуется. Проверка запоминается на
// время жизни серверного процесса, чтобы не дёргать API на каждый файл.
let bucketReady = false;
type StorageClient = NonNullable<ReturnType<typeof admin>>["storage"];
async function ensureBucket(storage: StorageClient): Promise<boolean> {
  if (bucketReady) return true;
  const { data } = await storage.getBucket(PORTFOLIO_BUCKET);
  if (data) {
    bucketReady = true;
    return true;
  }
  const { error } = await storage.createBucket(PORTFOLIO_BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Array.from(ALLOWED),
  });
  // "already exists" - значит бакет создали параллельно, это нормально.
  if (error && !/exist|conflict|409/i.test(error.message)) {
    console.error("createBucket failed", error.message);
    return false;
  }
  bucketReady = true;
  return true;
}

// Загружает один файл, возвращает публичный URL или null (тип/размер/ошибка).
export async function uploadImage(file: File, folder: string): Promise<string | null> {
  const client = admin();
  if (!client) return null;
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) return null;
  if (!ALLOWED.has(file.type)) return null;
  if (!(await ensureBucket(client.storage))) return null;

  const ext = EXT[file.type] ?? "jpg";
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(PORTFOLIO_BUCKET).upload(name, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("storage upload failed", error.message);
    return null;
  }
  const { data } = client.storage.from(PORTFOLIO_BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

// Загрузка нескольких файлов подряд. Пустые/битые пропускаются.
export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    const url = await uploadImage(f, folder);
    if (url) urls.push(url);
  }
  return urls;
}

// Удаление фото по публичному URL (best-effort).
export async function removeImage(publicUrl: string): Promise<void> {
  const client = admin();
  if (!client) return;
  const marker = `/${PORTFOLIO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  try {
    await client.storage.from(PORTFOLIO_BUCKET).remove([path]);
  } catch {
    // Не критично: запись из массива фото уже убрана.
  }
}
