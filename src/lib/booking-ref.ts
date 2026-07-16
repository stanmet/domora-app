// Читаемый номер заказа вида DM-XXXXXX. Генерируется при создании брони и
// хранится в Booking.ref (уникальный). Алфавит без похожих символов (0/O, 1/I/L),
// чтобы номер было легко продиктовать в поддержку. 6 знаков из 31 символа дают
// ~900 млн комбинаций, поэтому совпадения практически исключены.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function genBookingRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `DM-${s}`;
}

// Номер для показа: сохранённый ref, иначе запасной вариант из id (для старых
// заказов, если бэкофилл ещё не прошёл).
export function bookingRef(b: { ref?: string | null; id: string }): string {
  return b.ref ?? `DM-${b.id.slice(-6).toUpperCase()}`;
}
