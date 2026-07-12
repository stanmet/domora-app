import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = await prisma.category.findMany({ orderBy: { slug: "asc" } });

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1>Domora</h1>
      <p>Фундамент подключен. Категории из базы данных:</p>
      <ul>
        {categories.map((c) => (
          <li key={c.id}>
            {c.nameRu} ({c.slug})
          </li>
        ))}
      </ul>
    </main>
  );
}
