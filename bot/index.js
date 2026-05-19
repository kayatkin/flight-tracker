// bot/index.js
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const { activateProSubscription, parseInvoicePayload } = require('./subscriptionPayments');
require('dotenv').config();

// ========== КОНФИГУРАЦИЯ ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

// Supabase клиент
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Проверка обязательных переменных
if (!BOT_TOKEN) {
  console.error('❌ ОШИБКА: BOT_TOKEN не установлен в .env файле');
  console.error('📋 Получите токен у @BotFather командой /newbot');
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.warn('⚠️  ВНИМАНИЕ: WEBAPP_URL не установлен, используем значение по умолчанию');
}

console.log('🚀 Запуск бота...');
console.log(`🌐 WebApp URL: ${WEBAPP_URL}`);

// ========== СОЗДАНИЕ БОТА ==========
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: true,
  request: {
    timeout: 60000 // Таймаут 60 секунд
  }
});

// ========== ФУНКЦИИ БОТА ==========

/**
 * Проверяет валидность токена доступа
 */
async function validateShareToken(token) {
  try {
    const { data, error } = await supabase
      .from('shared_sessions')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.log(`❌ Токен не найден или истек: ${token}`);
      return null;
    }

    console.log(`✅ Токен валиден: ${token}`);
    return data;
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    return null;
  }
}

/**
 * Формирует сообщение с кнопкой WebApp
 */
function createWebAppMessage(tokenData) {
  const webAppUrl = `${WEBAPP_URL}?token=${encodeURIComponent(tokenData.token)}`;
  
  const permissionsText = tokenData.permissions === 'edit' 
    ? '✏️ редактирования' 
    : '👁️ просмотра';
  
  const expiryDate = new Date(tokenData.expires_at).toLocaleDateString('ru-RU');

  return {
    text: `🎉 *Доступ к истории полетов*\n\n` +
          `Владелец предоставил вам доступ для *${permissionsText}*\n\n` +
          `📅 Доступен до: ${expiryDate}\n` +
          `🔐 Токен: \`${tokenData.token.substring(0, 8)}...\`\n\n` +
          `Нажмите кнопку ниже чтобы открыть приложение:`,
    webAppUrl: webAppUrl
  };
}

// ========== ОБРАБОТЧИКИ КОМАНД ==========

// Обработчик /start с токеном
bot.onText(/\/start(.+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1] ? match[1].trim() : '';
  
  console.log(`📩 /start от ${chatId} (${msg.from.first_name}), args: "${args}"`);

  try {
    // Если есть токен в формате share_токен
    if (args.startsWith('share_')) {
      const token = args.replace('share_', '');
      
      // Проверяем токен в базе
      const tokenData = await validateShareToken(token);
      
      if (!tokenData) {
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

      // Создаем сообщение с кнопкой
      const { text, webAppUrl } = createWebAppMessage(tokenData);
      
      // Кнопка WebApp
      const keyboard = {
        inline_keyboard: [[{
          text: '✈️ Открыть историю полетов',
          web_app: { url: webAppUrl }
        }]]
      };

      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

      console.log(`✅ Отправлена кнопка WebApp для токена: ${token}`);

    } else {
      // Обычный /start без токена
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
          reply_markup: {
            inline_keyboard: [[{
              text: '🚀 Открыть приложение',
              web_app: { url: WEBAPP_URL }
            }]]
          }
        }
      );
    }

  } catch (error) {
    console.error('❌ Ошибка обработки /start:', error);
    await bot.sendMessage(
      chatId,
      '😔 *Произошла ошибка*\n\n' +
      'Попробуйте еще раз позже.',
      { parse_mode: 'Markdown' }
    );
  }
});

