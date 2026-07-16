// Отправка писем через Resend (https://resend.com). Включается переменными
// окружения RESEND_API_KEY и EMAIL_FROM. Если их нет - функция тихо ничего не
// делает (возвращает false), чтобы отсутствие почтового сервиса не ломало флоу.
// Никогда не бросает исключение наружу.

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!emailEnabled()) return false;
  // На обезличенные адреса удалённых аккаунтов не пишем.
  if (opts.to.endsWith("@domora.invalid")) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("sendEmail failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail error", e);
    return false;
  }
}

// Простой шаблон письма в стиле бренда (без внешних ресурсов).
export function emailLayout(title: string, body: string, actionUrl?: string, actionLabel?: string): string {
  const button =
    actionUrl && actionLabel
      ? `<p style="margin:24px 0"><a href="${actionUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block">${actionLabel}</a></p>`
      : "";
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <div style="font-weight:700;font-size:18px;letter-spacing:.02em;margin-bottom:16px">Domora</div>
    <div style="font-size:16px;line-height:1.5">${title}</div>
    <div style="font-size:14px;line-height:1.5;color:#555;margin-top:8px">${body}</div>
    ${button}
    <div style="font-size:12px;color:#999;margin-top:24px">Domora · Home services in Ireland</div>
  </div>`;
}
