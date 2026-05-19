import { supabase } from '../lib/supabaseClient';
import type { PlanId } from '@shared/constants/subscription';
import { resolveEffectivePlan } from '@shared/utils/subscriptionLimits';
import { devLog, logError } from '@shared/utils/logger';

export interface UserSubscription {
  plan: PlanId;
  status: string;
  expiresAt: string | null;
}

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  plan: 'free',
  status: 'active',
  expiresAt: null,
};

export async function fetchUserSubscription(userId: string): Promise<UserSubscription> {
  if (!userId) {
    return DEFAULT_SUBSCRIPTION;
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logError('[subscription] fetch failed:', error);
      return DEFAULT_SUBSCRIPTION;
    }

    if (!data) {
      return DEFAULT_SUBSCRIPTION;
    }

    const rawPlan = data.plan === 'premium' ? 'premium' : 'free';
    const plan = resolveEffectivePlan(rawPlan, data.status ?? 'active', data.expires_at ?? null);

    devLog('[subscription] loaded', { userId, plan, status: data.status });

    return {
      plan,
      status: data.status ?? 'active',
      expiresAt: data.expires_at ?? null,
    };
  } catch (err) {
    logError('[subscription] unexpected error:', err);
    return DEFAULT_SUBSCRIPTION;
  }
}
