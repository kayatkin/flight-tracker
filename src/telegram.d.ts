// src/telegram.d.ts - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface WebAppEvents {
  themeChanged: (theme: Record<string, any>) => void;
  viewportChanged: (data: { width: number; height: number }) => void;
  mainButtonClicked: () => void;
  backButtonClicked: () => void;
  settingsButtonClicked: () => void;
  invoiceClosed: (data: { url: string; status: string }) => void;
  popupClosed: (data: { button_id?: string }) => void;
  popupOpened: () => void;
  qrTextReceived: (data: { data: string }) => void;
}

export interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    query_id?: string;
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
    chat_instance?: string;
    start_param?: string;
    auth_date?: string;
    hash?: string;
  };
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  viewportHeight?: number;
  viewportStableHeight?: number;
  headerColor?: string;
  backgroundColor?: string;
  isExpanded?: boolean;
  isClosingConfirmationEnabled?: boolean;
  version?: string;
  platform?: string;
  colorScheme?: 'light' | 'dark';
  
  // Методы
  openTelegramLink(url: string): void;
  openLink(url: string): void;
  close(): void;
  ready(): void;
  expand(): void;
  sendData(data: string): void;
  onEvent<T extends keyof WebAppEvents>(
    eventType: T,
    eventHandler: WebAppEvents[T]
  ): void;
  offEvent<T extends keyof WebAppEvents>(
    eventType: T,
    eventHandler: WebAppEvents[T]
  ): void;
}