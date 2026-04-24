import { pickFromPool } from '@/lib/generation';
import type { GameSystemId } from '@/lib/gameSystems';

export type CurveType = 'linear' | 'smooth' | 'steep';
export type ProgressionPreset = 'slow' | 'standard' | 'heroic' | 'brutal' | 'custom';
export type ProgressionMode = 'xp' | 'milestone';

export type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type RewardType = 'gear' | 'gold' | 'consumable' | 'material';
export type RewardSource = 'boss' | 'chest' | 'quest' | 'vendor' | 'faction';
export type RewardTheme = 'arcane' | 'divine' | 'cursed' | 'martial' | 'wilderness' | 'noble';
export type BundleStyle = 'lean' | 'balanced' | 'generous';

type XpPresetValues = {
  baseXp: string;
  growthFactor: string;
  curveType: CurveType;
  encountersPerLevel: string;
  encountersPerSession: string;
  progressionMode?: ProgressionMode;
};

type XpLabels = {
  preset: string;
  mode: string;
  levels: string;
  baseXp: string;
  growthFactor: string;
  curve: string;
  encountersPerSession: string;
  encountersPerLevel: string;
  notes: string;
  notesPlaceholder: string;
  rerollButton: string;
  pacingSummary: string;
  levelingPreview: string;
  milestoneSuggestions: string;
  practicalAdvice: string;
  optionalPacingVariants: string;
  milestoneModeCopy: string;
};

export type XpSystemConfig = {
  defaults: {
    levels: string;
    baseXp: string;
    growthFactor: string;
    curveType: CurveType;
    progressionPreset: ProgressionPreset;
    progressionMode: ProgressionMode;
    encountersPerSession: string;
    encountersPerLevel: string;
  };
  linearStrategy: 'scaled' | 'flat';
  labels: XpLabels;
  presetLabels: Record<ProgressionPreset, string>;
  curveLabels: Record<CurveType, string>;
  modeLabels: Record<ProgressionMode, string>;
  presets: Record<Exclude<ProgressionPreset, 'custom'>, XpPresetValues>;
  pacingAssessment: {
    default: string;
    fast: string;
    slow: string;
    milestone: string;
  };
  advice: {
    milestoneMode: string;
    xpMode: string;
    singleSession: string;
    highEncounterCount: string;
    steepCurve: string;
    linearCurve: string;
    default: string;
  };
  pacingVariantPool: string[];
  milestoneBase: (levels: number) => string[];
  milestoneVariants: (levels: number) => string[];
};

type RewardLabels = {
  playerLevel: string;
  enemyTier: string;
  rewardType: string;
  rarity: string;
  rewardSource: string;
  rewardTheme: string;
  bundleStyle: string;
  prepNotes: string;
  prepNotesPlaceholder: string;
  rerollButton: string;
  rewardSummary: string;
  sourceGuidance: string;
  practicalAdvice: string;
  encounterHooks: string;
  featuredItem: string;
  itemDetail: string;
  statLine: string;
  bonusItem: string;
  currencyValue: string;
};

type RewardDetail = {
  description: string;
  statLine: string;
};

type RewardSystemConfig = {
  defaults: {
    playerLevel: string;
    enemyTier: string;
    rewardType: RewardType;
    rarity: LootRarity;
    rewardSource: RewardSource;
    rewardTheme: RewardTheme;
    bundleStyle: BundleStyle;
  };
  labels: RewardLabels;
  rarityLabels: Record<LootRarity, string>;
  rewardTypeLabels: Record<RewardType, string>;
  rewardSourceLabels: Record<RewardSource, string>;
  rewardThemeLabels: Record<RewardTheme, string>;
  bundleStyleLabels: Record<BundleStyle, string>;
  flavorNotes: Record<RewardSource, string>;
  advice: {
    boss: string;
    rareGold: string;
    material: string;
    vendor: string;
    generous: string;
    default: string;
  };
  hookPool: string[];
  bonusPools: Record<BundleStyle, string[]>;
  rewardSummary: (input: {
    rarity: LootRarity;
    rewardTheme: RewardTheme;
    rewardType: RewardType;
    rewardSource: RewardSource;
  }) => string;
  itemPools: Record<RewardTheme, Record<RewardType, string[]>>;
  itemDetail: (input: {
    rewardType: RewardType;
    rewardTheme: RewardTheme;
    rarity: LootRarity;
    itemName: string;
  }) => RewardDetail;
};

