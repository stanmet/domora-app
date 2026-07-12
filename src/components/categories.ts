// Иконки, порядок и фоны категорий. Дизайн из prototypes/Marketplace.jsx.
import {
  ChefHat,
  Sparkles,
  Wrench,
  Flower2,
  Scissors,
  PartyPopper,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ORDER = ["chef", "clean", "handy", "massage", "beauty", "events", "other"];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  chef: ChefHat,
  clean: Sparkles,
  handy: Wrench,
  massage: Flower2,
  beauty: Scissors,
  events: PartyPopper,
  other: LayoutGrid,
};

export const PHOTO_BG: Record<string, string> = {
  chef: "linear-gradient(135deg,#F3E7CF 0%,#E0B074 100%)",
  clean: "linear-gradient(135deg,#E9F2E2 0%,#93B981 100%)",
  handy: "linear-gradient(135deg,#EAE7DF 0%,#B4A98F 100%)",
  massage: "linear-gradient(135deg,#EAEFE6 0%,#8FAE9B 100%)",
  beauty: "linear-gradient(135deg,#F6E9E3 0%,#D9A38B 100%)",
  events: "linear-gradient(135deg,#FBEBDD 0%,#E08A4C 100%)",
  other: "linear-gradient(135deg,#ECEBE7 0%,#A9A18E 100%)",
};

export function sortByCategoryOrder<T extends { slug: string }>(cats: T[]): T[] {
  const order = (slug: string) => {
    const i = CATEGORY_ORDER.indexOf(slug);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...cats].sort((a, b) => order(a.slug) - order(b.slug));
}
