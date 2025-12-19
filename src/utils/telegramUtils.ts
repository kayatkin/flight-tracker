// src/utils/telegramUtils.ts

/**
 * Проверяет, открыто ли приложение внутри Telegram WebApp
 */
export const isInTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Способ 1: Стандартная проверка через Telegram WebApp SDK
  if (window.Telegram?.WebApp?.initData) {
    return true;
  }
  
  // Способ 2: Проверка параметров URL для прямого открытия WebApp
  const urlParams = new URLSearchParams(window.location.search);
  const tgWebAppStartParam = urlParams.get('tgWebAppStartParam');
  
  // Способ 3: Проверка hash параметров
  let hashStartParam = null;
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    hashStartParam = hashParams.get('tgWebAppStartParam');
  }
  
  return !!(tgWebAppStartParam || hashStartParam);
};

/**
 * Проверяет, является ли устройство мобильным
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Перенаправляет в Telegram для прямого открытия WebApp (без запущенного бота)
 */
export const redirectToTelegramForEdit = (token: string): void => {
  const BOT_USERNAME = 'my_flight_tracker1_bot';
  
  // ========== КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ==========
  // Формат для прямого открытия WebApp в Telegram
  // Telegram автоматически покажет кнопку "Open" при таком формате
  const telegramUrl = `https://t.me/${BOT_USERNAME}/flight_tracker?startapp=share_${token}`;
  
  console.log('[TELEGRAM] Opening WebApp directly:', telegramUrl);
  console.log('[TELEGRAM] Bot does not need to be running!');
  
  // Пытаемся открыть через tg:// протокол для лучшего UX на мобильных
  if (isMobileDevice()) {
    try {
      // Пытаемся открыть через tg:// (работает лучше на мобильных)
      const tgProtocolUrl = `tg://resolve?domain=${BOT_USERNAME}&startapp=share_${token}`;
      
      // Создаем невидимый iframe для открытия tg://
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = tgProtocolUrl;
      document.body.appendChild(iframe);
      
      // Fallback на https://t.me/ ссылку через 250ms
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.location.href = telegramUrl;
      }, 250);
      
    } catch (error) {
      console.error('[TELEGRAM] tg:// protocol failed, falling back:', error);
      window.location.href = telegramUrl;
    }
  } else {
    // Для десктопа - показываем инструкцию
    showDesktopInstructions(token, telegramUrl);
  }
};

/**
 * Получает токен из Telegram WebApp параметров
 * Работает при прямом открытии WebApp через startapp
 */
export const getTokenFromTelegramStartParam = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Проверяем параметры URL
  const urlParams = new URLSearchParams(window.location.search);
  let startParam = urlParams.get('tgWebAppStartParam');
  
  // Если не нашли в query params, проверяем hash
  if (!startParam && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    startParam = hashParams.get('tgWebAppStartParam');
  }
  
  // Обрабатываем параметр startapp
  if (startParam && startParam.startsWith('share_')) {
    const token = startParam.replace('share_', '');
    console.log('[TELEGRAM] Found token from start param:', token);
    return token;
  }
  
  // Также проверяем обычный токен в URL (для совместимости)
  const regularToken = urlParams.get('token');
  if (regularToken) {
    console.log('[TELEGRAM] Found regular token from URL:', regularToken);
    return regularToken;
  }
  
  return null;
};

/**
 * Проверяет, открыто ли приложение через прямое WebApp ссылку
 * (через startapp параметр)
 */
export const isInTelegramDirectWebApp = (): boolean => {
  return !!getTokenFromTelegramStartParam();
};

/**
 * Показывает инструкции для десктопных пользователей
 */
