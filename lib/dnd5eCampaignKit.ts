export type DndPartyMember = {
  id: string;
  name: string;
  species: string;
  className: string;
  background: string;
  level: string;
  armorClass: string;
  hitPoints: string;
  passivePerception: string;
  signatureItem: string;
  notes: string;
};

export type DndInventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  holder: string;
  rarity: string;
  attunement: string;
  notes: string;
};

export type DndPartyTreasury = {
  gp: string;
  sp: string;
  cp: string;
  special: string;
  notes: string;
};

export type DndNpc = {
  id: string;
  name: string;
  species: string;
  role: string;
  affiliation: string;
  disposition: string;
  hook: string;
};

export type DndReferenceEntry = {
  name: string;
  note: string;
};

export type DndWeaponReference = {
  name: string;
  category: string;
  damage: string;
  properties: string;
  note: string;
};

export type DndArmorReference = {
  name: string;
  category: string;
  armorClass: string;
  note: string;
};

export type DndMonsterReference = {
  name: string;
  creatureType: string;
  challenge: string;
  armorClass: string;
  hitPoints: string;
  speed: string;
  signature: string;
};

type DndCoverageLane = 'frontline' | 'support' | 'arcane' | 'scout';

type DndCampaignWorkbenchSnapshot = {
  partyCount: number;
  inventoryCount: number;
  npcCount: number;
  averageLevelLabel: string;
  highestPassiveLabel: string;
  partyCoverage: string[];
  inventoryHighlights: string[];
  npcHighlights: string[];
  treasurySummary: string;
};

type UnknownRecord = Record<string, unknown>;

const DND_CLASS_LANES: Record<string, DndCoverageLane[]> = {
  barbarian: ['frontline'],
  bard: ['support', 'arcane', 'scout'],
  cleric: ['support', 'frontline'],
  druid: ['support', 'arcane'],
  fighter: ['frontline'],
  monk: ['frontline', 'scout'],
  paladin: ['frontline', 'support'],
  ranger: ['scout', 'frontline'],
  rogue: ['scout'],
  sorcerer: ['arcane'],
  warlock: ['arcane'],
  wizard: ['arcane'],
};

export const DND_SPECIES_REFERENCE: DndReferenceEntry[] = [
  { name: 'Human', note: 'Flexible heroes who fit any class lane and almost any background hook.' },
  { name: 'Dwarf', note: 'Durable adventurers suited to front-line play, ancestral grudges, and hard travel.' },
  { name: 'Elf', note: 'Keen senses, mobility, and magical leanings make them strong scouts or casters.' },
  { name: 'Halfling', note: 'Small, brave, and lucky adventurers with strong stealth and social play hooks.' },
  { name: 'Gnome', note: 'Curious minds with a strong tilt toward clever utility, lore, and magical flavor.' },
  { name: 'Dragonborn', note: 'Bold draconic heroes with breath weapon pressure and clear visual identity.' },
  { name: 'Goliath', note: 'Powerful striders who make great defenders, skirmishers, or wilderness guides.' },
  { name: 'Orc', note: 'Relentless martial characters with aggressive momentum and strong survival flavor.' },
  { name: 'Tiefling', note: 'Fiend-touched heroes who naturally support social, arcane, and omen-heavy stories.' },
  { name: 'Aasimar', note: 'Celestial-touched champions, healers, prophets, or conflicted holy wanderers.' },
];

export const DND_CLASS_REFERENCE: DndReferenceEntry[] = [
  { name: 'Barbarian', note: 'Front-line bruiser built for rage, reckless pressure, and soaking hits.' },
  { name: 'Bard', note: 'Support caster, face, and skill engine who keeps scenes moving in and out of combat.' },
  { name: 'Cleric', note: 'Divine anchor for healing, defense, radiant damage, and patron-driven story hooks.' },
  { name: 'Druid', note: 'Nature caster with battlefield control, scouting options, and primal utility.' },
  { name: 'Fighter', note: 'Reliable martial core who can anchor the front, protect allies, or dominate range.' },
  { name: 'Monk', note: 'Fast striker and scout with mobility, control, and pressure on fragile targets.' },
  { name: 'Paladin', note: 'Armored defender with healing support, oath drama, and burst damage.' },
  { name: 'Ranger', note: 'Explorer, tracker, and ranged specialist who ties wilderness travel to combat utility.' },
  { name: 'Rogue', note: 'Skill expert and scout with stealth, burst damage, and intrigue-friendly play.' },
  { name: 'Sorcerer', note: 'Arcane blaster or controller whose magic feels innate, volatile, and dramatic.' },
  { name: 'Warlock', note: 'Pact-bound caster driven by short-rest cadence, patron tension, and signature spells.' },
  { name: 'Wizard', note: 'Arcane toolbox specialist with ritual utility, control, and broad spell access.' },
];

