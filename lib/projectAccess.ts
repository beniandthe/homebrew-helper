import type { SupabaseClient } from '@supabase/supabase-js';

import { hasActiveProAccess } from '@/lib/billing';

type CampaignOptionRow = {
  id: string;
  name: string;
};

export type LatestSaveAccess = {
  isPro: boolean;
  count: number;
};

export async function fetchLatestSaveAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<LatestSaveAccess> {
  const [{ data: profileData }, { count, error: countError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_pro, cancel_at_period_end, current_period_end, canceled_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('saved_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (countError) {
    throw countError;
  }

  return {
    isPro: hasActiveProAccess(profileData),
    count: count ?? 0,
  };
}

export async function fetchCampaignOptions(
  supabase: SupabaseClient,
  userId: string
): Promise<CampaignOptionRow[]> {
  const { data, error } = await supabase
    .from('saved_projects')
    .select('id, name')
    .eq('user_id', userId)
    .eq('tool_type', 'campaign_hub')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as CampaignOptionRow[];
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}
