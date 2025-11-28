// src/telegram.d.ts
export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          query_id?: string;
          chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
          chat_instance?: string;
          start_param?: string;
        };
        themeParams?: Record<string, any>;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        isExpanded?: boolean;
        isClosingConfirmationEnabled?: boolean;
        version?: string;
        platform?: string;
        openTelegramLink(url: string): void;
        openLink(url: string): void;
        close(): void;
        ready(): void;
        sendData(data: string): void;
        onEvent<T extends keyof WebAppEvents>(
          eventType: T,
          eventHandler: WebAppEvents[T]
        ): void;
        offEvent<T extends keyof WebAppEvents>(
          eventType: T,
          eventHandler: WebAppEvents[T]
        ): void;
      };
    };
  }
}

interface WebAppEvents {
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