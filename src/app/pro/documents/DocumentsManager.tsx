"use client";

// Список документов исполнителя и форма добавления (файл + подпись).
import { useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Plus, X } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import { addDocument, removeDocument } from "./actions";

export type DocRow = { id: string; url: string; label: string | null };

export default function DocumentsManager({ docs, t }: { docs: DocRow[]; t: Dict }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      {adding ? (
        <div className="sheet">
          <form
            ref={formRef}
            className="form"
            action={async (fd) => {
              setBusy(true);
              try {
                await addDocument(fd);
                setAdding(false);
              } finally {
                setBusy(false);
                formRef.current?.reset();
              }
            }}
          >
            <label htmlFor="doc-label">{t.liTitle}</label>
            <input id="doc-label" name="label" className="f" maxLength={120} placeholder="RECI, RGII, Garda vetting, diploma..." />
            <label htmlFor="doc-file">{t.navDocs}</label>
            <input
              id="doc-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              required
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-green" style={{ flex: 1, justifyContent: "center" }} disabled={busy}>
                {busy ? <Loader2 size={15} className="spin" /> : null} {busy ? t.bSending : t.save}
              </button>
              <button type="button" className="btn btn-line" onClick={() => setAdding(false)}>
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button className="btn btn-ink" style={{ marginBottom: 8 }} onClick={() => setAdding(true)}>
          <Plus size={15} /> {t.docsAdd}
        </button>
      )}

      {docs.length === 0 && !adding && <div className="empty">{t.docsEmpty}</div>}

      {docs.map((d) => (
        <div className="li" key={d.id}>
          <span className="inc-ic" style={{ background: "var(--sage)", color: "var(--green)" }}>
            <FileText size={15} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4>{d.label || t.navDocs}</h4>
          </div>
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="tgl" title={t.docOpen}>
            <ExternalLink size={20} />
          </a>
          <form action={removeDocument.bind(null, d.id)}>
            <button className="tgl off" title={t.docsRemove} type="submit">
              <X size={20} />
            </button>
          </form>
        </div>
      ))}
    </>
  );
}
