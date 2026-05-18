# Настройка Supabase: RLS + Edge Functions

Пошаговая инструкция для production-безопасности Flight Tracker.

## 1. Установите Supabase CLI

```bash
brew install supabase/tap/supabase
# или: npm install -g supabase
```

## 2. Войдите и привяжите проект

```bash
supabase login
cd /path/to/flight-tracker
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` — из URL дашборда: `https://supabase.com/dashboard/project/<ref>`.

## 3. Секреты Edge Functions

В [Supabase Dashboard → Settings → API](https://supabase.com/dashboard) скопируйте **JWT Secret**.

```bash
supabase secrets set BOT_TOKEN="ваш_токен_от_BotFather"
supabase secrets set JWT_SECRET="ваш_jwt_secret_из_dashboard"
supabase secrets set ALLOW_DEV_AUTH="true"   # только для staging; в production — false
```

`BOT_TOKEN` и `SUPABASE_*` подставляются автоматически при деплое функций.

## 4. Примените миграции БД

**Вариант A — SQL Editor (проще):**

1. Откройте Supabase → SQL Editor.
2. Выполните по порядку:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`

**Вариант B — CLI:**

```bash
supabase db push
```

## 5. Задеплойте Edge Functions

```bash
npm run supabase:deploy
```

Или вручную:

```bash
supabase functions deploy auth-telegram --no-verify-jwt
supabase functions deploy auth-guest --no-verify-jwt
supabase functions deploy auth-dev --no-verify-jwt
```

`--no-verify-jwt` нужен, потому что клиент ещё не авторизован при вызове auth-*.

## 6. Переменные фронтенда

`.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TELEGRAM_BOT_USERNAME=my_flight_tracker1_bot
```

GitHub Actions secrets (уже есть `SUPABASE_URL`, `SUPABASE_ANON_KEY`).

## 7. Проверка

### Telegram (владелец)

1. Откройте Mini App из Telegram.
2. В Network должен быть вызов `auth-telegram` → 200.
3. Добавление рейса сохраняется в `user_flights`.

### Гость по ссылке

1. Создайте share-ссылку.
2. Откройте в браузере или Telegram.
3. Вызов `auth-guest` → 200, данные владельца загружаются.

### Dev (браузер)

1. `ALLOW_DEV_AUTH=true` в secrets.
2. `npm run dev` — автоматически вызывается `auth-dev`.

## 8. Production checklist

| Шаг | Действие |
|-----|----------|
| RLS | Миграция `002_rls.sql` применена |
| Anon key | Нет прямого доступа к таблицам без JWT |
| `ALLOW_DEV_AUTH` | `false` |
| `JWT_SECRET` | Установлен в secrets |
| `BOT_TOKEN` | Совпадает с ботом Mini App |

## Устранение проблем

| Симптом | Решение |
|---------|---------|
| `JWT_SECRET is not set` | `supabase secrets set JWT_SECRET=...` |
| `Invalid Telegram initData` | Проверьте `BOT_TOKEN` (тот же бот, что открывает Mini App) |
| `new row violates row-level security` | Не вызван auth-* или истёк JWT — перезагрузите приложение |
| `Dev auth is disabled` | `ALLOW_DEV_AUTH=true` или откройте через Telegram |

## Архитектура

```
Клиент                    Edge Functions              PostgreSQL + RLS
  │                              │                           │
  ├─ initData ──► auth-telegram ─┤── JWT (owner) ───────────►│ owner policies
  ├─ share token ► auth-guest ───┤── JWT (guest) ───────────►│ guest policies
  └─ dev userId ► auth-dev ──────┘── JWT (owner) ───────────►│ (только staging)
```

JWT содержит `user_id`, `app_role` (`owner` | `guest`), `permissions` (`view` | `edit`).
