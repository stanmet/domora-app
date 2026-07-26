// Тексты FAQ на 6 языках. Вынесены отдельно, чтобы не раздувать основной словарь.
// Используются на странице /faq и в микроразметке FAQPage (schema.org) для поиска.
import type { Locale } from "@/i18n/config";

export type QA = { q: string; a: string };

export const FAQ_TITLE: Record<Locale, string> = {
  en: "Frequently asked questions",
  ru: "Частые вопросы",
  uk: "Часті запитання",
  pl: "Częste pytania",
  es: "Preguntas frecuentes",
  pt: "Perguntas frequentes",
};

const FAQ: Record<Locale, QA[]> = {
  en: [
    { q: "How much does Domora cost?", a: "Domora is completely free. We take no fees and no commission, neither from clients nor from professionals." },
    { q: "How do I find a professional in Ireland?", a: "Browse the catalogue by category and city, or post a task for free and get offers from local pros." },
    { q: "What services can I find on Domora?", a: "Cleaning, handyman, plumbing, electrical, chef at home, beauty, massage, gardening, moving, tutoring, events and more." },
    { q: "How do I become a service provider?", a: "Sign up as a professional, create your service listing and start receiving requests. It is free, with no commission." },
    { q: "Is Domora safe to use?", a: "You see ratings and two-way reviews, agree everything directly, and contact details open only after you choose a pro." },
    { q: "Which areas of Ireland are covered?", a: "All of Ireland, including Dublin, Cork, Galway, Limerick and Waterford, plus towns across the country." },
  ],
  ru: [
    { q: "Сколько стоит Domora?", a: "Domora полностью бесплатна. Мы не берём ни оплату, ни комиссию - ни с заказчиков, ни с исполнителей." },
    { q: "Как найти исполнителя в Ирландии?", a: "Смотрите каталог по категории и городу или разместите задачу бесплатно и получите отклики от местных исполнителей." },
    { q: "Какие услуги есть на Domora?", a: "Уборка, мастер на час, сантехника, электрика, повар на дом, красота, массаж, сад, переезды, репетиторство, праздники и другое." },
    { q: "Как стать исполнителем?", a: "Зарегистрируйтесь как исполнитель, создайте плашку услуги и начните получать заявки. Это бесплатно, без комиссии." },
    { q: "Безопасно ли пользоваться Domora?", a: "Вы видите рейтинг и двусторонние отзывы, обо всём договариваетесь напрямую, а контакты открываются только после выбора исполнителя." },
    { q: "Какие города Ирландии охвачены?", a: "Вся Ирландия: Дублин, Корк, Голуэй, Лимерик, Уотерфорд и города по всей стране." },
  ],
  uk: [
    { q: "Скільки коштує Domora?", a: "Domora повністю безкоштовна. Ми не беремо ні оплати, ні комісії - ні із замовників, ні з виконавців." },
    { q: "Як знайти виконавця в Ірландії?", a: "Перегляньте каталог за категорією та містом або розмістіть завдання безкоштовно й отримайте відгуки від місцевих виконавців." },
    { q: "Які послуги є на Domora?", a: "Прибирання, майстер на годину, сантехніка, електрика, кухар додому, краса, масаж, сад, переїзди, репетиторство, свята та інше." },
    { q: "Як стати виконавцем?", a: "Зареєструйтеся як виконавець, створіть картку послуги й почніть отримувати заявки. Це безкоштовно, без комісії." },
    { q: "Чи безпечно користуватися Domora?", a: "Ви бачите рейтинг і двосторонні відгуки, про все домовляєтеся напряму, а контакти відкриваються лише після вибору виконавця." },
    { q: "Які міста Ірландії охоплено?", a: "Уся Ірландія: Дублін, Корк, Голвей, Лімерик, Вотерфорд і міста по всій країні." },
  ],
  pl: [
    { q: "Ile kosztuje Domora?", a: "Domora jest całkowicie bezpłatna. Nie pobieramy opłat ani prowizji - ani od klientów, ani od wykonawców." },
    { q: "Jak znaleźć wykonawcę w Irlandii?", a: "Przeglądaj katalog według kategorii i miasta albo dodaj zlecenie za darmo i otrzymaj oferty od lokalnych wykonawców." },
    { q: "Jakie usługi znajdę w Domora?", a: "Sprzątanie, złota rączka, hydraulika, elektryka, kucharz w domu, uroda, masaż, ogród, przeprowadzki, korepetycje, imprezy i więcej." },
    { q: "Jak zostać wykonawcą?", a: "Zarejestruj się jako wykonawca, utwórz ofertę usługi i zacznij otrzymywać zgłoszenia. To bezpłatne, bez prowizji." },
    { q: "Czy Domora jest bezpieczna?", a: "Widzisz oceny i dwustronne opinie, wszystko ustalasz bezpośrednio, a dane kontaktowe otwierają się dopiero po wyborze wykonawcy." },
    { q: "Które regiony Irlandii są objęte?", a: "Cała Irlandia: Dublin, Cork, Galway, Limerick, Waterford i miasta w całym kraju." },
  ],
  es: [
    { q: "¿Cuánto cuesta Domora?", a: "Domora es totalmente gratis. No cobramos tarifas ni comisión, ni a clientes ni a profesionales." },
    { q: "¿Cómo encuentro un profesional en Irlanda?", a: "Explora el catálogo por categoría y ciudad, o publica una tarea gratis y recibe ofertas de profesionales locales." },
    { q: "¿Qué servicios hay en Domora?", a: "Limpieza, manitas, fontanería, electricidad, cocinero a domicilio, belleza, masaje, jardín, mudanzas, clases, eventos y más." },
    { q: "¿Cómo me hago profesional?", a: "Regístrate como profesional, crea tu anuncio de servicio y empieza a recibir solicitudes. Es gratis, sin comisión." },
    { q: "¿Es seguro usar Domora?", a: "Ves valoraciones y reseñas de ambas partes, lo acuerdas todo directamente y los contactos se abren solo tras elegir profesional." },
    { q: "¿Qué zonas de Irlanda cubre?", a: "Toda Irlanda: Dublín, Cork, Galway, Limerick, Waterford y localidades de todo el país." },
  ],
  pt: [
    { q: "Quanto custa a Domora?", a: "A Domora é totalmente grátis. Não cobramos taxas nem comissão, nem a clientes nem a profissionais." },
    { q: "Como encontro um profissional na Irlanda?", a: "Explore o catálogo por categoria e cidade, ou publique uma tarefa grátis e receba propostas de profissionais locais." },
    { q: "Que serviços existem na Domora?", a: "Limpeza, faz-tudo, canalização, eletricidade, cozinheiro ao domicílio, beleza, massagem, jardim, mudanças, explicações, eventos e mais." },
    { q: "Como me torno profissional?", a: "Registe-se como profissional, crie o seu anúncio de serviço e comece a receber pedidos. É grátis, sem comissão." },
    { q: "A Domora é segura?", a: "Vê avaliações e comentários dos dois lados, combina tudo diretamente, e os contactos abrem só depois de escolher o profissional." },
    { q: "Que zonas da Irlanda são cobertas?", a: "Toda a Irlanda: Dublin, Cork, Galway, Limerick, Waterford e localidades por todo o país." },
  ],
};

export function getFaq(locale: Locale): QA[] {
  return FAQ[locale] ?? FAQ.en;
}
