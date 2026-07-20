// Обновление сессии Supabase на каждом запросе: если access token истек,
// middleware перевыпускает его и кладет свежие cookies в запрос и ответ.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  // Гейтинг приватных путей на edge (defense-in-depth): аноним получает жёсткий
  // редирект на вход ещё до рендера страницы. Сами страницы тоже проверяют доступ.
  const PRIVATE = ["/account", "/bookings", "/pro", "/admin", "/messages", "/notifications", "/favorites", "/disputes"];
  const PRIVATE_EXACT = ["/tasks/mine", "/tasks/new"];
  const path = request.nextUrl.pathname;
  const isPrivate =
    PRIVATE.some((p) => path === p || path.startsWith(p + "/")) ||
    PRIVATE_EXACT.some((p) => path === p || path.startsWith(p + "/")) ||
    /^\/tasks\/[^/]+\/edit$/.test(path);
  if (isPrivate && !data.user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
