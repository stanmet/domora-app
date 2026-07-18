"use client";

// Кнопка отправки формы с подтверждением. Защищает от случайных необратимых
// действий администратора (массовое удаление, отключение всех ботов и т.п.).
export default function ConfirmButton({
  message,
  className,
  form,
  children,
}: {
  message: string;
  className?: string;
  form?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={className}
      form={form}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