const SHARED_RARITY_MULTIPLIERS: Record<LootRarity, number> = {
  common: 1,
  uncommon: 1.25,
  rare: 1.6,
  epic: 2.15,
  legendary: 3.1,
};

export function getLootRarityMultiplier(rarity: LootRarity) {
  return SHARED_RARITY_MULTIPLIERS[rarity];
}

const SHARED_RARITY_LABELS: Record<LootRarity, string> = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
};

const SHARED_SOURCE_MULTIPLIERS: Record<RewardSource, number> = {
  boss: 1.4,
  chest: 1.15,
  quest: 1.25,
  vendor: 0.95,
  faction: 1.2,
};

export function getRewardSourceMultiplier(source: RewardSource) {
  return SHARED_SOURCE_MULTIPLIERS[source];
}

const SHARED_BUNDLE_MULTIPLIERS: Record<BundleStyle, number> = {
  lean: 0.85,
  balanced: 1,
  generous: 1.25,
};

export function getBundleStyleMultiplier(style: BundleStyle) {
  return SHARED_BUNDLE_MULTIPLIERS[style];
}

const HOME_XP_CONFIG: XpSystemConfig = {
  defaults: {
    levels: '20',
    baseXp: '100',
    growthFactor: '1.3',
    curveType: 'smooth',
    progressionPreset: 'standard',
    progressionMode: 'xp',
    encountersPerSession: '2',
    encountersPerLevel: '4',
  },
  linearStrategy: 'scaled',
  labels: {
    preset: 'Campaign Pace',
    mode: 'Advancement Style',
    levels: 'Level Count',
    baseXp: 'Base XP Budget',
    growthFactor: 'Growth Rate',
    curve: 'Advancement Curve',
    encountersPerSession: 'Encounters per Session',
    encountersPerLevel: 'Expected Encounters per Level',
    notes: 'GM Notes',
    notesPlaceholder: 'Level 3 specialization, guild rank at 6, airship or stronghold at 10...',
    rerollButton: 'Reroll Advancement Beats',
    pacingSummary: 'Pacing Summary',
    levelingPreview: 'Advancement Preview',
    milestoneSuggestions: 'Level Beats',
    practicalAdvice: 'GM Advice',
    optionalPacingVariants: 'Optional Pace Tweaks',
    milestoneModeCopy: 'Milestone mode is active. Advancement follows major wins, discoveries, and chapter turns instead of strict XP math.',
  },
  presetLabels: {
    slow: 'slow burn',
    standard: 'standard arc',
    heroic: 'fast climb',
    brutal: 'hard road',
    custom: 'custom',
  },
  curveLabels: {
    linear: 'flat',
    smooth: 'rising',
    steep: 'steep climb',
  },
  modeLabels: {
    xp: 'xp',
    milestone: 'milestone',
  },
  presets: {
    slow: {
      baseXp: '140',
      growthFactor: '1.4',
      curveType: 'steep',
      encountersPerLevel: '6',
      encountersPerSession: '2',
    },
    standard: {
      baseXp: '100',
      growthFactor: '1.3',
      curveType: 'smooth',
      encountersPerLevel: '4',
      encountersPerSession: '2',
    },
    heroic: {
      baseXp: '80',
      growthFactor: '1.18',
      curveType: 'smooth',
      encountersPerLevel: '3',
      encountersPerSession: '2',
    },
    brutal: {
      baseXp: '160',
      growthFactor: '1.45',
      curveType: 'steep',
      encountersPerLevel: '7',
      encountersPerSession: '2',
    },
  },
  pacingAssessment: {
    default: 'Balanced pacing for a long original-fantasy campaign.',
    fast: 'Fast advancement with regular new tools and visible momentum.',
    slow: 'A slower climb that leaves room for travel, downtime, and faction play.',
    milestone: 'Milestone pacing keeps advancement anchored to major turns in the story.',
  },
  advice: {
    milestoneMode: 'Use milestone mode when you want level-ups to follow major victories, discoveries, and chapter breaks instead of session math.',
    xpMode: 'Tracked XP works best when your encounter count and threat level stay reasonably consistent week to week.',
    singleSession: 'One major fight per session can make advancement crawl unless exploration, social wins, and quest goals also grant progress.',
    highEncounterCount: 'A high encounters-per-level target can feel grindy unless every level meaningfully changes what the party can do.',
    steepCurve: 'A steep curve works best when late-game levels are meant to feel rare, weighty, and hard-earned.',
    linearCurve: 'A flatter curve is easier to teach and track, but it gives up some of the drama of bigger power jumps.',
    default: 'This setup should land cleanly for a practical home campaign without much retuning.',
  },
  pacingVariantPool: [
    'Give bonus XP for social and exploration wins to stabilize uneven combat schedules.',
    'Batch level-ups at chapter breaks so power spikes align with story arcs.',
    'Use downtime milestones to smooth campaigns with irregular attendance.',
    'Mark one "catch-up" level where under-leveled characters can close the gap.',
    'Reserve one bonus progression beat for completing a personal character goal.',
    'Gate high-level features behind faction or world unlocks to pace late-game complexity.',
    'Award goal XP for completing prep-defined objectives unrelated to combat.',
    'Use level sync windows so new characters can join without lagging far behind.',
    'Replace one grind-heavy level with a narrative training montage advancement.',
    'Tie one level-up to a region unlock so exploration directly feeds progression.',
    'Offer optional hard-mode encounters that grant accelerated progression.',
    'Convert failed missions into partial XP so losses still advance the campaign.',
  ],
  milestoneBase: (levels) => [
    'Level 3: establish subclass, specialization, or defining class identity.',
    `Level ${Math.max(4, Math.floor(levels * 0.35))}: grant a major gear, faction, or narrative unlock.`,
    `Level ${Math.max(6, Math.floor(levels * 0.6))}: introduce a strong power spike or campaign shift.`,
    `Level ${levels}: reserve for endgame mastery, capstone, or finale content.`,
  ],
  milestoneVariants: (levels) => [
    `Level ${Math.max(2, Math.floor(levels * 0.2))}: add a defensive feature or survivability bump.`,
    `Level ${Math.max(5, Math.floor(levels * 0.45))}: unlock faction command privileges or social leverage.`,
    `Level ${Math.max(7, Math.floor(levels * 0.7))}: introduce advanced tactical options or signature spell tier.`,
    `Level ${Math.max(8, Math.floor(levels * 0.8))}: provide travel, teleport, or strategic mobility access.`,
    `Level ${Math.max(9, levels - 2)}: preview finale mechanics with a controlled challenge.`,
  ],
};

