import type { SupabaseClient } from '@supabase/supabase-js';

import { hasActiveProAccess } from '@/lib/billing';
import { getGameSystem, resolveGameSystemId, type GameSystemId } from '@/lib/gameSystems';

type CampaignOptionRow = {
  id: string;
  name: string;
  data?: Record<string, unknown> | null;
};

export type LatestSaveAccess = {
  isPro: boolean;
  count: number;
};

export type CampaignOption = {
  id: string;
  name: string;
  systemId: GameSystemId;
  systemName: string;
  systemShortLabel: string;
  data?: Record<string, unknown> | null;
};

function mapCampaignOption(row: CampaignOptionRow): CampaignOption {
  const rawSystemId = typeof row.data?.systemId === 'string' ? row.data.systemId : undefined;
  const rawSystemName = typeof row.data?.systemName === 'string' ? row.data.systemName : undefined;
  const systemId = resolveGameSystemId(rawSystemId ?? rawSystemName);
  const system = getGameSystem(systemId);

  return {
    id: row.id,
    name: row.name,
    systemId,
    systemName: system.label,
    systemShortLabel: system.shortLabel,
    data: row.data ?? null,
  };
}

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
): Promise<CampaignOption[]> {
  const { data, error } = await supabase
    .from('saved_projects')
    .select('id, name, data')
    .eq('user_id', userId)
    .eq('tool_type', 'campaign_hub')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CampaignOptionRow[]).map(mapCampaignOption);
}

export async function fetchCampaignOptionById(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string
): Promise<CampaignOption | null> {
  const { data, error } = await supabase
    .from('saved_projects')
    .select('id, name, data')
    .eq('user_id', userId)
    .eq('tool_type', 'campaign_hub')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapCampaignOption(data as CampaignOptionRow);
}

export function applyCampaignSystemToPayload<T extends Record<string, unknown>>(
  payload: T,
  campaign: CampaignOption | null | undefined
) {
  if (!campaign) {
    return payload;
  }

  return {
    ...payload,
    systemId: campaign.systemId,
    systemName: campaign.systemName,
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}