const showDesktopInstructions = (token: string, telegramUrl: string): void => {
  // Создаем модальное окно с инструкциями
  const modalHtml = `
    <div id="telegram-instruction-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
    ">
      <div style="
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: modalAppear 0.3s ease;
      ">
        <h2 style="margin-top: 0; color: #333; text-align: center;">
          🔐 Открыть в Telegram
        </h2>
        
        <p style="color: #666; line-height: 1.6; text-align: center;">
          Для редактирования нужно открыть мини-приложение в Telegram на телефоне.
        </p>
        
        <div style="
          background: #0088cc;
          color: white;
          padding: 15px;
          border-radius: 12px;
          margin: 25px 0;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
        ">
          📱 Откройте на телефоне
        </div>
        
        <div style="
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #e9ecef;
          word-break: break-all;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.5;
        ">
          <div style="color: #666; font-size: 12px; margin-bottom: 5px;">Ссылка:</div>
          ${telegramUrl}
        </div>
        
        <div style="
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        ">
          <strong>📋 Как открыть:</strong>
          <ol style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Скопируйте ссылку выше</li>
            <li>Отправьте её себе в Telegram (любым чатом)</li>
            <li>Нажмите на ссылку в Telegram</li>
            <li>Telegram покажет кнопку "Open"</li>
            <li>Нажмите "Open" чтобы открыть мини-приложение</li>
          </ol>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          margin-top: 30px;
          flex-wrap: wrap;
        ">
          <button onclick="copyLink('${telegramUrl}')" style="
            flex: 1;
            background: #0088cc;
            color: white;
            border: none;
            padding: 16px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-width: 200px;
          ">
            📋 Копировать ссылку
          </button>
          
          <button onclick="openInNewTab('${telegramUrl}')" style="
            flex: 1;
            background: #6c757d;
            color: white;
            border: none;
            padding: 16px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-width: 200px;
          ">
            🔗 Открыть в новой вкладке
          </button>
          
          <button onclick="closeModal()" style="
            flex: 1;
            background: white;
            color: #666;
            border: 2px solid #ddd;
            padding: 16px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            min-width: 200px;
          ">
            Отмена
          </button>
        </div>
        
        <p style="
          margin-top: 25px;
          color: #999;
          font-size: 13px;
          text-align: center;
          font-style: italic;
        ">
          ⚡ Бот не должен быть запущен для работы этой ссылки
        </p>
      </div>
    </div>
    
    <style>
      @keyframes modalAppear {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    </style>
    
    <script>
      function copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
          alert('✅ Ссылка скопирована! Отправьте её в Telegram.');
        }).catch(err => {
          // Fallback для старых браузеров
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('✅ Ссылка скопирована! Отправьте её в Telegram.');
        });
      }
      
      function openInNewTab(url) {
        window.open(url, '_blank');
      }
      
      function closeModal() {
        const modal = document.getElementById('telegram-instruction-modal');
        if (modal) {
          modal.remove();
        }
      }
      
      // Закрытие по клику на фон
      document.getElementById('telegram-instruction-modal').addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal();
        }
      });
      
      // Закрытие по ESC
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeModal();
        }
      });
    </script>
  `;
  
  // Вставляем модальное окно в документ
  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div.firstElementChild as HTMLElement);
};

/**
 * Получает тип устройства для пользовательских сообщений
 */
export const getDeviceType = (): 'mobile' | 'desktop' => {
  return isMobileDevice() ? 'mobile' : 'desktop';
};

/**
 * Альтернативная функция для тестирования разных форматов ссылок
 */
export const testTelegramLinkFormats = (token: string): string[] => {
  const BOT_USERNAME = 'my_flight_tracker1_bot';
  
  return [
    // Основной рекомендуемый формат (прямое открытие WebApp)
    `https://t.me/${BOT_USERNAME}/flight_tracker?startapp=share_${token}`,
    
    // Альтернативный формат (через стартовую команду)
    `https://t.me/${BOT_USERNAME}?start=share_${token}`,
    
    // tg:// протокол для мобильных
    `tg://resolve?domain=${BOT_USERNAME}&startapp=share_${token}`,
    
    // tg:// с командой start
    `tg://resolve?domain=${BOT_USERNAME}&start=share_${token}`,
  ];
};