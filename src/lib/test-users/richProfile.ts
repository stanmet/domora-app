// Rich generator of unique, varied bot profiles (bios and service descriptions).
// Built from independent phrase pools by seed, giving tens of thousands of unique
// combinations. Text is in ENGLISH (bioLang="en") - the default language of the
// marketplace; it is auto-translated to the visitor's language on the page.
// Deterministic by seed: a bot always gets the same profile.
import { CATEGORY_PACKS } from "./personas";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// --- Provider bio ---
const B_INTRO = [
  "Professional {prof} based in {city}.",
  "I'm a {profLower} working across {city} and nearby areas.",
  "{prof}. I live and work in {city} and travel around the region.",
  "Hi! I'm a {profLower}, helping people in {city} for years.",
  "{prof} who loves the craft. Based in {city}.",
  "Private specialist: {profLower}. I cover {city} and its suburbs.",
  "Experienced {prof} taking jobs across {city} and the area.",
  "{prof} - this is my profession, not a side gig. Based in {city}.",
];
const B_EXP = [
  "Over {years} years of experience.",
  "More than {years} years in the trade.",
  "In {years} years I've completed hundreds of jobs.",
  "{years} years of practice and happy clients.",
  "I've been doing this for {years} years and keep learning.",
  "{years} years on the job - I've pretty much seen it all.",
];
const B_SPEC = [
  "I specialise in {skills}.",
  "I'm especially good at {skill1} and {skill2}.",
  "My strong points are {skills}.",
  "Most requests are for {skills}.",
  "I love jobs that need {skill1}, but I also handle {skill2}.",
];
const B_APPROACH = [
  "I work tidily, cleanly and without rushing.",
  "I value punctuality and fair pricing with no hidden extras.",
  "I treat every job individually and stay in touch.",
  "We agree the details first, then I start - no surprises.",
  "I'll calmly explain what I do and answer any questions.",
  "I take on both small tasks and big jobs - I'll adapt to you.",
];
const B_CTA = [
  "I guarantee the result.",
  "I bring my own tools and materials for the job.",
  "Message me in chat - I reply fast and can advise on price.",
  "Flexible schedule, evenings and weekends possible.",
  "I work openly, with the price agreed in advance.",
  "I care about my reviews, so I do the job properly.",
];

export function richBio(opts: { profession: string; city: string; years: number; categorySlug: string; seed: string }): string {
  const h = hash(opts.seed);
  const pack = CATEGORY_PACKS[opts.categorySlug] ?? CATEGORY_PACKS.other;
  const sk = pack.skills;
  const s1 = pick(sk, h >> 2);
  const s2 = pick(sk, (h >> 5) + 1);
  const skills = Array.from(new Set([s1, s2, pick(sk, (h >> 8) + 2)])).slice(0, 3).map(lower).join(", ");
  const fill = (t: string) =>
    t
      .replaceAll("{prof}", opts.profession)
      .replaceAll("{profLower}", lower(opts.profession))
      .replaceAll("{city}", opts.city)
      .replaceAll("{years}", String(opts.years))
      .replaceAll("{skills}", skills)
      .replaceAll("{skill1}", lower(s1))
      .replaceAll("{skill2}", lower(s2));
  return [
    fill(pick(B_INTRO, h)),
    fill(pick(B_EXP, h >> 3)),
    fill(pick(B_SPEC, h >> 6)),
    fill(pick(B_APPROACH, h >> 9)),
    fill(pick(B_CTA, h >> 12)),
  ].join(" ");
}

// --- Service description ---
const D_OPEN = [
  "{title}.",
  "Service offered: {title}.",
  "{title} - fast and done well.",
  "Happy to take on: {title}.",
];
const D_BODY = [
  "I work in {city} and nearby areas, and travel to you.",
  "I'll come at a convenient time, including evenings and weekends.",
  "I bring everything needed - you just provide access to the place.",
  "I'll assess the scope in advance and quote a fair price with no markups.",
  "Careful and respectful of your home and your time.",
];
const D_END = [
  "Message me in chat - let's agree the details and timing.",
  "I can start within the next few days.",
  "Questions about the price - just ask, I'll explain everything.",
  "I care about my reputation, so I do the job properly.",
];

export function richListingDesc(opts: { title: string; city: string; seed: string; index: number }): string {
  const h = hash(`${opts.seed}:${opts.index}`);
  const fill = (t: string) => t.replaceAll("{title}", opts.title).replaceAll("{city}", opts.city);
  return [fill(pick(D_OPEN, h)), fill(pick(D_BODY, h >> 4)), fill(pick(D_END, h >> 8))].join(" ");
}

// Believable "live" profile metrics by seed: experience, rating, jobs done, travel
// radius, response speed. So bots are not all "new" and identical.
export function richStats(seed: string): {
  years: number;
  jobsCount: number;
  rating: number;
  travelRadiusKm: number;
  responseMinutes: number;
  acceptanceRate: number;
} {
  const h = hash(seed);
  const years = 2 + (h % 16); // 2..17
  const jobsCount = 4 + ((h >> 3) % 160); // 4..163
  const rating = Math.round((4.3 + ((h >> 6) % 8) * 0.1) * 100) / 100; // 4.3..5.0
  const travelRadiusKm = [10, 15, 20, 25, 30, 40, 50][(h >> 9) % 7];
  const responseMinutes = [5, 10, 15, 20, 30, 45, 60][(h >> 11) % 7];
  const acceptanceRate = Math.round((0.85 + ((h >> 13) % 15) * 0.01) * 1000) / 1000; // 0.85..0.99
  return { years, jobsCount, rating, travelRadiusKm, responseMinutes, acceptanceRate };
}
