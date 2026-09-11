# ✈️ Flight Tracker — Telegram Mini App

Приложение для отслеживания выгодных авиабилетов внутри Telegram. Позволяет вести историю перелётов, анализировать цены, строить сезонные графики и делиться историей с другими пользователями.

## 🚀 Демо

Приложение развёрнуто на GitHub Pages и доступно через Telegram WebApp:

**[https://kayatkin.github.io/flight-tracker](https://kayatkin.github.io/flight-tracker)**

## 📋 Возможности

### ✈️ Добавление рейсов
- **Туда** (oneWay) или **Туда-обратно** (roundTrip)
- Поддержка **пересадок** — отдельно для прямого и обратного направления
- **Прилёт на следующий день** (+1) — актуально для ночных рейсов
- Автозаполнение городов и авиакомпаний из сохранённых значений и каталога
- Необязательная заметка к билету
- Черновик новой формы переживает обновление вкладки
- Редактирование и дублирование сохранённого билета
- Индикатор сохранения в шапке (очередь, успех, ошибка с повтором)
- Учёт количества пассажиров (1–4) и расчёт цены на человека

### 📊 Аналитика цен
- Сравнение цены нового рейса с лучшим ранее сохранённым
- Пороговая классификация: **выгодно / нейтрально / невыгодно** (±500 ₽)
- Сезонный график цен (Chart.js) — минимальная цена по месяцам для каждого типа рейса

### 📱 История в стиле iOS Wallet
- Карточки перелётов с детальной информацией (время, пересадки, авиакомпания)
- Группировка по направлению (origin → destination)
- Поиск по городам, авиакомпаниям и заметкам
- Сортировка групп: маршрут, цена, дата поиска
- Редактирование, копия и удаление карточки
- Экспорт видимой истории в CSV (UTF-8 с BOM для Excel)
- Индикатор выгоды на каждой карточке

### 👥 Совместный доступ (Sharing)
- Создание **одноразовых ссылок** для доступа к своей истории
- Настройка прав: **только просмотр** или **редактирование**
- Срок действия ссылки (до заданной даты)
- Присоединение по ссылке через Telegram бота

### 🔐 Гостевой режим
- Вход по одноразовой share-ссылке с правами **просмотр** или **редактирование**
- Данные владельца читаются из Supabase; view-гость не может менять историю
- Индикатор гостевого режима и выход из чужой истории

### 🤖 Telegram бот
- Команда `/start` — открытие WebApp
- Команда `/start share_<token>` — присоединение к чужой истории
- Команда `/help` — справка
- Глубокая интеграция с Telegram WebApp API

### 🎨 Адаптивная тема
- Автоматическая тёмная/светлая тема через Telegram Theme API
- CSS-переменные (design tokens) для всей цветовой палитры
- Анимации и переходы в стиле iOS

## 🛠️ Технологический стек

| Категория | Технологии |
|-----------|------------|
| **Frontend** | React 19, TypeScript 5, CSS Modules |
| **Графики** | Chart.js 4 + react-chartjs-2 |
| **Бэкенд/БД** | Supabase (PostgreSQL) |
| **Бот** | Node.js + node-telegram-bot-api |
| **Сборка** | Vite 6 |
| **Тесты** | Vitest + React Testing Library |
| **CI/CD** | GitHub Actions (lint, test, build, RLS, audit) → GitHub Pages |
| **Хостинг** | GitHub Pages (статический фронт) |

## 📁 Структура проекта

```
flight-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD деплой на GitHub Pages
├── bot/                            # Telegram бот
│   ├── index.js                    # Основной код бота
│   ├── package.json
│   └── .env                        # Конфиг бота (не коммитится)
├── public/                         # Статические файлы
├── src/
│   ├── features/                   # Фича-модули
│   │   ├── flights/                # Основная фича: рейсы
│   │   │   └── components/
│   │   │       ├── AddFlightForm/  # Форма добавления рейса
│   │   │       ├── HistoryView/    # История рейсов
│   │   │       ├── PriceAnalysis/  # Анализ цены
│   │   │       └── PriceChartModal/# Модальное окно с графиком
│   │   ├── guest-mode/             # Гостевой режим
│   │   └── sharing/                # Совместный доступ
│   │       └── components/
│   │           ├── ShareFlightModal/
│   │           ├── SharedSessionsList/
│   │           ├── JoinSessionModal/
│   │           └── ...
│   ├── shared/                     # Общий код
│   │   ├── data/                   # Каталоги городов и авиакомпаний
│   │   ├── hooks/                  # Кастомные хуки
│   │   ├── lib/                    # Библиотеки (Supabase client)
│   │   ├── types/                  # TypeScript типы
│   │   ├── ui/                     # Общие UI-компоненты
│   │   └── utils/                  # Утилиты
│   ├── services/                   # Сервисный слой
│   │   ├── dataService.ts          # CRUD для рейсов
│   │   └── appInitService.ts       # Инициализация приложения
│   ├── styles/                     # CSS переменные и глобальные стили
│   ├── App.tsx                     # Корневой компонент
│   └── index.tsx                   # Точка входа
├── .env.example                    # Пример переменных окружения
├── vite.config.ts                  # Vite + Vitest
├── supabase/migrations/            # SQL-схема и RLS
├── tsconfig.json                   # Конфиг TypeScript
└── package.json
```

## 🚦 Быстрый старт

### Предварительные требования

- Node.js ≥ 18
- npm ≥ 9
- Аккаунт [Supabase](https://supabase.com/) (бесплатный)
- Telegram бот, созданный через [@BotFather](https://t.me/BotFather)

### 1. Установка

```bash
git clone git@github.com:kayatkin/flight-tracker.git
cd flight-tracker

# Установка зависимостей фронтенда
npm install

# Установка зависимостей бота
cd bot && npm install && cd ..
```

### 2. Настройка переменных окружения

Создайте `.env.local` в корне проекта на основе `.env.example`:

```bash
cp .env.example .env.local
```

Заполните значения:

```env
# Frontend (.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_TELEGRAM_BOT_USERNAME=my_flight_tracker1_bot
```

Для бота создайте `bot/.env`:

```bash
cp .env.example bot/.env
```

### 3. Структура базы данных Supabase

Выполните эти SQL-запросы в SQL Editor Supabase:

Выполните миграции из `supabase/migrations/`:

- `001_schema.sql` — таблицы `users`, `user_flights`, `shared_sessions`
- `002_rls.sql` — Row Level Security (обязательно для production)
- `003_guest_session_rls.sql` — гостевой JWT с проверкой сессии
- `004_lookup_share_invite.sql` — RPC для бота без service role

**Production:** обязательно настройте RLS и Edge Functions — см. **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**.

### 4. Запуск в разработке

```bash
# Фронтенд (React dev server) — этого достаточно для локальной разработки Mini App
npm run dev
# → http://localhost:5173/flight-tracker/

# Telegram бот (нужен доступ к api.telegram.org)
cd bot && npm start
```

### 5. Тесты

```bash
npm test
```

## 🚢 Развёртывание

### GitHub Pages (автоматически)

При пуше в ветку `main` GitHub Actions автоматически:
1. Собирает React-приложение
2. Деплоит на GitHub Pages

Необходимые секреты в репозитории (Settings → Secrets and variables → Actions):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `BOT_TOKEN`

### Ручной деплой

```bash
npm run deploy
```

## 🤖 Telegram бот

Бот обрабатывает следующие сценарии:

| Команда | Описание |
|---------|----------|
| `/start` | Приветственное сообщение с кнопкой открытия WebApp |
| `/start share_<token>` | Присоединение к чужой истории по токену |
| `/help` | Справка по доступным командам |

Бот проверяет валидность токена в Supabase, показывает уровень доступа и срок действия ссылки.

Запуск бота на сервере:

```bash
cd bot
npm start  # polling mode
```

## 🧪 Тестирование

Проект содержит unit-тесты для ключевых утилит (`npm test`):

| Модуль | Что проверяем |
|--------|----------------|
| `validation.ts` | Валидация формы и дат round-trip |
| `flightAnalysis.ts` | Сравнение цены с лучшим ранее |
| `getSeasonalChartData.ts` | Данные сезонного графика |
| `flightCsv.ts` / `flightFormMapping.ts` | Экспорт и копирование билета |
| `historyViewHelpers.ts` | Группировка, поиск, плюрализация |

Полный прогон качества: `npm run lint && npm run typecheck && npm test && npm run build`.

## 📐 Архитектурные принципы

- **Feature-based структура** — код группируется по фичам, а не по типам файлов
- **Shared-модуль** — переиспользуемые компоненты, утилиты, типы и хуки
- **Сервисный слой** — бизнес-логика вынесена из компонентов в сервисы
- **Design tokens** — все цвета, шрифты, отступы и тени вынесены в CSS-переменные
- **Адаптивная тема** — через CSS `[data-tg-theme]` и Telegram Theme API

Подробнее в [ARCHITECTURE.md](./ARCHITECTURE.md), [docs/USER_GUIDE.md](./docs/USER_GUIDE.md), [docs/SECURITY.md](./docs/SECURITY.md) и [docs/ROADMAP.md](./docs/ROADMAP.md).

## 📄 Лицензия

MIT