const HOME_REWARD_CONFIG: RewardSystemConfig = {
  defaults: {
    playerLevel: '5',
    enemyTier: '1',
    rewardType: 'gear',
    rarity: 'common',
    rewardSource: 'chest',
    rewardTheme: 'martial',
    bundleStyle: 'balanced',
  },
  labels: {
    playerLevel: 'Party Level',
    enemyTier: 'Threat Tier',
    rewardType: 'Loot Type',
    rarity: 'Rarity',
    rewardSource: 'Loot Source',
    rewardTheme: 'Loot Theme',
    bundleStyle: 'Haul Size',
    prepNotes: 'GM Notes',
    prepNotesPlaceholder: 'Bandit cache, shrine offering, guild payment, smithing upgrade lead...',
    rerollButton: 'Reroll Loot Flavor',
    rewardSummary: 'Loot Summary',
    sourceGuidance: 'Source Notes',
    practicalAdvice: 'Loot Advice',
    encounterHooks: 'Follow-up Hooks',
    featuredItem: 'Featured loot',
    itemDetail: 'Loot detail',
    statLine: 'Use note',
    bonusItem: 'Bonus piece',
    currencyValue: 'Coin value',
  },
  rarityLabels: SHARED_RARITY_LABELS,
  rewardTypeLabels: {
    gear: 'weapon / gear',
    gold: 'coin / valuables',
    consumable: 'potion / kit',
    material: 'crafting stock',
  },
  rewardSourceLabels: {
    boss: 'boss trove',
    chest: 'cache',
    quest: 'patron payment',
    vendor: 'market stock',
    faction: 'house favor',
  },
  rewardThemeLabels: {
    arcane: 'arcane',
    divine: 'sanctified',
    cursed: 'blighted',
    martial: 'martial',
    wilderness: 'frontier',
    noble: 'courtly',
  },
  bundleStyleLabels: {
    lean: 'light haul',
    balanced: 'standard haul',
    generous: 'big score',
  },
  flavorNotes: {
    boss: 'Boss rewards should feel memorable and include at least one standout element.',
    chest: 'Chest rewards should feel discoverable and satisfying without overshadowing milestone rewards.',
    quest: 'Quest rewards should reflect story effort, faction trust, or completion significance.',
    vendor: 'Vendor rewards should be practical and priced like curated stock, not dramatic treasure spikes.',
    faction: 'Faction rewards should reinforce identity, loyalty, and world politics.',
  },
  advice: {
    boss: 'Boss rewards feel best when at least one item changes future player choices.',
    rareGold: 'High-rarity pure gold can feel flat. Consider pairing it with one named item or hook.',
    material: 'Material rewards are stronger when tied to crafting, upgrades, or a known NPC artisan.',
    vendor: 'Vendor rewards should stay useful and dependable rather than wildly swingy.',
    generous: 'Generous bundles are best used for bosses, milestone quests, or major world progress.',
    default: 'This reward bundle is broadly usable as-is for a typical session reward.',
  },
  hookPool: [
    'Guardians of the reward return after one long rest unless appeased.',
    'The item resonates near a hidden vault keyed to this theme.',
    'A rival group can identify this reward and track the party by it.',
    'The reward can be upgraded by completing a linked side objective.',
    'Using this reward publicly changes how one faction responds to the party.',
    'The reward contains a map clue toward a higher-tier location.',
  ],
  bonusPools: {
    lean: ['small currency bonus', 'one practical extra consumable', 'minor crafting add-on'],
    balanced: ['supplemental crafting materials', 'backup consumable pack', 'small secondary item'],
    generous: ['bonus rare material bundle', 'secondary themed item', 'extra coin cache'],
  },
  rewardSummary: ({ rarity, rewardTheme, rewardType, rewardSource }) =>
    `${rarity} ${rewardTheme} ${rewardType} pulled from a ${rewardSource}.`,
  itemPools: {
    arcane: {
      gear: ['Runed Focus', 'Spellthread Cloak', 'Sigil Rod', 'Aether Band'],
      gold: ['Mage Stipend', 'Arcane Treasury Token', 'Guild Payout', 'Conclave Retainer Purse'],
      consumable: ['Mana Tonic', 'Blink Dust', 'Scroll of Sparks', 'Elixir of Clarity'],
      material: ['Aether Crystal', 'Spellglass Shard', 'Runic Ink', 'Moonstone Dust'],
    },
    divine: {
      gear: ['Blessed Shield', 'Sunmetal Charm', 'Saints Cloak', 'Votive Blade'],
      gold: ['Temple Tithe', 'Pilgrim Offering', 'Relic Fund', 'Blessed Purse'],
      consumable: ['Healing Draught', 'Holy Water Flask', 'Incense Bundle', 'Purity Tonic'],
      material: ['Silver Filament', 'Blessed Resin', 'Sanctified Ash', 'Dawn Petal'],
    },
    cursed: {
      gear: ['Hexbound Ring', 'Blood-Etched Knife', 'Wailing Locket', 'Shadowmail'],
      gold: ['Black Coin Pouch', 'Forbidden Tribute', 'Night Tax Chest', 'Exile Bounty Token'],
      consumable: ['Rot Flask', 'Nightshade Tonic', 'Ash Smoke Bomb', 'Bone Elixir'],
      material: ['Witchbone Dust', 'Rot Resin', 'Black Salt', 'Mourning Iron'],
    },
    martial: {
      gear: ['Iron Blade', 'Hunter Bow', 'Runed Shield', 'Traveler Armor'],
      gold: ['Mercenary Purse', 'War Chest Coins', 'Captains Payout', 'Field Bounty'],
      consumable: ['Battle Tonic', 'Fire Flask', 'Sharpening Oil', 'Second Wind Salve'],
      material: ['Iron Ore', 'Hardened Leather', 'Steel Rivets', 'Tempered Steel Ingot'],
    },
    wilderness: {
      gear: ['Thorn Knife', 'Ranger Hood', 'Bone Charm', 'Mosscloak'],
      gold: ['Ranger Cache', 'Hunters Purse', 'Frontier Scrip', 'Camp Payout'],
      consumable: ['Antidote Kit', 'Healing Herb Pack', 'Beast Lure', 'Trail Ration Bundle'],
      material: ['Ancient Bark', 'Beast Pelt', 'Green Resin', 'Spirit Herb'],
    },
    noble: {
      gear: ['Signet Rapier', 'Velvet Mantle', 'House Brooch', 'Court Dagger'],
      gold: ['Estate Purse', 'Court Reward', 'Patrons Gift', 'Royal Charter Writ'],
      consumable: ['Perfumed Tonic', 'Courtly Elixir', 'Fine Oil Flask', 'Luxury Remedy'],
      material: ['Silk Thread', 'Gold Leaf', 'Fine Leather', 'Pearl Dust'],
    },
  },
  itemDetail: ({ rewardType, rewardTheme, rarity, itemName }) => ({
    description: `${itemName} is a ${rarity} ${rewardTheme} loot piece built to feel immediately usable at the table.`,
    statLine:
      rewardType === 'gear'
        ? 'Treat as tier-appropriate gear with one small situational bonus.'
        : rewardType === 'consumable'
          ? 'Single-use effect with a clear tactical or narrative edge.'
          : rewardType === 'material'
            ? 'Useful for upgrades, crafting, or a future barter scene.'
            : 'Use as a reward package or currency bundle with a little story weight.',
  }),
};

