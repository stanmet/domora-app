"use server";

// Автоподтверждение email при регистрации.
// Пока не подключена нормальная доставка писем (Custom SMTP), встроенная почта
// Supabase на бесплатном тарифе не доставляет письма, а без подтверждения email
// пользователь не может войти. Поэтому сразу подтверждаем email на сервере через
// админ-клиент (service role) - регистрация работает без письма, человек входит
// сразу. Когда настроим отправку писем, этот шаг можно убрать и вернуть обычную
// проверку почты.
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function autoConfirmEmail(userId: string): Promise<{ ok: boolean }> {
  if (!userId) return { ok: false };
  try {
    await getSupabaseAdmin().auth.admin.updateUserById(userId, { email_confirm: true });
    return { ok: true };
  } catch (e) {
    // Нет service-ключа или иная ошибка - тихо откатываемся на экран "проверьте почту".
    console.error("autoConfirmEmail failed", e);
    return { ok: false };
  }
}
