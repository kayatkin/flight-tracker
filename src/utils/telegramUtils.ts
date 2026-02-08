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
  
  // Формат для прямого открытия WebApp в Telegram
  // Telegram автоматически покажет кнопку "Open" при таком формате
  const telegramUrl = `https://t.me/${BOT_USERNAME}?startapp=share_${token}`;
  
  console.log('[TELEGRAM] Opening via Menu Button:', telegramUrl);
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
    if (startParam && startParam.startsWith('share_')) {
      const token = startParam.replace('share_', '');
      console.log('[TELEGRAM] Found token from WebApp SDK start_param:', token);
      return token;
    }
  }
  
  // 🔥 ПРИОРИТЕТ 2: Проверяем обычный токен в query параметрах (для тестирования)
  const urlParams = new URLSearchParams(window.location.search);
  const queryToken = urlParams.get('token');
  if (queryToken) {
    console.log('[TELEGRAM] Found token from query params (token):', queryToken);
    return queryToken;
  }
  
  // 🔥 ПРИОРИТЕТ 3: Проверяем startapp параметр в query (новый формат)
  const queryStartParam = urlParams.get('tgWebAppStartParam');
  if (queryStartParam && queryStartParam.startsWith('share_')) {
    const token = queryStartParam.replace('share_', '');
    console.log('[TELEGRAM] Found token from query params (tgWebAppStartParam):', token);
    return token;
  }
  
  // 🔥 ПРИОРИТЕТ 4: Проверяем hash параметры (Telegram WebApp иногда помещает параметры в hash)
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    console.log('[TELEGRAM] Hash analysis:', hash);
    
    // Пытаемся парсить как query строку в hash
    try {
      const hashParams = new URLSearchParams(hash);
      const hashStartParam = hashParams.get('tgWebAppStartParam');
      if (hashStartParam && hashStartParam.startsWith('share_')) {
        const token = hashStartParam.replace('share_', '');
        console.log('[TELEGRAM] Found token from hash params:', token);
        return token;
      }
    } catch (err) {
      console.log('[TELEGRAM] Hash is not a query string, trying direct match');
    }
    
    // Если hash напрямую содержит токен
    if (hash.startsWith('share_')) {
      const token = hash.replace('share_', '');
      console.log('[TELEGRAM] Found token directly in hash:', token);
      return token;
    }
  }
  
  // 🔥 ПРИОРИТЕТ 5: Проверяем initData строку (если есть)
  if (webApp?.initData) {
    try {
      // initData может быть строкой параметров
      const initDataParams = new URLSearchParams(webApp.initData);
      const initDataStartParam = initDataParams.get('start_param');
      if (initDataStartParam && initDataStartParam.startsWith('share_')) {
        const token = initDataStartParam.replace('share_', '');
        console.log('[TELEGRAM] Found token from initData params:', token);
        return token;
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
  
  // Если есть токен И мы в Telegram WebApp - это прямое открытие
  return hasToken && inTelegram;
};

/**
 * Показывает инструкции для десктопных пользователей
 */
const showDesktopInstructions = (token: string, telegramUrl: string): void => {
  // Создаем модальное окно с инструкциями
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
  
  // Создаем CSS для анимации
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
  
  // Функции для работы с модальным окном
  const copyLink = () => {
    navigator.clipboard.writeText(telegramUrl).then(() => {
      alert('✅ Ссылка скопирована! Отправьте её в Telegram.');
    }).catch(err => {
      // Fallback для старых браузеров
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
  
  // Закрытие по клику на фон
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Закрытие по ESC
  document.addEventListener('keydown', handleKeydown);
  
  // Создаем содержимое модального окна без inline onclick
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
  
  // Создаем кнопки
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
  
  // Собираем модальное окно
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

/**
 * 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ: Получает токен из Telegram WebApp параметров
 * Специально для ссылок формата: https://t.me/bot?startapp=share_TOKEN
 */
export const getTokenFromTelegramStartParamFixed = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const webApp = window.Telegram?.WebApp;
  
  console.log('[TELEGRAM FIXED] Token search started:', {
    hasWebApp: !!webApp,
    location: window.location.href,
    startParam: webApp?.initDataUnsafe?.start_param,
    startappParam: new URLSearchParams(window.location.search).get('startapp')
  });
  
  // 1. Telegram WebApp SDK - start_param (самый надежный)
  if (webApp?.initDataUnsafe?.start_param) {
    const startParam = webApp.initDataUnsafe.start_param;
    if (startParam && startParam.startsWith('share_')) {
      const token = startParam.replace('share_', '');
      console.log('[TELEGRAM FIXED] ✓ Found in start_param:', token);
      return token;
    }
  }
  
  // 2. Параметр startapp в query string (новый формат)
  const urlParams = new URLSearchParams(window.location.search);
  const startappParam = urlParams.get('startapp');
  if (startappParam && startappParam.startsWith('share_')) {
    const token = startappParam.replace('share_', '');
    console.log('[TELEGRAM FIXED] ✓ Found in startapp param:', token);
    return token;
  }
  
  // 3. Обычный токен для веб-версии
  const regularToken = urlParams.get('token');
  if (regularToken) {
    console.log('[TELEGRAM FIXED] ✓ Found regular token:', regularToken);
    return regularToken;
  }
  
  // 4. Telegram иногда помещает параметры в hash
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    console.log('[TELEGRAM FIXED] Checking hash:', hash);
    
    // Пытаемся извлечь из hash разными способами
    const patterns = [
      /token=([^&]+)/,
      /share_([a-zA-Z0-9]+)/,
      /startapp=share_([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = hash.match(pattern);
      if (match) {
        const token = match[1];
        console.log(`[TELEGRAM FIXED] ✓ Found in hash with pattern ${pattern}:`, token);
        return token;
      }
    }
  }
  
  console.log('[TELEGRAM FIXED] ✗ No token found');
  return null;
};