const DND_XP_CONFIG: XpSystemConfig = {
  defaults: {
    levels: '20',
    baseXp: '100',
    growthFactor: '1.24',
    curveType: 'smooth',
    progressionPreset: 'standard',
    progressionMode: 'xp',
    encountersPerSession: '2',
    encountersPerLevel: '4',
  },
  linearStrategy: 'scaled',
  labels: {
    preset: 'Tier Pacing',
    mode: 'Advancement Style',
    levels: 'Character Levels',
    baseXp: 'Base XP Award',
    growthFactor: 'Tier Growth',
    curve: '5e Progression Curve',
    encountersPerSession: 'Encounters per Session',
    encountersPerLevel: 'Expected Encounters per Level',
    notes: 'DM Notes',
    notesPlaceholder:
      'Level 5 power spike, spell tier jump at 9, potion-brewing beat, stronghold or patron pivot...',
    rerollButton: 'Reroll 5e Power Breaks',
    pacingSummary: 'Tier Pace Summary',
    levelingPreview: 'Tier of Play Preview',
    milestoneSuggestions: '5e Power Breaks',
    practicalAdvice: 'DM Guidance',
    optionalPacingVariants: 'Campaign Pace Options',
    milestoneModeCopy:
      'Milestone mode is active. Advancement follows major dungeon clears, travel chapters, patron victories, and adventure turns instead of tracked XP.',
  },
  presetLabels: {
    slow: 'dungeon crawl',
    standard: 'core campaign',
    heroic: 'heroic climb',
    brutal: 'long epic',
    custom: 'custom',
  },
  curveLabels: {
    linear: 'linear',
    smooth: 'tiered',
    steep: 'late-game drag',
  },
  modeLabels: {
    xp: 'xp',
    milestone: 'milestone',
  },
  presets: {
    slow: {
      baseXp: '130',
      growthFactor: '1.3',
      curveType: 'steep',
      encountersPerLevel: '6',
      encountersPerSession: '2',
    },
    standard: {
      baseXp: '100',
      growthFactor: '1.24',
      curveType: 'smooth',
      encountersPerLevel: '4',
      encountersPerSession: '2',
    },
    heroic: {
      baseXp: '80',
      growthFactor: '1.16',
      curveType: 'smooth',
      encountersPerLevel: '3',
      encountersPerSession: '2',
    },
    brutal: {
      baseXp: '145',
      growthFactor: '1.34',
      curveType: 'steep',
      encountersPerLevel: '6',
      encountersPerSession: '3',
    },
  },
  pacingAssessment: {
    default: 'Balanced fifth-edition pacing across a long campaign with clear power jumps.',
    fast: 'Fast heroic pacing that gets the party to Extra Attack and 3rd-level spells quickly.',
    slow: 'A slower climb that gives room for travel, downtime, dungeon attrition, and patron politics.',
    milestone: 'Milestone pacing keeps level-ups tied to dungeon clears, site turns, and major victories.',
  },
  advice: {
    milestoneMode:
      'Milestone mode works best when level-ups follow site clears, major patron wins, travel chapters, and boss turns rather than single encounters.',
    xpMode:
      'Tracked XP feels strongest when the table actually sees a regular mix of combat, exploration, and social wins instead of one big fight per night.',
    singleSession:
      'One encounter per session can make 5e feel flat unless exploration, faction goals, and site objectives also advance the party.',
    highEncounterCount:
      'High encounters-per-level can feel grindy unless short rests, magic items, and new class options keep the cadence fresh.',
    steepCurve:
      'A slower late-game curve is strongest when you want high-tier spells, flight, and world-scale threats to feel rare and campaign-defining.',
    linearCurve:
      'A flatter curve is easy to teach, but it softens the feel of the big 5e power jumps at levels like 5, 9, 13, and 17.',
    default:
      'This pacing should support a recognizably 5e campaign without forcing filler fights between the real adventure beats.',
  },
  pacingVariantPool: [
    'Batch level-ups at chapter breaks so feats, spell slots, and subclass changes land between adventures rather than mid-dungeon.',
    'Award story XP for exploration, faction wins, and hard social scenes so combat does not carry all progression.',
    'Tie one advancement beat to a patron alliance, stronghold unlock, or travel milestone instead of another random fight.',
    'Reserve a catch-up boost for replacement characters so the adventuring party stays in the same tier of play.',
    'Let major villains unlock bonus XP if the party resolves them through infiltration, diplomacy, or objective play.',
    'Use downtime montages to bridge slower levels without forcing repetitive filler encounters.',
    'Treat one dungeon floor, wilderness leg, or city ward as a complete progression chapter with its own level-up beat.',
    'Use weapon-mastery, magic-item, or spell-scroll unlocks as side rewards when a full level-up would come too fast.',
    'Gate one late-tier spike behind planar travel, a dragon-scale threat, or a major faction oath.',
    'Award partial XP for failed missions so setbacks still keep the campaign moving.',
    'Use milestone advancement for boss arcs and tracked XP for sandbox travel between them.',
  ],
  milestoneBase: (levels) => [
    'Level 3: subclass identity locks in and the party\'s first real combat rhythm appears.',
    `Level ${Math.max(5, Math.floor(levels * 0.25))}: plan for Extra Attack, 3rd-level spells, and a clear jump in encounter scale.`,
    `Level ${Math.max(9, Math.floor(levels * 0.45))}: stronger mobility, 5th-level spells, and better save pressure widen adventure design.`,
    `Level ${Math.max(13, Math.floor(levels * 0.65))}: high-tier magic, tougher monsters, and bigger site objectives should change the campaign footprint.`,
    `Level ${Math.max(17, levels - 2)}: reserve for epic spells, legendary-scale threats, and final-arc prep.`,
  ],
  milestoneVariants: (levels) => [
    `Level ${Math.max(4, Math.floor(levels * 0.2))}: feats or ability score improvements start defining sharper class lanes.`,
    `Level ${Math.max(6, Math.floor(levels * 0.3))}: use travel pace, environmental effects, or stronger site hazards to keep play from flattening out.`,
    `Level ${Math.max(8, Math.floor(levels * 0.4))}: hand out one real magic item, potion recipe, or spell-scroll lead that changes future choices.`,
    `Level ${Math.max(11, Math.floor(levels * 0.55))}: introduce monsters that reshape the battlefield through movement, saves, or concentration pressure.`,
    `Level ${Math.max(18, levels - 1)}: preview finale mechanics before the last arc begins.`,
  ],
};

