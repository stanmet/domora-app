// Сжатие фото в браузере ДО загрузки на сервер. Телефонные снимки весят 3-8 МБ,
// из-за чего загрузка нескольких фото шла очень медленно. Уменьшаем размер до
// разумного (макс. сторона ~1600px) и пережимаем в JPEG - обычно выходит
// 200-600 КБ, то есть в 10-20 раз меньше, и загрузка становится быстрой.
//
// Ориентация (EXIF) учитывается через createImageBitmap({imageOrientation}).
// Если что-то не поддерживается/ломается - молча возвращаем исходный файл, чтобы
// загрузка не падала (сервер всё равно принимает jpeg/png/webp/avif).

const MAX_DIM = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }

    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // не помогло - оставляем оригинал

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
