// Мгновенный индикатор загрузки при переходах между страницами: показывается
// сразу по тапу, пока сервер готовит новую страницу. Убирает ощущение "залипания".
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main
      className="wrap"
      style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "55vh" }}
    >
      <Loader2 size={30} className="spin" style={{ color: "var(--green)" }} />
    </main>
  );
}
