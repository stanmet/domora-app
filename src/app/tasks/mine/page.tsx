// «Мои задачи» объединены с «Мои заказы» в один раздел /bookings (вкладка
// «Ожидают выбора»). Прямые ссылки на старый адрес ведём туда же.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MyTasksRedirect() {
  redirect("/bookings?tab=active");
}
