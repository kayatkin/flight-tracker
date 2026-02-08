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
  
  // 🔥 ИСПРАВЛЕНО: убраны пробелы и префикс share_
  const telegramUrl = `https://t.me/${BOT_USERNAME}?startapp=${token}`;
  
  console.log('[TELEGRAM] Opening via Menu Button:', telegramUrl);
  console.log('[TELEGRAM] Opening WebApp directly:', telegramUrl);
  console.log('[TELEGRAM] Bot does not need to be running!');
  
  // Пытаемся открыть через tg:// протокол для лучшего UX на мобильных
  if (isMobileDevice()) {
    try {
      // 🔥 ИСПРАВЛЕНО: убраны пробелы и префикс share_
      const tgProtocolUrl = `tg://resolve?domain=${BOT_USERNAME}&startapp=${token}`;
      
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
  
  console.log('[TELEGRAM DEBUG] Location analysis:', {
    href: window.location.href,
    search: window.location.search,
    hash: window.location.hash,
    hasTelegramWebApp: !!window.Telegram?.WebApp,
    startParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param
  });
  
  // 🔥 ПРИОРИТЕТ 1: Проверяем Telegram WebApp SDK (самый надежный способ)
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initDataUnsafe?.start_param) {
    const startParam = webApp.initDataUnsafe.start_param;
    // 🔥 УБРАН ПРЕФИКС share_ — теперь принимаем токен как есть
    console.log('[TELEGRAM] Found token from WebApp SDK start_param:', startParam);
    return startParam;
  }
  
  // 🔥 ПРИОРИТЕТ 2: Проверяем обычный токен в query параметрах (для тестирования)
  const urlParams = new URLSearchParams(window.location.search);
  const queryToken = urlParams.get('token');
  if (queryToken) {
    console.log('[TELEGRAM] Found token from query params (token):', queryToken);
    return queryToken;
  }
  
  // 🔥 ПРИОRIТЕТ 3: Проверяем tgWebAppStartParam (для ?startapp=...)
  const tgWebAppStartParam = urlParams.get('tgWebAppStartParam');
  if (tgWebAppStartParam) {
    console.log('[TELEGRAM] Found token from tgWebAppStartParam:', tgWebAppStartParam);
    return tgWebAppStartParam;
  }
  
  // 🔥 ПРИОРИТЕТ 4: Проверяем hash параметры
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    console.log('[TELEGRAM] Hash analysis:', hash);
    
    try {
      const hashParams = new URLSearchParams(hash);
      const hashStartParam = hashParams.get('tgWebAppStartParam');
      if (hashStartParam) {
        console.log('[TELEGRAM] Found token from hash params:', hashStartParam);
        return hashStartParam;
      }
    } catch (err) {
      console.log('[TELEGRAM] Hash is not a query string');
    }
    
    // Прямой поиск токена в hash
    const directTokenMatch = hash.match(/token=([^&]+)/);
    if (directTokenMatch) {
      const token = directTokenMatch[1];
      console.log('[TELEGRAM] Found token directly in hash:', token);
      return token;
    }
  }
  
  // 🔥 ПРИОРИТЕТ 5: Проверяем initData строку
  if (webApp?.initData) {
    try {
      const initDataParams = new URLSearchParams(webApp.initData);
      const initDataStartParam = initDataParams.get('start_param');
      if (initDataStartParam) {
        console.log('[TELEGRAM] Found token from initData params:', initDataStartParam);
        return initDataStartParam;
      }
    } catch (err) {
      console.log('[TELEGRAM] Could not parse initData:', err);
    }
  }
  
  console.log('[TELEGRAM] No token found in Telegram start params');
  return null;
};

/**
 * Проверяет, открыто ли приложение через прямое WebApp ссылку
 * (через startapp параметр)
 */
export const isInTelegramDirectWebApp = (): boolean => {
  const hasToken = !!getTokenFromTelegramStartParam();
  const inTelegram = !!window.Telegram?.WebApp;
  
  console.log('[TELEGRAM DEBUG] isInTelegramDirectWebApp:', {
    hasToken,
    inTelegram,
    startParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param
  });
  
  return hasToken && inTelegram;
};

/**
 * Показывает инструкции для десктопных пользователей
 */
