"use client";

// Фильтр открытых задач по городу. Состояние живёт в URL (?city=), выбор
// категории (?cat=) сохраняется. Пустое значение - все города.
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

type Props = {
  cat: string;
  city: string;
  cities: string[];
  labels: { cityL: string; cityAll: string };
};

export default function CityFilter({ cat, city, cities, labels }: Props) {
  const router = useRouter();

  const apply = (nextCity: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (nextCity) params.set("city", nextCity);
    const s = params.toString();
    router.push(s ? `/tasks/browse?${s}` : "/tasks/browse");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 14px" }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
        <MapPin size={15} /> {labels.cityL}
      </label>
      <select className="f" style={{ maxWidth: 220 }} value={city} onChange={(e) => apply(e.target.value)}>
        <option value="">{labels.cityAll}</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
