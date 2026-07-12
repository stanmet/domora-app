// Проверка входящего запроса через Supabase Auth (magic link / Google).
// Токен приходит в заголовке Authorization: Bearer <access_token>.
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function requireUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Response("unauthorized", { status: 401 });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) throw new Response("unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: data.user.email } });
  if (!user) throw new Response("unauthorized", { status: 401 });

  return user;
}
