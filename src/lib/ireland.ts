// География Ирландии для подбора «по радиусу от города». Исполнитель базируется
// в городе и выставляет радиус выезда (км); он покрывает соседние города и целые
// графства вплоть до всей страны (Ирландия ~500 км с севера на юг, поэтому
// радиус 500 = вся страна). Координаты приблизительные - для сравнения расстояний
// этого достаточно. Внешние сервисы не нужны.

export interface Town {
  name: string;
  county: string;
  lat: number;
  lng: number;
}

// Главные города и центры графств (Республика Ирландия + крупные города севера).
export const IRELAND_TOWNS: Town[] = [
  { name: "Dublin", county: "Dublin", lat: 53.3498, lng: -6.2603 },
  { name: "Cork", county: "Cork", lat: 51.8985, lng: -8.4756 },
  { name: "Galway", county: "Galway", lat: 53.2707, lng: -9.0568 },
  { name: "Limerick", county: "Limerick", lat: 52.668, lng: -8.6305 },
  { name: "Waterford", county: "Waterford", lat: 52.2593, lng: -7.1101 },
  { name: "Kilkenny", county: "Kilkenny", lat: 52.6541, lng: -7.2448 },
  { name: "Drogheda", county: "Louth", lat: 53.7189, lng: -6.3478 },
  { name: "Dundalk", county: "Louth", lat: 54.0019, lng: -6.4058 },
  { name: "Swords", county: "Dublin", lat: 53.4597, lng: -6.2181 },
  { name: "Bray", county: "Wicklow", lat: 53.2026, lng: -6.0983 },
  { name: "Wicklow", county: "Wicklow", lat: 52.9808, lng: -6.0446 },
  { name: "Navan", county: "Meath", lat: 53.6528, lng: -6.6814 },
  { name: "Naas", county: "Kildare", lat: 53.2158, lng: -6.6669 },
  { name: "Athlone", county: "Westmeath", lat: 53.4239, lng: -7.9407 },
  { name: "Mullingar", county: "Westmeath", lat: 53.5258, lng: -7.3386 },
  { name: "Portlaoise", county: "Laois", lat: 53.0344, lng: -7.2994 },
  { name: "Carlow", county: "Carlow", lat: 52.8408, lng: -6.9261 },
  { name: "Wexford", county: "Wexford", lat: 52.3369, lng: -6.4633 },
  { name: "Clonmel", county: "Tipperary", lat: 52.3558, lng: -7.7043 },
  { name: "Tralee", county: "Kerry", lat: 52.2713, lng: -9.7016 },
  { name: "Killarney", county: "Kerry", lat: 52.0599, lng: -9.5044 },
  { name: "Ennis", county: "Clare", lat: 52.8436, lng: -8.9864 },
  { name: "Sligo", county: "Sligo", lat: 54.2766, lng: -8.4761 },
  { name: "Letterkenny", county: "Donegal", lat: 54.9558, lng: -7.7342 },
  { name: "Castlebar", county: "Mayo", lat: 53.8541, lng: -9.2988 },
  { name: "Roscommon", county: "Roscommon", lat: 53.6279, lng: -8.1893 },
  { name: "Longford", county: "Longford", lat: 53.7276, lng: -7.7932 },
  { name: "Cavan", county: "Cavan", lat: 53.991, lng: -7.3606 },
  { name: "Monaghan", county: "Monaghan", lat: 54.2492, lng: -6.9683 },
  { name: "Tullamore", county: "Offaly", lat: 53.2736, lng: -7.4894 },
  { name: "Thurles", county: "Tipperary", lat: 52.6817, lng: -7.8047 },
  { name: "Nenagh", county: "Tipperary", lat: 52.8642, lng: -8.1969 },
  { name: "Belfast", county: "Antrim", lat: 54.5973, lng: -5.9301 },
  { name: "Derry", county: "Derry", lat: 54.9966, lng: -7.3086 },
];

const byLower = new Map(IRELAND_TOWNS.map((t) => [t.name.toLowerCase(), t]));

export function findTown(name: string | null | undefined): Town | undefined {
  if (!name) return undefined;
  return byLower.get(name.trim().toLowerCase());
}

// Расстояние между точками по формуле гаверсинуса (км).
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Достаёт ли исполнитель из своего города с данным радиусом до целевого города.
// Если один из городов неизвестен таблице - падаем на точное совпадение имён
// (обратная совместимость со старыми произвольными названиями).
export function reachable(providerCity: string | null, radiusKm: number, targetCity: string | null): boolean {
  if (!targetCity) return true; // цель не задана (вся страна) - показываем всех
  const a = findTown(providerCity);
  const b = findTown(targetCity);
  if (!a || !b) return (providerCity ?? "").trim().toLowerCase() === targetCity.trim().toLowerCase();
  if (a.name === b.name) return true;
  return distanceKm(a, b) <= radiusKm;
}

export const IRELAND_TOWN_NAMES = IRELAND_TOWNS.map((t) => t.name);
