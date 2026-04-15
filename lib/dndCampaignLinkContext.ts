import type { EnemyRole } from '@/lib/encounterSystemConfig';
import type { RewardTheme } from '@/lib/systemTooling';
import {
  DND_MONSTER_REFERENCE,
  readDndInventoryItems,
  readDndNpcRoster,
  readDndPartyMembers,
  readDndPartyTreasury,
  type DndInventoryItem,
  type DndMonsterReference,
  type DndNpc,
  type DndPartyMember,
  type DndPartyTreasury,
} from '@/lib/dnd5eCampaignKit';
import { readDndThreatClocks, type DndThreatClockEntry } from '@/lib/dndCampaignLedger';

type DndRoleMix = {
  frontline: number;
  support: number;
  control: number;
  striker: number;
};

export type DndCampaignLinkContext = {
  campaignName: string;
  partyName: string;
  mainFaction: string;
  levelBand: string;
  tierLabel: string;
  suggestedPlanLevels: number | null;
  campaignSummary: string;
  currentObjective: string;
  partyRoster: DndPartyMember[];
  sharedInventory: DndInventoryItem[];
  partyTreasury: DndPartyTreasury;
  npcRoster: DndNpc[];
  partySize: number;
  averageLevel: number | null;
  roleMix: DndRoleMix;
  partySummaryLines: string[];
  inventorySummaryLines: string[];
  npcSummaryLines: string[];
  treasurySummary: string;
  partyHookLines: string[];
  attunementItems: string[];
  consumableItems: string[];
  trackedItemNames: string[];
  threatClocks: DndThreatClockEntry[];
  activeThreats: DndThreatClockEntry[];
  threatSummaryLines: string[];
  npcPressureLines: string[];
  factionPressureLines: string[];
  monsterBench: Record<EnemyRole, DndMonsterReference[]>;
  defaultEncounterNote: string;
  defaultQuestSeed: string;
  defaultTreasureNote: string;
};

type CampaignData = Record<string, unknown> | null | undefined;

const CLASS_ROLE_MAP: Record<string, (keyof DndRoleMix)[]> = {
  barbarian: ['frontline'],
  bard: ['support', 'striker'],
  cleric: ['support', 'frontline'],
  druid: ['support', 'control'],
  fighter: ['frontline'],
  monk: ['frontline', 'striker'],
  paladin: ['frontline', 'support'],
  ranger: ['striker', 'frontline'],
  rogue: ['striker'],
  sorcerer: ['control'],
  warlock: ['control'],
  wizard: ['control'],
};

const REWARD_THEME_CLASS_MAP: Record<RewardTheme, string[]> = {
  arcane: ['wizard', 'sorcerer', 'warlock', 'bard', 'druid'],
  divine: ['cleric', 'paladin', 'druid'],
  cursed: ['warlock', 'rogue', 'bard', 'wizard'],
  martial: ['fighter', 'barbarian', 'paladin', 'ranger', 'monk'],
  wilderness: ['ranger', 'druid', 'barbarian', 'monk'],
  noble: ['bard', 'rogue', 'paladin', 'cleric'],
};

const MONSTER_ROLE_MAP: Record<EnemyRole, string[]> = {
  brute: ['Guard', 'Orc', 'Ogre'],
  skirmisher: ['Goblin', 'Wolf', 'Giant Spider'],
  controller: ['Mimic', 'Giant Spider', 'Skeleton'],
  artillery: ['Skeleton', 'Goblin', 'Guard'],
  boss: ['Ogre', 'Mimic', 'Giant Spider'],
};

