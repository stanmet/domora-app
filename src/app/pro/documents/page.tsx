// Верификация документов убрана: Domora ничего не проверяет (бесплатный
// сервис, пользователи сами отвечают за себя). Прямые ссылки ведём в кабинет.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  redirect("/pro");
}
