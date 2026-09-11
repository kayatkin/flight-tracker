# Архитектура Flight Tracker

## Общее описание

Flight Tracker — это Telegram Mini App (React SPA), которое работает внутри Telegram WebView и на GitHub Pages как веб-приложение. Бэкенд реализован через Supabase (BaaS). Telegram бот написан на Node.js и обрабатывает команды пользователей, включая deep-linking для совместного доступа.

## Слои приложения

```
┌─────────────────────────────────────────────────────────┐
│                    UI (React-компоненты)                  │
│  features/flights, features/sharing, features/guest-mode  │
├─────────────────────────────────────────────────────────┤
│                 Services (бизнес-логика)                   │
│          dataService.ts, appInitService.ts               │
├─────────────────────────────────────────────────────────┤
│              Shared (переиспользуемый код)                 │
│    hooks, utils, ui, lib, types, styles/tokens           │
├─────────────────────────────────────────────────────────┤
│                    Внешние сервисы                         │
│         Supabase (DB + Auth), Telegram WebApp API        │
└─────────────────────────────────────────────────────────┘
```

## Структура `src/`

### `App.tsx` — корневой компонент

Точка входа в приложение. Управляет:

- Инициализацией (appInitService)
- Состоянием пользователя (гость / авторизован / Telegram)
- Данными рейсов
- Вкладками (AddFlight / History)
- Модальными окнами (график цен, sharing)

### `features/` — фича-модули

Каждая фича инкапсулирует компоненты, относящиеся к одной функциональности.

#### `features/flights/` — основная фича

| Компонент | Назначение |
|-----------|-----------|
| `AddFlightForm/` | Форма добавления рейса: выбор направления, дат, времени, пересадок, авиакомпании, пассажиров, цены |
| `HistoryView/` | История рейсов в виде карточек iOS Wallet: группировка, поиск, сортировка |
| `PriceAnalysis/` | Карточка анализа цены после добавления: выгодно/нейтрально/невыгодно |
| `PriceChartModal/` | Модальное окно с сезонным графиком цен (Chart.js) |

**AddFlightForm** состоит из подкомпонентов:

- `FlightTypeSection` — выбор типа рейса (oneWay / roundTrip)
- `RouteSection` — города вылета и назначения с автозаполнением
- `DateTimeSection` — даты, время, прилёт на следующий день
- `LayoverSection` — пересадки (для каждого направления отдельно)
- `AirlineSection` — авиакомпания с автозаполнением
- `PassengersSection` — количество пассажиров (1–4)
- `PriceSection` — цена билета
- `NotesSection` — необязательная заметка

**HistoryView** подкомпоненты:

- `SearchBar` — поиск, сортировка и экспорт CSV видимых билетов
- `DestinationGroup` — группа маршрута, раскрытие по заголовку
- `FlightCard` — карточка рейса: правка, копия, удаление
- `AccessManagement` — управление доступом (для владельца)

#### `features/sharing/` — совместный доступ

| Компонент | Назначение |
|-----------|-----------|
| `ShareFlightModal/` | Модальное окно создания ссылки для доступа |
| `ShareLinkOptions/` | Настройка прав (view/edit) и срока действия |
| `SharedSessionsList/` | Список активных сессий доступа |
| `JoinSessionForm/` | Форма ввода токена для присоединения |
| `JoinSessionModal/` | Подтверждение присоединения к чужой истории |

#### `features/guest-mode/` — гостевой режим

- `GuestModeIndicator` — индикатор чужой истории (права view/edit)

### `shared/` — переиспользуемый код

#### `shared/hooks/` — кастомные хуки

| Хук | Назначение |
|-----|-----------|
| `useFlightTracker` | Главный хук: список рейсов, add/update/duplicate/delete, autosave |
| `useFlightForm` | Состояние формы добавления рейса, черновик новой записи, валидация |
| `useAutocomplete` | Автозаполнение городов/авиакомпаний |

#### `shared/utils/` — утилиты

| Модуль | Описание |
|--------|----------|
| `validation.ts` | Валидация формы (`validateFlightForm`) и дат (`validateRoundTripDates`) |
| `flightAnalysis.ts` | Анализ цены: сравнение с лучшим ранее, порог ±500₽ |
| `getSeasonalChartData.ts` | Подготовка данных для сезонного графика (min цена по месяцам) |
| `telegramUtils.ts` | Проверка окружения Telegram, извлечение токенов |
| `telegramTokens.ts` | Управление токенами для совместного доступа |
| `telegram.ts` | Инициализация Telegram SDK |
| `flightCsv.ts` | Сборка и скачивание CSV истории |
| `formDraft.ts` | Черновик новой формы в sessionStorage |
| `flightFormMapping.ts` | Билет → поля формы, дублирование с новым UUID |
| `suggestions.ts` | Слияние сохранённых значений с каталогом |

#### `shared/types/` — типы TypeScript

| Файл | Содержание |
|------|-----------|
| `types.ts` | `Flight`, `UserData`, `UserDataResponse`, `UserConfig` |
| `common.ts` | Общие типы (не использовались) | Удалён |
| `shared.ts` | Типы для sharing-функциональности |
| `telegram.d.ts` | Декларации Telegram WebApp API |

#### `shared/lib/` — библиотеки

