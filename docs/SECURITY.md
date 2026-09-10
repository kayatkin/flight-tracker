# Безопасность Flight Tracker

Правила для людей, которые деплоят и правят репозиторий. Не кладите в git и в чаты живые токены.

## Что считается секретом

| Секрет | Где живёт | Куда не класть |
|--------|-----------|----------------|
| Telegram `BOT_TOKEN` | `bot/.env`, Supabase secrets | git, Issues, скриншоты логов |
| `SUPABASE_SERVICE_ROLE_KEY` | только Edge Functions (`auth-*`) | фронт, git, бот, чаты |
| `JWT_SECRET` | Supabase secrets | фронт и git |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, GitHub Actions secrets | публичные gist; anon + RLS допустим во фронте |
| Share-токен приглашения | одноразовая ссылка | логи, URL после входа |

В репозитории должен быть только `.env.example` с заглушками.

## Production-минимум

1. Миграции `001_schema.sql`, `002_rls.sql`, `003_guest_session_rls.sql`, `004_lookup_share_invite.sql`.
2. Edge Functions `auth-telegram` и `auth-guest`. Функцию `auth-dev` в production не деплоить.
3. `ALLOW_DEV_AUTH=false`.
4. После любой утечки в git или логах — **сразу ротация**: BotFather → Revoke, Supabase → новый anon/service/JWT, бот и фронт обновить, старые share-ссылки считать скомпрометированными.

История git публичного репозитория может содержать старые `.env`, даже если сейчас их нет в `main`. Ротация важнее rewrite. Если решите чистить историю — это отдельная операция (`git filter-repo`) и все ключи всё равно меняются.

## Клиент

- Autosave не стартует, пока загрузка рейсов не успешна.
- Удаляются только id, которые этот клиент уже знал, а не «всё, чего нет в локальном снимке».
- Telegram-сессия принимается только с живым `initData` не старше 24 часов.
- Гостевой JWT привязан к `share_session_id` и не живёт дольше сессии (макс. 1 сутки).
- Telegram-бот ходит в БД только через RPC `lookup_share_invite` с anon-ключом (или сразу открывает Mini App, если RPC ещё не применён).

Подробный чеклист деплоя: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). Разбор прошлых дыр: [CODE_AUDIT.md](./CODE_AUDIT.md).
