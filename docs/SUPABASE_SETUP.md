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
supabase secrets set ALLOW_DEV_AUTH="false"
```

Для staging-окружения (не production) можно отдельно включить `ALLOW_DEV_AUTH=true` и задеплоить `auth-dev` через `DEPLOY_AUTH_DEV=true`.

Опционально сузить CORS ещё сильнее:

```bash
supabase secrets set CORS_ALLOWED_ORIGINS="https://kayatkin.github.io,http://localhost:5173"
```

По умолчанию разрешены GitHub Pages и локальный Vite.

`BOT_TOKEN` и `SUPABASE_*` подставляются автоматически при деплое функций.

## 4. Примените миграции БД

**Вариант A — SQL Editor (проще):**

1. Откройте Supabase → SQL Editor.
2. Выполните по порядку:
    - `supabase/migrations/001_schema.sql`
    - `supabase/migrations/002_rls.sql`
    - `supabase/migrations/003_guest_session_rls.sql`
    - `supabase/migrations/004_lookup_share_invite.sql`
    - `supabase/migrations/005_flight_notes.sql`
    - `supabase/migrations/006_share_token_hash.sql` (lookup uses `search_path = public, extensions`, because on Supabase `digest` is in `extensions`)
    - `supabase/migrations/007_email_owner_auth.sql` (`is_owner()` для GoTrue JWT; `custom_access_token_hook`)
    - `supabase/migrations/008_user_identities.sql` (связка Telegram ↔ email, канонический `user_id` в хуке)

**Вариант B — CLI:**

```bash
supabase db push
```

## 5. Задеплойте Edge Functions

```bash
npm run supabase:deploy
```

`auth-dev` по умолчанию **не деплоится**. Для staging:

```bash
DEPLOY_AUTH_DEV=true npm run supabase:deploy
```

Или вручную:

```bash
supabase functions deploy auth-telegram --no-verify-jwt
supabase functions deploy auth-guest --no-verify-jwt
supabase functions deploy link-email
```

`--no-verify-jwt` нужен для `auth-*`, потому что клиент ещё не авторизован. `link-email` деплоится **с** проверкой JWT (владелец уже вошёл).

## 6. Переменные фронтенда

`.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
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

1. `ALLOW_DEV_AUTH=true` в secrets и `DEPLOY_AUTH_DEV=true` при деплое функций.
2. `npm run dev` → на экране входа кнопка **Войти как разработчик** (автоматически `auth-dev` больше не вызывается).

### Email (браузер)

Это настройки **Dashboard**, CLI их не включает.

1. Authentication → Providers → **Email** включён (Confirm email — по желанию).
2. Authentication → URL Configuration:
   - Site URL: `https://kayatkin.github.io/flight-tracker/`
   - Redirect URLs: `https://kayatkin.github.io/flight-tracker/`, `https://kayatkin.github.io/flight-tracker/**`, `http://localhost:5173/flight-tracker/`, `http://localhost:5173/flight-tracker/**`
3. Authentication → Hooks → **Custom Access Token** → `custom_access_token_hook` (после `007`; `008` только обновляет функцию).
4. Применить миграции `007_email_owner_auth.sql` и `008_user_identities.sql`.
5. Задеплоить `link-email` **без** `--no-verify-jwt` (`npm run supabase:deploy`).

После `008` email-JWT получает канонический `user_id` из `user_identities`. Telegram `auth-telegram` тоже выдаёт этот id. Связка: Mini App → **Аккаунт** → email + пароль. Два Telegram к одному email не сливаются.

## 8. Production checklist

| Шаг | Действие |
|-----|----------|
| RLS | Миграции `002`, `003`, `004_lookup_share_invite.sql`, `005_flight_notes.sql`, `006_share_token_hash.sql`, `007_email_owner_auth.sql`, `008_user_identities.sql` применены |
| Anon key | Нет прямого доступа к таблицам без JWT |
| `ALLOW_DEV_AUTH` | `false` |
| `auth-dev` | Не задеплоен в production |
| `JWT_SECRET` | Установлен в secrets |
| `BOT_TOKEN` | Совпадает с ботом Mini App |
| `link-email` | Задеплоен **с** проверкой JWT |
| Отзыв шаринга | После revoke гостевой JWT с `share_session_id` теряет доступ |

## Устранение проблем

| Симптом | Решение |
|---------|---------|
| `JWT_SECRET is not set` | `supabase secrets set JWT_SECRET=...` |
| `Invalid Telegram initData` | Проверьте `BOT_TOKEN` (тот же бот, что открывает Mini App) |
| `new row violates row-level security` | Не вызван auth-* или истёк JWT — перезагрузите приложение |
| `Dev auth is disabled` | `ALLOW_DEV_AUTH=true` или откройте через Telegram |

## Архитектура

```
Клиент                    Edge Functions / GoTrue     PostgreSQL + RLS
  │                              │                           │
  ├─ initData ──► auth-telegram ─┤── JWT (owner) ───────────►│ owner policies
  ├─ share token ► auth-guest ───┤── JWT (guest) ───────────►│ guest policies
  ├─ email/password ► GoTrue ────┤── JWT (owner) ───────────►│ owner policies
  ├─ Аккаунт ► link-email ───────┤── identities + merge ────►│ канонический user_id
  └─ dev userId ► auth-dev ──────┘── JWT (owner) ───────────►│ (только staging)
```

JWT содержит `user_id`, `app_role` (`owner` | `guest`), `permissions` (`view` | `edit`) и для гостей `share_session_id`.
Email GoTrue JWT до включения хука может быть без `app_role`; `is_owner()` это учитывает.
