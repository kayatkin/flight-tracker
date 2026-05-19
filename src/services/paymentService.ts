import { supabase } from '@lib/supabaseClient';
import type { BillingPeriod } from '@shared/constants/subscription';
import { logError } from '@shared/utils/logger';

export type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending' | 'unknown';

interface CreateInvoiceResponse {
  invoiceUrl: string;
  period: BillingPeriod;
  stars: number;
}

export async function createProInvoice(
  initData: string,
  period: BillingPeriod
): Promise<CreateInvoiceResponse> {
  const { data, error } = await supabase.functions.invoke<CreateInvoiceResponse>('create-pro-invoice', {
    body: { initData, period },
  });

  if (error) {
    logError('[payment] create-pro-invoice error:', error);
    throw new Error(error.message || 'Failed to create invoice');
  }

  if (!data?.invoiceUrl) {
    throw new Error('Invoice URL missing in response');
  }

  return data;
}

export function openStarsInvoice(invoiceUrl: string): Promise<InvoiceStatus> {
  return new Promise((resolve) => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.openInvoice) {
      resolve('failed');
      return;
    }

    webApp.openInvoice(invoiceUrl, (status: string) => {
      if (status === 'paid' || status === 'cancelled' || status === 'failed' || status === 'pending') {
        resolve(status);
        return;
      }
      resolve('unknown');
    });
  });
}

export function getTelegramInitData(): string | null {
  const initData = window.Telegram?.WebApp?.initData;
  return initData && initData.length > 0 ? initData : null;
}

export function isTelegramMiniApp(): boolean {
  return Boolean(getTelegramInitData());
}
