# Domora · Пошаговый запуск (для владельца)

Инструкция написана для человека без опыта в программировании. Делайте по
порядку сверху вниз. Каждый шаг заканчивается тем, что вы получаете один или
несколько «ключей» (длинные строки) и вставляете их в Vercel. Никакой код
писать не нужно.

Порядок важен: сначала база и адрес сайта, потом всё остальное.

Значок 🔑 - это то, что нужно скопировать и вставить в Vercel (шаг 2.3).

---

## Шаг 1. Supabase (база данных и вход)

1. Зайдите на https://supabase.com, зарегистрируйтесь, нажмите **New project**.
   Придумайте имя (например, `domora`), задайте пароль базы (сохраните его),
   регион выбирайте поближе к Ирландии (например, `West EU (Ireland)`).
2. Дождитесь создания проекта (пара минут).
3. Слева **Project Settings → API**. Скопируйте:
   - **Project URL** → 🔑 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** ключ → 🔑 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** ключ (секретный, не показывайте никому) → 🔑 `SUPABASE_SERVICE_ROLE_KEY`
4. Слева **Project Settings → Database → Connection string → URI**. Скопируйте
   строку, подставьте в неё пароль базы из шага 1 → 🔑 `DATABASE_URL`.
5. **Создать таблицы и тестовые данные одним скриптом.** Слева **SQL Editor →
   New query**. Откройте в проекте файл `setup.sql`, скопируйте всё его
   содержимое, вставьте в редактор и нажмите **Run**. Это создаст все таблицы,
   7 категорий услуг и 3 тестовых исполнителя. Запускать нужно **один раз** на
   пустой базе.

Ещё два ключа, которые задаёте сами:
- 🔑 `ENCRYPTION_KEY` - ключ шифрования адресов. Сгенерируйте: на Mac/Linux в
  терминале выполните `openssl rand -hex 32` и скопируйте результат. **Важно:**
  этот ключ нельзя менять после запуска, иначе старые адреса перестанут читаться.
- 🔑 `APP_URL` - публичный адрес сайта. Пока оставьте пустым, заполните после
  шага 2 (когда узнаете адрес на Vercel).

---

## Шаг 2. Vercel (публикация сайта)

2.1. Зайдите на https://vercel.com, войдите через GitHub, нажмите **Add New →
Project**, выберите репозиторий `stanmet/domora-app`.

2.2. На экране импорта **не нажимайте Deploy сразу** - сначала раскройте
**Environment Variables**.

2.3. Добавьте все ключи 🔑, собранные в шаге 1 (имя переменной слева, значение
справа):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `ENCRYPTION_KEY`.
Остальные (Stripe, Resend и т.д.) добавите позже - к ним ещё вернёмся.

2.4. Нажмите **Deploy**. Через пару минут получите адрес вида
`https://domora-app-xxxx.vercel.app`.

2.5. Вернитесь в **Settings → Environment Variables** и добавьте
🔑 `APP_URL` = этот адрес. (Когда подключите свой домен, поменяете на него.)

> Совет: свой домен (например, `domora.ie`) можно подключить позже в
> **Vercel → Settings → Domains**. Он понадобится для писем и Apple Pay.

---

## Шаг 3. Настроить адреса возврата в Supabase

Чтобы работали вход по ссылке, вход через Google/Apple и сброс пароля:

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL** = ваш адрес с шага 2.4 (или домен).
3. В **Redirect URLs** добавьте (каждый с новой строки):
   - `https://ВАШ-АДРЕС/auth/callback`
   - `https://ВАШ-АДРЕС/reset-password`
   - для локальной разработки можно добавить `http://localhost:3000/auth/callback`
     и `http://localhost:3000/reset-password`.
4. Сохраните.

Письма Supabase (magic link, сброс пароля) уже работают из коробки на тестовом
почтовике Supabase. Для «взрослой» отправки позже подключите свой SMTP в
**Authentication → Emails**, но для старта это не обязательно.

---

## Шаг 4. Сделать себя администратором

Админка (модерация услуг, споры, возвраты) доступна только пользователям с ролью
ADMIN. Роль ставится вручную:

1. Сначала **зарегистрируйтесь на сайте** обычным образом (ваш email).
2. Supabase → **SQL Editor → New query**, вставьте и запустите (подставьте свой
   email):

```sql
UPDATE "User"
SET roles = ARRAY['CLIENT','ADMIN']::"Role"[]
WHERE email = 'ваш@email.com';
```

3. Обновите страницу сайта - в меню появится «Админка».

---

## Шаг 5. Stripe (оплата и выплаты исполнителям)

5.1. Зарегистрируйтесь на https://stripe.com, заведите аккаунт для Ирландии.
Пока можно работать в **тестовом режиме** (переключатель Test mode вверху).

5.2. **Developers → API keys**. Скопируйте:
- **Secret key** → 🔑 `STRIPE_SECRET_KEY`
- **Publishable key** → 🔑 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

5.3. **Включить выплаты исполнителям (Connect).** В меню Stripe откройте
**Connect → Get started**, выберите платформу типа **Express**. Это позволяет
исполнителям подключать свои счета и получать выплаты.

