"use client";

// Форма арбитража спора для админа: три исхода (полный возврат клиенту,
// частичный возврат, выплата исполнителю). Для частичного возврата вводится сумма.
import { useState, useTransition } from "react";
import { resolveDispute, type DisputeOutcome } from "./actions";

export default function DisputeResolveForm({
  disputeId,
  labels,
}: {
  disputeId: string;
  labels: {
    hint: string;
    refundFull: string;
    partial: string;
    partialAmount: string;
    payProvider: string;
    error: string;
  };
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (outcome: DisputeOutcome) => {
    setError(null);
    start(async () => {
      const res = await resolveDispute(disputeId, outcome, outcome === "partial_refund" ? Number(amount) : undefined);
      if (res && "error" in res) setError(res.error || labels.error);
    });
  };

  return (
    <div className="adm-resolve">
      <p className="adm-desc">{labels.hint}</p>
      <div className="bkbtns">
        <button type="button" className="btn btn-red btn-sm" disabled={pending} onClick={() => run("full_refund")}>
          {labels.refundFull}
        </button>
        <button type="button" className="btn btn-green btn-sm" disabled={pending} onClick={() => run("provider_paid")}>
          {labels.payProvider}
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        <input
          className="f"
          type="number"
          min="0"
          step="0.01"
          placeholder={labels.partialAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <button
          type="button"
          className="btn btn-line btn-sm"
          disabled={pending || !amount}
          onClick={() => run("partial_refund")}
        >
          {labels.partial}
        </button>
      </div>
      {error && <div className="err" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}
