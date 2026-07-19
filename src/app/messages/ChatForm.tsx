"use client";

// Форма отправки сообщения в чат: текст и/или фото. Очищает поля после отправки.
import { useRef, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";

export default function ChatForm({
  action,
  placeholder,
  sendLabel,
  attachLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  sendLabel: string;
  attachLabel?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const clearFile = () => {
    if (fileRef.current) fileRef.current.value = "";
    setFileName(null);
  };

  const canSend = text.trim().length > 0 || fileName !== null;

  return (
    <form
      ref={ref}
      className="chatform"
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
        setText("");
        clearFile();
      }}
    >
      {fileName && (
        <div className="chat-attach-chip" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", width: "100%", marginBottom: 6 }}>
          <Paperclip size={13} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
          <button type="button" onClick={clearFile} aria-label="✕" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
            <X size={14} />
          </button>
        </div>
      )}
      {attachLabel && (
        <>
          <input
            ref={fileRef}
            type="file"
            name="image"
            accept="image/*"
            hidden
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <button type="button" className="btn btn-line" aria-label={attachLabel} onClick={() => fileRef.current?.click()}>
            <Paperclip size={16} />
          </button>
        </>
      )}
      <textarea
        name="text"
        className="f"
        rows={1}
        placeholder={placeholder}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ resize: "none" }}
      />
      <button type="submit" className="btn btn-green" aria-label={sendLabel} disabled={!canSend}>
        <Send size={16} />
      </button>
    </form>
  );
}
