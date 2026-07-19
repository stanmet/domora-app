// Иконки, порядок и фоны категорий. Дизайн из prototypes/Marketplace.jsx.
import {
  ChefHat,
  Sparkles,
  Wrench,
  Droplets,
  Zap,
  Sprout,
  Flower2,
  Scissors,
  PawPrint,
  Truck,
  GraduationCap,
  PartyPopper,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ORDER = [
  "clean",
  "handy",
  "plumbing",
  "electrical",
  "gardening",
  "beauty",
  "petcare",
  "chef",
  "moving",
  "tutoring",
  "massage",
  "events",
  "other",
];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  chef: ChefHat,
  clean: Sparkles,
  handy: Wrench,
  plumbing: Droplets,
  electrical: Zap,
  gardening: Sprout,
  beauty: Scissors,
  petcare: PawPrint,
  moving: Truck,
  tutoring: GraduationCap,
  massage: Flower2,
  events: PartyPopper,
  other: LayoutGrid,
};

export const PHOTO_BG: Record<string, string> = {
  chef: "linear-gradient(135deg,#F3E7CF 0%,#E0B074 100%)",
  clean: "linear-gradient(135deg,#E9F2E2 0%,#93B981 100%)",
  handy: "linear-gradient(135deg,#EAE7DF 0%,#B4A98F 100%)",
  plumbing: "linear-gradient(135deg,#E2ECF2 0%,#7FA6C0 100%)",
  electrical: "linear-gradient(135deg,#F6EFD9 0%,#E0C25A 100%)",
  gardening: "linear-gradient(135deg,#E7F1DE 0%,#8FB56A 100%)",
  beauty: "linear-gradient(135deg,#F6E9E3 0%,#D9A38B 100%)",
  petcare: "linear-gradient(135deg,#F0E9E1 0%,#C0A585 100%)",
  moving: "linear-gradient(135deg,#EDEAE4 0%,#A79B85 100%)",
  tutoring: "linear-gradient(135deg,#E6EAF2 0%,#8A9AC0 100%)",
  massage: "linear-gradient(135deg,#EAEFE6 0%,#8FAE9B 100%)",
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
