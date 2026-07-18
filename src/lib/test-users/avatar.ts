// Синтетическая «фотография» тестового профиля: детерминированный SVG-аватар
// (инициалы на цветном фоне) в виде data URI. Без внешних сервисов и загрузок,
// поэтому безопасен и бесплатен. Используется как фото портфолио и обложка услуги.

const BG = ["#E0B074", "#93B981", "#B4A98F", "#8FAE9B", "#D9A38B", "#E08A4C", "#A9A18E", "#7C9CB0"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function syntheticAvatar(firstName: string, lastName: string): string {
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase();
  const bg = BG[hash(firstName + lastName) % BG.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
    `<rect width="400" height="400" fill="${bg}"/>` +
    `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" ` +
    `font-family="Arial,Helvetica,sans-serif" font-size="180" font-weight="700" fill="#ffffff" ` +
    `fill-opacity="0.92">${initials}</text></svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