export const DND_WEAPON_REFERENCE: DndWeaponReference[] = [
  { name: 'Club', category: 'Simple melee', damage: '1d4 bludgeoning', properties: 'Light', note: 'Cheap backup weapon for improvised fighters and commoners.' },
  { name: 'Dagger', category: 'Simple melee', damage: '1d4 piercing', properties: 'Finesse, Light, Thrown (20/60)', note: 'Works for rogues, backup casters, and concealed carry.' },
  { name: 'Mace', category: 'Simple melee', damage: '1d6 bludgeoning', properties: '-', note: 'Straightforward one-handed weapon often tied to clerics and guards.' },
  { name: 'Quarterstaff', category: 'Simple melee', damage: '1d6 bludgeoning', properties: 'Versatile (1d8)', note: 'Excellent low-cost focus weapon for wanderers, druids, and monks.' },
  { name: 'Spear', category: 'Simple melee', damage: '1d6 piercing', properties: 'Thrown (20/60), Versatile (1d8)', note: 'A versatile battlefield staple for soldiers and travelers.' },
  { name: 'Rapier', category: 'Martial melee', damage: '1d8 piercing', properties: 'Finesse', note: 'A classic dueling sidearm for rogues, bards, and swashbucklers.' },
  { name: 'Longsword', category: 'Martial melee', damage: '1d8 slashing', properties: 'Versatile (1d10)', note: 'Reliable martial standard for knights, guards, and paladins.' },
  { name: 'Greatsword', category: 'Martial melee', damage: '2d6 slashing', properties: 'Heavy, Two-Handed', note: 'Big damage option for front-line martial characters.' },
  { name: 'Light Crossbow', category: 'Simple ranged', damage: '1d8 piercing', properties: 'Ammunition (80/320), Loading, Two-Handed', note: 'Steady ranged pressure for low-level parties and watch posts.' },
  { name: 'Longbow', category: 'Martial ranged', damage: '1d8 piercing', properties: 'Ammunition (150/600), Heavy, Two-Handed', note: 'Long-range staple for rangers, scouts, and battlefield snipers.' },
];

export const DND_ARMOR_REFERENCE: DndArmorReference[] = [
  { name: 'Leather Armor', category: 'Light armor', armorClass: '11 + Dex', note: 'Easy default for rogues, bards, and lightly armored adventurers.' },
  { name: 'Studded Leather Armor', category: 'Light armor', armorClass: '12 + Dex', note: 'Premium light-armor choice for agile frontliners and scouts.' },
  { name: 'Chain Shirt', category: 'Medium armor', armorClass: '13 + Dex (max 2)', note: 'Balanced option when you want protection without obvious bulk.' },
  { name: 'Breastplate', category: 'Medium armor', armorClass: '14 + Dex (max 2)', note: 'Strong medium armor for mobile leaders and holy warriors.' },
  { name: 'Half Plate Armor', category: 'Medium armor', armorClass: '15 + Dex (max 2)', note: 'Tougher medium choice when stealth matters less than durability.' },
  { name: 'Chain Mail', category: 'Heavy armor', armorClass: '16', note: 'Reliable heavy armor for fighters and paladins entering the front line.' },
  { name: 'Plate Armor', category: 'Heavy armor', armorClass: '18', note: 'Top-tier heavy armor that marks a serious martial presence.' },
  { name: 'Shield', category: 'Shield', armorClass: '+2 AC', note: 'The fastest way to harden a front liner or support caster.' },
];

