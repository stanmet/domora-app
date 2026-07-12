import React, { useState, useMemo } from "react";
import {
  ChefHat, Sparkles, Wrench, Star, MapPin, ShieldCheck, MessageCircle,
  Calendar, ArrowRight, ArrowLeft, Check, CreditCard, Globe, Lightbulb, Users, Ruler, Clock,
  Search, Heart, SlidersHorizontal, Home as HomeIcon, ClipboardList, UserRound, Flower2, Scissors, PartyPopper
} from "lucide-react";

/* ─────────────────────────  DESIGN TOKENS  ─────────────────────────
   Palette from the client's references:
   ink #141414 · paper #FFFFFF · sage #EFF4EA · green #4C7C3F
   beige-bg #F5EEDF · beige #A98F5F · orange #EA5B13
──────────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;800;900&family=Inter:wght@400;500;600;700&display=swap');

:root{
  --ink:#141414; --muted:#6b6b6b; --paper:#ffffff;
  --sage:#EFF4EA; --green:#4C7C3F; --green-dark:#3d6533;
  --beige-bg:#F5EEDF; --beige:#A98F5F;
  --orange:#EA5B13; --line:#e7e7e2;
}
*{box-sizing:border-box;margin:0;padding:0}
.dm{background:var(--paper);color:var(--ink);font-family:'Inter',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
.dm .wrap{max-width:1040px;margin:0 auto;padding:0 20px}

/* type */
.dm .display{font-family:'Archivo',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;line-height:.98}
.dm .eyebrow{font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
.dm .eyebrow b{color:var(--orange)}

/* header */
.dm header{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);z-index:20}
.dm .hd{display:flex;align-items:center;justify-content:space-between;height:60px}
.dm .logo{font-family:'Archivo',sans-serif;font-weight:900;font-size:19px;letter-spacing:.02em;cursor:pointer;text-transform:uppercase}
.dm .logo span{color:var(--green)}
.dm .hd-right{display:flex;gap:10px;align-items:center}
.dm .lang{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#fff}
.dm .lang:hover{border-color:var(--ink)}
.dm .langwrap{position:relative}
.dm .langmenu{position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid var(--line);border-radius:14px;padding:6px;z-index:60;box-shadow:0 10px 26px rgba(0,0,0,.10);min-width:150px}
.dm .langmenu button{display:flex;width:100%;gap:8px;align-items:center;padding:9px 12px;border:none;background:none;border-radius:9px;font-family:'Inter';font-size:13px;font-weight:600;cursor:pointer;color:var(--ink);text-align:left}
.dm .langmenu button.on{background:var(--sage);color:var(--green-dark);font-weight:700}

/* buttons */
.dm .btn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:999px;padding:13px 22px;font-family:'Inter';font-size:14px;font-weight:700;cursor:pointer;transition:transform .12s ease,background .12s ease}
.dm .btn:active{transform:scale(.98)}
.dm .btn-ink{background:var(--ink);color:#fff}
.dm .btn-ink:hover{background:#000}
.dm .btn-green{background:var(--green);color:#fff}
.dm .btn-green:hover{background:var(--green-dark)}
.dm .btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.dm .btn-ghost:hover{background:var(--sage)}
.dm .btn-sm{padding:9px 16px;font-size:13px}

/* hero */
.dm .hero{padding-top:44px;padding-bottom:40px;border-bottom:1px solid var(--line)}
.dm .hero h1{font-size:clamp(30px,8.5vw,68px);margin:12px 0 18px;line-height:1.03}
.dm .hero h1 em{font-style:normal;color:var(--orange)}
.dm .hero p{font-size:17px;line-height:1.55;color:var(--muted);max-width:560px;margin-bottom:28px}
.dm .hero .cta{display:flex;gap:12px;flex-wrap:wrap}

/* category cards — signature: sage icon circles, thin connector line */
.dm .cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;padding-top:44px;padding-bottom:44px}
.dm .cat{border:1px solid var(--line);border-radius:18px;padding:26px 22px;cursor:pointer;transition:border-color .15s,transform .15s;background:#fff;position:relative;overflow:hidden}
.dm .cat:hover{border-color:var(--green);transform:translateY(-2px)}
.dm .icircle{width:58px;height:58px;border-radius:50%;background:var(--sage);display:flex;align-items:center;justify-content:center;color:var(--green);margin-bottom:16px}
.dm .cat h3{font-family:'Archivo';font-weight:800;font-size:19px;text-transform:uppercase;letter-spacing:.01em;margin-bottom:6px}
.dm .cat p{font-size:13.5px;color:var(--muted);line-height:1.5;margin-bottom:14px}
.dm .cat .go{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--green)}
.dm .cat .n{position:absolute;top:18px;right:20px;font-family:'Archivo';font-weight:900;font-size:13px;color:#d8d8d2}

/* steps — circled numbers like the reference */
.dm .steps{padding-top:48px;padding-bottom:48px;border-top:1px solid var(--line)}
.dm .steps h2,.dm .sec h2{font-family:'Archivo';font-weight:900;font-size:clamp(24px,4vw,34px);text-transform:uppercase;margin:10px 0 30px}
.dm .steplist{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
.dm .step .num{width:34px;height:34px;border:2px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;margin-bottom:12px}
.dm .step h4{font-size:15px;font-weight:700;margin-bottom:6px}
.dm .step p{font-size:13.5px;color:var(--muted);line-height:1.5}

/* beige tip card */
.dm .tip{background:var(--beige-bg);border-radius:16px;padding:20px 22px;display:flex;gap:14px;align-items:flex-start;margin:36px 0}
.dm .tip .ti{width:42px;height:42px;border-radius:50%;background:var(--beige);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dm .tip p{font-size:14.5px;line-height:1.55}
.dm .tip b{font-weight:800}
.dm .tip i{font-style:normal;color:var(--beige)}

/* trust row */
.dm .trust{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;padding-top:8px;padding-bottom:56px}
.dm .titem{display:flex;gap:12px;align-items:flex-start}
.dm .titem .icircle{width:44px;height:44px;margin:0;flex-shrink:0}
.dm .titem h5{font-size:14px;font-weight:700;margin-bottom:3px}
.dm .titem p{font-size:12.5px;color:var(--muted);line-height:1.45}

/* catalog */
.dm .sec{padding-top:36px;padding-bottom:64px}
.dm .chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px}
.dm .chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer}
.dm .chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.dm .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.dm .pcard{border:1px solid var(--line);border-radius:18px;padding:22px;cursor:pointer;transition:border-color .15s,transform .15s;background:#fff}
.dm .pcard:hover{border-color:var(--green);transform:translateY(-2px)}
.dm .prow{display:flex;gap:14px;align-items:center;margin-bottom:14px}
.dm .avatar{width:52px;height:52px;border-radius:50%;background:var(--sage);color:var(--green);display:flex;align-items:center;justify-content:center;font-family:'Archivo';font-weight:900;font-size:18px;flex-shrink:0}
.dm .pname{font-weight:700;font-size:15.5px}
.dm .pmeta{display:flex;gap:10px;font-size:12.5px;color:var(--muted);margin-top:3px;align-items:center}
.dm .rate{display:inline-flex;align-items:center;gap:4px;color:var(--ink);font-weight:600}
.dm .rate svg{color:var(--orange)}
.dm .tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.dm .tag{background:var(--sage);color:var(--green-dark);font-size:11.5px;font-weight:600;border-radius:999px;padding:4px 10px}
.dm .price{font-size:13.5px;color:var(--muted)}
.dm .price b{font-family:'Archivo';font-weight:800;font-size:17px;color:var(--ink)}

/* profile */
.dm .back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--muted);cursor:pointer;background:none;border:none;margin:22px 0 6px;font-family:'Inter'}
.dm .back:hover{color:var(--ink)}
.dm .phead{display:flex;gap:20px;align-items:center;padding:14px 0 24px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.dm .avatar.big{width:84px;height:84px;font-size:28px}
.dm .phead h1{font-family:'Archivo';font-weight:900;font-size:clamp(24px,4vw,36px);text-transform:uppercase}
.dm .verified{display:inline-flex;align-items:center;gap:5px;background:var(--sage);color:var(--green-dark);font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 10px}
.dm .cols{display:grid;grid-template-columns:1.6fr 1fr;gap:36px;padding:28px 0 64px}
@media(max-width:760px){.dm .cols{grid-template-columns:1fr}}
.dm .svc{display:flex;justify-content:space-between;gap:14px;padding:16px 0;border-bottom:1px solid var(--line);align-items:baseline}
.dm .svc h4{font-size:15px;font-weight:700;margin-bottom:4px}
.dm .svc p{font-size:13px;color:var(--muted);line-height:1.5}
.dm .svc .pr{font-family:'Archivo';font-weight:800;font-size:16px;white-space:nowrap}
.dm .svc .pr span{font-family:'Inter';font-weight:500;font-size:12px;color:var(--muted)}
.dm .review{padding:16px 0;border-bottom:1px solid var(--line)}
.dm .review .rr{display:flex;gap:8px;align-items:center;margin-bottom:6px;font-size:13.5px;font-weight:700}
.dm .review p{font-size:13.5px;color:var(--muted);line-height:1.55}
.dm .stars{display:flex;gap:2px;color:var(--orange)}
.dm .side{border:1px solid var(--line);border-radius:18px;padding:24px;height:fit-content;position:sticky;top:80px}
.dm .side .from{font-size:13px;color:var(--muted);margin-bottom:4px}
.dm .side .amt{font-family:'Archivo';font-weight:900;font-size:30px;margin-bottom:16px}
.dm .side .amt span{font-family:'Inter';font-weight:500;font-size:13px;color:var(--muted)}
.dm .side .note{display:flex;gap:8px;font-size:12px;color:var(--muted);line-height:1.5;margin-top:14px}
.dm .side .note svg{flex-shrink:0;color:var(--green);margin-top:1px}

/* booking */
.dm .bform{max-width:560px;margin:0 auto;padding-top:28px;padding-bottom:64px}
.dm .bform h1{font-family:'Archivo';font-weight:900;font-size:clamp(24px,5vw,34px);text-transform:uppercase;margin-bottom:6px}
.dm .bform .sub{font-size:14px;color:var(--muted);margin-bottom:28px}
.dm label{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:18px 0 7px}
.dm input,.dm textarea,.dm select{width:100%;border:1px solid var(--line);border-radius:12px;padding:13px 14px;font-size:15px;font-family:'Inter';background:#fff;color:var(--ink)}
.dm input:focus,.dm textarea:focus,.dm select:focus{outline:2px solid var(--green);border-color:var(--green)}
.dm .stepper{display:flex;align-items:center;gap:14px}
.dm .stepper button{width:42px;height:42px;border-radius:50%;border:1px solid var(--ink);background:#fff;font-size:19px;font-weight:700;cursor:pointer}
.dm .stepper .val{font-family:'Archivo';font-weight:800;font-size:20px;min-width:64px;text-align:center}
.dm .brk{background:var(--beige-bg);border-radius:16px;padding:20px 22px;margin:26px 0 18px}
.dm .brk .row{display:flex;justify-content:space-between;font-size:14px;padding:5px 0}
.dm .brk .row.total{border-top:1px solid #e2d7bf;margin-top:8px;padding-top:12px;font-weight:800;font-size:16px}
.dm .hold{display:flex;gap:10px;font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:22px}
.dm .hold svg{flex-shrink:0;color:var(--green);margin-top:2px}

/* success */
.dm .done{max-width:520px;margin:0 auto;text-align:center;padding-top:80px;padding-bottom:80px}
.dm .done .ok{width:84px;height:84px;border-radius:50%;background:var(--sage);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.dm .done h1{font-family:'Archivo';font-weight:900;font-size:30px;text-transform:uppercase;margin-bottom:12px}
.dm .done p{font-size:15px;color:var(--muted);line-height:1.6;margin-bottom:28px}

/* footer */
.dm footer{border-top:1px solid var(--line);padding:28px 0;font-size:12.5px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}

/* search + category tabs */
.dm .search{display:flex;gap:10px;margin:16px 0 4px}
.dm .sbox{flex:1;display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:999px;padding:12px 18px;background:#fff}
.dm .sbox input{border:none;outline:none;flex:1;font-size:15px;font-family:'Inter';background:transparent;color:var(--ink);padding:0}
.dm .fbtn{display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:0 16px;background:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:'Inter'}
.dm .fbtn.on{border-color:var(--ink)}
.dm .citychips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 2px}
.dm .tabs{display:flex;gap:26px;border-bottom:1px solid var(--line);margin:16px 0 22px;overflow-x:auto}
.dm .tab{display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 2px 12px;background:none;border:none;font-family:'Inter';font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap}
.dm .tab.on{color:var(--ink);border-bottom-color:var(--orange);font-weight:700}
/* photo provider cards */
.dm .grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.dm .photo{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:4/3;margin-bottom:12px;display:flex;align-items:center;justify-content:center}
.dm .photo>svg{opacity:.55;color:#fff}
.dm .heart{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.94);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink)}
.dm .heart.on{color:var(--orange)}
.dm .dots{position:absolute;bottom:10px;left:0;right:0;display:flex;gap:5px;justify-content:center}
.dm .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55)}
.dm .dots i:first-child{background:#fff}
.dm .pcard2{cursor:pointer}
.dm .pcard2 .t{font-weight:700;font-size:15px;line-height:1.3}
.dm .pcard2 .m{font-size:12.5px;color:var(--muted);margin:5px 0 4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.dm .pcard2 .pr{font-size:13.5px}
.dm .pcard2 .pr b{font-weight:800}
.dm .count{font-size:13px;color:var(--muted);margin:0 0 18px}
/* client bookings + empty states */
.dm .bk{border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}
.dm .bk h4{font-size:14.5px;font-weight:700}
.dm .bk .meta{font-size:12.5px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}
.dm .bk .meta span{display:inline-flex;align-items:center;gap:4px}
.dm .pill{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 10px;background:#FDEBE0;color:var(--orange);white-space:nowrap}
.dm .empty{padding:48px 16px;text-align:center;color:var(--muted);font-size:14px;line-height:1.6}
/* client bottom nav (mobile) */
.dm .cnav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);z-index:40;display:none}
.dm .cnav .row{max-width:640px;margin:0 auto;display:flex}
.dm .cni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 0 11px;font-size:10px;font-weight:700;color:var(--muted);background:none;border:none;cursor:pointer;font-family:'Inter'}
.dm .cni.on{color:var(--orange)}

/* mobile */
@media(max-width:560px){
  .dm .wrap{padding-left:20px;padding-right:20px}
  .dm .hero{padding-top:28px;padding-bottom:30px}
  .dm .hero p{font-size:15px;margin-bottom:22px}
  .dm .eyebrow{letter-spacing:.15em;font-size:10.5px}
  .dm .cta{flex-direction:column}
  .dm .cta .btn{width:100%;justify-content:center}
  .dm .hd-cta{display:none}
  .dm .cats{padding-top:26px;padding-bottom:26px;gap:12px}
  .dm .cat{padding:22px 20px}
  .dm .steps{padding-top:34px;padding-bottom:34px}
  .dm .sec{padding-top:24px;padding-bottom:48px}
  .dm .side{position:static}
  .dm .tip{padding:16px}
  .dm .done{padding-top:56px;padding-bottom:56px}
  .dm{padding-bottom:76px}
  .dm .cnav{display:block}
  .dm .grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .dm .pcard2 .t{font-size:13.5px}
  .dm .photo{aspect-ratio:1/1;border-radius:14px}
  .dm .tabs{gap:18px}
  footer{margin-bottom:8px}
}
`;

/* ─────────────────────────  I18N  ───────────────────────── */

const T = {
  en: {
    tagline: "HOME SERVICES · IRELAND",
    h1a: "A WELL-RUN HOME", h1b: "IS A SCIENCE",
    heroP: "Verified chefs, cleaners and handymen near you. Clear prices, secure card payment. You're only charged when your pro accepts the job.",
    findPro: "Find a pro", becomePro: "Become a pro",
    catChef: "Private chef", catChefP: "Dinner parties, weekly meal prep, tasting menus, cooked in your kitchen.",
    catClean: "Cleaning", catCleanP: "Homes and offices, windows, facades and outdoor areas. One-off or regular.",
    catHandy: "Handyman", catHandyP: "Small repairs, assembly, fittings. Quote-first for tricky jobs.",
    catMassage: "Massage", catMassageP: "Certified therapists at your home. Swedish, sports, deep tissue. Table and oils included.",
    catBeauty: "Beauty at home", catBeautyP: "Hair cuts and colour, nails, makeup. Salon quality without the salon trip.",
    catEvents: "Events & parties", catEventsP: "DJs, musicians, waiters, entertainers, valets. Pros describe their own service, you pick the one that fits.",
    browse: "Browse",
    howTitle: "How it works",
    s1: "Pick your pro", s1p: "Compare profiles, prices and reviews in your area.",
    s2: "Send a request", s2p: "Choose date and details. A hold is placed on your card. Nothing is charged yet.",
    s3: "Pro accepts", s3p: "Only then is your card charged. Declined? The hold is released.",
    s4: "Job done, review", s4p: "Payment goes to the pro. You leave a review after a real job only.",
    tipB: "Remember:", tipP: "your card is only charged once the pro accepts. Until then it costs nothing to ask.",
    t1: "Identity checked", t1p: "Every pro passes ID verification before going live.",
    t2: "Secure payments", t2p: "Cards processed by Stripe. No cash, no risk.",
    t3: "In-app chat", t3p: "Agree the details before you pay a cent.",
    t4: "Real reviews", t4p: "Only from completed, paid bookings.",
    catalogTitle: "Pros near you", all: "All",
    from: "from", perGuest: "guest", perM2: "m²", perHour: "hour", perSession: "session", perEvent: "event",
    jobs: "jobs", back: "Back",
    services: "Services & prices", reviews: "Reviews",
    request: "Request booking", sideFrom: "Starting price",
    sideNote: "Free to ask. You're charged only when the pro accepts.",
    bTitle: "Request booking", bSub: "with",
    date: "Date", time: "Time", addr: "Address", addrPh: "Street, city, Eircode",
    msg: "Message to the pro (optional)", msgPh: "Dietary needs, access notes, anything useful…",
    guests: "Guests", area: "Area, m²", hours: "Hours", sessions: "Sessions", events: "Events",
    service: "Service", fee: "Service fee (12%)", total: "Total",
    holdNote: "This amount is held on your card, not charged. You pay only when the pro accepts. If they decline or don't respond within 7 days, the hold is released automatically.",
    confirm: "Place hold & send request",
    doneT: "Request sent", doneP: "We've placed a hold on your card and notified your pro. You'll get an answer in the app. Most pros reply within a few hours. Nothing is charged until they accept.",
    toHome: "Back to home",
    footer: "Domora · Prototype · Dublin, Ireland",
    verified: "ID verified",
    searchPh: "Search chefs, cleaners, handymen",
    filters: "Filters", results: "results", fromCap: "From",
    navHome: "Home", navSearch: "Search", navSaved: "Saved", navBook: "Bookings", navProf: "Profile",
    savedT: "Saved", savedEmpty: "Nothing saved yet. Tap the heart on any pro's card.",
    mybT: "My bookings", mybEmpty: "No bookings yet. Your requests will appear here.",
    pending: "Awaiting confirmation",
    upT: "Profile", nameL: "Name", emailL: "Email", phoneL: "Phone", saveBtn: "Save",
    cityAll: "All cities",
    chatSafe: "Chat and pay only inside Domora. On-platform messages and payments protect your money and serve as evidence in a dispute.",
  },
  ru: {
    tagline: "СЕРВИС ДЛЯ ДОМА · ИРЛАНДИЯ",
    h1a: "БЫТ ЛЮБИТ", h1b: "ТОЧНОСТЬ",
    heroP: "Проверенные повара, клинеры и мастера рядом с вами. Прозрачные цены, безопасная оплата картой: деньги списываются только после подтверждения заказа.",
    findPro: "Найти исполнителя", becomePro: "Стать исполнителем",
    catChef: "Повар на дом", catChefP: "Ужины, meal prep на неделю, дегустационные меню на вашей кухне.",
    catClean: "Уборка", catCleanP: "Дом и офис, окна, фасады, придомовая территория. Разово или регулярно.",
    catHandy: "Мастер на час", catHandyP: "Мелкий ремонт, сборка, установка. Для сложных задач сначала бесплатный осмотр и смета.",
    catMassage: "Массаж", catMassageP: "Сертифицированные массажисты у вас дома. Классический, спортивный, глубокий. Стол и масла включены.",
    catBeauty: "Красота на дому", catBeautyP: "Стрижки и окрашивание, маникюр, макияж. Салонное качество без поездки в салон.",
    catEvents: "Праздники и события", catEventsP: "Диджеи, музыканты, официанты, аниматоры, парковщики. Исполнители сами описывают свою услугу, вы выбираете подходящую.",
    browse: "Смотреть",
    howTitle: "Как это работает",
    s1: "Выберите исполнителя", s1p: "Сравните профили, цены и отзывы рядом с вами.",
    s2: "Отправьте запрос", s2p: "Дата и детали. На карте только холд, деньги не списываются.",
    s3: "Исполнитель подтверждает", s3p: "Только тогда происходит списание. Если откажет, холд снимется.",
    s4: "Работа и отзыв", s4p: "Оплата уходит исполнителю. Отзыв только после реального заказа.",
    tipB: "Запомните:", tipP: "деньги списываются только когда исполнитель принял заказ. До этого запрос не стоит ничего.",
    t1: "Проверка личности", t1p: "Каждый исполнитель проходит верификацию до публикации.",
    t2: "Безопасная оплата", t2p: "Карты обрабатывает Stripe. Без наличных и рисков.",
    t3: "Чат внутри платформы", t3p: "Обсудите детали до оплаты.",
    t4: "Честные отзывы", t4p: "Только после завершённых оплаченных заказов.",
    catalogTitle: "Исполнители рядом", all: "Все",
    from: "от", perGuest: "гость", perM2: "м²", perHour: "час", perSession: "сеанс", perEvent: "мероприятие",
    jobs: "заказов", back: "Назад",
    services: "Услуги и цены", reviews: "Отзывы",
    request: "Запросить бронь", sideFrom: "Стартовая цена",
    sideNote: "Запрос бесплатен. Списание только после подтверждения исполнителем.",
    bTitle: "Запрос брони", bSub: "исполнитель:",
    date: "Дата", time: "Время", addr: "Адрес", addrPh: "Улица, город, Eircode",
    msg: "Сообщение исполнителю (необязательно)", msgPh: "Аллергии, доступ в помещение, любые детали…",
    guests: "Гостей", area: "Площадь, м²", hours: "Часов", sessions: "Сеансов", events: "Мероприятий",
    service: "Услуга", fee: "Сервисный сбор (12%)", total: "Итого",
    holdNote: "Эта сумма замораживается на карте, но не списывается. Оплата произойдёт, только когда исполнитель примет заказ. Если он откажет или не ответит за 7 дней, холд снимется автоматически.",
    confirm: "Заморозить сумму и отправить",
    doneT: "Запрос отправлен", doneP: "Мы заморозили сумму на карте и уведомили исполнителя. Ответ придёт в приложение, обычно в течение пары часов. До подтверждения ничего не списывается.",
    toHome: "На главную",
    footer: "Domora · Прототип · Дублин, Ирландия",
    verified: "Личность проверена",
    searchPh: "Повара, клинеры, мастера",
    filters: "Фильтры", results: "результатов", fromCap: "От",
    navHome: "Главная", navSearch: "Поиск", navSaved: "Избранное", navBook: "Заказы", navProf: "Профиль",
    savedT: "Избранное", savedEmpty: "Пока пусто. Нажмите на сердечко в карточке исполнителя.",
    mybT: "Мои заказы", mybEmpty: "Заказов пока нет. Ваши запросы появятся здесь.",
    pending: "Ждёт подтверждения",
    upT: "Профиль", nameL: "Имя", emailL: "Email", phoneL: "Телефон", saveBtn: "Сохранить",
    cityAll: "Все города",
    chatSafe: "Общайтесь и платите только внутри Domora. Переписка и платежи в платформе защищают ваши деньги и служат доказательством при споре.",
  },
  uk: {
    tagline: "СЕРВІС ДЛЯ ДОМУ · ІРЛАНДІЯ",
    h1a: "ПОБУТ ЛЮБИТЬ", h1b: "ТОЧНІСТЬ",
    heroP: "Перевірені кухарі, клінери та майстри поруч із вами. Прозорі ціни, безпечна оплата карткою: гроші списуються лише після підтвердження замовлення.",
    findPro: "Знайти виконавця", becomePro: "Стати виконавцем",
    catChef: "Кухар додому", catChefP: "Вечері, meal prep на тиждень, дегустаційні меню на вашій кухні.",
    catClean: "Прибирання", catCleanP: "Дім і офіс, вікна, фасади, прибудинкова територія. Разово або регулярно.",
    catHandy: "Майстер на годину", catHandyP: "Дрібний ремонт, збирання, встановлення. Для складних задач спершу безкоштовний огляд і кошторис.",
    catMassage: "Масаж", catMassageP: "Сертифіковані масажисти у вас удома. Класичний, спортивний, глибокий. Стіл та олії включено.",
    catBeauty: "Краса вдома", catBeautyP: "Стрижки та фарбування, манікюр, макіяж. Салонна якість без поїздки в салон.",
    catEvents: "Свята та події", catEventsP: "Діджеї, музиканти, офіціанти, аніматори, паркувальники. Виконавці самі описують свою послугу, ви обираєте підходящу.",
    browse: "Дивитися",
    howTitle: "Як це працює",
    s1: "Оберіть виконавця", s1p: "Порівняйте профілі, ціни та відгуки поруч із вами.",
    s2: "Надішліть запит", s2p: "Дата й деталі. На картці лише холд, гроші не списуються.",
    s3: "Виконавець підтверджує", s3p: "Лише тоді відбувається списання. Якщо відмовить, холд знімається.",
    s4: "Робота та відгук", s4p: "Оплата йде виконавцю. Відгук лише після реального замовлення.",
    tipB: "Запам'ятайте:", tipP: "гроші списуються лише коли виконавець прийняв замовлення. До цього запит не коштує нічого.",
    t1: "Перевірка особи", t1p: "Кожен виконавець проходить верифікацію до публікації.",
    t2: "Безпечна оплата", t2p: "Картки обробляє Stripe. Без готівки та ризиків.",
    t3: "Чат у платформі", t3p: "Обговоріть деталі до оплати.",
    t4: "Чесні відгуки", t4p: "Лише після завершених оплачених замовлень.",
    catalogTitle: "Виконавці поруч", all: "Усі",
    from: "від", perGuest: "гість", perM2: "м²", perHour: "година", perSession: "сеанс", perEvent: "подія",
    jobs: "замовлень", back: "Назад",
    services: "Послуги та ціни", reviews: "Відгуки",
    request: "Запросити бронь", sideFrom: "Стартова ціна",
    sideNote: "Запит безкоштовний. Списання лише після підтвердження виконавцем.",
    bTitle: "Запит броні", bSub: "виконавець:",
    date: "Дата", time: "Час", addr: "Адреса", addrPh: "Вулиця, місто, Eircode",
    msg: "Повідомлення виконавцю (необов'язково)", msgPh: "Алергії, доступ до приміщення, будь-які деталі",
    guests: "Гостей", area: "Площа, м²", hours: "Годин", sessions: "Сеансів", events: "Подій",
    service: "Послуга", fee: "Сервісний збір (12%)", total: "Разом",
    holdNote: "Ця сума заморожується на картці, але не списується. Оплата відбудеться, лише коли виконавець прийме замовлення. Якщо він відмовить або не відповість за 7 днів, холд зніметься автоматично.",
    confirm: "Заморозити суму та надіслати",
    doneT: "Запит надіслано", doneP: "Ми заморозили суму на картці та повідомили виконавця. Відповідь прийде в застосунок, зазвичай протягом кількох годин. До підтвердження нічого не списується.",
    toHome: "На головну",
    footer: "Domora · Прототип · Дублін, Ірландія",
    verified: "Особу перевірено",
    searchPh: "Кухарі, клінери, майстри", filters: "Фільтри", results: "результатів", fromCap: "Від",
    navHome: "Головна", navSearch: "Пошук", navSaved: "Обране", navBook: "Замовлення", navProf: "Профіль",
    savedT: "Обране", savedEmpty: "Поки порожньо. Натисніть на сердечко в картці виконавця.",
    mybT: "Мої замовлення", mybEmpty: "Замовлень поки немає. Ваші запити з'являться тут.",
    pending: "Чекає підтвердження",
    upT: "Профіль", nameL: "Ім'я", emailL: "Email", phoneL: "Телефон", saveBtn: "Зберегти",
    cityAll: "Усі міста",
    chatSafe: "Спілкуйтеся та платіть лише всередині Domora. Листування й платежі в платформі захищають ваші гроші та є доказом у разі спору.",
  },
  pl: {
    tagline: "USŁUGI DLA DOMU · IRLANDIA",
    h1a: "DOM LUBI", h1b: "PRECYZJĘ",
    heroP: "Sprawdzeni kucharze, ekipy sprzątające i złote rączki w Twojej okolicy. Przejrzyste ceny, bezpieczna płatność kartą: pieniądze są pobierane dopiero po potwierdzeniu zlecenia.",
    findPro: "Znajdź wykonawcę", becomePro: "Zostań wykonawcą",
    catChef: "Kucharz w domu", catChefP: "Kolacje, meal prep na tydzień, menu degustacyjne w Twojej kuchni.",
    catClean: "Sprzątanie", catCleanP: "Dom i biuro, okna, elewacje, teren wokół domu. Jednorazowo lub regularnie.",
    catHandy: "Złota rączka", catHandyP: "Drobne naprawy, montaż, instalacje. Przy trudnych zadaniach najpierw bezpłatne oględziny i wycena.",
    catMassage: "Masaż", catMassageP: "Certyfikowani masażyści u Ciebie w domu. Klasyczny, sportowy, głęboki. Stół i olejki w cenie.",
    catBeauty: "Uroda w domu", catBeautyP: "Strzyżenie i koloryzacja, paznokcie, makijaż. Salonowa jakość bez wychodzenia z domu.",
    catEvents: "Imprezy i wydarzenia", catEventsP: "DJ-e, muzycy, kelnerzy, animatorzy, parkingowi. Wykonawcy sami opisują swoją usługę, Ty wybierasz.",
    browse: "Zobacz",
    howTitle: "Jak to działa",
    s1: "Wybierz wykonawcę", s1p: "Porównaj profile, ceny i opinie w Twojej okolicy.",
    s2: "Wyślij zapytanie", s2p: "Data i szczegóły. Na karcie tylko blokada, pieniądze nie są pobierane.",
    s3: "Wykonawca potwierdza", s3p: "Dopiero wtedy następuje płatność. Jeśli odmówi, blokada zostaje zdjęta.",
    s4: "Praca i opinia", s4p: "Zapłata trafia do wykonawcy. Opinia tylko po prawdziwym zleceniu.",
    tipB: "Pamiętaj:", tipP: "pieniądze są pobierane dopiero, gdy wykonawca przyjmie zlecenie. Do tego momentu zapytanie nic nie kosztuje.",
    t1: "Weryfikacja tożsamości", t1p: "Każdy wykonawca przechodzi weryfikację przed publikacją.",
    t2: "Bezpieczne płatności", t2p: "Karty obsługuje Stripe. Bez gotówki i ryzyka.",
    t3: "Czat w platformie", t3p: "Ustal szczegóły przed zapłatą.",
    t4: "Prawdziwe opinie", t4p: "Tylko po zakończonych, opłaconych zleceniach.",
    catalogTitle: "Wykonawcy w pobliżu", all: "Wszyscy",
    from: "od", perGuest: "gość", perM2: "m²", perHour: "godzina", perSession: "sesja", perEvent: "wydarzenie",
    jobs: "zleceń", back: "Wstecz",
    services: "Usługi i ceny", reviews: "Opinie",
    request: "Poproś o rezerwację", sideFrom: "Cena od",
    sideNote: "Zapytanie jest bezpłatne. Płatność dopiero po potwierdzeniu przez wykonawcę.",
    bTitle: "Zapytanie o rezerwację", bSub: "wykonawca:",
    date: "Data", time: "Godzina", addr: "Adres", addrPh: "Ulica, miasto, Eircode",
    msg: "Wiadomość do wykonawcy (opcjonalnie)", msgPh: "Alergie, dostęp do lokalu, przydatne szczegóły",
    guests: "Gości", area: "Powierzchnia, m²", hours: "Godzin", sessions: "Sesji", events: "Wydarzeń",
    service: "Usługa", fee: "Opłata serwisowa (12%)", total: "Razem",
    holdNote: "Ta kwota jest blokowana na karcie, ale nie pobierana. Płatność nastąpi dopiero, gdy wykonawca przyjmie zlecenie. Jeśli odmówi lub nie odpowie w ciągu 7 dni, blokada zostanie zdjęta automatycznie.",
    confirm: "Zablokuj kwotę i wyślij",
    doneT: "Zapytanie wysłane", doneP: "Zablokowaliśmy kwotę na karcie i powiadomiliśmy wykonawcę. Odpowiedź przyjdzie w aplikacji, zwykle w ciągu kilku godzin. Do potwierdzenia nic nie jest pobierane.",
    toHome: "Strona główna",
    footer: "Domora · Prototyp · Dublin, Irlandia",
    verified: "Tożsamość zweryfikowana",
    searchPh: "Kucharze, sprzątanie, złote rączki", filters: "Filtry", results: "wyników", fromCap: "Od",
    navHome: "Start", navSearch: "Szukaj", navSaved: "Zapisane", navBook: "Zlecenia", navProf: "Profil",
    savedT: "Zapisane", savedEmpty: "Na razie pusto. Kliknij serduszko na karcie wykonawcy.",
    mybT: "Moje zlecenia", mybEmpty: "Brak zleceń. Twoje zapytania pojawią się tutaj.",
    pending: "Oczekuje na potwierdzenie",
    upT: "Profil", nameL: "Imię", emailL: "Email", phoneL: "Telefon", saveBtn: "Zapisz",
    cityAll: "Wszystkie miasta",
    chatSafe: "Rozmawiaj i płać tylko w Domora. Wiadomości i płatności w platformie chronią Twoje pieniądze i są dowodem w razie sporu.",
  },
  es: {
    tagline: "SERVICIOS PARA EL HOGAR · IRLANDA",
    h1a: "TU HOGAR AMA", h1b: "LA PRECISIÓN",
    heroP: "Chefs, limpiadores y técnicos verificados cerca de ti. Precios claros y pago seguro con tarjeta: el cobro se realiza solo cuando el profesional confirma el trabajo.",
    findPro: "Buscar profesional", becomePro: "Hazte profesional",
    catChef: "Chef a domicilio", catChefP: "Cenas, meal prep semanal y menús degustación en tu cocina.",
    catClean: "Limpieza", catCleanP: "Casa y oficina, ventanas, fachadas y zonas exteriores. Puntual o regular.",
    catHandy: "Manitas", catHandyP: "Pequeñas reparaciones, montaje, instalaciones. Para trabajos complejos, primero visita y presupuesto gratis.",
    catMassage: "Masaje", catMassageP: "Masajistas certificados en tu casa. Sueco, deportivo, tejido profundo. Camilla y aceites incluidos.",
    catBeauty: "Belleza a domicilio", catBeautyP: "Cortes y color, uñas, maquillaje. Calidad de salón sin salir de casa.",
    catEvents: "Fiestas y eventos", catEventsP: "DJs, músicos, camareros, animadores, aparcacoches. Cada profesional describe su servicio y tú eliges.",
    browse: "Ver",
    howTitle: "Cómo funciona",
    s1: "Elige al profesional", s1p: "Compara perfiles, precios y reseñas en tu zona.",
    s2: "Envía la solicitud", s2p: "Fecha y detalles. Solo se retiene el importe, no se cobra.",
    s3: "El profesional confirma", s3p: "Solo entonces se realiza el cobro. Si rechaza, la retención se libera.",
    s4: "Trabajo y reseña", s4p: "El pago va al profesional. Reseñas solo tras un trabajo real.",
    tipB: "Recuerda:", tipP: "el cobro se realiza solo cuando el profesional acepta. Hasta entonces, pedir no cuesta nada.",
    t1: "Identidad verificada", t1p: "Cada profesional pasa una verificación antes de publicarse.",
    t2: "Pagos seguros", t2p: "Las tarjetas las procesa Stripe. Sin efectivo ni riesgos.",
    t3: "Chat en la plataforma", t3p: "Acuerda los detalles antes de pagar.",
    t4: "Reseñas reales", t4p: "Solo de trabajos completados y pagados.",
    catalogTitle: "Profesionales cerca de ti", all: "Todos",
    from: "desde", perGuest: "invitado", perM2: "m²", perHour: "hora", perSession: "sesión", perEvent: "evento",
    jobs: "trabajos", back: "Atrás",
    services: "Servicios y precios", reviews: "Reseñas",
    request: "Solicitar reserva", sideFrom: "Precio inicial",
    sideNote: "Solicitar es gratis. El cobro se realiza solo cuando el profesional confirma.",
    bTitle: "Solicitud de reserva", bSub: "profesional:",
    date: "Fecha", time: "Hora", addr: "Dirección", addrPh: "Calle, ciudad, Eircode",
    msg: "Mensaje al profesional (opcional)", msgPh: "Alergias, acceso al lugar, cualquier detalle útil",
    guests: "Invitados", area: "Superficie, m²", hours: "Horas", sessions: "Sesiones", events: "Eventos",
    service: "Servicio", fee: "Tarifa de servicio (12%)", total: "Total",
    holdNote: "Este importe se retiene en tu tarjeta, no se cobra. El pago se realiza solo cuando el profesional acepta. Si rechaza o no responde en 7 días, la retención se libera automáticamente.",
    confirm: "Retener importe y enviar",
    doneT: "Solicitud enviada", doneP: "Hemos retenido el importe en tu tarjeta y avisado al profesional. Recibirás la respuesta en la app, normalmente en unas horas. No se cobra nada hasta la confirmación.",
    toHome: "Inicio",
    footer: "Domora · Prototipo · Dublín, Irlanda",
    verified: "Identidad verificada",
    searchPh: "Chefs, limpieza, manitas", filters: "Filtros", results: "resultados", fromCap: "Desde",
    navHome: "Inicio", navSearch: "Buscar", navSaved: "Guardados", navBook: "Reservas", navProf: "Perfil",
    savedT: "Guardados", savedEmpty: "Aún no hay nada. Toca el corazón en la tarjeta de un profesional.",
    mybT: "Mis reservas", mybEmpty: "Aún no hay reservas. Tus solicitudes aparecerán aquí.",
    pending: "Pendiente de confirmación",
    upT: "Perfil", nameL: "Nombre", emailL: "Email", phoneL: "Teléfono", saveBtn: "Guardar",
    cityAll: "Todas las ciudades",
    chatSafe: "Habla y paga solo dentro de Domora. Los mensajes y pagos en la plataforma protegen tu dinero y sirven como prueba en caso de disputa.",
  },
  pt: {
    tagline: "SERVIÇOS PARA CASA · IRLANDA",
    h1a: "A SUA CASA AMA", h1b: "A PRECISÃO",
    heroP: "Chefs, equipas de limpeza e técnicos verificados perto de si. Preços claros e pagamento seguro com cartão: o valor só é cobrado quando o profissional confirma o trabalho.",
    findPro: "Encontrar profissional", becomePro: "Tornar-se profissional",
    catChef: "Chef ao domicílio", catChefP: "Jantares, meal prep semanal e menus de degustação na sua cozinha.",
    catClean: "Limpeza", catCleanP: "Casa e escritório, janelas, fachadas e áreas exteriores. Pontual ou regular.",
    catHandy: "Faz-tudo", catHandyP: "Pequenas reparações, montagem, instalações. Para trabalhos complexos, primeiro visita e orçamento grátis.",
    catMassage: "Massagem", catMassageP: "Massagistas certificados em sua casa. Clássica, desportiva, tecidos profundos. Marquesa e óleos incluídos.",
    catBeauty: "Beleza ao domicílio", catBeautyP: "Cortes e coloração, unhas, maquilhagem. Qualidade de salão sem sair de casa.",
    catEvents: "Festas e eventos", catEventsP: "DJs, músicos, empregados de mesa, animadores, arrumadores. Cada profissional descreve o seu serviço e você escolhe.",
    browse: "Ver",
    howTitle: "Como funciona",
    s1: "Escolha o profissional", s1p: "Compare perfis, preços e avaliações na sua zona.",
    s2: "Envie o pedido", s2p: "Data e detalhes. O valor fica apenas cativo, não é cobrado.",
    s3: "O profissional confirma", s3p: "Só então o valor é cobrado. Se recusar, a cativação é libertada.",
    s4: "Trabalho e avaliação", s4p: "O pagamento vai para o profissional. Avaliações só após um trabalho real.",
    tipB: "Lembre-se:", tipP: "o valor só é cobrado quando o profissional aceita. Até lá, pedir não custa nada.",
    t1: "Identidade verificada", t1p: "Cada profissional passa por verificação antes de ser publicado.",
    t2: "Pagamentos seguros", t2p: "Os cartões são processados pela Stripe. Sem numerário, sem riscos.",
    t3: "Chat na plataforma", t3p: "Combine os detalhes antes de pagar.",
    t4: "Avaliações reais", t4p: "Apenas de trabalhos concluídos e pagos.",
    catalogTitle: "Profissionais perto de si", all: "Todos",
    from: "desde", perGuest: "convidado", perM2: "m²", perHour: "hora", perSession: "sessão", perEvent: "evento",
    jobs: "trabalhos", back: "Voltar",
    services: "Serviços e preços", reviews: "Avaliações",
    request: "Pedir reserva", sideFrom: "Preço inicial",
    sideNote: "Pedir é grátis. O valor só é cobrado após a confirmação do profissional.",
    bTitle: "Pedido de reserva", bSub: "profissional:",
    date: "Data", time: "Hora", addr: "Morada", addrPh: "Rua, cidade, Eircode",
    msg: "Mensagem ao profissional (opcional)", msgPh: "Alergias, acesso ao local, detalhes úteis",
    guests: "Convidados", area: "Área, m²", hours: "Horas", sessions: "Sessões", events: "Eventos",
    service: "Serviço", fee: "Taxa de serviço (12%)", total: "Total",
    holdNote: "Este valor fica cativo no cartão, não é cobrado. O pagamento acontece apenas quando o profissional aceita. Se recusar ou não responder em 7 dias, a cativação é libertada automaticamente.",
    confirm: "Cativar valor e enviar",
    doneT: "Pedido enviado", doneP: "Cativámos o valor no cartão e avisámos o profissional. A resposta chega na app, normalmente em poucas horas. Nada é cobrado até à confirmação.",
    toHome: "Início",
    footer: "Domora · Protótipo · Dublin, Irlanda",
    verified: "Identidade verificada",
    searchPh: "Chefs, limpeza, faz-tudo", filters: "Filtros", results: "resultados", fromCap: "Desde",
    navHome: "Início", navSearch: "Procurar", navSaved: "Guardados", navBook: "Reservas", navProf: "Perfil",
    savedT: "Guardados", savedEmpty: "Ainda vazio. Toque no coração no cartão de um profissional.",
    mybT: "As minhas reservas", mybEmpty: "Ainda sem reservas. Os seus pedidos vão aparecer aqui.",
    pending: "A aguardar confirmação",
    upT: "Perfil", nameL: "Nome", emailL: "Email", phoneL: "Telefone", saveBtn: "Guardar",
    cityAll: "Todas as cidades",
    chatSafe: "Fale e pague apenas dentro da Domora. As mensagens e os pagamentos na plataforma protegem o seu dinheiro e servem de prova em caso de disputa.",
  },
};

const LANGS = [["en", "English"], ["ru", "Русский"], ["uk", "Українська"], ["pl", "Polski"], ["es", "Español"], ["pt", "Português"]];

/* ─────────────────────────  MOCK DATA  ───────────────────────── */

const CATS = [
  { id: "chef", icon: ChefHat, unit: "perGuest", param: "guests", min: 2, def: 4 },
  { id: "clean", icon: Sparkles, unit: "perM2", param: "area", min: 20, def: 60 },
  { id: "handy", icon: Wrench, unit: "perHour", param: "hours", min: 1, def: 2 },
  { id: "massage", icon: Flower2, unit: "perSession", param: "sessions", min: 1, def: 1 },
  { id: "beauty", icon: Scissors, unit: "perSession", param: "sessions", min: 1, def: 1 },
  { id: "events", icon: PartyPopper, unit: "perEvent", param: "events", min: 1, def: 1 },
];

const PROVIDERS = [
  { id: 1, cat: "chef", name: "Aoife Byrne", city: "Dublin", rating: 4.9, jobs: 132, rate: 55,
    tags: { en: ["Tasting menus", "Italian", "Meal prep"], ru: ["Дегустационные меню", "Итальянская", "Meal prep"] },
    bio: { en: "Former sous-chef at a Michelin-listed Dublin restaurant. Seasonal menus, calm kitchen, spotless finish.", ru: "Бывший су-шеф ресторана из мишленовского гида в Дублине. Сезонные меню, спокойная работа, идеальная чистота после." },
    services: [
      { en: "Dinner party (3 courses)", ru: "Ужин на компанию (3 блюда)", price: 55, unit: "perGuest", d: { en: "Menu agreed in chat, groceries included", ru: "Меню согласуем в чате, продукты включены" } },
      { en: "Weekly meal prep", ru: "Meal prep на неделю", price: 40, unit: "perGuest", d: { en: "10 containers, labelled and chilled", ru: "10 контейнеров, подписаны и охлаждены" } },
    ],
    reviews: [
      { n: "Sarah K.", r: 5, t: { en: "Booked for my mum's 60th. Flawless from the first message to the last plate.", ru: "Заказывали на 60-летие мамы. Безупречно от первого сообщения до последней тарелки." } },
      { n: "Mark O.", r: 5, t: { en: "Kitchen was cleaner after she left than before.", ru: "Кухня после неё была чище, чем до прихода." } },
    ] },
  { id: 2, cat: "chef", name: "Tomás Nagle", city: "Cork", rating: 4.8, jobs: 87, rate: 45,
    tags: { en: ["BBQ & grill", "Family style"], ru: ["Гриль и BBQ", "Семейный формат"] },
    bio: { en: "Grill and family-style feasts for 6 to 30 people. Brings his own equipment.", ru: "Гриль и семейные застолья на 6-30 человек. Приезжает со своим оборудованием." },
    services: [
      { en: "Backyard BBQ feast", ru: "BBQ во дворе", price: 45, unit: "perGuest", d: { en: "Meat, sides, salads, setup and cleanup", ru: "Мясо, гарниры, салаты, монтаж и уборка" } },
    ],
    reviews: [ { n: "Ciara M.", r: 5, t: { en: "Fed 22 people without a hitch. Booking again for Christmas.", ru: "Накормил 22 человека без единой заминки. Бронируем снова на Рождество." } } ] },
  { id: 3, cat: "chef", name: "Elena Petrova", city: "Galway", rating: 5.0, jobs: 54, rate: 50,
    tags: { en: ["Vegan", "Pastry"], ru: ["Веган", "Десерты"] },
    bio: { en: "Plant-based dinners and celebration cakes. Fluent English and Russian.", ru: "Растительные ужины и праздничные торты. Свободный английский и русский." },
    services: [ { en: "Vegan dinner (4 courses)", ru: "Веган-ужин (4 блюда)", price: 50, unit: "perGuest", d: { en: "Allergen-safe, menu agreed ahead", ru: "Безопасно при аллергиях, меню заранее" } } ],
    reviews: [ { n: "Niamh D.", r: 5, t: { en: "The dessert alone was worth the booking.", ru: "Один только десерт стоил всей брони." } } ] },
  { id: 4, cat: "clean", name: "BrightNest Team", city: "Dublin", rating: 4.9, jobs: 310, rate: 2.5,
    tags: { en: ["Deep clean", "Offices", "Windows"], ru: ["Генеральная", "Офисы", "Окна"] },
    bio: { en: "Insured 3-person crew. Homes, offices, post-renovation. Own eco supplies.", ru: "Застрахованная бригада из 3 человек. Дома, офисы, после ремонта. Свои эко-средства." },
    services: [
      { en: "Deep clean", ru: "Генеральная уборка", price: 2.5, unit: "perM2", d: { en: "Kitchen degrease, bathrooms, inside windows", ru: "Кухня, санузлы, окна изнутри" } },
      { en: "Office regular clean", ru: "Регулярная уборка офиса", price: 1.8, unit: "perM2", d: { en: "Weekly or biweekly schedule", ru: "Раз в неделю или две" } },
    ],
    reviews: [ { n: "David L.", r: 5, t: { en: "Our office has never looked better. Insurance docs provided upfront.", ru: "Офис никогда не выглядел лучше. Страховку показали сразу." } } ] },
  { id: 5, cat: "clean", name: "Marta Kowalska", city: "Cork", rating: 4.8, jobs: 198, rate: 2.2,
    tags: { en: ["Homes", "End of tenancy"], ru: ["Квартиры", "После аренды"] },
    bio: { en: "End-of-tenancy specialist, deposit-back checklist included.", ru: "Специалист по уборке после аренды. Чек-лист для возврата депозита включён." },
    services: [ { en: "End of tenancy clean", ru: "Уборка после аренды", price: 2.2, unit: "perM2", d: { en: "Landlord checklist, oven included", ru: "Чек-лист арендодателя, духовка включена" } } ],
    reviews: [ { n: "James F.", r: 5, t: { en: "Got the full deposit back. Enough said.", ru: "Депозит вернули полностью. Этим всё сказано." } } ] },
  { id: 6, cat: "clean", name: "FacadePro", city: "Dublin", rating: 4.7, jobs: 76, rate: 3.4,
    tags: { en: ["Facades", "Outdoor areas"], ru: ["Фасады", "Территория"] },
    bio: { en: "Facade washing, driveways, gutters. Working-at-height certified.", ru: "Мойка фасадов, подъездные пути, водостоки. Допуск к высотным работам." },
    services: [ { en: "Facade & window wash", ru: "Мойка фасада и окон", price: 3.4, unit: "perM2", d: { en: "Reach-and-wash system up to 4 floors", ru: "Штанговая система до 4 этажей" } } ],
    reviews: [ { n: "Orla B.", r: 5, t: { en: "The house looks newly painted.", ru: "Дом выглядит как свежепокрашенный." } } ] },
  { id: 7, cat: "handy", name: "Seán Murphy", city: "Dublin", rating: 4.9, jobs: 421, rate: 45,
    tags: { en: ["Assembly", "Mounting", "Plumbing"], ru: ["Сборка", "Монтаж", "Сантехника"] },
    bio: { en: "15 years in small repairs. Flat-pack furniture, TV mounting, leaky taps, with same-week slots.", ru: "15 лет в мелком ремонте. Сборка мебели, ТВ на стену, протечки. Слоты уже на этой неделе." },
    services: [
      { en: "Handyman visit", ru: "Вызов мастера", price: 45, unit: "perHour", d: { en: "First hour minimum, then per 30 min", ru: "Минимум час, далее по 30 минут" } },
      { en: "Quote-first job", ru: "Смета после осмотра", price: 0, unit: "perHour", d: { en: "Free assessment, fixed quote in chat", ru: "Бесплатный осмотр, фикс-смета в чате" } },
    ],
    reviews: [ { n: "Aisling R.", r: 5, t: { en: "Hung 6 shelves and fixed a door in one visit. Zero mess.", ru: "Повесил 6 полок и починил дверь за один визит. Ни соринки." } } ] },
  { id: 8, cat: "handy", name: "Piotr Zieliński", city: "Galway", rating: 4.8, jobs: 156, rate: 40,
    tags: { en: ["Electrics", "Painting"], ru: ["Электрика", "Покраска"] },
    bio: { en: "Registered electrician. Sockets, lighting, small paint jobs.", ru: "Сертифицированный электрик. Розетки, свет, небольшая покраска." },
    services: [ { en: "Electrical small works", ru: "Мелкая электрика", price: 40, unit: "perHour", d: { en: "RECI registered, cert on request", ru: "Регистрация RECI, сертификат по запросу" } } ],
    reviews: [ { n: "Tom H.", r: 5, t: { en: "Quick, tidy, explained everything.", ru: "Быстро, аккуратно, всё объяснил." } } ] },
  { id: 9, cat: "massage", name: "Nadia Farrell", city: "Dublin", rating: 4.9, jobs: 210, rate: 70,
    tags: { en: ["Swedish", "Sports", "Deep tissue"], ru: ["Классический", "Спортивный", "Глубокий"] },
    bio: { en: "ITEC-certified therapist, 8 years of practice. Brings a pro table, fresh linen and oils.", ru: "Сертифицированный массажист (ITEC), 8 лет практики. Привозит профессиональный стол, свежее бельё и масла." },
    services: [
      { en: "Massage, 60 min", ru: "Массаж, 60 минут", price: 70, unit: "perSession", d: { en: "Swedish or relaxing, pressure to your liking", ru: "Классический или расслабляющий, давление по запросу" } },
      { en: "Sports massage, 90 min", ru: "Спортивный массаж, 90 минут", price: 95, unit: "perSession", d: { en: "Recovery focus, stretching included", ru: "Акцент на восстановление, растяжка включена" } },
    ],
    reviews: [ { n: "Conor B.", r: 5, t: { en: "Better than my physio visits, and no commute.", ru: "Лучше, чем походы к физиотерапевту, и никуда не нужно ехать." } } ] },
  { id: 10, cat: "massage", name: "Kasia Nowak", city: "Cork", rating: 4.8, jobs: 98, rate: 65,
    tags: { en: ["Relaxing", "Hot stones", "Prenatal"], ru: ["Релакс", "Горячие камни", "Для беременных"] },
    bio: { en: "Spa-trained therapist. Calm pace, aromatherapy on request, insured.", ru: "Опыт работы в спа. Спокойный темп, ароматерапия по запросу, есть страховка." },
    services: [
      { en: "Relaxing massage, 60 min", ru: "Релакс-массаж, 60 минут", price: 65, unit: "perSession", d: { en: "Aromatherapy oils included", ru: "Аромамасла включены" } },
    ],
    reviews: [ { n: "Emily W.", r: 5, t: { en: "Fell asleep on the table. Twice.", ru: "Уснула прямо на столе. Дважды." } } ] },
  { id: 11, cat: "beauty", name: "Roisín Kelly", city: "Dublin", rating: 5.0, jobs: 175, rate: 55,
    tags: { en: ["Cuts", "Colour", "Blow-dry"], ru: ["Стрижки", "Окрашивание", "Укладки"] },
    bio: { en: "Mobile hairdresser with 10 years in Dublin salons. Colour-safe products, quick tidy-up after.", ru: "Выездной парикмахер, 10 лет в салонах Дублина. Щадящие красители, быстрая уборка после работы." },
    services: [
      { en: "Cut and blow-dry", ru: "Стрижка и укладка", price: 55, unit: "perSession", d: { en: "Consultation included", ru: "Консультация включена" } },
      { en: "Full colour", ru: "Окрашивание", price: 120, unit: "perSession", d: { en: "Premium dye, strand test first", ru: "Премиальный краситель, сначала тест на пряди" } },
    ],
    reviews: [ { n: "Grainne M.", r: 5, t: { en: "Salon result in my own kitchen. Booking monthly now.", ru: "Салонный результат на моей кухне. Теперь бронирую каждый месяц." } } ] },
  { id: 12, cat: "beauty", name: "Anna Volkova", city: "Galway", rating: 4.9, jobs: 88, rate: 45,
    tags: { en: ["Manicure", "Gel polish", "Makeup"], ru: ["Маникюр", "Гель-лак", "Макияж"] },
    bio: { en: "Nail tech and makeup artist. Sterile tools, hypoallergenic products. English and Russian.", ru: "Мастер маникюра и визажист. Стерильные инструменты, гипоаллергенные средства. Английский и русский." },
    services: [
      { en: "Manicure with gel polish", ru: "Маникюр с гель-лаком", price: 45, unit: "perSession", d: { en: "Lasts 3 weeks or more", ru: "Держится от 3 недель" } },
      { en: "Evening makeup", ru: "Вечерний макияж", price: 60, unit: "perSession", d: { en: "Lashes included", ru: "Ресницы включены" } },
    ],
    reviews: [ { n: "Saoirse L.", r: 5, t: { en: "Wedding-guest makeup done while my kids napped. Magic.", ru: "Макияж на свадьбу сделали, пока дети спали. Волшебство." } } ] },
  { id: 13, cat: "events", name: "Marco Byrne", city: "Dublin", rating: 4.9, jobs: 143, rate: 350,
    tags: { en: ["DJ", "Weddings", "Own equipment"], ru: ["Диджей", "Свадьбы", "Своё оборудование"] },
    bio: { en: "Wedding and party DJ. Sound system, lights and backup gear included. Playlist agreed in chat.", ru: "Диджей на свадьбы и вечеринки. Звук, свет и резервное оборудование включены. Плейлист согласуем в чате." },
    services: [
      { en: "DJ set, up to 5 hours", ru: "DJ-сет, до 5 часов", price: 350, unit: "perEvent", d: { en: "Setup, sound, lights and MC mic", ru: "Монтаж, звук, свет и микрофон для ведущего" } },
      { en: "Extra hour", ru: "Дополнительный час", price: 60, unit: "perHour", d: { en: "If the party keeps going", ru: "Если вечеринка продолжается" } },
    ],
    reviews: [ { n: "Laura F.", r: 5, t: { en: "Dance floor was never empty. Not once.", ru: "Танцпол не пустовал ни минуты." } } ] },
  { id: 14, cat: "events", name: "Sparkle Crew", city: "Cork", rating: 4.8, jobs: 76, rate: 180,
    tags: { en: ["Kids entertainer", "Face painting", "Games"], ru: ["Аниматоры", "Аквагрим", "Игры"] },
    bio: { en: "Two entertainers for kids parties: games, face painting, balloon art. Garda-vetted.", ru: "Два аниматора на детские праздники: игры, аквагрим, фигурки из шаров. Пройдена проверка Garda." },
    services: [
      { en: "Kids party, 2 hours", ru: "Детский праздник, 2 часа", price: 180, unit: "perEvent", d: { en: "Up to 15 kids, props included", ru: "До 15 детей, реквизит включён" } },
    ],
    reviews: [ { n: "Patrick H.", r: 5, t: { en: "15 five-year-olds fully occupied for two hours. Heroes.", ru: "15 пятилеток были заняты два часа без перерыва. Герои." } } ] },
  { id: 15, cat: "events", name: "StaffPoint", city: "Dublin", rating: 4.7, jobs: 204, rate: 28,
    tags: { en: ["Waiters", "Bartenders", "Valet parking"], ru: ["Официанты", "Бармены", "Парковщики"] },
    bio: { en: "Trained event staff by the hour: waiters, bartenders, cloakroom and valet. Uniformed, insured.", ru: "Обученный персонал для мероприятий с почасовой оплатой: официанты, бармены, гардероб и парковщики. Форма и страховка." },
    services: [
      { en: "Waiter / bartender, per hour", ru: "Официант или бармен, за час", price: 28, unit: "perHour", d: { en: "4 hour minimum per person", ru: "Минимум 4 часа на человека" } },
      { en: "Valet parking attendant", ru: "Парковщик", price: 32, unit: "perHour", d: { en: "Fully insured drivers", ru: "Водители с полной страховкой" } },
    ],
    reviews: [ { n: "Deirdre O.", r: 5, t: { en: "Two waiters saved our garden party. Booked in 10 minutes.", ru: "Два официанта спасли нашу вечеринку в саду. Забронировали за 10 минут." } } ] },
];

/* ─────────────────────────  APP  ───────────────────────── */

export default function App() {
  const [lang, setLang] = useState("ru");
  const [view, setView] = useState("home"); // home | catalog | profile | booking | done
  const [catFilter, setCatFilter] = useState("all");
  const [prov, setProv] = useState(null);
  const [qty, setQty] = useState(4);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [q, setQ] = useState("");
  const [cityF, setCityF] = useState("all");
  const [cityOpen, setCityOpen] = useState(false);
  const [fav, setFav] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [langOpen, setLangOpen] = useState(false);

  const t = T[lang];
  const L = (o) => (o ? o[lang] || o.en : "");
  const catMeta = (id) => CATS.find((c) => c.id === id);
  const catLabel = (id) => ({ chef: t.catChef, clean: t.catClean, handy: t.catHandy, massage: t.catMassage, beauty: t.catBeauty, events: t.catEvents }[id]);
  const unitLabel = (u) => t[u];

  const list = useMemo(() => {
    let l = catFilter === "all" ? PROVIDERS : PROVIDERS.filter((p) => p.cat === catFilter);
    if (cityF !== "all") l = l.filter((p) => p.city === cityF);
    const sq = q.trim().toLowerCase();
    if (sq) l = l.filter((p) =>
      p.name.toLowerCase().includes(sq) || p.city.toLowerCase().includes(sq) ||
      p.tags.en.concat(p.tags.ru).join(" ").toLowerCase().includes(sq) ||
      p.services.map((x) => x.en + " " + x.ru).join(" ").toLowerCase().includes(sq));
    return l;
  }, [catFilter, cityF, q]);

  const openCatalog = (cat) => { setCatFilter(cat); setView("catalog"); window.scrollTo(0, 0); };
  const openProfile = (p) => { setProv(p); setView("profile"); window.scrollTo(0, 0); };
  const openBooking = () => {
    const m = catMeta(prov.cat);
    setQty(m.def); setDate(""); setView("booking"); window.scrollTo(0, 0);
  };

  const PHOTO_BG = {
    chef: "linear-gradient(135deg,#F3E7CF 0%,#E0B074 100%)",
    clean: "linear-gradient(135deg,#E9F2E2 0%,#93B981 100%)",
    handy: "linear-gradient(135deg,#EAE7DF 0%,#B4A98F 100%)",
    massage: "linear-gradient(135deg,#EAEFE6 0%,#8FAE9B 100%)",
    beauty: "linear-gradient(135deg,#F6E9E3 0%,#D9A38B 100%)",
    events: "linear-gradient(135deg,#FBEBDD 0%,#E08A4C 100%)",
  };
  const toggleFav = (e, id) => {
    e.stopPropagation();
    setFav(fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id]);
  };
  const PCard = ({ p }) => {
    const I = catMeta(p.cat).icon;
    return (
      <div className="pcard2" onClick={() => openProfile(p)}>
        <div className="photo" style={{ background: PHOTO_BG[p.cat] }}>
          <I size={56} strokeWidth={1.1} />
          <button className={"heart" + (fav.includes(p.id) ? " on" : "")} onClick={(e) => toggleFav(e, p.id)}>
            <Heart size={17} fill={fav.includes(p.id) ? "currentColor" : "none"} />
          </button>
          <div className="dots"><i /><i /><i /></div>
        </div>
        <div className="t">{L(p.services[0])}</div>
        <div className="m">
          <span>{p.name}</span><span>·</span><span>{p.city}</span>
          <span className="rate"><Star size={12} fill="currentColor" /> {p.rating}</span>
        </div>
        <div className="pr">{t.fromCap} <b>{eur(p.rate)}</b> / {unitLabel(catMeta(p.cat).unit)}</div>
      </div>
    );
  };

  const subtotal = prov ? prov.rate * qty : 0;
  const fee = Math.round(subtotal * 0.12 * 100) / 100;
  const total = Math.round((subtotal + fee) * 100) / 100;
  const eur = (n) => "€" + n.toLocaleString({ ru: "ru-RU", uk: "uk-UA", pl: "pl-PL", es: "es-ES", pt: "pt-PT" }[lang] || "en-IE", { minimumFractionDigits: n % 1 ? 2 : 0 });

  return (
    <div className="dm">
      <style>{CSS}</style>

      <header>
        <div className="wrap hd">
          <div className="logo" onClick={() => setView("home")}>DOMO<span>RA</span></div>
          <div className="hd-right">
            <div className="langwrap">
              <button className="lang" onClick={() => setLangOpen(!langOpen)}>
                <Globe size={14} /> {lang.toUpperCase()}
              </button>
              {langOpen && (
                <div className="langmenu">
                  {LANGS.map(([k, l]) => (
                    <button key={k} className={lang === k ? "on" : ""}
                      onClick={() => { setLang(k); setLangOpen(false); }}>{l}</button>
                  ))}
                </div>
              )}
            </div>
            {view === "home" && (
              <button className="btn btn-ink btn-sm hd-cta" onClick={() => openCatalog("all")}>{t.findPro}</button>
            )}
          </div>
        </div>
      </header>

      {/* ── HOME ── */}
      {view === "home" && (
        <>
          <div className="wrap hero">
            <div className="eyebrow">{t.tagline}</div>
            <h1 className="display">{t.h1a}<br /><em>{t.h1b}</em></h1>
            <p>{t.heroP}</p>
            <div className="cta">
              <button className="btn btn-ink" onClick={() => openCatalog("all")}>{t.findPro} <ArrowRight size={16} /></button>
              <button className="btn btn-ghost">{t.becomePro}</button>
            </div>
          </div>

          <div className="wrap cats">
            {CATS.map((c, i) => {
              const Icon = c.icon;
              return (
                <div className="cat" key={c.id} onClick={() => openCatalog(c.id)}>
                  <div className="n">0{i + 1}</div>
                  <div className="icircle"><Icon size={26} strokeWidth={1.6} /></div>
                  <h3>{catLabel(c.id)}</h3>
                  <p>{{ chef: t.catChefP, clean: t.catCleanP, handy: t.catHandyP, massage: t.catMassageP, beauty: t.catBeautyP, events: t.catEventsP }[c.id]}</p>
                  <span className="go">{t.browse} <ArrowRight size={14} /></span>
                </div>
              );
            })}
          </div>

          <div className="wrap steps">
            <div className="eyebrow"><b>01 · 04</b></div>
            <h2>{t.howTitle}</h2>
            <div className="steplist">
              {[ [t.s1, t.s1p], [t.s2, t.s2p], [t.s3, t.s3p], [t.s4, t.s4p] ].map(([h, p], i) => (
                <div className="step" key={i}>
                  <div className="num">{i + 1}</div>
                  <h4>{h}</h4><p>{p}</p>
                </div>
              ))}
            </div>

            <div className="tip">
              <div className="ti"><Lightbulb size={20} /></div>
              <p><b>{t.tipB}</b> {t.tipP}</p>
            </div>

            <div className="trust">
              {[ [ShieldCheck, t.t1, t.t1p], [CreditCard, t.t2, t.t2p], [MessageCircle, t.t3, t.t3p], [Star, t.t4, t.t4p] ].map(([I, h, p], i) => (
                <div className="titem" key={i}>
                  <div className="icircle"><I size={20} strokeWidth={1.7} /></div>
                  <div><h5>{h}</h5><p>{p}</p></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── CATALOG ── */}
      {view === "catalog" && (
        <div className="wrap sec">
          <div className="search">
            <div className="sbox">
              <Search size={17} color="#6b6b6b" />
              <input value={q} placeholder={t.searchPh} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className={"fbtn" + (cityOpen ? " on" : "")} onClick={() => setCityOpen(!cityOpen)}>
              <SlidersHorizontal size={15} /> {t.filters}
            </button>
          </div>
          {cityOpen && (
            <div className="citychips">
              {["all", "Dublin", "Cork", "Galway"].map((c) => (
                <button key={c} className={"chip" + (cityF === c ? " on" : "")} onClick={() => setCityF(c)}>
                  {c === "all" ? t.cityAll : c}
                </button>
              ))}
            </div>
          )}
          <div className="tabs">
            {["all", ...CATS.map((c) => c.id)].map((c) => {
              const I = c === "all" ? Search : CATS.find((x) => x.id === c).icon;
              return (
                <button key={c} className={"tab" + (catFilter === c ? " on" : "")} onClick={() => setCatFilter(c)}>
                  <I size={21} strokeWidth={1.7} /> {c === "all" ? t.all : catLabel(c)}
                </button>
              );
            })}
          </div>
          <h2 className="display" style={{ fontSize: "clamp(22px,4.5vw,32px)", margin: "0 0 6px" }}>{t.catalogTitle}</h2>
          <div className="count">{list.length} {t.results}</div>
          <div className="grid">
            {list.map((p) => <PCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {view === "profile" && prov && (
        <div className="wrap">
          <button className="back" onClick={() => setView("catalog")}><ArrowLeft size={14} /> {t.back}</button>
          <div className="phead">
            <div className="avatar big">{prov.name[0]}</div>
            <div>
              <h1>{prov.name}</h1>
              <div className="pmeta" style={{ marginTop: 8, gap: 12 }}>
                <span className="rate"><Star size={14} fill="currentColor" /> {prov.rating}</span>
                <span>{prov.jobs} {t.jobs}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><MapPin size={13} /> {prov.city}</span>
                <span className="verified"><ShieldCheck size={12} /> {t.verified}</span>
              </div>
            </div>
          </div>
          <div className="cols">
            <div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--muted)", paddingBottom: 8 }}>{L(prov.bio)}</p>
              <h3 style={{ fontFamily: "Archivo", fontWeight: 800, textTransform: "uppercase", fontSize: 16, margin: "22px 0 4px" }}>{t.services}</h3>
              {prov.services.map((s, i) => (
                <div className="svc" key={i}>
                  <div><h4>{L(s)}</h4><p>{L(s.d)}</p></div>
                  <div className="pr">{s.price ? <>{eur(s.price)} <span>/ {unitLabel(s.unit)}</span></> : "—"}</div>
                </div>
              ))}
              <h3 style={{ fontFamily: "Archivo", fontWeight: 800, textTransform: "uppercase", fontSize: 16, margin: "28px 0 4px" }}>{t.reviews}</h3>
              {prov.reviews.map((r, i) => (
                <div className="review" key={i}>
                  <div className="rr">
                    {r.n}
                    <span className="stars">{Array.from({ length: r.r }).map((_, j) => <Star key={j} size={12} fill="currentColor" />)}</span>
                  </div>
                  <p>{L(r.t)}</p>
                </div>
              ))}
            </div>
            <div className="side">
              <div className="from">{t.sideFrom}</div>
              <div className="amt">{eur(prov.rate)} <span>/ {unitLabel(catMeta(prov.cat).unit)}</span></div>
              <button className="btn btn-green" style={{ width: "100%", justifyContent: "center" }} onClick={openBooking}>
                {t.request}
              </button>
              <div className="note"><ShieldCheck size={15} /> {t.sideNote}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOOKING ── */}
      {view === "booking" && prov && (
        <div className="wrap bform">
          <button className="back" onClick={() => setView("profile")}><ArrowLeft size={14} /> {t.back}</button>
          <h1>{t.bTitle}</h1>
          <p className="sub">{t.bSub} <b style={{ color: "var(--ink)" }}>{prov.name}</b> · {catLabel(prov.cat)}</p>

          <label>{t.date}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label>{t.time}</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />

          <label>{{ chef: t.guests, clean: t.area, handy: t.hours, massage: t.sessions, beauty: t.sessions, events: t.events }[prov.cat]}</label>
          <div className="stepper">
            <button onClick={() => setQty(Math.max(catMeta(prov.cat).min, qty - (prov.cat === "clean" ? 10 : 1)))}>−</button>
            <div className="val">{qty}</div>
            <button onClick={() => setQty(qty + (prov.cat === "clean" ? 10 : 1))}>+</button>
            <span style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {prov.cat === "chef" && <Users size={14} />}
              {prov.cat === "clean" && <Ruler size={14} />}
              {prov.cat === "handy" && <Clock size={14} />}
              {prov.cat === "massage" && <Flower2 size={14} />}
              {prov.cat === "beauty" && <Scissors size={14} />}
              {prov.cat === "events" && <PartyPopper size={14} />}
              {eur(prov.rate)} / {unitLabel(catMeta(prov.cat).unit)}
            </span>
          </div>

          <label>{t.addr}</label>
          <input placeholder={t.addrPh} />
          <label>{t.msg}</label>
          <textarea rows={3} placeholder={t.msgPh} />

          <div className="brk">
            <div className="row"><span>{t.service} × {qty}</span><span>{eur(subtotal)}</span></div>
            <div className="row"><span>{t.fee}</span><span>{eur(fee)}</span></div>
            <div className="row total"><span>{t.total}</span><span>{eur(total)}</span></div>
          </div>
          <div className="hold"><ShieldCheck size={16} /> {t.holdNote}</div>
          <div className="hold"><MessageCircle size={16} /> {t.chatSafe}</div>

          <button className="btn btn-green" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              setMyBookings([...myBookings, { id: Date.now(), prov: prov.name, svc: L(prov.services[0]),
                date, time, qty, unitKey: catMeta(prov.cat).unit, total }]);
              setView("done"); window.scrollTo(0, 0);
            }}>
            <CreditCard size={16} /> {t.confirm} · {eur(total)}
          </button>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {view === "done" && (
        <div className="wrap done">
          <div className="ok"><Check size={40} strokeWidth={2.5} /></div>
          <h1>{t.doneT}</h1>
          <p>{t.doneP}</p>
          <button className="btn btn-ink" onClick={() => setView("home")}>{t.toHome}</button>
        </div>
      )}

      {/* ── SAVED ── */}
      {view === "saved" && (
        <div className="wrap sec">
          <h2 className="display" style={{ fontSize: "clamp(24px,5vw,34px)", margin: "16px 0 20px" }}>{t.savedT}</h2>
          {fav.length
            ? <div className="grid">{PROVIDERS.filter((p) => fav.includes(p.id)).map((p) => <PCard key={p.id} p={p} />)}</div>
            : <div className="empty">{t.savedEmpty}</div>}
        </div>
      )}

      {/* ── MY BOOKINGS ── */}
      {view === "mybook" && (
        <div className="wrap sec">
          <h2 className="display" style={{ fontSize: "clamp(24px,5vw,34px)", margin: "16px 0 20px" }}>{t.mybT}</h2>
          {myBookings.length ? myBookings.map((b) => (
            <div className="bk" key={b.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <h4>{b.prov}</h4><span className="pill">{t.pending}</span>
              </div>
              <div className="meta">
                <span><Calendar size={13} /> {b.date ? b.date + ", " : ""}{b.time}</span>
                <span><Users size={13} /> {b.qty} {t[b.unitKey]}</span>
                <span><CreditCard size={13} /> {eur(b.total)}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{b.svc}</div>
            </div>
          )) : <div className="empty">{t.mybEmpty}</div>}
        </div>
      )}

      {/* ── USER PROFILE ── */}
      {view === "uprofile" && (
        <div className="wrap sec" style={{ maxWidth: 560 }}>
          <h2 className="display" style={{ fontSize: "clamp(24px,5vw,34px)", margin: "16px 0 8px" }}>{t.upT}</h2>
          <label>{t.nameL}</label><input placeholder="John Murphy" />
          <label>{t.emailL}</label><input placeholder="you@example.com" />
          <label>{t.phoneL}</label><input placeholder="+353 85 123 4567" />
          <button className="btn btn-green" style={{ marginTop: 22 }}>{t.saveBtn}</button>
        </div>
      )}

      {/* ── CLIENT BOTTOM NAV (mobile) ── */}
      <div className="cnav"><div className="row">
        {[["home", t.navHome, HomeIcon], ["catalog", t.navSearch, Search], ["saved", t.navSaved, Heart],
          ["mybook", t.navBook, ClipboardList], ["uprofile", t.navProf, UserRound]].map(([k, l, I]) => (
          <button key={k}
            className={"cni" + (view === k || (k === "catalog" && ["profile", "booking"].includes(view)) ? " on" : "")}
            onClick={() => { setView(k); window.scrollTo(0, 0); }}>
            <I size={20} strokeWidth={1.9} /> {l}
          </button>
        ))}
      </div></div>

      <footer>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, width: "100%" }}>
          <span>{t.footer}</span>
          <span>Stripe Connect · ID checks · Public liability insured</span>
        </div>
      </footer>
    </div>
  );
}
