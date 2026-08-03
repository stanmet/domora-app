"use client";

// Кнопка отправки формы с индикатором «идёт отправка»: пока серверное действие
// выполняется, показываем спиннер/точки и блокируем повторное нажатие. Нужна,
// чтобы у обычных форм (form action=серверное действие) была видимая реакция на
// нажатие, особенно на медленном мобильном соединении.
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export default function SubmitButton({
  children,
  className = "btn btn-green",
  pendingLabel,
  style,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} style={style}>
      {pending ? (
        <>
          <Loader2 size={15} className="spin" /> {pendingLabel ?? ""}
        </>
      ) : (
        children
      )}
    </button>
  );
}
