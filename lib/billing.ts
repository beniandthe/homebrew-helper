export type BillingProfile = {
  is_pro?: boolean | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  canceled_at?: string | null;
};

export function hasActiveProAccess(profile: BillingProfile | null | undefined, nowMs = Date.now()) {
  if (!profile) return false;

  if (Boolean(profile.is_pro)) {
    return true;
  }

  if (!profile.current_period_end) {
    return false;
  }

  const periodEndMs = Date.parse(profile.current_period_end);
  if (!Number.isFinite(periodEndMs)) {
    return false;
  }

  return periodEndMs > nowMs;
}
