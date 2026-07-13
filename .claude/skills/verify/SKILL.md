---
name: verify
description: Как поднять Domora локально без реального Supabase и проверить флоу в браузере
---

# Проверка Domora в песочнице (без реального Supabase и Stripe)

Рецепт, который уже сработал. Времени занимает ~5 минут.

## Стенд

1. Локальный Postgres уже установлен в контейнере: `service postgresql start`,
   затем создать роль и базу `domora/domora` через `sudo -u postgres psql`.
2. `.env`: DATABASE_URL на локальную базу, ENCRYPTION_KEY=`openssl rand -hex 32`,
   NEXT_PUBLIC_SUPABASE_URL=`http://127.0.0.1:54321`, ключи Supabase любые строки.
3. `npx prisma migrate deploy`, сид: `set -a && source .env && set +a && npx tsx prisma/seed.ts`
   (tsx сам .env не читает). Сид дает исполнителей chef@/clean@/handy@test.domora.ie.
4. Мок Supabase Auth: мини http-сервер на :54321, который на GET /auth/v1/user
   отвечает JSON пользователя по Bearer-токену (token-client, token-chef...).
   getUser() из @supabase/ssr ходит именно туда, больше ничего не нужно.
5. `npx next dev -p 3100` (dev, а не start: NEXT_PUBLIC_* инлайнятся при сборке).

## Логин в браузере

Cookie сессии @supabase/ssr для URL 127.0.0.1: имя `sb-127-auth-token`,
значение `base64-` + base64url(JSON сессии с access_token=токен мока).
Cookie `locale=ru` переключает язык. Playwright: chromium по пути
`/opt/pw-browsers/chromium` (executablePath), пакет playwright ставить в scratchpad.

## Что гонять

Клиент: /providers/[id] -> Запросить бронь -> форма -> /bookings?sent=1.
Исполнитель: /pro -> Заказы -> Принять/Отклонить, адрес виден только после принятия.
БД: суммы в центах в Booking, переходы статусов в BookingEvent,
addressEncrypted не содержит открытого текста.

## Грабли

- React 19 сбрасывает неконтролируемые поля формы после server action:
  поля формы брони должны быть контролируемыми (уже сделано).
- Сид падает без DATABASE_URL в окружении процесса (tsx не читает .env).
- fullPage-скриншоты дублируют sticky-шапку посреди страницы: артефакт, не баг.
