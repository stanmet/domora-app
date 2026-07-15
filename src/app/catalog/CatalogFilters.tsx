"use client";

// Поиск, фильтры (город, цена, рейтинг) и сортировка + вкладки категорий.
// Состояние живёт в URL (?q=&cat=&city=&sort=&maxPrice=&minRating=),
// данные грузит серверная страница.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/categories";

type Labels = {
  searchPh: string;
  filters: string;
  cityAll: string;
  all: string;
  sort: string;
  sortRecommended: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortRating: string;
  sortPopular: string;
  maxPriceL: string;
  minRatingL: string;
  apply: string;
  reset: string;
  any: string;
};

type Props = {
  q: string;
  cat: string;
  city: string;
  sort: string;
  maxPrice: string;
  minRating: string;
  cities: string[];
  categories: { slug: string; label: string }[];
  labels: Labels;
};

export default function CatalogFilters({ q, cat, city, sort, maxPrice, minRating, cities, categories, labels }: Props) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [open, setOpen] = useState(Boolean(city || maxPrice || minRating || (sort && sort !== "recommended")));
  const [priceInput, setPriceInput] = useState(maxPrice);

  const apply = (next: Partial<{ q: string; cat: string; city: string; sort: string; maxPrice: string; minRating: string }>) => {
    const params = new URLSearchParams();
    const merged = { q, cat, city, sort, maxPrice, minRating, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.cat) params.set("cat", merged.cat);
    if (merged.city) params.set("city", merged.city);
    if (merged.sort && merged.sort !== "recommended") params.set("sort", merged.sort);
    if (merged.maxPrice) params.set("maxPrice", merged.maxPrice);
    if (merged.minRating) params.set("minRating", merged.minRating);
    const s = params.toString();
    router.push(s ? `/catalog?${s}` : "/catalog");
  };

  const sortOptions = [
    { value: "recommended", label: labels.sortRecommended },
    { value: "price_asc", label: labels.sortPriceAsc },
    { value: "price_desc", label: labels.sortPriceDesc },
    { value: "rating", label: labels.sortRating },
    { value: "popular", label: labels.sortPopular },
  ];

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
        <button type="button" className={"fbtn" + (open ? " on" : "")} onClick={() => setOpen(!open)}>
          <SlidersHorizontal size={15} /> {labels.filters}
        </button>
      </form>

      {open && (
        <div className="filterpanel" style={{ display: "flex", flexDirection: "column", gap: 12, margin: "10px 0" }}>
          {/* Сортировка */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>{labels.sort}</label>
            <select className="f" style={{ maxWidth: 220 }} value={sort} onChange={(e) => apply({ sort: e.target.value })}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Город */}
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

          {/* Рейтинг от */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>{labels.minRatingL}</label>
            <button className={"chip" + (minRating === "" ? " on" : "")} onClick={() => apply({ minRating: "" })}>
              {labels.any}
            </button>
            {["3", "4", "4.5"].map((r) => (
              <button key={r} className={"chip" + (minRating === r ? " on" : "")} onClick={() => apply({ minRating: r })}>
                {r}+
              </button>
            ))}
          </div>

          {/* Цена до */}
          <form
            style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
            onSubmit={(e) => {
              e.preventDefault();
              apply({ maxPrice: priceInput.trim() });
            }}
          >
            <label style={{ fontSize: 13, color: "var(--muted)" }}>{labels.maxPriceL}</label>
            <input
              className="f"
              type="number"
              min="0"
              step="1"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              style={{ maxWidth: 120 }}
            />
            <button type="submit" className="btn btn-line btn-sm">
              {labels.apply}
            </button>
            {(maxPrice || minRating || city || (sort && sort !== "recommended")) && (
              <button
                type="button"
                className="btn btn-line btn-sm"
                onClick={() => {
                  setPriceInput("");
                  apply({ city: "", sort: "recommended", maxPrice: "", minRating: "" });
                }}
              >
                {labels.reset}
              </button>
            )}
          </form>
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