const showDesktopInstructions = (token: string, telegramUrl: string): void => {
  // ... (оставляем без изменений — весь код ниже остаётся как есть)
  const modal = document.createElement('div');
  modal.id = 'telegram-instruction-modal';
  modal.style.cssText = `
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
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalAppear {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    #telegram-instruction-modal > div {
      animation: modalAppear 0.3s ease;
    }
    
    .telegram-modal-btn {
      flex: 1;
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
      transition: transform 0.2s, opacity 0.2s;
    }
    
    .telegram-modal-btn:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
    
    .telegram-modal-btn:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
  
  const copyLink = () => {
    navigator.clipboard.writeText(telegramUrl).then(() => {
      alert('✅ Ссылка скопирована! Отправьте её в Telegram.');
    }).catch(err => {
      const textArea = document.createElement('textarea');
      textArea.value = telegramUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Ссылка скопирована! Отправьте её в Telegram.');
    });
  };
  
  const openInNewTab = () => {
    window.open(telegramUrl, '_blank');
  };
  
  const closeModal = () => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
    document.removeEventListener('keydown', handleKeydown);
  };
  
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  document.addEventListener('keydown', handleKeydown);
  
  const title = document.createElement('h2');
  title.textContent = '🔐 Открыть в Telegram';
  title.style.cssText = 'margin-top: 0; color: #333; text-align: center;';
  
  const description = document.createElement('p');
  description.textContent = 'Для редактирования нужно открыть мини-приложение в Telegram на телефоне.';
  description.style.cssText = 'color: #666; line-height: 1.6; text-align: center;';
  
  const mobileNote = document.createElement('div');
  mobileNote.textContent = '📱 Откройте на телефоне';
  mobileNote.style.cssText = `
    background: #0088cc;
    color: white;
    padding: 15px;
    border-radius: 12px;
    margin: 25px 0;
    text-align: center;
    font-weight: bold;
    font-size: 18px;
  `;
  
  const urlContainer = document.createElement('div');
  urlContainer.style.cssText = `
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    border: 1px solid #e9ecef;
    word-break: break-all;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
  `;
  
  const urlLabel = document.createElement('div');
  urlLabel.textContent = 'Ссылка:';
  urlLabel.style.cssText = 'color: #666; font-size: 12px; margin-bottom: 5px;';
  
  const urlText = document.createElement('div');
  urlText.textContent = telegramUrl;
  
  urlContainer.appendChild(urlLabel);
  urlContainer.appendChild(urlText);
  
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
  `;
  
  const instructionsTitle = document.createElement('strong');
  instructionsTitle.textContent = '📋 Как открыть:';
  
  const instructionsList = document.createElement('ol');
  instructionsList.style.cssText = 'margin: 10px 0 0 0; padding-left: 20px;';
  
  ['Скопируйте ссылку выше', 'Отправьте её себе в Telegram (любым чатом)', 
   'Нажмите на ссылку в Telegram', 'Telegram покажет кнопку "Open"', 
   'Нажмите "Open" чтобы открыть мини-приложение'].forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    instructionsList.appendChild(li);
  });
  
  instructions.appendChild(instructionsTitle);
  instructions.appendChild(instructionsList);
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 12px;
    margin-top: 30px;
    flex-wrap: wrap;
  `;
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Копировать ссылку';
  copyBtn.className = 'telegram-modal-btn';
  copyBtn.style.cssText = 'background: #0088cc; color: white;';
  copyBtn.addEventListener('click', copyLink);
  
  const openTabBtn = document.createElement('button');
  openTabBtn.textContent = '🔗 Открыть в новой вкладке';
  openTabBtn.className = 'telegram-modal-btn';
  openTabBtn.style.cssText = 'background: #6c757d; color: white;';
  openTabBtn.addEventListener('click', openInNewTab);
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Отмена';
  closeBtn.className = 'telegram-modal-btn';
  closeBtn.style.cssText = 'background: white; color: #666; border: 2px solid #ddd;';
  closeBtn.addEventListener('click', closeModal);
  
  buttonsContainer.appendChild(copyBtn);
  buttonsContainer.appendChild(openTabBtn);
  buttonsContainer.appendChild(closeBtn);
  
  const footerNote = document.createElement('p');
  footerNote.textContent = '⚡ Бот не должен быть запущен для работы этой ссылки';
  footerNote.style.cssText = `
    margin-top: 25px;
    color: #999;
    font-size: 13px;
    text-align: center;
    font-style: italic;
  `;
  
  modalContent.appendChild(title);
  modalContent.appendChild(description);
  modalContent.appendChild(mobileNote);
  modalContent.appendChild(urlContainer);
  modalContent.appendChild(instructions);
  modalContent.appendChild(buttonsContainer);
  modalContent.appendChild(footerNote);
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
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
    `https://t.me/${BOT_USERNAME}/flight_tracker?startapp=${token}`,
    `https://t.me/${BOT_USERNAME}?start=${token}`,
    `tg://resolve?domain=${BOT_USERNAME}&startapp=${token}`,
    `tg://resolve?domain=${BOT_USERNAME}&start=${token}`,
  ];
};

/**
 * 🔥 ОСНОВНАЯ ФУНКЦИЯ: Получает токен из любого источника
 */
export const getTokenFromTelegramStartParamFixed = (): string | null => {
  if (typeof window === 'undefined') return null;

  const webApp = window.Telegram?.WebApp;
  
  // 1. start_param (для ?start=...)
  if (webApp?.initDataUnsafe?.start_param) {
    const token = webApp.initDataUnsafe.start_param;
    console.log('[TOKEN] Found in start_param:', token);
    return token;
  }

  // 2. tgWebAppStartParam (для ?startapp=...)
  const urlParams = new URLSearchParams(window.location.search);
  const startappParam = urlParams.get('tgWebAppStartParam');
  if (startappParam) {
    console.log('[TOKEN] Found in tgWebAppStartParam:', startappParam);
    return startappParam;
  }

  // 3. Обычный ?token= (для веба)
  const regularToken = urlParams.get('token');
  if (regularToken) {
    console.log('[TOKEN] Found in ?token=', regularToken);
    return regularToken;
  }

  // 4. Hash fallback
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const hashToken = hashParams.get('token');
    if (hashToken) {
      console.log('[TOKEN] Found in hash:', hashToken);
      return hashToken;
    }
  }

  console.log('[TOKEN] No token found in any location');
  return null;
};