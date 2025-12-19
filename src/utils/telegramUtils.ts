// src/utils/telegramUtils.ts

/**
 * Проверяет, открыто ли приложение внутри Telegram WebApp
 */
export const isInTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.Telegram && 
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initData &&
    window.Telegram.WebApp.initData.length > 0
  );
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
 * Перенаправляет в Telegram для ссылок редактирования
 */
export const redirectToTelegramForEdit = (token: string): void => {
  const BOT_USERNAME = 'my_flight_tracker1_bot'; // Ваш бот
  
  // Формируем deep link для Telegram
  const telegramUrl = `https://t.me/${BOT_USERNAME}?start=share_${token}`;
  
  console.log('[TELEGRAM] Redirecting to:', telegramUrl);
  
  // Для мобильных устройств - прямой переход
  if (isMobileDevice()) {
    window.location.href = telegramUrl;
  } else {
    // Для десктопа показываем инструкцию
    const message = `
      🔐 Редактирование доступно только в Telegram
      
      Чтобы получить доступ к редактированию:
      
      1. Откройте эту ссылку на телефоне:
         ${telegramUrl}
      
      2. Или отсканируйте QR-код:
         (здесь можно добавить генерацию QR-кода)
      
      3. Токен для ручного ввода в Telegram:
         ${token}
    `;
    
    alert(message);
    // Можно также открыть Telegram в новой вкладке
    window.open(telegramUrl, '_blank');
  }
};

/**
 * Получает тип устройства для пользовательских сообщений
 */
export const getDeviceType = (): 'mobile' | 'desktop' => {
  return isMobileDevice() ? 'mobile' : 'desktop';
};