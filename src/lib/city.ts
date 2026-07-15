// Глобальный выбранный город (гео). Хранится в cookie, как и язык интерфейса.
// Пустая строка = "Все города".
import { cookies } from "next/headers";

export const CITY_COOKIE = "city";

export async function getCity(): Promise<string> {
  return (await cookies()).get(CITY_COOKIE)?.value?.trim() ?? "";
}
