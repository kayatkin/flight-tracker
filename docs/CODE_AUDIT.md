# Аудит Flight Tracker

Полный разбор кодовой базы: что было сломано, что исправлено в этом изменении, и какие мировые практики ещё можно применить **без переписывания** продукта.

Действующее поведение владельца (добавить рейс → история → шаринг) сохранено. Меняются только аварийные и небезопасные пути.

## Что исправлено сейчас

| Риск | Было | Стало |
|------|------|--------|
| Потеря всех рейсов | Ошибка загрузки = пустой список, через 2 с autosave удалял строки в БД | `loadUserData` возвращает `ok: false`; autosave не стартует, пока данные не загружены успешно |
| Last-writer-wins | `DELETE ... NOT IN (локальный снимок)` стирал чужие рейсы | Удаляются только **известные этому клиенту** id |
| Нестабильные id | `Date.now()` → на каждом save новый UUID | UUID v4 при создании рейса |
| Браузер = Telegram | Любой `window.Telegram.WebApp` считался Mini App | Telegram только при реальных launch data (`initData`) |
| Утечка share-токена | Токен в `console.log`, URL и sessionStorage-флаге | Редакция логов, токен сразу убирается из URL |
| Отозванный гость | JWT жил 7 дней, RLS не смотрел `shared_sessions` | В JWT есть `share_session_id`, TTL ≤ остатка сессии (макс. 1 сутки), RLS проверяет активность |
| Replay Telegram | `initData` принимался бессрочно | `auth_date` не старше 24 часов, сравнение HMAC без утечки по времени |
| `auth-dev` в prod | Всегда деплоился | Деплой только при `DEPLOY_AUTH_DEV=true` |
| View-гость на форме | Вкладка «Добавить» открывалась и принимала локальные данные | Сразу история, мутации заблокированы |
| Ссылки шаринга | Хардкод бота / origin | Единый `buildShareUrl` |
| Даты | `toISOString()` сдвигает день в отрицательных TZ | Локальный `YYYY-MM-DD` |
| Поиск / группировка | Группы только по destination | `origin → destination`, поиск ещё и по авиакомпании |

После выката фронта нужно применить миграцию `003_guest_session_rls.sql` и задеплоить Edge Functions `auth-telegram` / `auth-guest`.

## Оставшиеся улучшения (не ломают продукт, делать отдельно)

Это мировой стандарт для Mini App + BaaS, но каждое изменение либо операционное, либо требует отдельного окна миграции.

1. **Asymmetric JWT Supabase** вместо общего HS256 `JWT_SECRET`. Dual-key, `kid`, ротация.
2. **Хеш share-токена в БД** (`token_hash`), в ссылке — plaintext один раз.
3. **Привязка edit-приглашения к Telegram user id**, а не «любой подписанный пользователь».
4. **Пер-операционный CRUD** вместо snapshot-save (добавить/удалить одну строку).
5. **Настоящий refresh** (GoTrue session) вместо копии access JWT.
6. **CORS allowlist** origin Mini App / GitHub Pages вместо `*`.
7. **Доступный modal/dialog** с focus trap, Escape, `inert` на фоне.
8. **Тема**: `data-theme=light|dark` из `colorScheme`, слушать `themeChanged`.
9. **i18n-каталог** вместо строк в JSX (сейчас продукт только на русском).
10. **CI для Deno functions + RLS** на эфемерной Postgres и `npm audit` в pipeline.
11. **Обновить бот** с `node-telegram-bot-api@0.61` на актуальный клиент; убрать service role, читать токен через RPC.
12. **Не деплоить фронт**, если lint/test красные.

## Файл за файлом

### Корень и инфраструктура

| Файл | Назначение | Проблема | Решение |
|------|------------|----------|---------|
| `package.json` | React 19 + Vite 6 + Vitest | Нет coverage/`check`; неиспользуемый `@telegram-apps/sdk` тянет advisory | Оставить SDK на отдельный рефакторинг; тесты расширены |
| `vite.config.ts` | Сборка, aliases, `envPrefix` | `REACT_APP_*` может утечь в бандл | Не трогали префикс, чтобы не сломать legacy env |
| `tsconfig.json` | Strict TS только для `src` | Конфиги не проверяются | Ок для текущего контура |
| `eslint.config.mjs` | Lint фронта | `bot/**` и `supabase/functions/**` игнорируются | Отдельный job — следующий шаг |
| `index.html` | Telegram script | Нет CSP | CSP после выноса inline-стилей |
| `public/manifest.json` | PWA | CRA sample, битые иконки | Имя приложения, без фейковых иконок |
| `.github/workflows/deploy.yml` | Pages | Деплой без обязательного CI | Рекомендация: `needs: ci` |
| `.github/workflows/ci.yml` | lint/test/build | Нет аудита бэкенда | Рекомендация: Deno + RLS job |
| `scripts/deploy-supabase.sh` | Деплой functions | Всегда деплоил `auth-dev` | Skip по умолчанию |
| `docs/SUPABASE_SETUP.md` | Прод-инструкция | Копипаста включала `ALLOW_DEV_AUTH=true` | Staging отдельно, добавлен `003` |

