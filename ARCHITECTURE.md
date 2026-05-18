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

**HistoryView** подкомпоненты:

- `SearchBar` — поиск по городам/авиакомпаниям
- `DestinationGroup` — группировка рейсов по направлению
- `FlightCard` — карточка одного рейса (в стиле iOS Wallet)
- `GuestIndicator` — индикатор гостевого режима
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

- `GuestModeIndicator` — визуальный индикатор, что данные хранятся локально

### `shared/` — переиспользуемый код

#### `shared/hooks/` — кастомные хуки

| Хук | Назначение |
|-----|-----------|
| `useFlightTracker` | Главный хук: управление списком рейсов, добавление/удаление |
| `useFlightForm` | Состояние формы добавления рейса, валидация |
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
| `theme.ts` | Управление темой (светлая/тёмная) |

#### `shared/types/` — типы TypeScript

| Файл | Содержание |
|------|-----------|
| `types.ts` | `Flight`, `UserData`, `UserDataResponse`, `UserConfig` |
| `common.ts` | Общие типы |
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

### Добавление рейса

```
AddFlightForm
  → useFlightForm (валидация: validation.ts)
    → PriceAnalysis (анализ: flightAnalysis.ts)
      → useFlightTracker (сохранение)
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

Тесты используют Jest (встроен в CRA). Расположение:

```
src/shared/utils/__tests__/
├── validation.test.ts
├── flightAnalysis.test.ts
└── getSeasonalChartData.test.ts
```

Тестируются чистые функции (unit-тесты):

- Валидация: проверка всех полей формы, граничные случаи
- Анализ цены: пороги, фильтрация сопоставимых рейсов
- График: расчёт цены на человека, выбор минимальной, правильные месяцы

Запуск: `npm test`

## CI/CD (GitHub Actions)

Файл: `.github/workflows/deploy.yml`

При пуше в `main`:
1. Установка Node.js 18
2. `npm ci`
3. Проверка секретов (SUPABASE_URL, SUPABASE_ANON_KEY, BOT_TOKEN)
4. `npm run build` с подстановкой ENV
5. Деплой на GitHub Pages

## Конфигурация сборки

### CRACO (`craco.config.js`)

Настроены alias'ы для импортов:

```js
'@' → src/
'@features' → src/features/
'@shared' → src/shared/
'@services' → src/services/
'@hooks' → src/hooks/
'@utils' → src/utils/
'@types' → src/types/
'@lib' → src/lib/
```

### TypeScript (`tsconfig.json`)

- Strict mode
- JSX: react-jsx
- Базовый путь: `src`
- Path aliases синхронизированы с CRACO

## Переменные окружения

| Переменная | Клиент/Сервер | Назначение |
|-----------|---------------|------------|
| `REACT_APP_SUPABASE_URL` | Клиент | URL проекта Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | Клиент | Анонимный ключ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Сервер (бот) | Сервисный ключ для операций от имени сервера |
| `BOT_TOKEN` | Сервер (бот) | Токен Telegram бота |
| `WEBAPP_URL` | Сервер (бот) | URL WebApp (для deep-link) |
| `NODE_ENV` | Оба | Окружение (development/production) |

Клиентские переменные должны начинаться с `REACT_APP_` (требование CRA).

## Telegram бот (`bot/`)

Простой Node.js скрипт на `node-telegram-bot-api` в режиме polling.

Обработчики:
- `/start` — приветствие + кнопка WebApp
- `/start share_<token>` — валидация токена через Supabase, показ информации о доступе
- `/help` — справка
- `polling_error` / `webhook_error` — обработка ошибок
- `SIGINT` / `SIGTERM` — graceful shutdown

Не требует отдельного веб-сервера: работает через long-polling к Telegram API.