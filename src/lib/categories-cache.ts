// Кэш списка категорий. Категории одинаковы для всех и меняются редко (только
// через админку), поэтому держим их в кэше данных Next и не ходим в базу на
// каждый запрос. При изменении категорий кэш сбрасывается по тегу "categories"
// (revalidateTag в админских действиях createCategory/updateCategory/deleteCategory).
//
// Безопасность: если база недоступна и запрос падает, ошибка пробрасывается и НЕ
// кэшируется - на следующем запросе будет новая попытка (пустой список не
// «залипает» на время жизни кэша). Вызывающий код уже оборачивает это в try/catch.
import { unstable_cache } from "next/cache";
import type { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const CATEGORIES_TAG = "categories";

export const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => prisma.category.findMany(),
  ["all-categories"],
  { tags: [CATEGORIES_TAG], revalidate: 600 },
);
