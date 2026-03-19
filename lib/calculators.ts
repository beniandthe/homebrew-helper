import { encounterMultipliers, factionTensions, lootBases, lootPerks, lootPrefixes, questHooksByTone, rarityTable } from '@/lib/data';
import { EncounterDifficulty, LootRarity, QuestTone, XPCurveType } from '@/types';

export function buildXpTable(levels: number, baseXp: number, growth: number, curve: XPCurveType) {
  const modifier = curve === 'linear' ? 1 : curve === 'smooth' ? 1.12 : 1.24;
  const rows = [] as { level: number; xpToNext: number; totalXp: number }[];
  let totalXp = 0;

  for (let level = 1; level <= levels; level += 1) {
    const xpToNext = Math.round(baseXp * Math.pow(growth * modifier, level - 1));
    totalXp += xpToNext;
    rows.push({ level, xpToNext, totalXp });
  }

  return rows;
}

export function buildEncounterBudget(partySize: number, partyLevel: number, enemyCount: number, difficulty: EncounterDifficulty) {
  const baseBudget = partySize * partyLevel * 40;
  const multiplier = encounterMultipliers[difficulty];
  const totalBudget = Math.round(baseBudget * multiplier);
  const budgetPerEnemy = Math.max(1, Math.round(totalBudget / Math.max(1, enemyCount)));

  return {
    totalBudget,
    budgetPerEnemy,
    note:
      difficulty === 'deadly'
        ? 'Expect resource drain or a possible wipe if tactics go badly.'
        : difficulty === 'hard'
          ? 'This should feel tense without being unfair.'
          : 'Good for standard progression and testing builds.',
  };
}

function pickWeightedRarity(seed: number): LootRarity {
  const totalWeight = rarityTable.reduce((acc, item) => acc + item.weight, 0);
  let value = seed % totalWeight;

  for (const item of rarityTable) {
    if (value < item.weight) return item.rarity;
    value -= item.weight;
  }

  return 'Common';
}

export function generateLoot(seedText: string, playerLevel: number) {
  const seed = Array.from(seedText || 'loot').reduce((acc, char) => acc + char.charCodeAt(0), 0) + playerLevel * 17;
  const rarity = pickWeightedRarity(seed);
  const prefix = lootPrefixes[seed % lootPrefixes.length];
  const base = lootBases[(seed * 3) % lootBases.length];
  const perk = lootPerks[(seed * 7) % lootPerks.length];
  const value = Math.max(10, playerLevel * (rarityTable.find((item) => item.rarity === rarity)?.weight ?? 10));

  return {
    name: `${prefix} ${base}`,
    rarity,
    goldValue: value,
    effect: `${perk} scaled for level ${playerLevel}`,
  };
}

export function generateQuest(factionName: string, tone: QuestTone) {
  const hooks = questHooksByTone[tone];
  const seed = Array.from(factionName || 'Faction').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hook = hooks[seed % hooks.length];
  const tension = factionTensions[(seed * 5) % factionTensions.length];

  return {
    title: `${factionName || 'Unnamed Faction'}: ${tone} Opportunity`,
    hook,
    complication: `The mission is complicated by ${tension}, forcing the party to choose who benefits from the outcome.`,
    reward: 'Gain faction favor, a rare contact, and a scalable treasure reward.',
  };
}
