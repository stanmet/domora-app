// Браузерный клиент Supabase Auth. Создается лениво внутри обработчиков,
// чтобы сборка не требовала переменных окружения.
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Add them in .env or in Vercel project settings.",
    );
  }
  return createBrowserClient(url, key);
}
