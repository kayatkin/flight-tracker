const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const {
  parseStartPayload,
  buildShareWebAppUrl,
  buildInviteCopy,
  buildOpenInviteCopy,
  webAppKeyboard,
  isTelegramUnreachable,
  lookupShareInvite,
} = require('./invite');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set in bot/.env');
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.warn('WEBAPP_URL is not set, /start will not have a WebApp button');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is ignored. Use SUPABASE_ANON_KEY and migration 004.');
}

const inviteLookup = {
  supabaseUrl: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
  request: {
    timeout: 60000,
  },
});

bot.onText(/\/start(.+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const payload = parseStartPayload(match[1]);

  console.log(` /start from ${chatId}, kind=${payload.kind}`);

  try {
    if (payload.kind === 'invalid') {
      await bot.sendMessage(
        chatId,
        '❌ *Ссылка недействительна*\n\nЗапросите новую ссылку у владельца.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (payload.kind === 'share') {
      if (!WEBAPP_URL) {
        await bot.sendMessage(chatId, 'WebApp URL не настроен.');
        return;
      }

      const invite = await lookupShareInvite(payload.token, inviteLookup);
      if (invite.status === 'invalid') {
        await bot.sendMessage(
          chatId,
          '❌ *Ссылка недействительна*\n\n' +
            'Возможные причины:\n' +
            '• Ссылка просрочена\n' +
            '• Доступ был отозван\n' +
            '• Некорректная ссылка\n\n' +
            'Запросите новую ссылку у владельца.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const webAppUrl = buildShareWebAppUrl(WEBAPP_URL, payload.token);
      const text = invite.status === 'ok'
        ? buildInviteCopy(invite.permissions, invite.expires_at)
        : buildOpenInviteCopy();

      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: webAppKeyboard(webAppUrl, '✈️ Открыть историю полетов'),
        disable_web_page_preview: true,
      });
      return;
    }

    await bot.sendMessage(
      chatId,
      '👋 *Привет! Я бот для отслеживания перелетов*\n\n' +
        'Я помогу вам:\n' +
        '• ✈️ Вести историю перелетов\n' +
        '• 👥 Делиться историей с друзьями\n' +
        '• 📊 Анализировать перелеты\n\n' +
        'Чтобы начать, откройте WebApp:',
      {
        parse_mode: 'Markdown',
        reply_markup: WEBAPP_URL
          ? webAppKeyboard(WEBAPP_URL, '🚀 Открыть приложение')
          : undefined,
      }
    );
  } catch (error) {
    console.error('/start failed');
    await bot.sendMessage(
      chatId,
      '😔 *Произошла ошибка*\n\nПопробуйте еще раз позже.',
      { parse_mode: 'Markdown' }
    );
  }
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '📋 *Доступные команды:*\n\n' +
      '/start - Начать работу\n' +
      '/help - Эта справка\n\n' +
      '🔗 *Ссылки для доступа:*\n' +
      'Для присоединения к чужой истории используйте ссылку от владельца.\n\n' +
      '📱 *WebApp:*\n' +
      'Основной функционал доступен в WebApp.',
    { parse_mode: 'Markdown' }
  );
});

function logTelegramUnreachable() {
  console.error('Cannot reach api.telegram.org (timeout or blocked network).');
  console.error('The Mini App does not need the bot: from the repo root run `npm run dev`.');
}

bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error.message);
  if (isTelegramUnreachable(error)) {
    logTelegramUnreachable();
    setTimeout(() => process.exit(0), 1000);
    return;
  }
  if (error.code === 'EFATAL') {
    setTimeout(() => process.exit(1), 5000);
  }
});

bot.on('webhook_error', (error) => {
  console.error('Telegram webhook error:', error.message);
});

bot.getMe().then((botInfo) => {
  console.log(`Bot started @${botInfo.username}`);
}).catch((error) => {
  console.error('getMe failed:', error.message);
  if (isTelegramUnreachable(error)) {
    logTelegramUnreachable();
    process.exit(0);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stopPolling();
  process.exit(0);
});
