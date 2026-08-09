import type { MetadataRoute } from "next";

// Манифест PWA: делает сайт устанавливаемым на телефон (иконка на рабочем столе,
// запуск на весь экран без адресной строки). Next.js сам отдаёт его по адресу
// /manifest.webmanifest и подставляет <link rel="manifest"> на все страницы.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Domora - Home services in Ireland",
    short_name: "Domora",
    description:
      "Find local help across Ireland: chefs, cleaners, handymen and more. Post a task for free, get offers and agree directly.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en",
    dir: "ltr",
    categories: ["lifestyle", "shopping", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
