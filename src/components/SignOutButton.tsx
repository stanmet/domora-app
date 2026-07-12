"use client";

// Кнопка выхода в шапке: завершает сессию Supabase и возвращает на главную.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await getSupabaseBrowser().auth.signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <button className="lang" onClick={signOut} disabled={busy} aria-label={label} title={label}>
      <LogOut size={14} />
    </button>
  );
}
