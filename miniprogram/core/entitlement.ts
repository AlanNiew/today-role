import type { Entitlement } from './types';

export type ProFeature = 'monthly-deep' | 'monthly-history' | 'monthly-action-plan';

export function createFreeEntitlement(userId: string): Entitlement {
  return { userId, isPro: false, plan: 'free' };
}

/** mock 开关：仅写本机，不接支付、不产生费用 */
export function createMockProEntitlement(userId: string, enabled: boolean): Entitlement {
  return enabled
    ? { userId, isPro: true, plan: 'mock_pro' }
    : createFreeEntitlement(userId);
}

export function isProActive(entitlement: Entitlement | null | undefined, now = Date.now()): boolean {
  if (!entitlement || !entitlement.isPro) {
    return false;
  }
  if (typeof entitlement.expiresAt === 'number' && entitlement.expiresAt <= now) {
    return false;
  }
  return true;
}

export function canUseFeature(
  feature: ProFeature,
  entitlement: Entitlement | null | undefined,
  now = Date.now(),
): boolean {
  if (feature === 'monthly-deep' || feature === 'monthly-history' || feature === 'monthly-action-plan') {
    return isProActive(entitlement, now);
  }
  return false;
}

export function planLabel(entitlement: Entitlement | null | undefined, now = Date.now()): string {
  if (isProActive(entitlement, now)) {
    return 'Mock Pro';
  }
  return '免费版';
}
