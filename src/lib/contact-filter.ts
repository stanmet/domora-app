// Фильтр контактов в тексте отклика (docs/domora-spec.md: обмен контактами до
// брони запрещён). Прячем телефоны, email, ссылки и упоминания мессенджеров,
// заменяя их на плашку. Флаг flagged показывает, что что-то было скрыто, чтобы
// показать клиенту предупреждение.
export type FilteredText = { text: string; flagged: boolean };

// Каждый шаблон обрабатывается по очереди. Телефон требует минимум 7 цифр,
// чтобы не задевать короткие числа вроде бюджета или площади.
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;
const MESSENGER = /\b(?:t\.me|wa\.me|telegram|telega|whatsapp|whats app|viber|signal|instagram|insta|snapchat|facebook|messenger)\b[^\s]*/gi;
const HANDLE = /@[A-Za-z0-9_.]{3,}/g;
const PHONE = /\+?\d[\d\s().-]{5,}\d/g;

export function filterContacts(input: string, placeholder = "[hidden]"): FilteredText {
  let flagged = false;
  const mark = () => {
    flagged = true;
    return placeholder;
  };

  let text = input
    .replace(EMAIL, mark)
    .replace(LINK, mark)
    .replace(MESSENGER, mark)
    .replace(HANDLE, mark);

  // Телефоны: заменяем только если в совпадении набирается не меньше 7 цифр.
  text = text.replace(PHONE, (m) => {
    const digits = (m.match(/\d/g) ?? []).length;
    if (digits < 7) return m;
    flagged = true;
    return placeholder;
  });

  return { text: text.replace(/\s{2,}/g, " ").trim(), flagged };
}
