import React, { useState } from "react";
import {
  LayoutGrid, Home, Calendar as CalIcon, Wallet, ClipboardCheck, MessageCircle,
  Star, UserCog, Settings, Gift, MoreHorizontal, X, ArrowRight, Check,
  Rocket, AlertTriangle, ShieldCheck, Globe, Plus, ChevronLeft, Send,
  CreditCard, Clock, MapPin, Lightbulb, ToggleLeft, ToggleRight
} from "lucide-react";

/* ── DESIGN TOKENS (same system as the marketplace prototype) ──
   ink #141414 · sage #EFF4EA · green #4C7C3F · beige-bg #F5EEDF
   beige #A98F5F · orange #EA5B13 · amber warn #FBF3DC
──────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap');
:root{--ink:#141414;--muted:#6b6b6b;--paper:#fff;--sage:#EFF4EA;--green:#4C7C3F;--green-dark:#3d6533;
--beige-bg:#F5EEDF;--beige:#A98F5F;--orange:#EA5B13;--line:#e7e7e2;--warn-bg:#FBF3DC;--warn:#8a6a1f;--red:#c23b22}
*{box-sizing:border-box;margin:0;padding:0}
.hd{background:var(--paper);color:var(--ink);font-family:'Inter',system-ui,sans-serif;min-height:100vh;padding-bottom:84px;-webkit-font-smoothing:antialiased}
.hd .wrap{max-width:640px;margin:0 auto;padding:0 18px}
.hd .display{font-family:'Archivo',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;line-height:1}
.hd .eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}

/* top bar */
.hd .top{position:sticky;top:0;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:30}
.hd .toprow{display:flex;align-items:center;justify-content:space-between;height:56px}
.hd .logo{font-family:'Archivo';font-weight:900;font-size:17px;text-transform:uppercase}
.hd .logo span{color:var(--green)}
.hd .lang{display:flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer;background:#fff}

/* page head */
.hd h1.page{font-family:'Archivo';font-weight:900;text-transform:uppercase;font-size:clamp(24px,6vw,32px);margin:22px 0 4px}
.hd .sub{font-size:13.5px;color:var(--muted);margin-bottom:20px}

/* cards */
.hd .card{border:1px solid var(--line);border-radius:18px;padding:20px;background:#fff;margin-bottom:14px}
.hd .icircle{width:46px;height:46px;border-radius:50%;background:var(--sage);color:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hd .icircle.or{background:#FDEBE0;color:var(--orange)}
.hd .icircle.bg{background:var(--beige-bg);color:var(--beige)}

/* onboarding */
.hd .ob-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}
.hd .ob-head h3{font-family:'Archivo';font-weight:800;font-size:17px;text-transform:uppercase;margin-bottom:3px}
.hd .ob-head p{font-size:13px;color:var(--muted);line-height:1.45}
.hd .prog{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px}
.hd .prog b{color:var(--orange)}
.hd .bar{height:6px;background:#f0f0eb;border-radius:99px;overflow:hidden;margin-bottom:16px}
.hd .bar i{display:block;height:100%;background:var(--green);border-radius:99px;transition:width .4s ease}
.hd .ob-step{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;margin-bottom:10px}
.hd .ob-step.next{border-color:var(--green);background:var(--sage)}
.hd .ob-step.ok{opacity:.65}
.hd .num{width:30px;height:30px;border:2px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;background:#fff}
.hd .num.ok{background:var(--green);border-color:var(--green);color:#fff}
.hd .ob-step h4{font-size:14px;font-weight:700;flex:1}
.hd .ob-step .tagnext{font-size:10px;font-weight:800;letter-spacing:.1em;background:var(--orange);color:#fff;border-radius:99px;padding:3px 8px;margin-left:6px}

/* buttons */
.hd .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;border-radius:999px;padding:11px 18px;font-family:'Inter';font-size:13.5px;font-weight:700;cursor:pointer;transition:transform .1s}
.hd .btn:active{transform:scale(.97)}
.hd .btn-ink{background:var(--ink);color:#fff}
.hd .btn-green{background:var(--green);color:#fff}
.hd .btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--ink)}
.hd .btn-line{background:#fff;color:var(--ink);border:1px solid var(--line)}
.hd .btn-sm{padding:8px 14px;font-size:12.5px}
.hd .btn-red{background:#fff;color:var(--red);border:1px solid var(--red)}

/* warn */
.hd .warn{background:var(--warn-bg);border-radius:16px;padding:16px 18px;display:flex;gap:12px;margin-bottom:14px}
.hd .warn .wi{width:40px;height:40px;border-radius:12px;background:#F3E3B5;color:var(--warn);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hd .warn h4{font-size:14px;font-weight:800;color:#5c4712;margin-bottom:3px}
.hd .warn p{font-size:12.5px;color:var(--warn);line-height:1.5}

/* beige tip */
.hd .tip{background:var(--beige-bg);border-radius:16px;padding:16px 18px;display:flex;gap:12px;align-items:flex-start;margin:16px 0}
.hd .tip .ti{width:38px;height:38px;border-radius:50%;background:var(--beige);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hd .tip p{font-size:13px;line-height:1.5}
.hd .tip b{font-weight:800}

/* stats */
.hd .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.hd .stat{border:1px solid var(--line);border-radius:16px;padding:14px}
.hd .stat .v{font-family:'Archivo';font-weight:900;font-size:22px}
.hd .stat .l{font-size:11px;color:var(--muted);font-weight:600;margin-top:2px;line-height:1.3}

/* bookings */
.hd .bk{border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}
.hd .bk.req{border-color:var(--orange)}
.hd .bkrow{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px}
.hd .bk h4{font-size:14.5px;font-weight:700}
.hd .bk .meta{font-size:12.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 10px}
.hd .bk .meta span{display:inline-flex;align-items:center;gap:4px}
.hd .bk .amt{font-family:'Archivo';font-weight:800;font-size:16px;white-space:nowrap}
.hd .pill{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:99px;padding:4px 10px}
.hd .pill.req{background:#FDEBE0;color:var(--orange)}
.hd .pill.ok{background:var(--sage);color:var(--green-dark)}
.hd .pill.done{background:#f0f0eb;color:var(--muted)}
.hd .pill.dec{background:#fae6e2;color:var(--red)}
.hd .bkbtns{display:flex;gap:8px}

/* listings */
.hd .li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 0;border-bottom:1px solid var(--line)}
.hd .li h4{font-size:14.5px;font-weight:700;margin-bottom:2px}
.hd .li p{font-size:12.5px;color:var(--muted)}
.hd .li .pr{font-family:'Archivo';font-weight:800;font-size:15px;white-space:nowrap}
.hd .tgl{cursor:pointer;color:var(--green)}
.hd .tgl.off{color:#c9c9c2}

/* calendar */
.hd .week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:16px 0}
.hd .day{border:1px solid var(--line);border-radius:12px;padding:10px 4px;text-align:center;cursor:pointer;font-size:12px;font-weight:700}
.hd .day span{display:block;font-size:10px;color:var(--muted);font-weight:600;margin-bottom:4px;text-transform:uppercase}
.hd .day.on{background:var(--sage);border-color:var(--green);color:var(--green-dark)}
.hd .day.on span{color:var(--green)}

/* payouts */
.hd .bal{background:var(--ink);color:#fff;border-radius:18px;padding:22px;margin-bottom:14px}
.hd .bal .l{font-size:11px;letter-spacing:.15em;text-transform:uppercase;opacity:.6;font-weight:700}
.hd .bal .v{font-family:'Archivo';font-weight:900;font-size:34px;margin:6px 0 14px}
.hd .tx{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.hd .tx b{font-family:'Archivo';font-weight:800}
.hd .tx .neg{color:var(--muted)}

/* messages */
.hd .msg-item{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);cursor:pointer;align-items:center}
.hd .ava{width:44px;height:44px;border-radius:50%;background:var(--sage);color:var(--green);display:flex;align-items:center;justify-content:center;font-family:'Archivo';font-weight:900;flex-shrink:0}
.hd .msg-item h4{font-size:14px;font-weight:700}
.hd .msg-item p{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52vw}
.hd .dot{width:9px;height:9px;border-radius:50%;background:var(--orange);margin-left:auto;flex-shrink:0}
.hd .thread{display:flex;flex-direction:column;gap:10px;padding:16px 0}
.hd .bub{max-width:78%;border-radius:16px;padding:11px 14px;font-size:13.5px;line-height:1.45}
.hd .bub.them{background:#f2f2ed;align-self:flex-start;border-bottom-left-radius:4px}
.hd .bub.me{background:var(--sage);align-self:flex-end;border-bottom-right-radius:4px}
.hd .trnote{margin-top:7px;font-size:11px;color:var(--green-dark);display:flex;gap:5px;align-items:center;cursor:pointer;font-weight:700}
.hd .composer{display:flex;gap:8px;position:sticky;bottom:84px;background:#fff;padding:10px 0}
.hd .composer input{flex:1;border:1px solid var(--line);border-radius:999px;padding:12px 16px;font-size:14px;font-family:'Inter'}
.hd .composer input:focus{outline:2px solid var(--green)}
.hd .composer button{width:46px;height:46px;border-radius:50%;background:var(--green);color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer}

/* reviews */
.hd .rev{padding:14px 0;border-bottom:1px solid var(--line)}
.hd .rev .rr{display:flex;gap:8px;align-items:center;font-size:13.5px;font-weight:700;margin-bottom:5px}
.hd .stars{display:flex;gap:2px;color:var(--orange)}
.hd .rev p{font-size:13px;color:var(--muted);line-height:1.5}

/* settings */
.hd label{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:16px 0 6px}
.hd input.f,.hd select.f{width:100%;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14.5px;font-family:'Inter';background:#fff}
.hd input.f:focus{outline:2px solid var(--green)}

/* bottom nav */
.hd nav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);z-index:40}
.hd .navrow{max-width:640px;margin:0 auto;display:flex}
.hd .ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0 12px;font-size:10px;font-weight:700;color:var(--muted);cursor:pointer;background:none;border:none;font-family:'Inter'}
.hd .ni.on{color:var(--orange)}

/* drawer */
.hd .ovl{position:fixed;inset:0;background:rgba(20,20,20,.45);z-index:50}
.hd .drawer{position:fixed;top:0;left:0;bottom:0;width:min(320px,85vw);background:#fff;z-index:51;padding:20px;overflow-y:auto}
.hd .dr-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
.hd .dr-head h3{font-family:'Archivo';font-weight:900;text-transform:uppercase;font-size:16px;display:flex;gap:8px;align-items:center}
.hd .dr-head h3 svg{color:var(--orange)}
.hd .mi{display:flex;align-items:center;gap:13px;width:100%;padding:13px 12px;border:none;background:none;border-radius:12px;font-size:15px;font-weight:600;color:var(--ink);cursor:pointer;font-family:'Inter';text-align:left}
.hd .mi.on{background:var(--sage);color:var(--green-dark);font-weight:700}
.hd .mi svg{color:var(--muted)}
.hd .mi.on svg{color:var(--green)}

/* modal-lite add listing */
.hd .sheet{border:1px solid var(--green);border-radius:18px;padding:18px;background:var(--sage);margin-bottom:16px}
.hd .empty{text-align:center;color:var(--muted);font-size:13.5px;padding:26px 0}
`;

/* ── I18N ── */
const T = {
  ru: {
    dash: "Кабинет исполнителя", welcome: "С возвращением! Управляйте услугами и заказами.",
    obT: "Подготовка к заказам", obP: "Выполните шаги, чтобы начать получать брони",
    progress: "Прогресс настройки",
    st1: "Подключите Stripe для выплат", st2: "Создайте первую услугу", st3: "Укажите доступность",
    go: "Открыть", next: "Далее", donel: "Готово",
    warnT: "Завершите верификацию Stripe", warnP: "Stripe нужно ещё несколько данных, чтобы выплаты шли без задержек.",
    finish: "Завершить",
    statBook: "заказов в этом месяце", statEarn: "заработано", statRate: "рейтинг",
    tipB: "Совет:", tipOb: "отвечайте на запросы быстрее: брони, принятые в течение часа, отменяются на 70% реже.",
    menu: "Меню", overview: "Обзор", listings: "Мои услуги", calendar: "Календарь",
    avail: "Доступность", bookings: "Заказы", messages: "Сообщения",
    items: "Услуги и пакеты", refs: "Приглашения", payouts: "Выплаты",
    reviews: "Отзывы", profile: "Профиль", settings: "Настройки", more: "Ещё",
    newReq: "Новые запросы", upcoming: "Подтверждено", history: "История",
    accept: "Принять", decline: "Отклонить",
    holdTip: "деньги клиента заморожены на карте. Списание произойдёт, когда вы примете заказ. Если отклоните, холд снимется и клиент ничего не заплатит.",
    stReq: "Запрос", stOk: "Подтверждено", stDone: "Завершено", stDec: "Отклонено",
    guests: "гостей", m2: "м²", hours: "ч",
    addListing: "Добавить услугу", active: "Активна", paused: "Пауза",
    liWho: "Кто вы", liWhoPh: "Диджей, музыкант, официант, аниматор, парковщик...",
    liCat: "Категория", liTitle: "Название услуги", liTitlePh: "Например: DJ-сет на свадьбу, до 5 часов", liPrice: "Цена, €", liUnit: "Единица",
    perGuest: "за гостя", perM2: "за м²", perHour: "за час", perSession: "за сеанс", perEvent: "за мероприятие", save: "Сохранить", cancel: "Отмена",
    calT: "Доступность на неделе", calP: "Нажмите на день, чтобы открыть или закрыть его для брони.",
    balance: "К выплате", nextPay: "Следующая выплата: понедельник, на счёт IE••4821",
    txT: "Операции", fee: "Комиссия платформы",
    revT: "Отзывы клиентов",
    profT: "Профиль", name: "Имя / бренд", city: "Город", radius: "Радиус выезда, км", cat: "Категория",
    chef: "Повар на дом", clean: "Уборка", handy: "Мастер на час", catMassage: "Массаж", catBeauty: "Красота на дому", catEvents: "Праздники и события", catOther: "Другое (категорию подберёт модерация)",
    back: "Назад", typeMsg: "Сообщение…",
    chatBanner: "Общайтесь и получайте оплату только внутри Domora. Переписка в платформе защищает ваши деньги и служит доказательством при споре.",
    translatedFrom: "Переведено с", showOrig: "показать оригинал", hideOrig: "скрыть оригинал",
    lang_uk: "украинского", lang_en: "английского", lang_ru: "русского", lang_pl: "польского", lang_es: "испанского", lang_pt: "португальского",
    emptyReq: "Новых запросов нет. Мы пришлём уведомление.",
  },
  en: {
    dash: "Host dashboard", welcome: "Welcome back! Manage your services and bookings.",
    obT: "Get ready for bookings", obP: "Complete these steps to start receiving bookings",
    progress: "Setup progress",
    st1: "Connect Stripe for payouts", st2: "Create your first listing", st3: "Set your availability",
    go: "Go", next: "Next", donel: "Done",
    warnT: "Finish your Stripe verification", warnP: "Stripe still needs a few details before your payouts can move.",
    finish: "Finish",
    statBook: "bookings this month", statEarn: "earned", statRate: "rating",
    tipB: "Tip:", tipOb: "reply to requests fast: bookings accepted within an hour get cancelled 70% less often.",
    menu: "Menu", overview: "Overview", listings: "My listings", calendar: "Calendar",
    avail: "Availability", bookings: "Bookings", messages: "Messages",
    items: "Services & packages", refs: "Referrals", payouts: "Payouts",
    reviews: "Reviews", profile: "Profile", settings: "Settings", more: "More",
    newReq: "New requests", upcoming: "Confirmed", history: "History",
    accept: "Accept", decline: "Decline",
    holdTip: "the client's money is held on their card. It's charged when you accept. If you decline, the hold is released and they pay nothing.",
    stReq: "Request", stOk: "Confirmed", stDone: "Completed", stDec: "Declined",
    guests: "guests", m2: "m²", hours: "h",
    addListing: "Add listing", active: "Active", paused: "Paused",
    liWho: "Who are you", liWhoPh: "DJ, musician, waiter, entertainer, valet...",
    liCat: "Category", liTitle: "Listing title", liTitlePh: "e.g. Wedding DJ set, up to 5 hours", liPrice: "Price, €", liUnit: "Unit",
    perGuest: "per guest", perM2: "per m²", perHour: "per hour", perSession: "per session", perEvent: "per event", save: "Save", cancel: "Cancel",
    calT: "Weekly availability", calP: "Tap a day to open or close it for bookings.",
    balance: "Pending payout", nextPay: "Next payout: Monday, to account IE••4821",
    txT: "Transactions", fee: "Platform fee",
    revT: "Client reviews",
    profT: "Profile", name: "Name / brand", city: "City", radius: "Travel radius, km", cat: "Category",
    chef: "Private chef", clean: "Cleaning", handy: "Handyman", catMassage: "Massage", catBeauty: "Beauty at home", catEvents: "Events & parties", catOther: "Other (moderation will pick the category)",
    back: "Back", typeMsg: "Message…",
    chatBanner: "Chat and get paid only inside Domora. On-platform messages protect your money and serve as evidence in a dispute.",
    translatedFrom: "Translated from", showOrig: "show original", hideOrig: "hide original",
    lang_uk: "Ukrainian", lang_en: "English", lang_ru: "Russian", lang_pl: "Polish", lang_es: "Spanish", lang_pt: "Portuguese",
    emptyReq: "No new requests. We'll notify you.",
  },
};

/* ── MOCK DATA ── */
const INIT_BOOKINGS = [
  { id: 1, client: "Sarah K.", svc: { ru: "Ужин на компанию (3 блюда)", en: "Dinner party (3 courses)" },
    date: "18.07", time: "18:30", qty: 6, unit: "guests", amount: 330, addr: "Ranelagh, Dublin 6", status: "request" },
  { id: 2, client: "Mark O.", svc: { ru: "Meal prep на неделю", en: "Weekly meal prep" },
    date: "21.07", time: "10:00", qty: 2, unit: "guests", amount: 80, addr: "Dún Laoghaire", status: "request" },
  { id: 3, client: "Ciara M.", svc: { ru: "Ужин на компанию (3 блюда)", en: "Dinner party (3 courses)" },
    date: "14.07", time: "19:00", qty: 4, unit: "guests", amount: 220, addr: "Clontarf, Dublin 3", status: "confirmed" },
  { id: 4, client: "Niamh D.", svc: { ru: "Веган-ужин", en: "Vegan dinner" },
    date: "02.07", time: "19:00", qty: 8, unit: "guests", amount: 400, addr: "Howth", status: "done" },
];

const INIT_LISTINGS = [
  { id: 1, t: { ru: "Ужин на компанию (3 блюда)", en: "Dinner party (3 courses)" }, price: 55, unit: "perGuest", on: true },
  { id: 2, t: { ru: "Meal prep на неделю", en: "Weekly meal prep" }, price: 40, unit: "perGuest", on: true },
];

const CHATS = [
  { id: 1, n: "Oksana T.", unread: true,
    msgs: [
      { me: false, from: "uk", orig: "Доброго дня! Чи зможете приготувати вечерю на 6 осіб у суботу?",
        t: { ru: "Добрый день! Сможете приготовить ужин на 6 человек в субботу?", en: "Hello! Could you cook dinner for 6 people on Saturday?" } },
      { me: true, t: { ru: "Здравствуйте! Да, суббота свободна. Есть пожелания по кухне?", en: "Hi! Yes, Saturday is free. Any cuisine preferences?" } },
      { me: false, from: "uk", orig: "Українська або італійська. Двоє дітей, без гострого.",
        t: { ru: "Украинская или итальянская. Двое детей, без острого.", en: "Ukrainian or Italian. Two kids, nothing spicy." } },
    ] },
  { id: 2, n: "Sarah K.", unread: true,
    msgs: [
      { me: false, from: "en", orig: "Hi! Two guests have a nut allergy, is that workable?",
        t: { ru: "Здравствуйте! У двоих гостей аллергия на орехи, это решаемо?", en: "Hi! Two guests have a nut allergy, is that workable?" } },
      { me: true, t: { ru: "Конечно, составлю меню полностью без орехов и пришлю на согласование.", en: "Of course, I'll build a fully nut-free menu and send it for approval." } },
      { me: false, from: "en", orig: "Great, sending the request for the 18th!",
        t: { ru: "Отлично, тогда отправляю запрос на 18-е!", en: "Great, sending the request for the 18th!" } },
    ] },
  { id: 3, n: "Mark O.", unread: false,
    msgs: [ { me: false, from: "en", orig: "Do I supply containers or do you?",
              t: { ru: "Контейнеры свои или ваши?", en: "Do I supply containers or do you?" } },
            { me: true, t: { ru: "Привожу свои, входит в цену.", en: "I bring my own, included in the price." } } ] },
];

const REVIEWS = [
  { n: "Sarah K.", r: 5, t: { ru: "Безупречно от первого сообщения до последней тарелки.", en: "Flawless from the first message to the last plate." } },
  { n: "Mark O.", r: 5, t: { ru: "Кухня после неё была чище, чем до прихода.", en: "Kitchen was cleaner after she left than before." } },
  { n: "Niamh D.", r: 5, t: { ru: "Один только десерт стоил всей брони.", en: "The dessert alone was worth the booking." } },
];

const DAYS = { ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] };

/* ── APP ── */
export default function App() {
  const [lang, setLang] = useState("ru");
  const [tab, setTab] = useState("overview");
  const [menu, setMenu] = useState(false);
  const [steps, setSteps] = useState({ stripe: false, listing: true, avail: false });
  const [bookings, setBookings] = useState(INIT_BOOKINGS);
  const [listings, setListings] = useState(INIT_LISTINGS);
  const [adding, setAdding] = useState(false);
  const [nl, setNl] = useState({ who: "", cat: "events", t: "", price: "", unit: "perHour" });
  const [days, setDays] = useState([true, true, false, true, true, true, false]);
  const [chat, setChat] = useState(null);
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState(CHATS);
  const [showOrig, setShowOrig] = useState({});

  const t = T[lang];
  const doneCount = Object.values(steps).filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);
  const nextKey = !steps.stripe ? "stripe" : !steps.listing ? "listing" : !steps.avail ? "avail" : null;
  const eur = (n) => "€" + n.toLocaleString(lang === "ru" ? "ru-RU" : "en-IE");
  const unitL = (u) => ({ guests: t.guests, m2: t.m2, hours: t.hours }[u]);

  const setStatus = (id, status) =>
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status } : b)));

  const openTab = (x) => { setTab(x); setMenu(false); setChat(null); window.scrollTo(0, 0); };

  const send = () => {
    if (!draft.trim()) return;
    setChats(chats.map((c) => c.id === chat ? { ...c, msgs: [...c.msgs, { me: true, t: { ru: draft, en: draft } }] } : c));
    setDraft("");
  };

  const stepDefs = [
    { key: "stripe", label: t.st1, icon: Wallet },
    { key: "listing", label: t.st2, icon: Home },
    { key: "avail", label: t.st3, icon: CalIcon },
  ];

  const menuItems = [
    ["overview", t.overview, LayoutGrid], ["listings", t.listings, Home],
    ["calendar", t.calendar, CalIcon], ["bookings", t.bookings, ClipboardCheck],
    ["messages", t.messages, MessageCircle], ["payouts", t.payouts, Wallet],
    ["reviews", t.reviews, Star], ["profile", t.profile, UserCog], ["settings", t.settings, Settings],
  ];

  const Pill = ({ s }) => (
    <span className={"pill " + ({ request: "req", confirmed: "ok", done: "done", declined: "dec" }[s])}>
      {{ request: t.stReq, confirmed: t.stOk, done: t.stDone, declined: t.stDec }[s]}
    </span>
  );

  const BookingCard = ({ b, actions }) => (
    <div className={"bk" + (b.status === "request" ? " req" : "")}>
      <div className="bkrow">
        <div><h4>{b.client}</h4><div style={{ fontSize: 13, color: "var(--muted)" }}>{b.svc[lang]}</div></div>
        <div style={{ textAlign: "right" }}><div className="amt">{eur(b.amount)}</div><Pill s={b.status} /></div>
      </div>
      <div className="meta">
        <span><CalIcon size={13} /> {b.date}, {b.time}</span>
        <span><Clock size={13} /> {b.qty} {unitL(b.unit)}</span>
        <span><MapPin size={13} /> {b.addr}</span>
      </div>
      {actions && b.status === "request" && (
        <div className="bkbtns">
          <button className="btn btn-green btn-sm" style={{ flex: 1 }} onClick={() => setStatus(b.id, "confirmed")}>
            <Check size={14} /> {t.accept}
          </button>
          <button className="btn btn-red btn-sm" style={{ flex: 1 }} onClick={() => setStatus(b.id, "declined")}>
            {t.decline}
          </button>
        </div>
      )}
    </div>
  );

  const reqs = bookings.filter((b) => b.status === "request");
  const conf = bookings.filter((b) => b.status === "confirmed");
  const hist = bookings.filter((b) => b.status === "done" || b.status === "declined");

  return (
    <div className="hd">
      <style>{CSS}</style>

      <div className="top"><div className="wrap toprow">
        <div className="logo">DOMO<span>RA</span> · PRO</div>
        <button className="lang" onClick={() => setLang(lang === "ru" ? "en" : "ru")}>
          <Globe size={13} /> {lang === "ru" ? "EN" : "RU"}
        </button>
      </div></div>

      <div className="wrap">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            <h1 className="page">{t.dash}</h1>
            <p className="sub">{t.welcome}</p>

            <div className="stats">
              <div className="stat"><div className="v">7</div><div className="l">{t.statBook}</div></div>
              <div className="stat"><div className="v">€1 240</div><div className="l">{t.statEarn}</div></div>
              <div className="stat"><div className="v">4.9 ★</div><div className="l">{t.statRate}</div></div>
            </div>

            {pct < 100 && (
              <div className="card">
                <div className="ob-head">
                  <div className="icircle or"><Rocket size={22} strokeWidth={1.7} /></div>
                  <div><h3>{t.obT}</h3><p>{t.obP}</p></div>
                </div>
                <div className="prog"><span>{t.progress}</span><b>{pct}%</b></div>
                <div className="bar"><i style={{ width: pct + "%" }} /></div>
                {stepDefs.map((s, i) => {
                  const done = steps[s.key];
                  const isNext = s.key === nextKey;
                  return (
                    <div key={s.key} className={"ob-step" + (isNext ? " next" : "") + (done ? " ok" : "")}>
                      <div className={"num" + (done ? " ok" : "")}>{done ? <Check size={15} /> : i + 1}</div>
                      <h4>{s.label}{isNext && <span className="tagnext">{t.next}</span>}</h4>
                      {done
                        ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{t.donel}</span>
                        : <button className="btn btn-ink btn-sm" onClick={() => setSteps({ ...steps, [s.key]: true })}>
                            {t.go} <ArrowRight size={13} />
                          </button>}
                    </div>
                  );
                })}
              </div>
            )}

            {!steps.stripe && (
              <div className="warn">
                <div className="wi"><AlertTriangle size={20} /></div>
                <div>
                  <h4>{t.warnT}</h4><p>{t.warnP}</p>
                  <button className="btn btn-ink btn-sm" style={{ marginTop: 10 }}
                    onClick={() => setSteps({ ...steps, stripe: true })}>{t.finish} <ArrowRight size={13} /></button>
                </div>
              </div>
            )}

            {reqs.length > 0 && (
              <>
                <h3 className="display" style={{ fontSize: 16, margin: "22px 0 12px" }}>{t.newReq} · {reqs.length}</h3>
                {reqs.map((b) => <BookingCard key={b.id} b={b} actions />)}
              </>
            )}

            <div className="tip">
              <div className="ti"><Lightbulb size={18} /></div>
              <p><b>{t.tipB}</b> {t.tipOb}</p>
            </div>
          </>
        )}

        {/* ── BOOKINGS ── */}
        {tab === "bookings" && (
          <>
            <h1 className="page">{t.bookings}</h1>
            <div className="tip">
              <div className="ti"><ShieldCheck size={18} /></div>
              <p><b>{t.tipB}</b> {t.holdTip}</p>
            </div>
            <h3 className="display" style={{ fontSize: 15, margin: "6px 0 12px" }}>{t.newReq}</h3>
            {reqs.length ? reqs.map((b) => <BookingCard key={b.id} b={b} actions />)
              : <div className="empty">{t.emptyReq}</div>}
            {conf.length > 0 && <>
              <h3 className="display" style={{ fontSize: 15, margin: "20px 0 12px" }}>{t.upcoming}</h3>
              {conf.map((b) => <BookingCard key={b.id} b={b} />)}
            </>}
            {hist.length > 0 && <>
              <h3 className="display" style={{ fontSize: 15, margin: "20px 0 12px" }}>{t.history}</h3>
              {hist.map((b) => <BookingCard key={b.id} b={b} />)}
            </>}
          </>
        )}

        {/* ── LISTINGS ── */}
        {tab === "listings" && (
          <>
            <h1 className="page">{t.listings}</h1>
            <p className="sub">{t.items}</p>
            {adding ? (
              <div className="sheet">
                <label>{t.liWho}</label>
                <input className="f" value={nl.who} placeholder={t.liWhoPh} onChange={(e) => setNl({ ...nl, who: e.target.value })} />
                <label>{t.liCat}</label>
                <select className="f" value={nl.cat} onChange={(e) => setNl({ ...nl, cat: e.target.value })}>
                  <option value="chef">{t.chef}</option>
                  <option value="clean">{t.clean}</option>
                  <option value="handy">{t.handy}</option>
                  <option value="massage">{t.catMassage}</option>
                  <option value="beauty">{t.catBeauty}</option>
                  <option value="events">{t.catEvents}</option>
                  <option value="other">{t.catOther}</option>
                </select>
                <label>{t.liTitle}</label>
                <input className="f" value={nl.t} placeholder={t.liTitlePh} onChange={(e) => setNl({ ...nl, t: e.target.value })} />
                <label>{t.liPrice}</label>
                <input className="f" type="number" value={nl.price} onChange={(e) => setNl({ ...nl, price: e.target.value })} />
                <label>{t.liUnit}</label>
                <select className="f" value={nl.unit} onChange={(e) => setNl({ ...nl, unit: e.target.value })}>
                  <option value="perHour">{t.perHour}</option>
                  <option value="perEvent">{t.perEvent}</option>
                  <option value="perSession">{t.perSession}</option>
                  <option value="perGuest">{t.perGuest}</option>
                  <option value="perM2">{t.perM2}</option>
                </select>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button className="btn btn-green" style={{ flex: 1 }} onClick={() => {
                    if (!nl.t || !nl.price) return;
                    setListings([...listings, { id: Date.now(), who: nl.who, cat: nl.cat, t: { ru: nl.t, en: nl.t }, price: +nl.price, unit: nl.unit, on: true }]);
                    setNl({ who: "", cat: "events", t: "", price: "", unit: "perHour" }); setAdding(false);
                    setSteps((s) => ({ ...s, listing: true }));
                  }}>{t.save}</button>
                  <button className="btn btn-line" onClick={() => setAdding(false)}>{t.cancel}</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ink" style={{ marginBottom: 8 }} onClick={() => setAdding(true)}>
                <Plus size={15} /> {t.addListing}
              </button>
            )}
            {listings.map((l) => (
              <div className="li" key={l.id}>
                <div style={{ flex: 1 }}>
                  <h4>{l.who ? l.who + " · " + l.t[lang] : l.t[lang]}</h4>
                  <p>{l.on ? t.active : t.paused}</p>
                </div>
                <div className="pr">{eur(l.price)} <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 11, color: "var(--muted)" }}>{t[l.unit]}</span></div>
                <span className={"tgl" + (l.on ? "" : " off")}
                  onClick={() => setListings(listings.map((x) => x.id === l.id ? { ...x, on: !x.on } : x))}>
                  {l.on ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                </span>
              </div>
            ))}
          </>
        )}

        {/* ── CALENDAR ── */}
        {tab === "calendar" && (
          <>
            <h1 className="page">{t.calendar}</h1>
            <p className="sub">{t.calP}</p>
            <div className="week">
              {DAYS[lang].map((d, i) => (
                <div key={i} className={"day" + (days[i] ? " on" : "")}
                  onClick={() => { const nd = [...days]; nd[i] = !nd[i]; setDays(nd); setSteps((s) => ({ ...s, avail: true })); }}>
                  <span>{d}</span>{13 + i}.07
                </div>
              ))}
            </div>
            {conf.length > 0 && <>
              <h3 className="display" style={{ fontSize: 15, margin: "16px 0 12px" }}>{t.upcoming}</h3>
              {conf.map((b) => <BookingCard key={b.id} b={b} />)}
            </>}
          </>
        )}

        {/* ── PAYOUTS ── */}
        {tab === "payouts" && (
          <>
            <h1 className="page">{t.payouts}</h1>
            <div className="bal">
              <div className="l">{t.balance}</div>
              <div className="v">€546</div>
              <div style={{ fontSize: 12.5, opacity: .75, display: "flex", gap: 7, alignItems: "center" }}>
                <CreditCard size={14} /> {t.nextPay}
              </div>
            </div>
            {!steps.stripe && (
              <div className="warn">
                <div className="wi"><AlertTriangle size={20} /></div>
                <div><h4>{t.warnT}</h4><p>{t.warnP}</p></div>
              </div>
            )}
            <h3 className="display" style={{ fontSize: 15, margin: "18px 0 4px" }}>{t.txT}</h3>
            {[["Niamh D. · 02.07", 400], [t.fee + " · 02.07", -48], ["Ciara M. · 28.06", 220], [t.fee + " · 28.06", -26.4]].map(([l, v], i) => (
              <div className="tx" key={i}>
                <span className={v < 0 ? "neg" : ""}>{l}</span>
                <b className={v < 0 ? "neg" : ""}>{v > 0 ? "+" : "−"}€{Math.abs(v)}</b>
              </div>
            ))}
          </>
        )}

        {/* ── MESSAGES ── */}
        {tab === "messages" && chat === null && (
          <>
            <h1 className="page">{t.messages}</h1>
            <div className="tip" style={{ marginTop: 0 }}>
              <div className="ti"><ShieldCheck size={18} /></div>
              <p>{t.chatBanner}</p>
            </div>
            {chats.map((c) => (
              <div className="msg-item" key={c.id} onClick={() => setChat(c.id)}>
                <div className="ava">{c.n[0]}</div>
                <div><h4>{c.n}</h4><p>{c.msgs[c.msgs.length - 1].t[lang] || c.msgs[c.msgs.length - 1].t.en}</p></div>
                {c.unread && <div className="dot" />}
              </div>
            ))}
          </>
        )}
        {tab === "messages" && chat !== null && (() => {
          const c = chats.find((x) => x.id === chat);
          return (
            <>
              <button className="btn btn-line btn-sm" style={{ margin: "16px 0 4px" }} onClick={() => setChat(null)}>
                <ChevronLeft size={14} /> {t.back}
              </button>
              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div className="ava">{c.n[0]}</div><h3 style={{ fontSize: 16, fontWeight: 800 }}>{c.n}</h3>
              </div>
              <div className="tip" style={{ margin: "14px 0 0" }}>
                <div className="ti"><ShieldCheck size={18} /></div>
                <p>{t.chatBanner}</p>
              </div>
              <div className="thread">
                {c.msgs.map((m, i) => {
                  const k = c.id + "-" + i;
                  const translated = !m.me && m.from && m.from !== lang;
                  return (
                    <div key={i} className={"bub " + (m.me ? "me" : "them")}>
                      {showOrig[k] && m.orig ? m.orig : (m.t[lang] || m.t.en)}
                      {translated && (
                        <div className="trnote" onClick={() => setShowOrig({ ...showOrig, [k]: !showOrig[k] })}>
                          <Globe size={11} /> {showOrig[k] ? t.hideOrig : t.translatedFrom + " " + t["lang_" + m.from] + " · " + t.showOrig}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="composer">
                <input value={draft} placeholder={t.typeMsg} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} />
                <button onClick={send}><Send size={18} /></button>
              </div>
            </>
          );
        })()}

        {/* ── REVIEWS ── */}
        {tab === "reviews" && (
          <>
            <h1 className="page">{t.reviews}</h1>
            <p className="sub">{t.revT}</p>
            {REVIEWS.map((r, i) => (
              <div className="rev" key={i}>
                <div className="rr">{r.n}
                  <span className="stars">{Array.from({ length: r.r }).map((_, j) => <Star key={j} size={12} fill="currentColor" />)}</span>
                </div>
                <p>{r.t[lang]}</p>
              </div>
            ))}
          </>
        )}

        {/* ── PROFILE / SETTINGS ── */}
        {(tab === "profile" || tab === "settings") && (
          <>
            <h1 className="page">{tab === "profile" ? t.profile : t.settings}</h1>
            <label>{t.name}</label><input className="f" defaultValue="Elena Petrova" />
            <label>{t.cat}</label>
            <select className="f" defaultValue="chef">
              <option value="chef">{t.chef}</option><option value="clean">{t.clean}</option><option value="handy">{t.handy}</option>
              <option value="massage">{t.catMassage}</option><option value="beauty">{t.catBeauty}</option>
              <option value="events">{t.catEvents}</option><option value="other">{t.catOther}</option>
            </select>
            <label>{t.city}</label><input className="f" defaultValue="Galway" />
            <label>{t.radius}</label><input className="f" type="number" defaultValue={30} />
            <button className="btn btn-green" style={{ marginTop: 20 }}>{t.save}</button>
          </>
        )}
      </div>

      {/* ── DRAWER ── */}
      {menu && (
        <>
          <div className="ovl" onClick={() => setMenu(false)} />
          <div className="drawer">
            <div className="dr-head">
              <h3><ChefHatSafe /> {t.menu}</h3>
              <button className="btn btn-line btn-sm" onClick={() => setMenu(false)}><X size={16} /></button>
            </div>
            {menuItems.map(([k, l, I]) => (
              <button key={k} className={"mi" + (tab === k ? " on" : "")} onClick={() => openTab(k)}>
                <I size={19} strokeWidth={1.8} /> {l}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav><div className="navrow">
        {[["overview", t.overview, LayoutGrid], ["calendar", t.calendar, CalIcon], ["payouts", t.payouts, Wallet],
          ["bookings", t.bookings, ClipboardCheck], ["messages", t.messages, MessageCircle]].map(([k, l, I]) => (
          <button key={k} className={"ni" + (tab === k ? " on" : "")} onClick={() => openTab(k)}>
            <I size={20} strokeWidth={1.9} />{l}
          </button>
        ))}
        <button className={"ni" + (menu ? " on" : "")} onClick={() => setMenu(true)}>
          <MoreHorizontal size={20} />{t.more}
        </button>
      </div></nav>
    </div>
  );
}

/* small inline logo icon for the drawer header */
function ChefHatSafe() {
  return <Rocket size={18} />;
}
