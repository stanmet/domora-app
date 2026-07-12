// Серверный клиент Supabase Auth: сессия хранится в cookies (@supabase/ssr).
// Используется в layout, серверных страницах и route-обработчиках.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Вызов из серверного компонента: cookies обновит middleware.
        }
      },
    },
  });
}

// Проверенный пользователь Supabase из текущей сессии, либо null.
export async function getAuthUser(): Promise<User | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
