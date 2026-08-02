"use client";

// Рассылка сообщений от администратора. Выбор получателей: все / клиенты /
// исполнители / вручную отмеченные. Текст уходит серверному действию
// broadcastMessage и доставляется как уведомление (колокольчик).
import { useMemo, useState, useTransition } from "react";
import { Search, Send } from "lucide-react";
import { broadcastMessage, type BroadcastResult } from "./actions";

type U = { id: string; name: string; email: string; roles: string[] };
type Mode = "all" | "clients" | "providers" | "selected";

type Labels = {
  title: string; sub: string;
  modeAll: string; modeClients: string; modeProviders: string; modeSelected: string;
  search: string; text: string; placeholder: string; send: string; sending: string;
  sent: string; errEmpty: string; errNoRecipients: string; recipients: string;
  selectedCount: string; confirmAll: string;
};

export default function BroadcastSection({ users, labels }: { users: U[]; labels: Labels }) {
  const [mode, setMode] = useState<Mode>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => ({
    all: users.length,
    clients: users.filter((u) => u.roles.includes("CLIENT")).length,
    providers: users.filter((u) => u.roles.includes("PROVIDER")).length,
  }), [users]);

  const recipientCount = mode === "selected" ? selected.size : counts[mode];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const fmt = (s: string, n: number) => s.replace("{n}", String(n));

  const submit = () => {
    setMsg(null);
    if (!text.trim()) { setMsg({ ok: false, text: labels.errEmpty }); return; }
    if (mode === "selected" && selected.size === 0) { setMsg({ ok: false, text: labels.errNoRecipients }); return; }
    if (recipientCount === 0) { setMsg({ ok: false, text: labels.errNoRecipients }); return; }
    // Подтверждение для крупных рассылок (всем/по роли).
    if (mode !== "selected" && !window.confirm(fmt(labels.confirmAll, recipientCount))) return;

    const fd = new FormData();
    fd.set("mode", mode);
    fd.set("text", text.trim());
    if (mode === "selected") selected.forEach((id) => fd.append("userIds", id));

    startTransition(async () => {
      const res: BroadcastResult = await broadcastMessage(fd);
      if ("error" in res) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: fmt(labels.sent, res.count) });
        setText("");
        setSelected(new Set());
      }
    });
  };

  const modes: { key: Mode; label: string; count: number | null }[] = [
    { key: "all", label: labels.modeAll, count: counts.all },
    { key: "clients", label: labels.modeClients, count: counts.clients },
    { key: "providers", label: labels.modeProviders, count: counts.providers },
    { key: "selected", label: labels.modeSelected, count: null },
  ];

  return (
    <div className="adm-card" style={{ display: "block" }}>
      <h4 style={{ marginTop: 0 }}>{labels.title}</h4>
      <p className="adm-muted" style={{ fontSize: 13, marginBottom: 14 }}>{labels.sub}</p>

      {/* Кому */}
      <div className="chips" style={{ marginBottom: 12 }}>
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            className={"chip" + (mode === m.key ? " on" : "")}
            onClick={() => setMode(m.key)}
          >
            {m.label}{m.count != null ? ` · ${m.count}` : ""}
          </button>
        ))}
      </div>

      {/* Список для ручного выбора */}
      {mode === "selected" && (
        <div style={{ marginBottom: 12 }}>
          <div className="sbox" style={{ marginBottom: 8 }}>
            <Search size={16} color="#6b6b6b" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.search} />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
            {filtered.map((u) => (
              <label key={u.id} className="bc-row">
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                <span style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 13.5 }}>{u.name}</b>
                  <span className="adm-muted" style={{ fontSize: 12, display: "block" }}>{u.email}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="adm-muted" style={{ fontSize: 12, marginTop: 6 }}>{fmt(labels.selectedCount, selected.size)}</div>
        </div>
      )}

      {/* Текст */}
      <textarea
        className="f"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={labels.placeholder}
        maxLength={2000}
        style={{ width: "100%", resize: "vertical" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-green btn-sm" onClick={submit} disabled={pending}>
          <Send size={14} /> {pending ? labels.sending : `${labels.send}${recipientCount ? ` · ${recipientCount}` : ""}`}
        </button>
        {msg && (
          <span className={"tu-note " + (msg.ok ? "ok" : "err")} style={{ margin: 0, padding: "6px 10px" }}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
