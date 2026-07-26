// Страница частых вопросов (FAQ). Видимая для пользователей и с микроразметкой
// FAQPage (schema.org) - помогает попадать в расширенные сниппеты поиска.
import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { getFaq, FAQ_TITLE } from "@/i18n/faq";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = FAQ_TITLE[locale];
  const qa = getFaq(locale);
  return {
    title,
    description: qa.slice(0, 2).map((x) => x.q).join(" "),
    alternates: { canonical: "/faq" },
    openGraph: { title: `${title} · Domora` },
  };
}

export default async function FaqPage() {
  const locale = await getLocale();
  const title = FAQ_TITLE[locale];
  const qa = getFaq(locale);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <main className="wrap sec">
      <JsonLd data={faqLd} />
      <h1 className="page">{title}</h1>
      <div className="faqlist">
        {qa.map((x, i) => (
          <div className="faqitem" key={i}>
            <h2>{x.q}</h2>
            <p>{x.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
