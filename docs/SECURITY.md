# Безопасность Flight Tracker

Правила для людей, которые деплоят и правят репозиторий. Не кладите в git и в чаты живые токены.

## Что считается секретом

| Секрет | Где живёт | Куда не класть |
|--------|-----------|----------------|
| Telegram `BOT_TOKEN` | `bot/.env`, Supabase secrets | git, Issues, скриншоты логов |
| `SUPABASE_SERVICE_ROLE_KEY` | только Edge Functions (`auth-*`) | фронт, git, бот, чаты |
| `JWT_SECRET` | Supabase secrets | фронт и git |
| `JWT_SIGNING_PRIVATE_JWK` | Supabase secrets (ES256 private JWK) | фронт, git, логи, чаты |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, GitHub Actions secrets | публичные gist; anon + RLS допустим во фронте |
| Share-токен приглашения | одноразовая ссылка | логи, URL после входа |

В репозитории должен быть только `.env.example` с заглушками.

## Production-минимум

1. Миграции `001_schema.sql` … `009_refresh_tokens.sql`.
2. Edge Functions `auth-telegram`, `auth-guest`, `auth-refresh` и `link-email`. Функцию `auth-dev` в production не деплоить.
3. `ALLOW_DEV_AUTH=false`.
4. После любой утечки в git или логах — **сразу ротация**: BotFather → Revoke, Supabase → новый anon/service/JWT, бот и фронт обновить, старые share-ссылки считать скомпрометированными.

История git публичного репозитория может содержать старые `.env`, даже если сейчас их нет в `main`. Ротация важнее rewrite. Если решите чистить историю — это отдельная операция (`git filter-repo`) и все ключи всё равно меняются.

## Клиент

- Autosave пишет только изменённые строки и явные удаления, а не полный снимок истории.
- Удаляются только id, которые этот клиент уже знал, а не «всё, чего нет в локальном снимке».
- Telegram-сессия принимается только с живым `initData` не старше 24 часов.
- Гостевой JWT привязан к `share_session_id` и не живёт дольше сессии (макс. 1 сутки). Access для Telegram/гостя — 1 час; opaque refresh хешируется в `refresh_tokens`, ротируется через `auth-refresh`, повтор отозванного токена закрывает всю family.
- Новые share-ссылки хранят `token_hash`; plaintext остаётся только в ссылке, которую копируют сразу после создания.
- Edit-приглашение привязывается к первому Telegram user id, который его открыл; чужой Telegram получает просмотр.
- CORS Edge Functions — allowlist GitHub Pages и localhost, не `*`.
- Telegram-бот ходит в БД только через RPC `lookup_share_invite` с anon-ключом (или сразу открывает Mini App, если RPC ещё не применён).
- Связка Telegram ↔ email идёт только через `link-email` (service role): клиент не пишет в `user_identities`. Новый email создаётся неподтверждённым; существующий — только после `signInWithPassword`. Два разных Telegram к одному ящику не сливаются.
- Custom access JWT: HS256, пока нет `JWT_SIGNING_PRIVATE_JWK`; иначе ES256 с `kid`. `link-email` проверяет токен в функции (шлюз Auth после ротации ключей не подходит). Legacy JWT Secret пока не отзываем.

Подробный чеклист деплоя: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). Разбор прошлых дыр: [CODE_AUDIT.md](./CODE_AUDIT.md).
