// bot/index.js
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
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

// Обработчик команды /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(
    chatId,
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