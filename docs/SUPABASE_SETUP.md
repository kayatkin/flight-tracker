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

`JWT_SIGNING_PRIVATE_JWK` пока не ставьте: без него functions подписывают HS256, как раньше. Импорт ES256-ключа — отдельный шаг после деплоя кода, см. раздел 9. Не кладите private JWK в git, `.env.local` и чаты.

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
    - `supabase/migrations/009_refresh_tokens.sql` (opaque refresh для Telegram/гостя)

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
supabase functions deploy auth-refresh --no-verify-jwt
supabase functions deploy link-email --no-verify-jwt
```

`--no-verify-jwt` нужен для `auth-*`, потому что клиент ещё не авторизован. Для `link-email` шлюз тоже выключен: после ротации signing keys gateway-verify ломается, а владелец проверяется внутри функции (`verifyOwnerToken`).

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
5. Задеплоить `link-email` с `--no-verify-jwt` (`npm run supabase:deploy`). Проверка владельца — в `verifyOwnerToken`.

После `008` email-JWT получает канонический `user_id` из `user_identities`. Telegram `auth-telegram` тоже выдаёт этот id. Связка: Mini App → **Аккаунт** → email + пароль. Два Telegram к одному email не сливаются.

## 8. Production checklist

| Шаг | Действие |
|-----|----------|
| RLS | Миграции `002`–`009` применены |
| Anon key | Нет прямого доступа к таблицам без JWT |
| `ALLOW_DEV_AUTH` | `false` |
| `auth-dev` | Не задеплоен в production |
| `JWT_SECRET` | Установлен в secrets (пока не отзываем, даже после ES256) |
| `BOT_TOKEN` | Совпадает с ботом Mini App |
| `link-email` | Задеплоен с `--no-verify-jwt`; проверка JWT внутри функции |
| Отзыв шаринга | После revoke гостевой JWT с `share_session_id` теряет доступ |

## Устранение проблем

| Симптом | Решение |
|---------|---------|
| `JWT_SECRET is not set` | `supabase secrets set JWT_SECRET=...` (нужен, пока нет `JWT_SIGNING_PRIVATE_JWK`) |
| `JWT_SIGNING_PRIVATE_JWK is not valid JSON` | Секрет должен быть одним JSON-объектом JWK, в одинарных кавычках в shell |
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

Custom JWT от `auth-*` подписывается HS256 (`JWT_SECRET`) или ES256 (`JWT_SIGNING_PRIVATE_JWK` + `kid`). Issuer остаётся `supabase`, чтобы не путать с GoTrue `…/auth/v1`.

## 9. Asymmetric JWT (отдельный шаг после деплоя кода)

Это **не** часть `git pull`. Сначала выкатайте functions из раздела 5 — они уже умеют dual-key. Пока `JWT_SIGNING_PRIVATE_JWK` не задан, подпись остаётся HS256.

Когда будете готовы включить ES256:

1. Сгенерируйте ключ локально (private JWK целиком сохраните у себя, Dashboard его обратно не отдаст):

   ```bash
   supabase gen signing-key --algorithm ES256
   ```

2. Dashboard → Project Settings → JWT Keys → **Import** этот JWK как **standby** (не сразу current).
3. Тот же JSON положите в секрет функции:

   ```bash
   supabase secrets set JWT_SIGNING_PRIVATE_JWK='{"kty":"EC","kid":"...","crv":"P-256","x":"...","y":"...","d":"..."}'
   ```

   Опционально `JWT_SIGNING_KID`, если `kid` в JSON другой.
4. Подождите не меньше ~20 минут: JWKS на Edge кэшируется (~10 мин), плюс запас.
5. В Dashboard нажмите **Rotate**, чтобы standby стал current. GoTrue и PostgREST начнут принимать ES256; старые HS256 access ещё живут до `exp` (1 час), refresh выдаст уже ES256.
6. **Не отзывайте** legacy JWT Secret на этом шаге. Отзыв и переход на publishable/`sb_` ключи — отдельное явное «да»: GitHub Pages сейчас ходит с JWT-based `VITE_SUPABASE_ANON_KEY`.

После Rotate не включайте снова gateway «Verify JWT» на `link-email`.
