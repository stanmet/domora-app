// Микроразметка schema.org (JSON-LD) для поисковиков. Рендерит скрытый от
// пользователя, но читаемый Google скрипт. Данные - обычный объект/массив.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
