// Налоговый раздел убран: Domora - бесплатный посредник и не даёт налоговых
// советов. Прямые ссылки ведём на "как это работает".
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TaxesPage() {
  redirect("/how-it-works");
}