const DND_RARITY_LABELS: Record<LootRarity, string> = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  epic: 'very rare',
  legendary: 'legendary',
};

const DND_REWARD_TYPE_LABELS: Record<RewardType, string> = {
  gear: 'magic item',
  gold: 'coins & gems',
  consumable: 'potions & scrolls',
  material: 'artisan reagents',
};

const DND_REWARD_SOURCE_LABELS: Record<RewardSource, string> = {
  boss: 'boss hoard',
  chest: 'dungeon cache',
  quest: 'patron reward',
  vendor: 'curio shop stock',
  faction: 'guild or temple grant',
};

const DND_REWARD_THEME_LABELS: Record<RewardTheme, string> = {
  arcane: 'arcane',
  divine: 'divine',
  cursed: 'shadowed',
  martial: 'martial',
  wilderness: 'primal',
  noble: 'courtly',
};

const DND_REWARD_CONFIG: RewardSystemConfig = {
  defaults: {
    playerLevel: '5',
    enemyTier: '1',
    rewardType: 'gear',
    rarity: 'common',
    rewardSource: 'chest',
    rewardTheme: 'martial',
    bundleStyle: 'balanced',
  },
  labels: {
    playerLevel: 'Party Level',
    enemyTier: 'Encounter CR Band',
    rewardType: 'Treasure Type',
    rarity: 'Rarity',
    rewardSource: 'Treasure Source',
    rewardTheme: 'Treasure Theme',
    bundleStyle: 'Treasure Style',
    prepNotes: 'DM Notes',
    prepNotesPlaceholder:
      'Dragon hoard fragment, spell scroll case, potion-brewing reagents, patron bonus tied to the next dungeon...',
    rerollButton: 'Reroll Hoard Flavor',
    rewardSummary: 'Treasure Summary',
    sourceGuidance: 'Treasure Source Notes',
    practicalAdvice: 'DM Treasure Advice',
    encounterHooks: 'Follow-up Adventure Hooks',
    featuredItem: 'Featured magic item',
    itemDetail: 'Treasure detail',
    statLine: 'Table use',
    bonusItem: 'Bonus treasure',
    currencyValue: 'Coin & gem value',
  },
  rarityLabels: DND_RARITY_LABELS,
  rewardTypeLabels: DND_REWARD_TYPE_LABELS,
  rewardSourceLabels: DND_REWARD_SOURCE_LABELS,
  rewardThemeLabels: DND_REWARD_THEME_LABELS,
  bundleStyleLabels: {
    lean: 'single find',
    balanced: 'adventuring stash',
    generous: 'hoard',
  },
  flavorNotes: {
    boss: 'Boss treasure should feel like a hoard or named reward beat, not just loose coin on a corpse.',
    chest: 'Dungeon caches should reward exploration, secret doors, and curiosity about who stocked the site.',
    quest: 'Patron rewards should reflect trust, leverage, or access as much as raw value.',
    vendor: 'Curio stock should feel curated for adventurers, not like random dungeon overflow.',
    faction: 'Guild or temple treasure should reinforce who granted it and what future obligations come with it.',
  },
  advice: {
    boss: 'Boss treasure feels best when one item changes future tactics, travel options, or who gets the party\'s attunement slots.',
    rareGold: 'Big coin piles feel flatter in 5e if they do not point toward one memorable item, scroll, favor, or map.',
    material: 'Artisan reagents land better when the table can connect them to brewing a potion of healing, scribing a spell scroll, or commissioning gear.',
    vendor: 'Shop stock should be dependable and tempting, not swingier than dungeon treasure.',
    generous: 'Full hoards work best after bosses, vault clears, dragon-scale beats, or major arc finishes.',
    default: 'This treasure package should slot cleanly into a fifth-edition reward beat without much extra tuning.',
  },
  hookPool: [
    'One item in the bundle only fully awakens after attunement at a second site the party has not reached yet.',
    'A spell scroll case in the treasure names a tower, patron, or wizard tied to the next adventure.',
    'The coins carry a mint mark that reveals who secretly funded the dungeon or villain.',
    'The hoard includes notes for brewing a potion of healing if the party finds the missing reagent.',
    'Displaying the treasure openly changes how one guild, temple, or noble house sizes up the party.',
    'The featured item can be upgraded only if the party follows a new lead into another ruin or vault.',
  ],
  bonusPools: {
    lean: ['pouch of mixed coin and gems', 'backup potion of healing', 'spell-scroll reagents'],
    balanced: ['extra spell scroll or potion', 'useful artisan component', 'small named trinket'],
    generous: ['secondary magic item', 'extra gem chest', 'rare reagent bundle'],
  },
  rewardSummary: ({ rarity, rewardTheme, rewardType, rewardSource }) =>
    `${DND_RARITY_LABELS[rarity]} ${DND_REWARD_THEME_LABELS[rewardTheme]} ${DND_REWARD_TYPE_LABELS[rewardType]} from a ${DND_REWARD_SOURCE_LABELS[rewardSource]}.`,
  itemPools: {
    arcane: {
      gear: ['Wand of Magic Detection', 'Pearl of Power', 'Hat of Many Spells', 'Bag of Holding'],
      gold: ['spellvault coin tube', 'wizard stipend purse', 'gem-cut lecture grant', 'tower treasury roll'],
      consumable: ['Spell Scroll', 'Potion of Healing', 'Elixir of Health', 'bead of nourishment case'],
      material: ['scribe ink kit', 'arcane crystal shard', 'scroll vellum bundle', 'silvered focus wire'],
    },
    divine: {
      gear: ['Sentinel Shield', 'Rod of Resurrection', 'Shield of the Cavalier', 'holy ward icon'],
      gold: ['temple tithe bundle', 'pilgrim offering chest', 'sanctuary coin roll', 'relic repair fund'],
      consumable: ['Potion of Vitality', 'Potion of Healing', 'consecrated water flask', 'prayer incense pack'],
      material: ['blessed resin', 'silver reliquary wire', 'sanctified ash', 'restoration herbs'],
    },
    cursed: {
      gear: ['shadow oath blade', 'grave-bound ring', 'mourning cloak', 'blood-sealed locket'],
      gold: ['grave coin bundle', 'black tribute purse', 'forbidden tithe roll', 'night tax chest'],
      consumable: ['dust of silence', 'hexbreaker salve', 'nightshade phial', 'ash-smoke bomb'],
      material: ['Grave Wax', 'Witchbone Dust', 'Ebon Amber', 'Mourning Iron'],
    },
    martial: {
      gear: ['Thunderous Greatclub', 'Energy Bow', 'Quarterstaff of the Acrobat', 'weapon of warning'],
      gold: ['war chest roll', 'mercenary bonus purse', 'quartermaster payout', 'captain\'s bounty chest'],
      consumable: ['oil of keen edges', 'Potion of Invulnerability', 'fire flask', 'battle tonic'],
      material: ['tempered steel ingot', 'masterwork bowstring', 'weapon-mastery drills', 'arrowhead bundle'],
    },
    wilderness: {
      gear: ['cloak of the trail', 'longbow of the wild', 'ranger\'s stride boots', 'survivalist\'s spear'],
      gold: ['frontier cache', 'warden purse', 'huntmaster payout', 'forest trade coin'],
      consumable: ['Potion of Longevity', 'trail ration satchel', 'predator ward salve', 'stormleaf tea'],
      material: ['wyvern tendon', 'spirit bark', 'verdant ore', 'monster-hide packet'],
    },
    noble: {
      gear: ['Sending Stones', 'Gloves of Thievery', 'Cloak of Invisibility', 'regent\'s signet blade'],
      gold: ['patron\'s gift pouch', 'court reward roll', 'house dividend purse', 'royal writ chest'],
      consumable: ['Courtly Elixir', 'Perfumed Remedy', 'Banquet Reserve Flask', 'Imperial Antitoxin'],
      material: ['gold leaf packet', 'embossed silver plate', 'pearl dust vial', 'fine vellum folio'],
    },
  },
  itemDetail: ({ rewardType, rewardTheme, rarity, itemName }) => ({
    description: `${itemName} is presented as a ${DND_RARITY_LABELS[rarity]} ${DND_REWARD_THEME_LABELS[rewardTheme]} treasure piece for a fifth-edition table.`,
    statLine:
      rewardType === 'gear'
        ? rarity === 'common'
          ? 'Treat as a simple magic item with one clear benefit and no extra rules burden.'
          : rarity === 'epic' || rarity === 'legendary'
            ? 'Treat as a very rare or legendary-style magic item that may deserve attunement and a spotlight moment.'
            : 'Treat as an uncommon or rare magic item with one clear tactical, utility, or exploration edge.'
        : rewardType === 'consumable'
          ? 'Use as a potion, oil, or spell scroll that solves one specific encounter, rest, or travel problem.'
          : rewardType === 'material'
            ? 'Use as reagents for scribing a spell scroll, brewing a potion of healing, commissioning gear, or bargaining with a specialist.'
            : 'Count as coins, gems, and sellable valuables that can fund the next meaningful upgrade.',
  }),
};

export function getXpSystemConfig(systemId: GameSystemId) {
  if (systemId === 'dnd5e') {
    return DND_XP_CONFIG;
  }

  return HOME_XP_CONFIG;
}

export function getRewardSystemConfig(systemId: GameSystemId) {
  if (systemId === 'dnd5e') {
    return DND_REWARD_CONFIG;
  }

  return HOME_REWARD_CONFIG;
}

export function buildRewardName(
  config: RewardSystemConfig,
  rewardTheme: RewardTheme,
  rewardType: RewardType,
  seed: number
) {
  return pickFromPool(config.itemPools[rewardTheme][rewardType], seed, 3);
}

export function buildRewardDetail(
  config: RewardSystemConfig,
  input: {
    rewardType: RewardType;
    rewardTheme: RewardTheme;
    rarity: LootRarity;
    itemName: string;
  }
) {
  return config.itemDetail(input);
}
