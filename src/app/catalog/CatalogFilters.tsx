"use client";

// Поиск, фильтр по городу и вкладки категорий.
// Состояние живет в URL (?q=&cat=&city=), данные грузит серверная страница.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";

type Props = {
  q: string;
  cat: string;
  city: string;
  cities: string[];
  categories: { slug: string; label: string }[];
  labels: { searchPh: string; filters: string; cityAll: string; all: string };
};

export default function CatalogFilters({ q, cat, city, cities, categories, labels }: Props) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [cityOpen, setCityOpen] = useState(Boolean(city));

  const apply = (next: { q?: string; cat?: string; city?: string }) => {
    const params = new URLSearchParams();
    const merged = { q, cat, city, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.cat) params.set("cat", merged.cat);
    if (merged.city) params.set("city", merged.city);
    const s = params.toString();
    router.push(s ? `/catalog?${s}` : "/catalog");
  };

  return (
    <>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: text.trim() });
        }}
      >
        <div className="sbox">
          <Search size={17} color="#6b6b6b" />
          <input value={text} placeholder={labels.searchPh} onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="button" className={"fbtn" + (cityOpen ? " on" : "")} onClick={() => setCityOpen(!cityOpen)}>
          <SlidersHorizontal size={15} /> {labels.filters}
        </button>
      </form>
      {cityOpen && (
        <div className="citychips">
          <button className={"chip" + (city === "" ? " on" : "")} onClick={() => apply({ city: "" })}>
            {labels.cityAll}
          </button>
          {cities.map((c) => (
            <button key={c} className={"chip" + (city === c ? " on" : "")} onClick={() => apply({ city: c })}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="tabs">
        <button className={"tab" + (cat === "" ? " on" : "")} onClick={() => apply({ cat: "" })}>
          <Search size={21} strokeWidth={1.7} /> {labels.all}
        </button>
        {categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? CATEGORY_ICONS.other;
          return (
            <button key={c.slug} className={"tab" + (cat === c.slug ? " on" : "")} onClick={() => apply({ cat: c.slug })}>
              <Icon size={21} strokeWidth={1.7} /> {c.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