export const DND_GEAR_REFERENCE: DndReferenceEntry[] = [
  { name: 'Healing Potion', note: 'Consumable recovery that keeps the party moving when rests are not safe.' },
  { name: 'Spell Scroll', note: 'One-use spell delivery that makes treasure feel tactical instead of only monetary.' },
  { name: 'Bag of Holding', note: 'Classic campaign utility item for hauling gear, treasure, and odd quest cargo.' },
  { name: 'Sending Stones', note: 'Reliable party-to-party communication for split missions, scouts, or allies.' },
  { name: 'Pearl of Power', note: 'Spellcaster reward that supports long dungeon days and hard boss scenes.' },
  { name: 'Cloak of Protection', note: 'Compact defensive upgrade that feels useful on almost any adventurer.' },
  { name: 'Holy Symbol', note: 'Important divine focus for clerics, paladins, temples, and faction identity.' },
  { name: 'Thieves\' Tools', note: 'Signal item for infiltration, scouting, and trap pressure.' },
  { name: 'Climber\'s Kit', note: 'Travel utility that makes vertical sites and ruined keeps play better.' },
  { name: 'Explorer\'s Pack', note: 'All-purpose dungeon crawl baseline for torches, rope, rations, and field gear.' },
];

export const DND_MONSTER_REFERENCE: DndMonsterReference[] = [
  { name: 'Guard', creatureType: 'Humanoid', challenge: 'CR 1/8', armorClass: '16', hitPoints: '11', speed: '30 ft.', signature: 'Spear or ranged post duty; ideal for watch posts, escorts, and city friction.' },
  { name: 'Goblin', creatureType: 'Humanoid', challenge: 'CR 1/4', armorClass: '15', hitPoints: '7', speed: '30 ft.', signature: 'Nimble skirmisher with scimitar and shortbow pressure.' },
  { name: 'Wolf', creatureType: 'Beast', challenge: 'CR 1/4', armorClass: '13', hitPoints: '11', speed: '40 ft.', signature: 'Pack hunter that rewards flanking, movement, and outdoor pressure.' },
  { name: 'Skeleton', creatureType: 'Undead', challenge: 'CR 1/4', armorClass: '13', hitPoints: '13', speed: '30 ft.', signature: 'Undead sentry with sword-and-bow coverage for crypts and old battlefields.' },
  { name: 'Orc', creatureType: 'Humanoid', challenge: 'CR 1/2', armorClass: '13', hitPoints: '15', speed: '30 ft.', signature: 'Aggressive melee raider that turns distance into immediate pressure.' },
  { name: 'Giant Spider', creatureType: 'Beast', challenge: 'CR 1', armorClass: '14', hitPoints: '26', speed: '30 ft., climb 30 ft.', signature: 'Webbed ambusher with climb routes and poison tension.' },
  { name: 'Mimic', creatureType: 'Monstrosity', challenge: 'CR 2', armorClass: '12', hitPoints: '58', speed: '15 ft.', signature: 'Sticky ambush predator that punishes greedy treasure-room habits.' },
  { name: 'Ogre', creatureType: 'Giant', challenge: 'CR 2', armorClass: '11', hitPoints: '59', speed: '40 ft.', signature: 'Brute benchmark for low-tier parties facing raw damage pressure.' },
];

export function createDndPartyMember(): DndPartyMember {
  return {
    id: createEntityId('party'),
    name: '',
    species: 'Human',
    className: 'Fighter',
    background: 'Soldier',
    level: '1',
    armorClass: '16',
    hitPoints: '12',
    passivePerception: '12',
    signatureItem: 'Longsword',
    notes: '',
  };
}

export function createDndInventoryItem(): DndInventoryItem {
  return {
    id: createEntityId('loot'),
    name: '',
    category: 'Gear',
    quantity: '1',
    holder: 'Shared',
    rarity: 'Common',
    attunement: 'No',
    notes: '',
  };
}

export function createDndPartyTreasury(): DndPartyTreasury {
  return {
    gp: '',
    sp: '',
    cp: '',
    special: '',
    notes: '',
  };
}

export function createDndNpc(): DndNpc {
  return {
    id: createEntityId('npc'),
    name: '',
    species: 'Human',
    role: 'Patron',
    affiliation: '',
    disposition: 'Ally',
    hook: '',
  };
}

export function readDndPartyMembers(value: unknown): DndPartyMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        id: readString(entry.id) || createEntityId(`party-${index}`),
        name: readString(entry.name),
        species: readString(entry.species) || 'Human',
        className: readString(entry.className) || 'Fighter',
        background: readString(entry.background) || 'Soldier',
        level: readString(entry.level) || '1',
        armorClass: readString(entry.armorClass) || '',
        hitPoints: readString(entry.hitPoints) || '',
        passivePerception: readString(entry.passivePerception) || '',
        signatureItem: readString(entry.signatureItem) || '',
        notes: readString(entry.notes),
      },
    ];
  });
}