// Telegram Stars: подтверждение оплаты
bot.on('pre_checkout_query', async (query) => {
  try {
    const parsed = parseInvoicePayload(query.invoice_payload);
    if (!parsed) {
      await bot.answerPreCheckoutQuery(query.id, false, {
        error_message: 'Некорректный счёт. Откройте оплату из приложения Flight Tracker.',
      });
      return;
    }
    await bot.answerPreCheckoutQuery(query.id, true);
  } catch (err) {
    console.error('[payment] pre_checkout_query error:', err);
    await bot.answerPreCheckoutQuery(query.id, false, {
      error_message: 'Ошибка проверки платежа. Попробуйте позже.',
    });
  }
});

bot.on('message', async (msg) => {
  const payment = msg.successful_payment;
  if (!payment) return;

  const chatId = msg.chat.id;
  const parsed = parseInvoicePayload(payment.invoice_payload);

  if (!parsed) {
    console.error('[payment] invalid payload:', payment.invoice_payload);
    await bot.sendMessage(chatId, '❌ Оплата получена, но не удалось активировать Pro. Напишите в поддержку.');
    return;
  }

  try {
    const result = await activateProSubscription(supabase, {
      userId: parsed.userId,
      period: parsed.period,
      chargeId: payment.telegram_payment_charge_id,
      starsAmount: payment.total_amount,
    });

    const expiry = result.expiresAt
      ? new Date(result.expiresAt).toLocaleDateString('ru-RU')
      : '—';

    await bot.sendMessage(
      chatId,
      `✅ *Flight Tracker Pro активирован!*\n\n` +
        `📅 Действует до: ${expiry}\n\n` +
        `Перезапустите мини-приложение, чтобы увидеть все функции.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[payment] successful_payment error:', err);
    await bot.sendMessage(
      chatId,
      '😔 Оплата прошла, но активация задержалась. Напишите /status через минуту или обратитесь в поддержку.'
    );
  }
});

// Статус подписки
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = `tg_${msg.from.id}`;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      await bot.sendMessage(chatId, '📋 Подписка: *Free* (запись не найдена)', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const planLabel = data.plan === 'premium' ? 'Pro ⭐' : 'Free';
    const expiry = data.expires_at
      ? new Date(data.expires_at).toLocaleString('ru-RU')
      : 'без срока';

    await bot.sendMessage(
      chatId,
      `📋 *Ваш тариф:* ${planLabel}\n` +
        `📌 Статус: \`${data.status}\`\n` +
        `📅 Истекает: ${expiry}`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[status] error:', err);
    await bot.sendMessage(chatId, '😔 Не удалось получить статус подписки.');
  }
});

// Обработчик команды /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(
    chatId,
    '📋 *Доступные команды:*\n\n' +
    '/start - Начать работу\n' +
    '/status - Тариф Pro / Free\n' +
    '/help - Эта справка\n\n' +
    '🔗 *Ссылки для доступа:*\n' +
    'Для присоединения к чужой истории используйте ссылку от владельца.\n\n' +
    '📱 *WebApp:*\n' +
    'Основной функционал доступен в WebApp.',
    { parse_mode: 'Markdown' }
  );
});

// ========== ОБРАБОТКА ОШИБОК ==========

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling Telegram:', error.message);
  if (error.code === 'EFATAL') {
    console.error('❌ Критическая ошибка, перезапуск...');
    setTimeout(() => process.exit(1), 5000);
  }
});

bot.on('webhook_error', (error) => {
  console.error('❌ Ошибка webhook:', error.message);
});

// ========== ЗАПУСК БОТА ==========

// Получаем информацию о боте
bot.getMe().then((botInfo) => {
  console.log(`🤖 Бот запущен: @${botInfo.username}`);
  console.log(`👤 Имя бота: ${botInfo.first_name}`);
  console.log(`📡 Режим: polling`);
  console.log('✅ Готов к работе!');
}).catch((error) => {
  console.error('❌ Ошибка при получении информации о боте:', error);
  process.exit(1);
});

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал завершения...');
  bot.stopPolling();
  process.exit(0);
});