| Файл | Описание |
|------|----------|
| `supabaseClient.ts` | Инициализация Supabase-клиента с проверкой ENV |
| `i18n/` | Интернационализация (плюрализация, приглашения) |

#### `shared/ui/` — общие UI-компоненты

- `AutocompleteInput` — поле ввода с выпадающим списком подсказок

### `services/` — сервисный слой

| Сервис | Назначение |
|--------|-----------|
| `dataService.ts` | CRUD-операции с рейсами через Supabase. Сохранение/загрузка/удаление. Метаданные: города, авиакомпании |
| `appInitService.ts` | Инициализация приложения: определение окружения (Telegram/веб), загрузка данных пользователя, обработка гостевого режима и токенов доступа |

## Потоки данных

### Добавление и правка рейса

```
AddFlightForm
  → useFlightForm (hydrateFromFlight при правке)
    → validation.ts
      → PriceAnalysis (кроме единственного редактируемого билета)
        → useFlightTracker add | update
          → dataService.ts → Supabase
```

### Загрузка приложения

```
App.tsx → appInitService.ts
  ├─ Определение окружения (telegramUtils.ts)
  │   ├─ Telegram WebApp: авторизация через Telegram
  │   └─ Веб: guest mode или Supabase Auth
  ├─ Проверка токенов доступа (telegramTokens.ts)
  └─ Загрузка данных → dataService.ts → Supabase
```

### Совместный доступ

```
Владелец:
  ShareFlightModal → dataService.ts → Supabase (shared_sessions)
    → Генерация токена
    → Telegram deep-link: https://t.me/bot?start=share_<token>

Гость:
  Telegram bot /start share_<token>
    → Проверка токена в Supabase
      → Кнопка WebApp с URL ?token=<token>
        → appInitService.ts
          → Загрузка чужих данных (view/edit)
```

## Система тем

CSS-переменные определены в `src/styles/tokens.css`:

```css
:root {
  --tg-bg: var(--tg-theme-bg-color, #ffffff);
  --tg-text: var(--tg-theme-text-color, #000000);
  /* ... дизайн-токены ... */
}

[data-tg-theme] {
  /* Тёмная тема через Telegram Theme API */
}
```

- Светлая тема — значения по умолчанию (fallback)
- Тёмная тема — через атрибут `[data-tg-theme]`
- Telegram WebApp автоматически передаёт цвета через CSS-переменные `--tg-theme-*`

## Тестирование

Тесты — Vitest + jsdom. Файлы рядом с модулем: `src/**/__tests__/*.test.ts`.

Запуск: `npm test`. Перед релизом: `npm run lint && npm run typecheck && npm test && npm run build`.

## CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` — на PR в `main`: lint, typecheck, test, build, `npm audit`; отдельно `deno check` functions, тесты бота и RLS на Postgres 15
- `.github/workflows/deploy.yml` — пуш в `main`: сборка Vite и GitHub Pages
- Локально RLS: `npm run test:rls` при доступном Postgres

Node 20. Секреты Pages: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Username бота — `vars.TELEGRAM_BOT_USERNAME`.

## Конфигурация сборки

### Vite (`vite.config.ts`)

`base: '/flight-tracker/'`. Алиасы:

```
@ → src/
@features → src/features/
@shared → src/shared/
@services → src/services/
```

Клиентские переменные: `VITE_*` (legacy `REACT_APP_*` ещё читается).

### TypeScript (`tsconfig.json`)

- Strict mode
- JSX: react-jsx
- Базовый путь: `src`
- Path aliases синхронизированы с Vite

## Переменные окружения

| Переменная | Клиент/Сервер | Назначение |
|-----------|---------------|------------|
| `VITE_SUPABASE_URL` | Клиент | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Клиент | Anon key (RLS обязателен) |
| `VITE_TELEGRAM_BOT_USERNAME` | Клиент | Username бота для share-ссылок |
| `SUPABASE_ANON_KEY` | Сервер (бот) | Lookup приглашения через RPC, без service role |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Только `auth-*` на стороне Supabase, не бот |
| `BOT_TOKEN` | Сервер (бот + Edge Functions) | Токен BotFather |
| `WEBAPP_URL` | Сервер (бот) | URL Mini App |
| `CORS_ALLOWED_ORIGINS` | Edge Functions | Дополнительные origin через запятую |

Шаблон: `.env.example`. Живые значения — [docs/SECURITY.md](./docs/SECURITY.md).

## Telegram бот (`bot/`)

Простой Node.js скрипт на `node-telegram-bot-api` в режиме polling. Lookup приглашения — `fetch` на RPC, без `@supabase/supabase-js` (так бот стартует на Node 20). Если Telegram API недоступен, процесс завершается без fatal-цикла: Mini App разрабатывают через `npm run dev`.

Обработчики:
- `/start` — приветствие + кнопка WebApp
- `/start share_<token>` — опциональная проверка через RPC `lookup_share_invite` (anon key), иначе сразу кнопка Mini App. Токен в текст сообщения не пишется.
- `/help` — справка
- `polling_error` / `webhook_error` — обработка ошибок
- `SIGINT` / `SIGTERM` — graceful shutdown

Не требует отдельного веб-сервера: работает через long-polling к Telegram API.