5.4. **Apple Pay и Google Pay.** Google Pay включается автоматически. Для Apple
Pay: **Settings → Payment methods → Apple Pay → Add new domain** и укажите ваш
домен сайта. (В коде кошельки уже включены, нужно только подтвердить домен.)

5.5. Вебхуки создавать вручную **не нужно** - приложение делает это само.
Переменные `STRIPE_WEBHOOK_SECRET` и `STRIPE_CONNECT_WEBHOOK_SECRET` можно
оставить пустыми (подлинность событий проверяется другим способом). Подробности
в `docs/stripe-webhook-setup.md`.

5.6. Добавьте оба ключа Stripe в Vercel (Settings → Environment Variables) и
нажмите **Redeploy**.

> Тестовая карта Stripe для проверки оплаты: `4242 4242 4242 4242`, любая будущая
> дата, любой CVC. Для 3D-Secure есть отдельные тестовые карты в документации Stripe.

---

## Шаг 6. Вход через Google и Apple (необязательно, но желательно)

**Google:**
1. https://console.cloud.google.com → создайте проект → **APIs & Services →
   Credentials → Create Credentials → OAuth client ID** (тип Web).
2. В **Authorized redirect URIs** добавьте адрес из Supabase
   (**Authentication → Providers → Google**, там показан нужный redirect URL).
3. Полученные Client ID и Client Secret вставьте в Supabase →
   **Authentication → Providers → Google** и включите провайдер.

**Apple** (нужен аккаунт Apple Developer, $99/год):
1. В Apple Developer настройте **Sign in with Apple** (Service ID, ключ).
2. Данные вставьте в Supabase → **Authentication → Providers → Apple**, включите.

Если пока не делаете - кнопки Google/Apple просто не будут работать, а вход по
email и паролю работает всегда.

---

## Шаг 7. Email-уведомления (Resend)

1. Зарегистрируйтесь на https://resend.com.
2. **Domains → Add Domain**, добавьте свой домен и пропишите показанные
   DNS-записи (SPF/DKIM) у регистратора домена. Дождитесь статуса Verified.
3. **API Keys → Create** → 🔑 `RESEND_API_KEY`.
4. 🔑 `EMAIL_FROM` - адрес отправителя на вашем домене, например
   `Domora <noreply@domora.ie>`.
5. Добавьте оба ключа в Vercel и сделайте **Redeploy**.

Без этих ключей письма просто не отправляются, остаются уведомления внутри сайта.

---

## Шаг 8. Аналитика (Plausible)

1. Зарегистрируйтесь на https://plausible.io, добавьте сайт (ваш домен).
2. 🔑 `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` = домен сайта (например, `domora.ie`).
3. Добавьте в Vercel и **Redeploy**. После этого считаются переходы и события:
   регистрация, вход, создание заказа, оплата, отзыв.

---

## Шаг 9. Фоновые задачи (Cron)

В проекте уже настроено ежедневное задание (`vercel.json`): истечение старых
запросов и выплаты по завершённым заказам, каждый день в 02:00.

1. Задайте 🔑 `CRON_SECRET` - придумайте длинную случайную строку (можно снова
   `openssl rand -hex 32`). Vercel сам будет подставлять её при вызове, а
   приложение проверит, что запрос пришёл от Vercel, а не снаружи.
2. Добавьте в Vercel и **Redeploy**.

(Автоперевод чата и профилей включается ключом 🔑 `DEEPL_API_KEY` с
deepl.com/pro-api - необязательно для старта.)

---

## Шаг 10. Проверка перед запуском

Пройдите сценарии руками (в тестовом режиме Stripe):

- [ ] Регистрация нового клиента по email и паролю; выход и вход обратно.
- [ ] «Забыли пароль» - приходит письмо, пароль меняется.
- [ ] Регистрация исполнителя, создание услуги, одобрение в админке.
- [ ] Заказ у исполнителя, оплата тестовой картой, номер заказа виден (#DM-...).
- [ ] Исполнитель принимает заказ, отмечает выполненным, клиент подтверждает.
- [ ] Клиент оставляет отзыв, рейтинг обновляется.
- [ ] Открыть спор, разрешить его в админке.
- [ ] Проверить сайт с телефона (iPhone Safari и Android Chrome).

Когда всё пройдено в тестовом режиме - переключите Stripe в **Live mode**,
поменяйте ключи Stripe на «боевые» и подключите настоящий домен.

---

### Краткая карта переменных Vercel

| Переменная | Обязательна для старта | Где взять |
|---|---|---|
| `DATABASE_URL` | да | Supabase → Database |
| `NEXT_PUBLIC_SUPABASE_URL` | да | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | да | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | да | Supabase → API |
| `ENCRYPTION_KEY` | да | `openssl rand -hex 32` |
| `APP_URL` | да | адрес на Vercel/домен |
| `STRIPE_SECRET_KEY` | да | Stripe → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | да | Stripe → API keys |
| `CRON_SECRET` | желательно | придумать |
| `RESEND_API_KEY`, `EMAIL_FROM` | для писем | Resend |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | для аналитики | Plausible |
| `DEEPL_API_KEY` | для автоперевода | DeepL |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | нет | можно не задавать |