### `src/services`

| Файл | Проблема | Решение |
|------|----------|---------|
| `dataService.ts` | Пустая загрузка при ошибке; wipe всей таблицы; prune `NOT IN` | `ok`, prune известных id, UUID сохраняется |
| `appInitService.ts` | Логи токена; boolean `processed_invitation_token`; браузер как Telegram | Без логов секретов; in-memory promise; `initData` |
| `authService.ts` | Access JWT как refresh | `autoRefreshToken: false` на клиенте |
| `shareService.ts` | Ок | Без ломающих правок |
| `shareUrls.ts` | Хардкод origin/бота | Origin из `window`, бот из env |

### `src/shared`

| Файл | Проблема | Решение |
|------|----------|---------|
| `hooks/useFlightTracker.ts` | Autosave сразу после load; токен в URL после join | Hydration flag, dirty save, `clearTokenFromUrl` |
| `hooks/useFlightForm.ts` | `Date.now()` id, UTC дата | UUID + local date |
| `utils/telegramUserType.ts` | SDK ⇒ Mini App | Только launch data |
| `utils/telegramUtils.ts` | Логи токена | Возврат без логов |
| `utils/logger.ts` | Секреты в console | `redactSecrets` |
| `utils/validation.ts` | Пробелы, Infinity, нет airline | Trim, `Number.isFinite`, airline |
| `utils/id.ts` | Math.random fallback для share token | Share token требует Web Crypto |
| `utils/url.ts` | Стирает весь query/hash | Удаляет только token-параметры |
| `utils/getSeasonalChartData.ts` | UTC parse месяца | Разбор `YYYY-MM-DD` |
| `lib/supabaseClient.ts` | `createClient('', '')`; auto refresh | Placeholder URL, без refresh |
| `config/env.ts` | Варн только в DEV | Варн всегда |
| `ui/AutocompleteInput` | Дублирующийся `id` | `useId()` |

### Фичи UI

| Файл | Проблема | Решение |
|------|----------|---------|
| `App.tsx` | View-гость на add | Редирект на историю |
| `AddFlightForm` | Таймер после unmount, форма не сбрасывалась | cleanup + `resetForm` |
| `JoinSessionForm` | Не парсил `startapp` | `extractShareToken` |
| `JoinSessionModal` | Закрытие до завершения join | `await onJoin` |
| `SharedSessionsList` | Хардкод бота, лог URL | `buildShareUrl` |
| `HistoryView` | Поиск только по ключу группы | Origin/destination/airline |
| `historyViewHelpers` | Группа = destination | `origin → destination` |

### Supabase

| Файл | Проблема | Решение |
|------|----------|---------|
| `001_schema.sql` | Plaintext token, нет FK на owner | Следующий этап (миграция данных) |
| `002_rls.sql` | Гость = claims JWT | Дополнено `003` |
| `003_guest_session_rls.sql` | — | Новая проверка сессии, legacy JWT без claim ещё работают |
| `_shared/telegram.ts` | Нет TTL, `===` для HMAC | `auth_date` + timing-safe |
| `_shared/jwt.ts` | Claims могли перекрыть `role`; guest TTL 7д | Reserved claims последними |
| `auth-guest` | 7д JWT, `expires_in: 1д` | TTL = min(1д, остаток сессии) + `share_session_id` |
| `auth-telegram` | JWT даже если upsert users упал | Ошибка 500 |
| `auth-dev` | Account takeover если секрет true | Не деплоить в prod |
| `_shared/cors.ts` | `*` | Не сужали, чтобы не сломать WebView |

### Бот

| Файл | Проблема | Решение |
|------|----------|---------|
| `bot/index.js` | Токены в логах; service role | Логи без токена; service role — отдельный рефакторинг |
| `bot/validateTelegram.js` | Мёртвый код без `auth_date` | Не подключали, чтобы не плодить второй валидатор |
| `bot/package.json` | `node-telegram-bot-api@0.61` | Обновление — отдельный PR с тестами бота |

CSS-модули содержат много мёртвых селекторов и дубли theme override — чистить постепенно, не пакетом: легко сломать визуал Telegram.
