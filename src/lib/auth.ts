// Проверка входящего запроса через Supabase Auth (magic link / Google).
// Токен приходит в заголовке Authorization: Bearer <access_token>,
// либо, для запросов из браузера, сессия берется из cookies (@supabase/ssr).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";

// Клиент Supabase создается при первом запросе, а не при импорте файла.
// Иначе next build падает на этапе сбора страниц, когда переменные
// NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY не заданы в окружении сборки.
let supabaseAdmin: SupabaseClient | undefined;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Add them in .env or in Vercel project settings.",
      );
    }
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

export async function requireUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let email: string | undefined;

  if (token) {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user?.email) throw new Response("unauthorized", { status: 401 });
    email = data.user.email;
  } else {
    const authUser = await getAuthUser();
    if (!authUser?.email) throw new Response("unauthorized", { status: 401 });
    email = authUser.email;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Response("unauthorized", { status: 401 });

  return user;
}
