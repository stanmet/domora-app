// Исключение тестовых (синтетических) аккаунтов из всего, что видят реальные
// пользователи: поиск, каталог, ленты, рейтинги, статистика, отзывы. Источник
// правды - флаг User.isTest. Ниже - готовые фрагменты where под разные модели.
import type { Prisma } from "@prisma/client";

// Для запросов по User (счётчики, списки).
export const notTestUser: Prisma.UserWhereInput = { isTest: false };

// Для запросов по ProviderProfile (каталог, топ-исполнители).
export const notTestProviderProfile = { user: { isTest: false } };

// Для запросов по Listing (каталог, главная).
export const notTestListingProvider = { user: { isTest: false } };

// Для запросов по Task (доска задач, лента открытых задач).
export const notTestTaskClient = { isTest: false };
