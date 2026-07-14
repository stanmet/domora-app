"use client";

// Форма отправки сообщения в чат. Очищает поле после отправки.
import { useRef } from "react";
import { Send } from "lucide-react";

export default function ChatForm({
  action,
  placeholder,
  sendLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  sendLabel: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className="chatform"
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
    >
      <textarea name="text" className="f" rows={1} placeholder={placeholder} maxLength={1000} required style={{ resize: "none" }} />
      <button type="submit" className="btn btn-green" aria-label={sendLabel}>
        <Send size={16} />
      </button>
    </form>
  );
}
