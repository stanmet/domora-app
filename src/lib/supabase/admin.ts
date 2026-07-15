// Административный клиент Supabase (service role). Нужен для операций, которые
// нельзя делать от лица пользователя: удаление аккаунта из Auth и т.п.
// Создаётся лениво при первом обращении, чтобы next build не падал без ключей.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Add them in .env or in Vercel project settings.",
      );
    }
    admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return admin;
}