export function buildDndCampaignLinkContext(data: CampaignData): DndCampaignLinkContext | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const partyRoster = readDndPartyMembers(data.partyRoster).filter((entry) => entry.name.trim().length > 0);
  const sharedInventory = readDndInventoryItems(data.sharedInventory).filter((entry) => entry.name.trim().length > 0);
  const partyTreasury = readDndPartyTreasury(data.partyTreasury);
  const npcRoster = readDndNpcRoster(data.npcRoster).filter((entry) => entry.name.trim().length > 0);

  const partyName = readString(data.partyName);
  const mainFaction = readString(data.mainFaction);
  const campaignName = readString(data.campaignName);
  const levelBand = readString(data.levelBand);
  const campaignSummary = readString(data.campaignSummary);
  const currentObjective = readString(data.currentObjective);
  const threatClocks = readDndThreatClocks(data.threatClocks);
  const activeThreats = threatClocks.filter((entry) => entry.status !== 'resolved');

  const roleMix = partyRoster.reduce<DndRoleMix>(
    (mix, member) => {
      const className = member.className.trim().toLowerCase();
      const roles = CLASS_ROLE_MAP[className] ?? [];

      for (const role of roles) {
        mix[role] += 1;
      }

      return mix;
    },
    {
      frontline: 0,
      support: 0,
      control: 0,
      striker: 0,
    }
  );

  const levels = partyRoster
    .map((member) => parseInteger(member.level))
    .filter((value): value is number => value !== null);
  const averageLevel =
    levels.length > 0 ? Math.max(1, Math.round(levels.reduce((sum, value) => sum + value, 0) / levels.length)) : null;

  const partySummaryLines = partyRoster.map((member) => {
    const levelLabel = member.level.trim() ? `Lv ${member.level.trim()}` : 'Level ?';
    const statBits = [
      member.armorClass.trim() ? `AC ${member.armorClass.trim()}` : null,
      member.hitPoints.trim() ? `HP ${member.hitPoints.trim()}` : null,
      member.passivePerception.trim() ? `PP ${member.passivePerception.trim()}` : null,
    ].filter(Boolean);

    return `${member.name} - ${member.species} ${member.className}, ${levelLabel}${statBits.length > 0 ? `, ${statBits.join(', ')}` : ''}`;
  });

  const trackedItemNames = sharedInventory.map((item) => item.name);
  const attunementItems = sharedInventory
    .filter((item) => item.attunement.trim().toLowerCase() === 'yes')
    .map((item) => item.name);
  const consumableItems = sharedInventory
    .filter((item) => {
      const category = item.category.trim().toLowerCase();
      const name = item.name.trim().toLowerCase();
      return (
        category.includes('consumable') ||
        category.includes('potion') ||
        category.includes('scroll') ||
        name.includes('potion') ||
        name.includes('scroll')
      );
    })
    .map((item) => item.name);

  const inventorySummaryLines = [
    sharedInventory.length > 0
      ? `${sharedInventory.length} inventory entries are logged for the campaign.`
      : 'No shared inventory is logged yet.',
    attunementItems.length > 0
      ? `Attunement-sensitive gear: ${attunementItems.join(', ')}.`
      : 'No attunement-bound item is logged yet.',
    consumableItems.length > 0
      ? `Consumables on hand: ${consumableItems.join(', ')}.`
      : 'No potions or scrolls are visible on the current ledger.',
  ];

  const npcSummaryLines = npcRoster.map((npc) => {
    const affiliation = npc.affiliation.trim() ? ` (${npc.affiliation.trim()})` : '';
    const hook = npc.hook.trim() ? ` - ${npc.hook.trim()}` : '';
    return `${npc.name} - ${npc.role}${affiliation}, ${npc.disposition}${hook}`;
  });

  const partyHookLines = partyRoster.map((member) => {
    const hookBits = [
      member.background.trim() ? `${member.background.trim()} background` : null,
      member.signatureItem.trim() ? `signature: ${member.signatureItem.trim()}` : null,
      member.notes.trim() ? member.notes.trim() : null,
    ].filter(Boolean);

    return `${member.name}: ${hookBits.join(' - ')}`.trim();
  });

  const treasuryParts = [
    partyTreasury.gp.trim() ? `${partyTreasury.gp.trim()} gp` : null,
    partyTreasury.sp.trim() ? `${partyTreasury.sp.trim()} sp` : null,
    partyTreasury.cp.trim() ? `${partyTreasury.cp.trim()} cp` : null,
    partyTreasury.special.trim() ? partyTreasury.special.trim() : null,
  ].filter(Boolean);
  const treasurySummary =
    treasuryParts.length > 0 ? `Campaign treasury: ${treasuryParts.join(', ')}.` : 'Campaign treasury not logged yet.';

  const threatSummaryLines = activeThreats.map((entry) => {
    const latestBeat = entry.latestBeat ? ` Latest beat: ${entry.latestBeat}.` : '';
    const targetBits = [
      entry.linkedNpcName ? `NPC: ${entry.linkedNpcName}` : null,
      entry.linkedFaction ? `Faction: ${entry.linkedFaction}` : null,
      entry.escalationTag ? entry.escalationTag : null,
    ].filter(Boolean);
    return `${entry.title || entry.projectName} - ${formatThreatClockStatusLabel(entry.status)} ${entry.segmentsFilled}/${entry.segmentsTotal}${targetBits.length > 0 ? ` • ${targetBits.join(' • ')}` : ''}.${latestBeat}`;
  });

  const npcPressureLines = activeThreats
    .filter((entry) => entry.linkedNpcName)
    .map((entry) => {
      const labelBits = [
        entry.linkedFaction ? entry.linkedFaction : null,
        entry.escalationTag ? entry.escalationTag : null,
      ].filter(Boolean);
      return `${entry.linkedNpcName} - ${entry.title}${labelBits.length > 0 ? ` • ${labelBits.join(' • ')}` : ''}`;
    });

  const factionPressureLines = activeThreats
    .filter((entry) => entry.linkedFaction)
    .map((entry) => {
      const labelBits = [
        entry.linkedNpcName ? entry.linkedNpcName : null,
        entry.escalationTag ? entry.escalationTag : null,
      ].filter(Boolean);
      return `${entry.linkedFaction} - ${entry.title}${labelBits.length > 0 ? ` • ${labelBits.join(' • ')}` : ''}`;
    });

  const monsterBench = (Object.keys(MONSTER_ROLE_MAP) as EnemyRole[]).reduce<Record<EnemyRole, DndMonsterReference[]>>(
    (bench, role) => {
      bench[role] = DND_MONSTER_REFERENCE.filter((monster) => MONSTER_ROLE_MAP[role].includes(monster.name));
      return bench;
    },
    {
      brute: [],
      skirmisher: [],
      controller: [],
      artillery: [],
      boss: [],
    }
  );

  const defaultEncounterNote = [
    mainFaction ? `Patron pressure from ${mainFaction}.` : null,
    currentObjective ? `Current objective: ${currentObjective}.` : null,
    partyName ? `Party on the field: ${partyName}.` : null,
    attunementItems.length > 0 ? `Watch attunement spotlight around ${attunementItems.slice(0, 2).join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const defaultQuestSeed =
    currentObjective ||
    campaignSummary ||
    (mainFaction ? `secure a key win for ${mainFaction}` : '') ||
    'recover a relic before the opposition reaches it';

  const defaultTreasureNote = [
    partyName ? `Treasure should fit ${partyName}.` : null,
    currentObjective ? `Tie the haul back to ${currentObjective}.` : null,
    attunementItems.length > 0 ? `Attunement slots are already under pressure.` : null,
    consumableItems.length === 0 ? `The party could use more consumables.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const tierInfo = parseDndTierInfo(levelBand, averageLevel);

  return {
    campaignName,
    partyName,
    mainFaction,
    levelBand,
    tierLabel: tierInfo.tierLabel,
    suggestedPlanLevels: tierInfo.suggestedPlanLevels,
    campaignSummary,
    currentObjective,
    partyRoster,
    sharedInventory,
    partyTreasury,
    npcRoster,
    partySize: partyRoster.length,
    averageLevel,
    roleMix,
    partySummaryLines,
    inventorySummaryLines,
    npcSummaryLines,
    treasurySummary,
    partyHookLines,
    attunementItems,
    consumableItems,
    trackedItemNames,
    threatClocks,
    activeThreats,
    threatSummaryLines,
    npcPressureLines,
    factionPressureLines,
    monsterBench,
    defaultEncounterNote,
    defaultQuestSeed,
    defaultTreasureNote,
  };
}

