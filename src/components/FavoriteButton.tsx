"use client";

// Кнопка "в избранное" на странице исполнителя. Отправляет серверное действие
// toggleFavorite. Гостя действие перенаправит на вход.
import { Heart } from "lucide-react";

export default function FavoriteButton({
  action,
  active,
  addLabel,
  removeLabel,
}: {
  action: () => Promise<void>;
  active: boolean;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <form action={action} style={{ marginTop: 12 }}>
      <button
        type="submit"
        className={"btn btn-line btn-sm" + (active ? " on" : "")}
        style={{ width: "100%", justifyContent: "center", color: active ? "var(--orange)" : undefined }}
      >
        <Heart size={15} fill={active ? "currentColor" : "none"} /> {active ? removeLabel : addLabel}
      </button>
    </form>
  );
}
