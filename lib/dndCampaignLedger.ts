import type { SupabaseClient } from '@supabase/supabase-js';

import {
  readDndInventoryItems,
  readDndPartyTreasury,
  type DndInventoryItem,
} from '@/lib/dnd5eCampaignKit';

export type DndEncounterLedgerEntry = {
  id: string;
  sourceProjectId: string;
  projectName: string;
  savedAt: string;
  difficulty: string;
  enemyRole: string;
  terrainType: string;
  verdict: string;
  partyLevel: number;
  partySize: number;
  monsterBench: string[];
  lineupIdeas: string[];
  tacticalBeats: string[];
  notes: string;
};

export type DndTreasureLedgerEntry = {
  id: string;
  sourceProjectId: string;
  projectName: string;
  savedAt: string;
  rewardType: string;
  rarity: string;
  rewardSource: string;
  rewardTheme: string;
  bundleStyle: string;
  featuredItem: string;
  bonusItem: string;
  currencyValue: number;
  rewardSummary: string;
  recipientHints: string[];
  notes: string;
};

export type DndThreatClockStatus = 'lurking' | 'active' | 'escalating' | 'contained' | 'resolved';

export type DndThreatClockEntry = {
  id: string;
  sourceProjectId: string;
  projectName: string;
  title: string;
  status: DndThreatClockStatus;
  segmentsFilled: number;
  segmentsTotal: number;
  linkedNpcId: string;
  linkedNpcName: string;
  linkedFaction: string;
  escalationTag: string;
  difficulty: string;
  enemyRole: string;
  verdict: string;
  fallout: string;
  latestBeat: string;
  updatedAt: string;
};

export type DndTreasuryAwardEntry = {
  id: string;
  sourceProjectId: string;
  projectName: string;
  amountGp: number;
  note: string;
  updatedAt: string;
};

type CampaignData = Record<string, unknown>;

export function readDndEncounterLedger(value: unknown): DndEncounterLedgerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        id: readString(entry.id),
        sourceProjectId: readString(entry.sourceProjectId),
        projectName: readString(entry.projectName),
        savedAt: readString(entry.savedAt),
        difficulty: readString(entry.difficulty),
        enemyRole: readString(entry.enemyRole),
        terrainType: readString(entry.terrainType),
        verdict: readString(entry.verdict),
        partyLevel: readNumber(entry.partyLevel),
        partySize: readNumber(entry.partySize),
        monsterBench: readStringArray(entry.monsterBench),
        lineupIdeas: readStringArray(entry.lineupIdeas),
        tacticalBeats: readStringArray(entry.tacticalBeats),
        notes: readString(entry.notes),
      },
    ].filter((item) => item.sourceProjectId.length > 0);
  });
}

export function readDndTreasureLedger(value: unknown): DndTreasureLedgerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        id: readString(entry.id),
        sourceProjectId: readString(entry.sourceProjectId),
        projectName: readString(entry.projectName),
        savedAt: readString(entry.savedAt),
        rewardType: readString(entry.rewardType),
        rarity: readString(entry.rarity),
        rewardSource: readString(entry.rewardSource),
        rewardTheme: readString(entry.rewardTheme),
        bundleStyle: readString(entry.bundleStyle),
        featuredItem: readString(entry.featuredItem),
        bonusItem: readString(entry.bonusItem),
        currencyValue: readNumber(entry.currencyValue),
        rewardSummary: readString(entry.rewardSummary),
        recipientHints: readStringArray(entry.recipientHints),
        notes: readString(entry.notes),
      },
    ].filter((item) => item.sourceProjectId.length > 0);
  });
}

export function readDndThreatClocks(value: unknown): DndThreatClockEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const status = readThreatClockStatus(entry.status);
    const segmentsTotal = Math.max(1, readNumber(entry.segmentsTotal) || 4);
    const segmentsFilled = Math.min(Math.max(0, readNumber(entry.segmentsFilled)), segmentsTotal);

    return [
      {
        id: readString(entry.id),
        sourceProjectId: readString(entry.sourceProjectId),
        projectName: readString(entry.projectName),
        title: readString(entry.title),
        status,
        segmentsFilled,
        segmentsTotal,
        linkedNpcId: readString(entry.linkedNpcId),
        linkedNpcName: readString(entry.linkedNpcName),
        linkedFaction: readString(entry.linkedFaction),
        escalationTag: readString(entry.escalationTag),
        difficulty: readString(entry.difficulty),
        enemyRole: readString(entry.enemyRole),
        verdict: readString(entry.verdict),
        fallout: readString(entry.fallout),
        latestBeat: readString(entry.latestBeat),
        updatedAt: readString(entry.updatedAt),
      },
    ].filter((item) => item.sourceProjectId.length > 0);
  });
}