export function getDndRewardRecipientCandidates(
  context: DndCampaignLinkContext,
  rewardTheme: RewardTheme
) {
  const preferredClasses = REWARD_THEME_CLASS_MAP[rewardTheme];
  return context.partyRoster.filter((member) => preferredClasses.includes(member.className.trim().toLowerCase()));
}

export function getDndRewardRecipientSuggestions(
  context: DndCampaignLinkContext,
  rewardTheme: RewardTheme
) {
  const matches = getDndRewardRecipientCandidates(context, rewardTheme);

  if (matches.length === 0) {
    return ['No obvious ideal carrier is logged in the roster yet. Use the reward to cover the party\'s biggest gap.'];
  }

  return matches.map((member) => {
    const signature = member.signatureItem.trim() ? ` Favorite hook: ${member.signatureItem.trim()}.` : '';
    return `${member.name} (${member.className}) is a strong fit for ${rewardTheme} treasure.${signature}`;
  });
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatThreatClockStatusLabel(value: string) {
  switch (value) {
    case 'lurking':
      return 'Lurking';
    case 'active':
      return 'Active';
    case 'escalating':
      return 'Escalating';
    case 'contained':
      return 'Contained';
    case 'resolved':
      return 'Resolved';
    default:
      return value;
  }
}

function parseDndTierInfo(levelBand: string, averageLevel: number | null) {
  const normalized = levelBand.trim();
  const rangeMatch = normalized.match(/levels?\s*(\d+)\s*[-–]\s*(\d+)/i) ?? normalized.match(/(\d+)\s*[-–]\s*(\d+)/);

  if (rangeMatch) {
    const low = Number.parseInt(rangeMatch[1], 10);
    const high = Number.parseInt(rangeMatch[2], 10);
    const tierLabel = normalized.match(/tier\s*\d/i)?.[0]
      ? normalized.split('(')[0].trim()
      : `Tier ${inferTierFromLevel(Math.max(low, 1))}`;

    return {
      tierLabel,
      suggestedPlanLevels: Number.isFinite(high) ? high : averageLevel,
    };
  }

  if (normalized.match(/tier\s*1/i)) {
    return { tierLabel: 'Tier 1', suggestedPlanLevels: 4 };
  }

  if (normalized.match(/tier\s*2/i)) {
    return { tierLabel: 'Tier 2', suggestedPlanLevels: 10 };
  }

  if (normalized.match(/tier\s*3/i)) {
    return { tierLabel: 'Tier 3', suggestedPlanLevels: 16 };
  }

  if (normalized.match(/tier\s*4/i)) {
    return { tierLabel: 'Tier 4', suggestedPlanLevels: 20 };
  }

  if (averageLevel !== null) {
    return {
      tierLabel: `Tier ${inferTierFromLevel(averageLevel)}`,
      suggestedPlanLevels: averageLevel <= 4 ? 4 : averageLevel <= 10 ? 10 : averageLevel <= 16 ? 16 : 20,
    };
  }

  return {
    tierLabel: normalized || 'Tier unknown',
    suggestedPlanLevels: null,
  };
}

function inferTierFromLevel(level: number) {
  if (level <= 4) return 1;
  if (level <= 10) return 2;
  if (level <= 16) return 3;
  return 4;
}
