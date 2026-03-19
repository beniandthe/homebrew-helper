import { EncounterDifficulty, LootRarity, QuestTone } from '@/types';

export const encounterMultipliers: Record<EncounterDifficulty, number> = {
  easy: 0.8,
  normal: 1,
  hard: 1.3,
  deadly: 1.6,
};

export const rarityTable: { rarity: LootRarity; weight: number }[] = [
  { rarity: 'Common', weight: 50 },
  { rarity: 'Uncommon', weight: 28 },
  { rarity: 'Rare', weight: 14 },
  { rarity: 'Epic', weight: 6 },
  { rarity: 'Legendary', weight: 2 },
];

export const lootPrefixes = ['Ashen', 'Moonlit', 'Ironbound', 'Whispering', 'Stormforged', 'Sunken'];
export const lootBases = ['Blade', 'Helm', 'Sigil', 'Charm', 'Gauntlets', 'Bow', 'Codex'];
export const lootPerks = [
  '+crit chance',
  '+initiative',
  '+essence regeneration',
  '+resistance to fear',
  '+bleed damage',
  '+summon durability',
];

export const questHooksByTone: Record<QuestTone, string[]> = {
  Heroic: [
    'A frontier village needs defenders before a siege at dawn.',
    'A famed captain vanished while escorting refugees through cursed woods.',
    'A relic that stabilizes the region\'s essence storms has been stolen.',
  ],
  Political: [
    'Two rival houses need deniable agents before peace talks collapse.',
    'A governor is buying mercenary loyalty with counterfeit treasury seals.',
    'A spy ring is feeding troop movements to both sides of the same war.',
  ],
  Dark: [
    'A mine keeps sending back workers who return with no shadows.',
    'Nightly bells ring from a temple that was buried fifty years ago.',
    'A noble family offers gold to erase all evidence of a blood pact.',
  ],
  Mystic: [
    'A celestial alignment opens a ruined archive for one night only.',
    'Dreams across the city point different people to the same hidden gate.',
    'A spirit court offers guidance if someone settles an ancient grievance.',
  ],
};

export const factionTensions = [
  'resource scarcity',
  'religious schism',
  'succession crisis',
  'border raids',
  'forbidden magic',
  'trade monopoly',
];