export function readDndInventoryItems(value: unknown): DndInventoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        id: readString(entry.id) || createEntityId(`loot-${index}`),
        name: readString(entry.name),
        category: readString(entry.category) || 'Gear',
        quantity: readString(entry.quantity) || '1',
        holder: readString(entry.holder) || 'Shared',
        rarity: readString(entry.rarity) || 'Common',
        attunement: readString(entry.attunement) || 'No',
        notes: readString(entry.notes),
      },
    ];
  });
}

export function readDndPartyTreasury(value: unknown): DndPartyTreasury {
  if (!isRecord(value)) {
    return createDndPartyTreasury();
  }

  return {
    gp: readString(value.gp),
    sp: readString(value.sp),
    cp: readString(value.cp),
    special: readString(value.special),
    notes: readString(value.notes),
  };
}

export function readDndNpcRoster(value: unknown): DndNpc[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        id: readString(entry.id) || createEntityId(`npc-${index}`),
        name: readString(entry.name),
        species: readString(entry.species) || 'Human',
        role: readString(entry.role) || 'Patron',
        affiliation: readString(entry.affiliation),
        disposition: readString(entry.disposition) || 'Neutral',
        hook: readString(entry.hook),
      },
    ];
  });
}

export function buildDndCampaignWorkbenchSnapshot(input: {
  partyRoster: DndPartyMember[];
  inventory: DndInventoryItem[];
  treasury: DndPartyTreasury;
  npcRoster: DndNpc[];
}): DndCampaignWorkbenchSnapshot {
  const partyRoster = input.partyRoster.filter((member) => member.name.trim().length > 0);
  const inventory = input.inventory.filter((item) => item.name.trim().length > 0);
  const npcRoster = input.npcRoster.filter((npc) => npc.name.trim().length > 0);

  const levels = partyRoster
    .map((member) => parseInteger(member.level))
    .filter((value): value is number => value !== null);

  const passiveRoster = partyRoster
    .map((member) => ({
      name: member.name,
      passive: parseInteger(member.passivePerception),
    }))
    .filter((entry): entry is { name: string; passive: number } => entry.passive !== null);

  const highestPassive = passiveRoster.reduce<{ name: string; passive: number } | null>(
    (current, entry) => (current && current.passive >= entry.passive ? current : entry),
    null
  );

  const laneLeads = new Map<DndCoverageLane, string[]>();
  for (const member of partyRoster) {
    const normalizedClass = member.className.trim().toLowerCase();
    const lanes = DND_CLASS_LANES[normalizedClass] ?? [];
    for (const lane of lanes) {
      const existing = laneLeads.get(lane) ?? [];
      existing.push(member.name);
      laneLeads.set(lane, existing);
    }
  }

  const partyCoverage = [
    describeCoverageLane('frontline', laneLeads, 'No clear front-line anchor logged yet.'),
    describeCoverageLane('support', laneLeads, 'No obvious healing or support lane logged yet.'),
    describeCoverageLane('arcane', laneLeads, 'No dedicated arcane lane logged yet.'),
    describeCoverageLane('scout', laneLeads, 'No stealth or scouting specialist logged yet.'),
  ];

  const totalQuantity = inventory.reduce((sum, item) => sum + (parseInteger(item.quantity) ?? 1), 0);
  const consumables = inventory.filter((item) => isConsumable(item)).length;
  const magicItems = inventory.filter((item) => isMagicItem(item)).length;
  const attunedItems = inventory.filter((item) => item.attunement.trim().toLowerCase() === 'yes').length;
  const healingItems = inventory.filter((item) => item.name.toLowerCase().includes('healing')).length;

  const inventoryHighlights = [
    inventory.length > 0
      ? `${inventory.length} tracked entries covering ${totalQuantity} total pieces of gear or treasure.`
      : 'No shared inventory logged yet. Start with weapons, potions, or the last treasure haul.',
    magicItems > 0
      ? `${magicItems} magic item entries are on the ledger.`
      : 'No magic items logged yet.',
    consumables > 0
      ? `${consumables} consumable entries can feed attrition-heavy dungeon days.`
      : 'No consumables logged yet. Potions and scrolls are worth tracking separately.',
    healingItems > 0
      ? 'Healing resources are on the ledger.'
      : 'No healing item is visible in the shared inventory.',
    attunedItems > 0
      ? `${attunedItems} item entries are marked as requiring attunement.`
      : 'No attunement-bound item is logged right now.',
  ];

  const allies = npcRoster.filter((npc) => npc.disposition.trim().toLowerCase().includes('ally')).length;
  const neutrals = npcRoster.filter((npc) => npc.disposition.trim().toLowerCase().includes('neutral')).length;
  const hostiles = npcRoster.filter((npc) => {
    const disposition = npc.disposition.trim().toLowerCase();
    return disposition.includes('hostile') || disposition.includes('enemy') || disposition.includes('rival');
  }).length;

  const npcHighlights = [
    npcRoster.length > 0
      ? `${npcRoster.length} named NPC contacts are tied into the campaign.`
      : 'No NPC web logged yet. Add patrons, rivals, guides, or quest givers.',
    allies > 0 ? `${allies} allied NPCs can reinforce quest hooks or safe rests.` : 'No allied NPC is marked yet.',
    neutrals > 0 ? `${neutrals} neutral contacts can swing scenes through leverage or favors.` : 'No neutral broker or wildcard is logged yet.',
    hostiles > 0 ? `${hostiles} hostile or rival figures are actively on the board.` : 'No explicit rival or hostile NPC is logged yet.',
  ];

  const averageLevelLabel =
    levels.length > 0
      ? `Average level ${formatAverage(levels)} across ${levels.length} tracked adventurers.`
      : 'No party levels logged yet.';

  const highestPassiveLabel = highestPassive
    ? `Highest passive Perception: ${highestPassive.name} (${highestPassive.passive}).`
    : 'No passive Perception scores logged yet.';

  const treasuryParts = [
    formatCoinValue(input.treasury.gp, 'gp'),
    formatCoinValue(input.treasury.sp, 'sp'),
    formatCoinValue(input.treasury.cp, 'cp'),
  ].filter(Boolean);

  const treasurySummary = treasuryParts.length > 0
    ? `Party treasury: ${treasuryParts.join(', ')}${input.treasury.special ? `, plus ${input.treasury.special}` : ''}.`
    : input.treasury.special
      ? `Party treasury notes: ${input.treasury.special}.`
      : 'No party treasury logged yet.';

  return {
    partyCount: partyRoster.length,
    inventoryCount: inventory.length,
    npcCount: npcRoster.length,
    averageLevelLabel,
    highestPassiveLabel,
    partyCoverage,
    inventoryHighlights,
    npcHighlights,
    treasurySummary,
  };
}

