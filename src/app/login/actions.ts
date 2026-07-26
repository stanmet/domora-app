"use server";

// Самолечение входа для «застрявших» аккаунтов.
// Если пользователь зарегистрировался, когда доставка писем ещё не работала,
// его email остаётся неподтверждённым, и Supabase не пускает по паролю. Тогда
// при попытке входа мы находим такого пользователя по email и подтверждаем его
// на сервере через админ-клиент (service role). Пароль при этом НЕ проверяем и
// НЕ раскрываем: после подтверждения браузер повторяет обычный вход по паролю,
// и если пароль неверный, вход всё равно не пройдёт. Подтверждаем только тех, у
// кого email ещё не подтверждён, поэтому уже активные аккаунты не затрагиваются.
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function confirmStuckAccount(email: string): Promise<{ ok: boolean }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false };
  try {
    // Ищем пользователя в auth.users по email; берём только неподтверждённых.
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM auth.users
       WHERE lower(email) = $1 AND email_confirmed_at IS NULL
       LIMIT 1`,
      clean,
    );
    const id = rows[0]?.id;
    if (!id) return { ok: false };
    await getSupabaseAdmin().auth.admin.updateUserById(id, { email_confirm: true });
    return { ok: true };
  } catch (e) {
    // Нет service-ключа или доступа к auth.users - тихо возвращаем неудачу.
    console.error("confirmStuckAccount failed", e);
    return { ok: false };
  }
}
