// Колбэк magic link: обмен кода на сессию, создание пользователя в таблице User
// и редирект по роли (исполнитель попадает в кабинет /pro).
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

function safePath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safePath(url.searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email) {
        const locale = await getLocale();
        const user = await ensureDbUser(data.user, locale);
        const target = next ?? (user.roles.includes("PROVIDER") ? "/pro" : "/account");
        return NextResponse.redirect(new URL(target, url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
