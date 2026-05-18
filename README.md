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
- Автозаполнение авиакомпаний из списка ранее использованных
- Учёт количества пассажиров (1–4) и расчёт цены на человека

### 📊 Аналитика цен
- Сравнение цены нового рейса с лучшим ранее сохранённым
- Пороговая классификация: **выгодно / нейтрально / невыгодно** (±500 ₽)
- Сезонный график цен (Chart.js) — минимальная цена по месяцам для каждого типа рейса

### 📱 История в стиле iOS Wallet
- Карточки перелётов с детальной информацией (время, пересадки, авиакомпания)
- Группировка по направлению (origin → destination)
- Поиск по городам и авиакомпаниям
- Индикатор выгоды на каждой карточке

### 👥 Совместный доступ (Sharing)
- Создание **одноразовых ссылок** для доступа к своей истории
- Настройка прав: **только просмотр** или **редактирование**
- Срок действия ссылки (до заданной даты)
- Присоединение по ссылке через Telegram бота

### 🔐 Гостевой режим
- Работа без авторизации (данные в localStorage)
- Индикатор гостевого режима
- Миграция гостевых данных при входе в аккаунт

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
| **CI/CD** | GitHub Actions (lint, test, build) → GitHub Pages |
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
│   │   ├── hooks/                  # Кастомные хуки
│   │   ├── lib/                    # Библиотеки (Supabase client)
│   │   ├── types/                  # TypeScript типы
│   │   ├── ui/                     # Общие UI-компоненты
│   │   └── utils/                  # Утилиты
│   │       ├── flightAnalysis.ts   # Анализ цены
│   │       ├── validation.ts       # Валидация формы
│   │       ├── getSeasonalChartData.ts # Данные для графика
│   │       ├── telegramUtils.ts    # Утилиты Telegram WebApp
│   │       └── __tests__/          # Unit-тесты
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
# Supabase (создайте проект на https://supabase.com)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_TELEGRAM_BOT_USERNAME=my_flight_tracker1_bot
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Telegram Bot (получите токен у @BotFather)
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
WEBAPP_URL=https://your-username.github.io/flight-tracker

# Application
NODE_ENV=development
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

**Production:** обязательно настройте RLS и Edge Functions — см. **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**.

### 4. Запуск в разработке

```bash
# Фронтенд (React dev server)
npm run dev
# → http://localhost:5173/flight-tracker/

# Telegram бот (в другом терминале)
cd bot && npm run dev
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

Проект содержит unit-тесты для ключевых утилит:

| Модуль | Тестов | Описание |
|--------|--------|----------|
| `validation.ts` | 11 | Валидация формы и дат |
| `flightAnalysis.ts` | 10 | Анализ выгоды цены |
| `getSeasonalChartData.ts` | 12 | Подготовка данных для графика |

Запуск: `npm test`

## 📐 Архитектурные принципы

- **Feature-based структура** — код группируется по фичам, а не по типам файлов
- **Shared-модуль** — переиспользуемые компоненты, утилиты, типы и хуки
- **Сервисный слой** — бизнес-логика вынесена из компонентов в сервисы
- **Design tokens** — все цвета, шрифты, отступы и тени вынесены в CSS-переменные
- **Адаптивная тема** — через CSS `[data-tg-theme]` и Telegram Theme API

Подробнее в [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📄 Лицензия

MIT