function createEntityId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function parseInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAverage(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  return Number.isInteger(average) ? String(average) : average.toFixed(1);
}

function describeCoverageLane(
  lane: DndCoverageLane,
  laneLeads: Map<DndCoverageLane, string[]>,
  fallback: string
) {
  const names = laneLeads.get(lane);
  if (!names || names.length === 0) {
    return fallback;
  }

  const joinedNames = names.join(', ');

  switch (lane) {
    case 'frontline':
      return `Front line covered by ${joinedNames}.`;
    case 'support':
      return `Support and recovery covered by ${joinedNames}.`;
    case 'arcane':
      return `Arcane pressure handled by ${joinedNames}.`;
    case 'scout':
      return `Scouting and infiltration covered by ${joinedNames}.`;
    default:
      return fallback;
  }
}

function isConsumable(item: DndInventoryItem) {
  const category = item.category.trim().toLowerCase();
  const name = item.name.trim().toLowerCase();
  return (
    category.includes('consumable') ||
    category.includes('potion') ||
    category.includes('scroll') ||
    name.includes('potion') ||
    name.includes('scroll')
  );
}

function isMagicItem(item: DndInventoryItem) {
  const category = item.category.trim().toLowerCase();
  const rarity = item.rarity.trim().toLowerCase();
  return (
    category.includes('magic') ||
    category.includes('wondrous') ||
    (rarity.length > 0 && rarity !== 'common')
  );
}

function formatCoinValue(value: string, denomination: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed} ${denomination}` : '';
}
