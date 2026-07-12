# Domora · Production Core

Инженерное ядро маркетплейса услуг. Это НЕ готовое приложение, а фундамент для разработки:
проверенная схема данных и самый рискованный код (деньги), написанный сразу правильно.

## Состав

prisma/schema.prisma - полная схема БД: 20 моделей, статусные машины, страйки, споры, переводы чата.
src/lib/stripe.ts - клиент Stripe и единый расчет денег брони.
src/app/api/connect/onboard - онбординг исполнителя в Stripe Connect Express.
src/app/api/bookings - создание брони с холдом (manual capture).
src/app/api/bookings/[id]/accept - подтверждение исполнителем и списание.
src/app/api/stripe/webhook - вебхуки: онбординг, отказы, возвраты, чарджбеки.
src/lib/jobs.ts - фоновые таймеры: истечение запросов 72ч, планирование и исполнение выплат.
docs/LAUNCH-CHECKLIST.md - пусковой чек-лист от регистрации бизнеса до первых денег.
.env.example - все нужные ключи.

## Как использовать

1. npx create-next-app@latest domora-app (TypeScript, App Router)
2. Скопировать файлы этого пакета поверх, npm install stripe @prisma/client prisma
3. Заполнить .env, затем npx prisma migrate dev
4. Дописать слои: src/lib/prisma.ts (клиент), src/lib/auth.ts (Supabase Auth), src/lib/crypto.ts (шифрование адресов)
5. Перенести UI из прототипов (Marketplace.jsx, HostDashboard.jsx) на страницы Next.js

Код написан без запуска в этой среде: перед продакшеном обязателен прогон разработчиком
и тестовые сценарии денег из чек-листа.

Полная логика продукта: domora-spec.md (споры, отмены, страйки, автоперевод).
