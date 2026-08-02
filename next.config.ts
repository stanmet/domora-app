import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Загрузка фото идёт через серверные действия (portfolio, услуги, аватар,
    // фото задачи, чат). По умолчанию Next режет тело запроса на 1 МБ, из-за чего
    // любая реальная фотография (2-6 МБ) падала с ошибкой ещё до сохранения.
    // Поднимаем лимит с запасом на несколько файлов (лимит на один файл - 6 МБ).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
