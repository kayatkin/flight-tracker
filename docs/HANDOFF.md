# Flight Tracker — Handoff / контекст для продолжения разработки

**Дата:** 2026-06-09  
**Репозиторий:** `/Users/kaimac/Documents/flight-tracker`  
**Remote:** `git@github.com:kayatkin/flight-tracker.git`  
**Демо:** https://kayatkin.github.io/flight-tracker  
**Версия пакета:** `2.0.0`

> Этот файл — единая точка входа для нового разработчика или AI-агента.  
> Содержит: что уже сделано, как устроен проект, что не доделано, куда смотреть дальше.

---

## Содержание

1. [Краткое описание](#1-краткое-описание)
2. [Текущее состояние Git](#2-текущее-состояние-git)
3. [Хронология работ](#3-хронология-работ)
4. [Архитектура](#4-архитектура)
5. [Структура проекта](#5-структура-проекта)
6. [Пользовательские сценарии](#6-пользовательские-сценарии)
7. [Модели данных](#7-модели-данных)
8. [Сервисный слой (frontend)](#8-сервисный-слой-frontend)
9. [Supabase: БД, RLS, Edge Functions](#9-supabase-бд-rls-edge-functions)
10. [Telegram-бот](#10-telegram-бот)
11. [Монетизация (freemium + Stars)](#11-монетизация-freemium--stars)
12. [Интернационализация (i18n)](#12-интернационализация-i18n)
13. [UI-компоненты](#13-ui-компоненты)
14. [Конфигурация и переменные окружения](#14-конфигурация-и-переменные-окружения)
15. [Тестирование](#15-тестирование)
16. [CI/CD и деплой](#16-cicd-и-деплой)
17. [Технический долг и устаревшая документация](#17-технический-долг-и-устаревшая-документация)
18. [Что не проверено / pending](#18-что-не-проверено--pending)
19. [Следующие шаги](#19-следующие-шаги)
20. [Шпаргалка команд](#20-шпаргалка-команд)

---

## 1. Краткое описание

**Flight Tracker** — Telegram Mini App для отслеживания выгодных авиабилетов.

Пользователь:
- добавляет рейсы (туда / туда-обратно, пересадки, ночные прилёты +1 день);
- видит анализ цены (выгодно / нейтрально / невыгодно, порог ±500 ₽);
- просматривает историю в стиле iOS Wallet;
- строит сезонные графики цен (Chart.js, только Pro);
- делится историей через одноразовые ссылки (view / edit);
- может купить Pro через Telegram Stars.

### Стек

| Слой | Технологии |
|------|------------|
| Frontend | React 19, TypeScript 5, CSS Modules, Vite 6 |
| Графики | Chart.js 4 + react-chartjs-2 |
| i18n | i18next + react-i18next (RU / EN) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Бот | Node.js + `node-telegram-bot-api` (polling) |
| Telegram SDK | `@telegram-apps/sdk` + `telegram-web-app.js` |
| Тесты | Vitest + React Testing Library + jsdom |
| CI/CD | GitHub Actions → GitHub Pages |
| Lint | ESLint 9 flat config (`eslint.config.mjs`) |

---

## 2. Текущее состояние Git

### Активная ветка

```
feature/monetization-i18n  (синхронизирована с origin)
```

**`main`** — продакшн на GitHub Pages, **ещё не содержит** монетизацию (3 коммита отстаёт от feature-ветки).

### Бекапы

| Артефакт | Значение |
|----------|----------|
| Тег | `v2.0.0-stable` |
| Ветка | `backup/pre-monetization-2026-05-19` |
| Коммит | `fda3ac7` — Vite + JWT auth, **до** монетизации |

Подробнее: `docs/BACKUP.md`

### Последние коммиты (feature-ветка)

| Hash | Описание |
|------|----------|
| `1bbd58f` | Полный UI i18n EN/RU + SubscriptionPanel |
| `cef3763` | Фаза 2: Telegram Stars, UpgradeModal, бот `/status`, лимиты share-ссылок |
| `cfb1130` | Фаза 1: i18n, валидация полей, freemium-лимиты |
| `fda3ac7` | Миграция CRA → Vite, JWT auth через Edge Functions, RLS |
| `cbe7229` | Улучшена система совместного доступа |
| `cdc7f29` | Исправления share link и autoRunApp |

### Локальные изменения

На момент создания этого файла рабочая копия **чистая** (только неотслеживаемый `docs/HANDOFF.md`).

---

## 3. Хронология работ

### Этап 0 — Базовое приложение (до v2.0.0)

- React Mini App с формой рейсов, историей, анализом цен, графиками
- Supabase как хранилище рейсов
- Telegram-бот: `/start`, `/start share_<token>`, `/help`
- Совместный доступ через `shared_sessions`
- Деплой на GitHub Pages

### Этап 1 — Миграция и безопасность (`fda3ac7`)

**CRA → Vite:**
- Удалён `craco.config.js`
- `public/index.html` → корневой `index.html`
- `REACT_APP_*` → `VITE_*` (обратная совместимость через `envPrefix`)
- Сборка: `build/` → `dist/`
- Тесты: Jest → Vitest

**Рефакторинг структуры:**
- `src/types/*` → `src/shared/types/*` (старые файлы удалены)
- `src/utils/*` → `src/shared/utils/*` (старые файлы удалены)
- `src/hooks/` и `src/lib/` — shim-реэкспорты из `shared/`

**Безопасность:**
- Supabase доступ через JWT (Edge Functions `auth-telegram`, `auth-guest`, `auth-dev`)
- RLS-политики в `002_rls.sql` (claims: `user_id`, `app_role`, `permissions`)
- Toast-уведомления
- `shareService` вынесен в отдельный сервис

### Этап 2 — Монетизация, фаза 1 (`cfb1130`)

- i18n RU/EN + `LanguageSwitcher`
- Каталоги городов/авиакомпаний для валидации (`src/shared/data/`)
- Таблица `subscriptions` (`003_subscriptions.sql`)
- `PLAN_LIMITS` + проверки в UI (`subscriptionLimits.ts`)
- `subscriptionService`, `PlanBadge`

### Этап 3 — Монетизация, фаза 2 (`cef3763`)

- `UpgradeModal` + оплата Telegram Stars
- Edge Function `create-pro-invoice`
- Бот: `pre_checkout_query`, `successful_payment`, `/status`
- Таблица `payment_events` (`004_payment_events.sql`)
- Лимит share-ссылок (free: 1, premium: 5)

### Этап 4 — Полный i18n UI (`1bbd58f`)

- Локализованы HistoryView, sharing-модалки, форма добавления
- `SubscriptionPanel` — статус подписки, срок, кнопка апгрейда

---

## 4. Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Mini App (React)                 │
│  App.tsx → useFlightTracker → services → Supabase REST      │
└──────────────┬──────────────────────────────┬───────────────┘
               │ initData / openInvoice        │ share token
               ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  Supabase Edge Functions │    │   Telegram Bot (polling)    │
│  auth-telegram           │    │   /start, share_*, /status  │
│  auth-guest              │    │   Stars: pre_checkout, paid   │
│  auth-dev                │    └──────────────┬──────────────┘
│  create-pro-invoice      │                   │ service role
└──────────────┬───────────┘                   ▼
               │                    ┌─────────────────────────┐
               ▼                    │  Supabase PostgreSQL    │
┌──────────────────────────────────│  users, user_flights    │
│  JWT session (owner / guest)     │  shared_sessions        │
│  RLS по claims                   │  subscriptions          │
└──────────────────────────────────│  payment_events         │
                                   └─────────────────────────┘
```

### Слои frontend

| Слой | Путь | Назначение |
|------|------|------------|
| Features | `src/features/` | UI по доменам (flights, sharing, guest-mode, subscription) |
| Services | `src/services/` | Бизнес-логика, Supabase CRUD, auth, payments |
| Shared | `src/shared/` | Типы, хуки, утилиты, UI-примитивы, i18n, env |
| Shims | `src/hooks/`, `src/lib/` | Обратная совместимость импортов |

### Точка входа

```
index.tsx
  → i18n init
  → ToastProvider
  → App.tsx
    → useFlightTracker()
      → initializeApp() [appInitService]
      → fetchUserSubscription() [subscriptionService]
```

---

## 5. Структура проекта

```
flight-tracker/
├── .env.example                 # Шаблон env (VITE_* + bot)
├── .env.local                   # Локальные секреты (gitignored)
├── .github/workflows/
│   ├── ci.yml                   # lint → typecheck → test → build
│   └── deploy.yml               # build + gh-pages
├── index.html                   # Vite entry
├── vite.config.ts               # base, aliases, Vitest
├── tsconfig.json
├── eslint.config.mjs
├── package.json                 # v2.0.0
│
├── bot/                         # Отдельный npm-пакет
│   ├── index.js                 # Команды, share tokens, Stars
│   ├── subscriptionPayments.js  # Активация Pro после оплаты
│   ├── validateTelegram.js
│   └── .env                     # BOT_TOKEN, SUPABASE_*, WEBAPP_URL
│
├── docs/
│   ├── HANDOFF.md               # ← этот файл
│   ├── MONETIZATION_ROADMAP.md
│   ├── PAYMENTS.md
│   ├── SUPABASE_SETUP.md
│   └── BACKUP.md
│
├── scripts/
│   └── deploy-supabase.sh       # Деплой всех Edge Functions
│
├── supabase/
│   ├── migrations/              # 001–004 SQL
│   └── functions/               # Deno Edge Functions
│       ├── _shared/             # cors, jwt, telegram helpers
│       ├── auth-telegram/
│       ├── auth-guest/
│       ├── auth-dev/
│       └── create-pro-invoice/
│
├── public/
│   └── manifest.json
│
└── src/
    ├── App.tsx                  # Корень UI: табы, модалки, панели
    ├── index.tsx
    │
    ├── features/
    │   ├── flights/             # AddFlightForm, HistoryView, PriceAnalysis, PriceChartModal
    │   ├── sharing/             # ShareFlightModal, SharedSessionsList, JoinSession*
    │   ├── guest-mode/          # GuestModeIndicator
    │   └── subscription/        # SubscriptionPanel, UpgradeModal
    │
    ├── services/
    │   ├── appInitService.ts    # Bootstrap: token, Telegram/dev/guest auth
    │   ├── authService.ts       # Вызов Edge Functions, установка сессии
    │   ├── dataService.ts       # CRUD рейсов
    │   ├── shareService.ts      # Создание/отзыв share-сессий
    │   ├── shareUrls.ts         # Deep links для Telegram
    │   ├── subscriptionService.ts
    │   ├── paymentService.ts    # Stars invoice + openInvoice
    │   └── __tests__/
    │
    ├── shared/
    │   ├── config/env.ts        # VITE_* + legacy REACT_APP_*
    │   ├── constants/subscription.ts  # PLAN_LIMITS, PRO_PRICING
    │   ├── data/                # cities.ts, airlines.ts
    │   ├── hooks/               # useFlightTracker, useFlightForm, useAutocomplete
    │   ├── lib/                 # supabaseClient, i18n
    │   ├── types/               # Flight, AppUser, SharedSession, ...
    │   ├── ui/                  # AutocompleteInput, Toast, LanguageSwitcher, PlanBadge
    │   └── utils/               # validation, flightAnalysis, telegram*, subscriptionLimits
    │
    ├── hooks/                   # shim → shared/hooks
    ├── lib/                     # shim → shared/lib
    └── styles/                  # tokens.css (Telegram theme)
```

### Удалённые пути (не искать!)

- `src/types/` — перенесено в `src/shared/types/`
- `src/utils/` — перенесено в `src/shared/utils/`
- `craco.config.js` — удалён при миграции на Vite

---

## 6. Пользовательские сценарии

### 6.1 Запуск приложения

```
1. Пользователь открывает Mini App в Telegram (или браузер для dev)
2. appInitService.initializeApp():
   a. Есть token в URL / start_param? → auth-guest → guest JWT
   b. Есть Telegram user (initData)?  → auth-telegram → owner JWT
   c. Браузер без Telegram?           → auth-dev → dev JWT (если ALLOW_DEV_AUTH)
3. loadUserData() → рейсы из user_flights
4. fetchUserSubscription() → план (только для owner)
```

**Источники токена share-ссылки** (`appInitService.getTokenFromUrl`):
- Telegram `start_param` (`share_<token>`)
- Query `?token=...`
- Hash `#token=...` (резерв)

### 6.2 Добавление рейса

```
AddFlightForm → useFlightForm + validation.ts
  → PriceAnalysis (flightAnalysis.ts) — сравнение с лучшей ценой
  → canAddFlightForPlan() — проверка лимитов
  → если лимит → toast + UpgradeModal
  → saveOwnerData / saveGuestData → dataService → Supabase
```

### 6.3 Совместный доступ

**Владелец:**
```
ShareFlightModal → shareService.createShareSession()
  → INSERT shared_sessions
  → ссылка: t.me/<bot>?start=share_<token>
```

**Гость:**
```
Бот /start share_<token>  ИЛИ  WebApp ?token=<token>
  → auth-guest → guest JWT (scope = данные владельца)
  → GuestModeIndicator, вкладка Add отключена при view-only
```

### 6.4 Покупка Pro (только в Telegram Mini App)

```
PlanBadge / UpgradeModal / paywall при лимите
  → paymentService.createProInvoice(period)
  → Edge Function create-pro-invoice → invoice URL
  → WebApp.openInvoice(url)
  → Бот: successful_payment → activateProSubscription()
  → UPDATE subscriptions + INSERT payment_events
  → refreshPlan() в приложении
```

---

## 7. Модели данных

### TypeScript (`src/shared/types/`)

**`Flight`** (`types.ts`) — полная запись рейса:
- `id`, `origin`, `destination`, `type` (oneWay / roundTrip)
- даты/время вылета и возврата, флаги `arrivalNextDay`
- пересадки (`layoverCityThere`, `layoverDurationThere`, ...)
- `airline`, `passengers` (1–4), `totalPrice`, `dateFound`

**`AppUser`** (`shared.ts`) — дискриминированный union:
- `OwnerUser` — `isGuest: false`, `isTelegram: boolean`
- `GuestUser` — `isGuest: true`, `sessionToken`, `permissions`, `ownerId`, `ownerName`

**`SharedSession`** — запись share-ссылки в БД

**`UserSubscription`** (`subscriptionService.ts`):
```typescript
{ plan: 'free' | 'premium'; status: string; expiresAt: string | null }
```

### PostgreSQL (`supabase/migrations/`)

| Таблица | Назначение |
|---------|------------|
| `users` | `user_id` (напр. `tg_12345`, `dev_user_...`), `name` |
| `user_flights` | Один ряд = один рейс, FK → users |
| `shared_sessions` | Токены share-ссылок, permissions, expires_at, is_active |
| `subscriptions` | План, статус, expires_at, provider (Stars) |
| `payment_events` | Идемпотентный лог Stars-платежей (только service role) |

### JWT claims (для RLS)

- `user_id` — ID пользователя
- `app_role` — `owner` | `guest`
- `permissions` — `view` | `edit` (для guest)

---

## 8. Сервисный слой (frontend)

| Файл | Ответственность |
|------|-----------------|
| `appInitService.ts` | Bootstrap, дедупликация init, определение токена, guest/owner/dev режимы |
| `authService.ts` | `authenticateOwner`, `authenticateGuest` → Edge Functions → Supabase session |
| `dataService.ts` | `loadUserData`, `saveOwnerData`, `saveGuestData`, `deleteFlight`; извлечение airlines/cities |
| `shareService.ts` | CRUD share-сессий, проверка лимита ссылок по плану |
| `shareUrls.ts` | Формирование Telegram deep links |
| `subscriptionService.ts` | `fetchUserSubscription` из таблицы `subscriptions` |
| `paymentService.ts` | `createProInvoice`, `openInvoice`, helpers для initData |

### Главный хук: `useFlightTracker`

Файл: `src/shared/hooks/useFlightTracker.ts`

Управляет:
- состоянием пользователя, рейсов, плана
- `handleAddFlight`, `handleDeleteFlight`
- `handleJoinSession`, `handleLeaveGuestMode`
- `refreshPlan`, `chartsEnabled`
- callback `onLimitReached` → открывает UpgradeModal

---

## 9. Supabase: БД, RLS, Edge Functions

### Миграции (выполнять по порядку в SQL Editor)

| Файл | Статус | Содержание |
|------|--------|------------|
| `001_schema.sql` | ✅ выполнена | users, user_flights, shared_sessions |
| `002_rls.sql` | ✅ выполнена | JWT-based RLS, helper functions |
| `003_subscriptions.sql` | ✅ выполнена | subscriptions + RLS + default free для существующих |
| `004_payment_events.sql` | ⚠️ **проверить** | payment_events, без RLS policies (только service role) |

### Edge Functions

| Function | JWT verify | Назначение |
|----------|------------|------------|
| `auth-telegram` | `--no-verify-jwt` | Валидация `initData` → owner JWT |
| `auth-guest` | `--no-verify-jwt` | Валидация share token → guest JWT |
| `auth-dev` | `--no-verify-jwt` | Dev auth в браузере (gated `ALLOW_DEV_AUTH`) |
| `create-pro-invoice` | `--no-verify-jwt` | Создание Telegram Stars invoice link |

**Секреты Edge Functions:**
- `BOT_TOKEN`
- `JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOW_DEV_AUTH` (опционально, для dev)

**Деплой:**
```bash
npm run supabase:deploy
# или
supabase functions deploy create-pro-invoice --no-verify-jwt
```

Подробнее: `docs/SUPABASE_SETUP.md`

---

## 10. Telegram-бот

**Путь:** `bot/index.js`  
**Режим:** polling (webhook — в планах, фаза 3)  
**Зависимости:** отдельный `bot/package.json`

### Команды

| Команда | Действие |
|---------|----------|
| `/start` | Кнопка открытия WebApp |
| `/start share_<token>` | Валидация токена в Supabase, сообщение + WebApp URL с `?token=` |
| `/help` | Справка |
| `/status` | Показать план подписки и дату истечения |

### Обработка платежей Stars

- `pre_checkout_query` — подтверждение invoice
- `successful_payment` → `subscriptionPayments.activateProSubscription()`
  - INSERT в `payment_events` (идемпотентно по `telegram_payment_charge_id`)
  - UPSERT в `subscriptions`

### Конфиг бота (`bot/.env`)

```
BOT_TOKEN=...
WEBAPP_URL=https://kayatkin.github.io/flight-tracker/
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Запуск:**
```bash
cd bot && npm install && npm run dev
```

---

## 11. Монетизация (freemium + Stars)

### Лимиты (`src/shared/constants/subscription.ts`)

| План | Маршруты | Рейсы | Share-ссылки | Графики |
|------|----------|-------|--------------|---------|
| **free** | 3 | 30 | 1 активная | ❌ |
| **premium** | ∞ | ∞ | 5 активных | ✅ |

### Цены (Telegram Stars)

| Период | Stars | Дней |
|--------|-------|------|
| Monthly | 199 | 30 |
| Annual | 999 | 365 |

Определены в `PRO_PRICING` (frontend) и дублируются в `create-pro-invoice` (backend).

### Где проверяются лимиты

- `src/shared/utils/subscriptionLimits.ts` — `canAddFlightForPlan`, `canCreateShareLink`, ...
- `useFlightTracker` — при добавлении рейса
- `shareService` — при создании ссылки
- `PriceChartModal` — графики заблокированы на free (`chartsEnabled`)

### UI монетизации

- `PlanBadge` — бейдж free/pro + подсказки по использованию
- `SubscriptionPanel` — статус, срок, кнопка апгрейда
- `UpgradeModal` — выбор monthly/annual, вызов Stars checkout

### Ручная активация Pro (для тестов)

```sql
UPDATE subscriptions
SET plan = 'premium', status = 'active',
    expires_at = NOW() + INTERVAL '30 days'
WHERE user_id = 'dev_user_...';
-- или tg_<telegram_id>
```

Подробнее: `docs/PAYMENTS.md`, `docs/MONETIZATION_ROADMAP.md`

---

## 12. Интернационализация (i18n)

**Библиотека:** i18next + react-i18next  
**Конфиг:** `src/shared/lib/i18n/config.ts`  
**Локали:**
- `src/shared/lib/i18n/locales/ru.json`
- `src/shared/lib/i18n/locales/en.json`

**Переключатель:** `LanguageSwitcher` в шапке App  
**Сохранение языка:** localStorage

### Что локализовано (фаза 1bbd58f)

- App (заголовок, приветствие, загрузка, табы)
- AddFlightForm (все секции)
- HistoryView (поиск, карточки, пустое состояние)
- Sharing-модалки
- SubscriptionPanel, UpgradeModal, PlanBadge
- Toast-сообщения (через i18n в хуке)

### Что ещё на русском (hardcoded)

- Fallback-имена в `dataService.ts` (owner display names)
- Сообщения бота (`bot/index.js`) — только RU
- Некоторые `console.log` / dev-логи

---

## 13. UI-компоненты

### `App.tsx`

Оркестрирует:
- loading / checking token states
- header: PlanBadge, LanguageSwitcher
- GuestModeIndicator (для гостей)
- SubscriptionPanel (для владельцев)
- UpgradeModal, ShareFlightModal
- табы Add / History

### Features

**flights/**
| Компонент | Описание |
|-----------|----------|
| `AddFlightForm` | Секции: тип, маршрут, дата/время, пересадки, авиакомпания, пассажиры, цена |
| `HistoryView` | SearchBar, DestinationGroup, FlightCard, EmptyState, AccessManagement |
| `PriceAnalysis` | Карточка сравнения цены после добавления |
| `PriceChartModal` | Chart.js сезонный график (gated) |

**sharing/**
- `ShareFlightModal`, `ShareLinkOptions`, `SharedSessionsList`
- `JoinSessionForm`, `JoinSessionModal`

**guest-mode/**
- `GuestModeIndicator`

**subscription/**
- `SubscriptionPanel`, `UpgradeModal`

### Shared UI (`src/shared/ui/`)

- `AutocompleteInput` — автодополнение городов/авиакомпаний
- `Toast` — глобальные уведомления (provider + bus)
- `LanguageSwitcher`
- `PlanBadge`

---

## 14. Конфигурация и переменные окружения

### Frontend (`.env.local`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_TELEGRAM_BOT_USERNAME=my_flight_tracker1_bot
```

Legacy `REACT_APP_*` тоже работают (см. `envPrefix` в `vite.config.ts`).

Централизованный доступ: `src/shared/config/env.ts`

### Vite (`vite.config.ts`)

- `base: '/flight-tracker/'` — для GitHub Pages subpath
- Path aliases: `@`, `@features`, `@shared`, `@services`, `@hooks`, `@lib`
- ⚠️ Устаревшие aliases: `@utils` → `src/utils` (не существует), `@types` → `src/types` (не существует)
- Vitest: jsdom, `setupTests.ts`
- Manual chunk: `charts` (Chart.js)

### GitHub Actions secrets

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — для build
- `TELEGRAM_BOT_USERNAME` — для deploy workflow

---

## 15. Тестирование

**Фреймворк:** Vitest 3 (не Jest!)

### Тестовые файлы (~42 теста)

| Файл | Покрытие |
|------|----------|
| `shared/utils/__tests__/validation.test.ts` | Валидация формы/дат |
| `shared/utils/__tests__/flightAnalysis.test.ts` | Анализ выгодности цены |
| `shared/utils/__tests__/getSeasonalChartData.test.ts` | Данные для графика |
| `shared/utils/__tests__/subscriptionLimits.test.ts` | Freemium-лимиты |
| `shared/utils/__tests__/fieldValidation.test.ts` | Каталоги городов/авиакомпаний |
| `shared/utils/__tests__/id.test.ts` | Генерация UUID/token |
| `services/__tests__/shareService.test.ts` | Share URL building |

### Команды

```bash
npm test              # vitest run
npm run test:watch    # watch mode
npm run typecheck     # tsc -b --noEmit
npm run lint          # eslint .
```

---

## 16. CI/CD и деплой

### CI (`.github/workflows/ci.yml`)

На push/PR в `main`: lint → typecheck → test → build

### Frontend deploy

```bash
npm run build         # dist/
npm run deploy        # gh-pages -d dist
```

GitHub Pages: `https://kayatkin.github.io/flight-tracker/`

### Supabase

```bash
npm run supabase:deploy   # все Edge Functions
npm run supabase:db       # supabase db push (миграции)
```

### Бот

Ручной перезапуск на сервере / локально после изменений в `bot/`.

---

## 17. Технический долг и устаревшая документация

| Проблема | Где | Рекомендация |
|----------|-----|--------------|
| `ARCHITECTURE.md` ссылается на CRA, CRACO, Jest, `REACT_APP_*` | корень | Обновить под Vite/Vitest |
| `README.md` описывает guest mode через localStorage | README §Гостевой режим | Guest mode = share-session JWT; localStorage только для dev user ID и языка |
| `CHANGELOG.md` — только v1.0.0 | корень | Добавить v2.0.0 и монетизацию |
| Aliases `@utils`, `@types` → несуществующие папки | `vite.config.ts`, `tsconfig.json` | Удалить или перенаправить на `@shared` |
| Папка `build/` — артефакт CRA | корень | Можно удалить из репо |
| Двойные пути импорта supabase client | `src/lib/` shim + `src/shared/lib/` | Постепенно унифицировать на `@shared/lib` |
| Hardcoded RU в сервисах и боте | `dataService.ts`, `bot/` | Опционально i18n |
| Бот на polling, не webhook | `bot/index.js` | Фаза 3 roadmap |

---

## 18. Что не проверено / pending

### Supabase

- [ ] **`004_payment_events.sql`** — убедиться, что миграция выполнена в продакшн Supabase
- [ ] **Edge Function `create-pro-invoice`** — убедиться, что задеплоена на прод

### Функциональность

- [ ] **End-to-end оплата Stars** в реальном Telegram Mini App (не проверялась пользователем)
- [ ] **Merge `feature/monetization-i18n` → `main`** — продакшн GitHub Pages ещё на старой версии
- [ ] **Перезапуск бота** после деплоя Stars-обработчиков

### Фаза 3 (опционально, из roadmap)

- [ ] Webhook mode для бота
- [ ] Restore purchases / UI управления подпиской
- [ ] Аналитика (конверсия, MRR proxy через Stars)
- [ ] A/B тест цен Stars
- [x] Полный i18n UI — **сделано**

---

## 19. Следующие шаги

### Приоритет 1 — выкат монетизации

1. Выполнить `004_payment_events.sql` в Supabase SQL Editor (если ещё не сделано)
2. Задеплоить `create-pro-invoice`:
   ```bash
   supabase functions deploy create-pro-invoice --no-verify-jwt
   ```
3. Перезапустить бота (`bot/index.js`)
4. Протестировать Stars checkout в Telegram Mini App
5. Merge PR `feature/monetization-i18n` → `main`
6. `npm run deploy` (или дождаться GitHub Actions deploy)

### Приоритет 2 — стабилизация

1. Обновить `ARCHITECTURE.md`, `CHANGELOG.md`, устаревшие секции `README.md`
2. Убрать мёртвые aliases `@utils` / `@types`
3. Удалить legacy `build/` из репо

### Приоритет 3 — фаза 3

1. Webhook для бота (production scale)
2. Аналитика конверсии
3. i18n бота и сервисных сообщений

---

## 20. Шпаргалка команд

```bash
# Перейти в проект
cd /Users/kaimac/Documents/flight-tracker

# Frontend dev (http://localhost:5173/flight-tracker/)
npm install
npm run dev

# Качество кода
npm test
npm run typecheck
npm run lint

# Сборка и деплой frontend
npm run build
npm run deploy

# Supabase Edge Functions
npm run supabase:deploy

# Бот
cd bot && npm install && npm run dev

# Вернуться к стабильной версии (до монетизации)
git checkout v2.0.0-stable

# Вернуться к текущей разработке
git checkout feature/monetization-i18n
```

### Тест Pro через SQL

```sql
UPDATE subscriptions
SET plan = 'premium', status = 'active',
    expires_at = NOW() + INTERVAL '30 days'
WHERE user_id = 'tg_YOUR_TELEGRAM_ID';
```

---

## Связанная документация

| Файл | Содержание |
|------|------------|
| `README.md` | Обзор, быстрый старт, возможности |
| `ARCHITECTURE.md` | Архитектура (частично устарела) |
| `CONTRIBUTING.md` | Правила контрибуции |
| `docs/MONETIZATION_ROADMAP.md` | Фазы монетизации |
| `docs/PAYMENTS.md` | Настройка Telegram Stars |
| `docs/SUPABASE_SETUP.md` | Продакшн Supabase / RLS |
| `docs/BACKUP.md` | Бекап и откат версий |

---

*Файл создан для сохранения контекста разработки. Обновляйте при значимых изменениях в архитектуре, деплое или roadmap.*