export function readDndTreasuryAwards(value: unknown): DndTreasuryAwardEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        id: readString(entry.id),
        sourceProjectId: readString(entry.sourceProjectId),
        projectName: readString(entry.projectName),
        amountGp: Math.max(0, readNumber(entry.amountGp)),
        note: readString(entry.note),
        updatedAt: readString(entry.updatedAt),
      },
    ].filter((item) => item.sourceProjectId.length > 0);
  });
}

export async function syncDndEncounterLedgerEntry(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  entry: DndEncounterLedgerEntry
) {
  await updateDndCampaignData(supabase, userId, campaignId, (data) => {
    const nextEntries = upsertEncounterLedgerEntry(readDndEncounterLedger(data.encounterLedger), entry);
    return {
      ...data,
      encounterLedger: nextEntries,
    };
  });
}

export async function syncDndTreasureLedgerEntry(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  entry: DndTreasureLedgerEntry
) {
  await updateDndCampaignData(supabase, userId, campaignId, (data) => {
    const nextEntries = upsertTreasureLedgerEntry(readDndTreasureLedger(data.treasureLedger), entry);
    return {
      ...data,
      treasureLedger: nextEntries,
    };
  });
}

export async function syncDndThreatClockEntry(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  entry: DndThreatClockEntry
) {
  await updateDndCampaignData(supabase, userId, campaignId, (data) => {
    const nextEntries = upsertThreatClockEntry(readDndThreatClocks(data.threatClocks), entry);
    return {
      ...data,
      threatClocks: nextEntries,
    };
  });
}

export async function syncDndCampaignInventoryItem(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  item: DndInventoryItem
) {
  await updateDndCampaignData(supabase, userId, campaignId, (data) => {
    const nextInventory = upsertInventoryItem(readDndInventoryItems(data.sharedInventory), item);
    return {
      ...data,
      sharedInventory: nextInventory,
    };
  });
}

export async function syncDndTreasuryAwardEntry(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  entry: DndTreasuryAwardEntry
) {
  await updateDndCampaignData(supabase, userId, campaignId, (data) => {
    const currentTreasury = readDndPartyTreasury(data.partyTreasury);
    const currentAwards = readDndTreasuryAwards(data.treasuryAwards);
    const nextAwards = upsertTreasuryAwardEntry(currentAwards, entry);

    const currentAwardedGp = currentAwards.reduce((sum, award) => sum + award.amountGp, 0);
    const nextAwardedGp = nextAwards.reduce((sum, award) => sum + award.amountGp, 0);
    const currentGp = parseNumberString(currentTreasury.gp);
    const baseGp = Math.max(0, currentGp - currentAwardedGp);
    const nextGp = baseGp + nextAwardedGp;

    return {
      ...data,
      partyTreasury: {
        ...currentTreasury,
        gp: String(nextGp),
      },
      treasuryAwards: nextAwards,
    };
  });
}

function upsertEncounterLedgerEntry(entries: DndEncounterLedgerEntry[], entry: DndEncounterLedgerEntry) {
  const next = entries.filter((item) => item.sourceProjectId !== entry.sourceProjectId);
  return [entry, ...next].slice(0, 8);
}

function upsertTreasureLedgerEntry(entries: DndTreasureLedgerEntry[], entry: DndTreasureLedgerEntry) {
  const next = entries.filter((item) => item.sourceProjectId !== entry.sourceProjectId);
  return [entry, ...next].slice(0, 10);
}

function upsertThreatClockEntry(entries: DndThreatClockEntry[], entry: DndThreatClockEntry) {
  const next = entries.filter((item) => item.sourceProjectId !== entry.sourceProjectId);
  return [entry, ...next].slice(0, 8);
}

function upsertInventoryItem(items: DndInventoryItem[], item: DndInventoryItem) {
  const next = items.filter((entry) => entry.id !== item.id);
  return [item, ...next].slice(0, 60);
}

function upsertTreasuryAwardEntry(entries: DndTreasuryAwardEntry[], entry: DndTreasuryAwardEntry) {
  const next = entries.filter((item) => item.sourceProjectId !== entry.sourceProjectId);
  return [entry, ...next].slice(0, 20);
}

async function updateDndCampaignData(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  mutate: (data: CampaignData) => CampaignData
) {
  const { data, error } = await supabase
    .from('saved_projects')
    .select('data')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .eq('tool_type', 'campaign_hub')
    .single();

  if (error) {
    throw error;
  }

  const currentData = isRecord(data?.data) ? data.data : {};
  const nextData = mutate(currentData);

  const { error: updateError } = await supabase
    .from('saved_projects')
    .update({
      data: nextData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readThreatClockStatus(value: unknown): DndThreatClockStatus {
  return value === 'lurking' ||
    value === 'active' ||
    value === 'escalating' ||
    value === 'contained' ||
    value === 'resolved'
    ? value
    : 'active';
}

function parseNumberString(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}
