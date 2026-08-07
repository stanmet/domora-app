"use client";

// Фильтры открытых задач: категория и город. Состояние живёт в URL
// (?cat= и ?city=). Пустое значение - все категории / все города.
import { useRouter } from "next/navigation";
import { LayoutGrid, MapPin } from "lucide-react";

type Props = {
  cat: string;
  city: string;
  categories: { slug: string; label: string }[];
  cities: string[];
  labels: { catL: string; catAll: string; cityL: string; cityAll: string };
};

export default function TaskFilters({ cat, city, categories, cities, labels }: Props) {
  const router = useRouter();

  const go = (nextCat: string, nextCity: string) => {
    const params = new URLSearchParams();
    if (nextCat) params.set("cat", nextCat);
    if (nextCity) params.set("city", nextCity);
    const s = params.toString();
    router.push(s ? `/tasks/browse?${s}` : "/tasks/browse");
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "0 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
          <LayoutGrid size={15} /> {labels.catL}
        </label>
        <select className="f" style={{ maxWidth: 220 }} value={cat} onChange={(e) => go(e.target.value, city)}>
          <option value="">{labels.catAll}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
          <MapPin size={15} /> {labels.cityL}
        </label>
        <select className="f" style={{ maxWidth: 220 }} value={city} onChange={(e) => go(cat, e.target.value)}>
          <option value="">{labels.cityAll}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
