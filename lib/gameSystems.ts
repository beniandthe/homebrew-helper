export type GameSystemId = 'homebrew' | 'dnd5e' | 'pathfinder2e';

type TabCopy = {
  home: string;
  campaign: string;
  xp: string;
  encounters: string;
  generator: string;
  quest: string;
  projects: string;
  account: string;
};

type HomeToolCardCopy = {
  label: string;
  title: string;
  body: string;
};

type HomeCopy = {
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  sectionTitle: string;
  sectionSubtitle: string;
  campaign: HomeToolCardCopy;
  xp: HomeToolCardCopy;
  encounters: HomeToolCardCopy;
  generator: HomeToolCardCopy;
  quest: HomeToolCardCopy;
  projects: HomeToolCardCopy;
  proTitle: string;
  proBody: string;
};

type ModeIdentityCopy = {
  title: string;
  body: string;
  highlights: string[];
};

type AttributionCopy = {
  title: string;
  body: string;
  scopeNote: string;
  linkLabel: string;
  linkUrl: string;
};

type ScreenCopy = {
  title: string;
  description: string;
};

type CampaignCopy = ScreenCopy & {
  selectorLabel: string;
  selectorHelper: string;
  groupLabel: string;
  groupPlaceholder: string;
  notesPlaceholder: string;
  summaryPlaceholder: string;
  objectivePlaceholder: string;
};

export type GameSystemDefinition = {
  id: GameSystemId;
  label: string;
  shortLabel: string;
  tabs: TabCopy;
  home: HomeCopy;
  modeIdentity: ModeIdentityCopy;
  attribution?: AttributionCopy;
  campaign: CampaignCopy;
  xp: ScreenCopy;
  encounters: ScreenCopy;
  generator: ScreenCopy;
  quest: ScreenCopy;
  projects: ScreenCopy;
};

export const DEFAULT_GAME_SYSTEM_ID: GameSystemId = 'homebrew';
export const GAME_SYSTEM_STORAGE_KEY = 'rpg-toolkit.active-game-system';

export const GAME_SYSTEMS: Record<GameSystemId, GameSystemDefinition> = {
  homebrew: {
    id: 'homebrew',
    label: 'Homebrew',
    shortLabel: 'Homebrew',
    tabs: {
      home: 'Home',
      campaign: 'Campaign',
      xp: 'Advancement',
      encounters: 'Battle',
      generator: 'Loot',
      quest: 'Adventure',
      projects: 'Saved',
      account: 'Account',
    },
    home: {
      badge: 'Original Fantasy Toolkit',
      heroTitle: 'Plan original campaigns that still feel table-ready.',
      heroSubtitle:
        'A flexible prep suite for custom worlds, house rules, and fantasy tables that want familiar structure without borrowing someone else\'s canon.',
      primaryCta: 'Plan Advancement',
      sectionTitle: 'Prep Boards',
      sectionSubtitle: 'Choose the board that fits original fantasy campaigns, clearer battles, useful loot, and practical adventure hooks.',
      campaign: {
        label: 'Campaign',
        title: 'Campaign Hub',
        body: 'Track party goals, faction pressure, session notes, and linked prep in one place.',
      },
      xp: {
        label: 'Advancement',
        title: 'Advancement Planner',
        body: 'Set campaign pace, level beats, and milestone turns without locking yourself to a published system.',
      },
      encounters: {
        label: 'Battle',
        title: 'Battle Planner',
        body: 'Build cleaner fights with concrete enemy archetypes, battlefield terrain, and table-ready pacing notes.',
      },
      generator: {
        label: 'Loot',
        title: 'Loot Builder',
        body: 'Draft loot, coin, crafting stock, and payoff hooks that fit your world instead of a stock setting.',
      },
      quest: {
        label: 'Adventure',
        title: 'Adventure Builder',
        body: 'Create patrons, objectives, twists, and fallout that sound like adventures players would actually hear at the table.',
      },
      projects: {
        label: 'Saved',
        title: 'Saved Prep',
        body: 'Reopen saved plans, revisit strong ideas, and keep half-finished worldbuilding close at hand.',
      },
      proTitle: 'Guildmaster Access',
      proBody: 'Your account has full access. Continue building without save limits.',
    },
    modeIdentity: {
      title: 'Homebrew keeps the app flexible without borrowing someone else\'s canon.',
      body:
        'It stays grounded in familiar fantasy prep structure while leaving names, factions, monsters, and progression logic open to your own setting and house rules.',
      highlights: [
        'Uses broad fantasy language instead of one publisher\'s classes, pantheons, or signature lore.',
        'Keeps encounters, rewards, and adventures table-ready without tying you to a published setting bible.',
        'Works best when you want standard fantasy scaffolding with room for custom mechanics and worldbuilding.',
      ],
    },
    campaign: {
      title: 'Campaign Hub',
      description:
        'Organize campaign identity, party focus, faction pressure, session prep, and saved original-fantasy notes.',
      selectorLabel: 'Game',
      selectorHelper:
        'Choose the game voice the app should use across tabs and saves.',
      groupLabel: 'Party Name / Group',
      groupPlaceholder: 'The Ashen Company',
      notesPlaceholder: 'Recap, unresolved hooks, next-scene prep, NPC reminders...',
      summaryPlaceholder: 'What is this campaign about, at a high level?',
      objectivePlaceholder: 'What is the party trying to accomplish right now?',
    },
    xp: {
      title: 'Advancement Planner',
      description:
        'Plan advancement pace, compare leveling styles, and estimate how long a campaign takes to reach key milestones.',
    },
    encounters: {
      title: 'Battle Planner',
      description:
        'Build battles with clearer party archetypes, enemy lineups, terrain pressure, wave structure, and campaign context in mind.',
    },
    generator: {
      title: 'Loot Builder',
      description:
        'Build more useful loot by combining source, theme, rarity, haul size, and practical table advice.',
    },
    quest: {
      title: 'Adventure Builder',
      description:
        'Build practical adventure structure with hooks, twists, fallout, alternate routes, and faction pressure.',
    },
    projects: {
      title: 'Saved Prep',
      description: 'View and manage your saved plans, encounters, treasure, and campaign notes.',
    },
  },
  dnd5e: {
    id: 'dnd5e',
    label: 'D&D 5e (SRD)',
    shortLabel: '5e SRD',
    tabs: {
      home: 'Home',
      campaign: 'Campaign',
      xp: 'XP',
      encounters: 'Encounter',
      generator: 'Treasure',
      quest: 'Adventure',
      projects: 'Saved',
      account: 'Account',
    },
    home: {
      badge: 'SRD 5.2.1 Toolkit',
      heroTitle: 'Prep like a real 5e DM with class lanes, dungeon pressure, and magic-item rewards.',
      heroSubtitle:
        'Switch into a fifth-edition SRD setup tuned around species, backgrounds, classes, spell tiers, party sheets, treasure ledgers, travel pace, and SRD-safe field references instead of generic fantasy placeholder language.',
      primaryCta: 'Plan Tier Pacing',
      sectionTitle: 'DM Boards',
      sectionSubtitle:
        'Choose the board that fits CR bands, adventure sites, patrons, spell-scroll rewards, potion brewing hooks, and saved campaign prep.',
      campaign: {
        label: 'Campaign',
        title: 'Campaign Hub',
        body: 'Track party sheets, treasure ledgers, NPC web, patron pressure, rest cadence, and session prep for your next 5e chapter.',
      },
      xp: {
        label: 'XP',
        title: 'Tier & XP Planner',
        body: 'Model the real 5e power breaks at level 5, 9, 13, and 17 so spell tiers and martial jumps land on purpose.',
      },
      encounters: {
        label: 'Encounter',
        title: 'Encounter Builder',
        body: 'Build around CR bands, class mix, cover, concentration pressure, and boss support before initiative is rolled.',
      },
      generator: {
        label: 'Treasure',
        title: 'Treasure Hoard Builder',
        body: 'Generate hoards, potions, spell scrolls, magic items, and artisan reagents in a clear fifth-edition voice.',
      },
      quest: {
        label: 'Adventure',
        title: 'Adventure Site Builder',
        body: 'Spin patrons, dungeons, travel beats, and faction fallout that can kick off the next session fast.',
      },
      projects: {
        label: 'Saved',
        title: 'Saved Prep',
        body: 'Open saved 5e notes, reuse strong site ideas, and jump back into half-finished adventures without losing the game lock.',
      },
      proTitle: 'Dungeon Master Pro',
      proBody: 'Your account has full access. Keep building adventures without save limits.',
    },
    modeIdentity: {
      title: 'D&D 5e SRD is built around SRD v5.2.1, not a generic fantasy reskin.',
      body:
        'When you switch into this game, the app leans on 5.2.1-safe terms like species, backgrounds, weapon masteries, travel pace, spell scrolls, potions, magic items, CR bands, and dungeon-first adventure prep.',
      highlights: [
        'Party mix, encounters, treasure, and adventure beats all shift toward a Dungeon Master prep style.',
        'Treasure uses SRD-safe magic item, potion, scroll, and reagent language instead of generic loot filler.',
        'Campaign prompts stay inside open SRD rules language and avoid closed settings, logos, and branded lore.',
      ],
    },
    attribution: {
      title: 'SRD v5.2.1 notice',
      body:
        'This mode uses material derived from the System Reference Document v5.2.1, which D&D Beyond says is released under Creative Commons Attribution 4.0. It is not affiliated with or endorsed by Wizards of the Coast.',
      scopeNote:
        'The app uses SRD-safe rules terms and open or renamed content only. It does not rely on closed settings, protected story characters, or non-SRD product identity.',
      linkLabel: 'Open the SRD source',
      linkUrl: 'https://www.dndbeyond.com/srd',
    },
    campaign: {
      title: 'Campaign Hub',
      description:
        'Organize the adventuring party, tier of play, patron pressure, party roster, shared inventory, NPC web, travel and rest cadence, and linked adventures for a fifth-edition SRD campaign.',
      selectorLabel: 'Game',
      selectorHelper:
        'Switch the app into a fifth-edition SRD voice for labels, generated content, and saved prep.',
      groupLabel: 'Adventuring Party',
      groupPlaceholder: 'The Ashen Company',
      notesPlaceholder: 'Recap, patron demands, rest pressure, travel pace, NPC reminders, spell-scroll or hoard fallout...',
      summaryPlaceholder: 'What is this campaign about, and what kind of dungeon, travel, or faction pressure keeps it moving?',
      objectivePlaceholder: 'What is the party trying to accomplish before the next long rest or travel leg?',
    },
    xp: {
      title: 'Tier & XP Planner',
      description:
        'Plan 5e level pacing, compare XP and milestone progression, and estimate when the party hits the big power breaks in the SRD rules.',
    },
    encounters: {
      title: 'Encounter Builder',
      description:
        'Build encounters with class mix, CR pressure, cover, concentration, boss support, and adventuring-day pacing in mind.',
    },
    generator: {
      title: 'Treasure Hoard Builder',
      description:
        'Build better treasure by combining source, rarity, theme, potions, scrolls, magic items, and practical reward advice for a fifth-edition SRD table.',
    },
    quest: {
      title: 'Adventure Site Builder',
      description:
        'Create adventure sites, patrons, twists, consequences, alternate routes, and faction pressure in a fifth-edition SRD voice.',
    },
    projects: {
      title: 'Saved Prep',
      description: 'View and manage your saved 5e encounters, treasure, adventures, and campaign notes.',
    },
  },
  pathfinder2e: {
    id: 'pathfinder2e',
    label: 'Pathfinder 2e',
    shortLabel: 'PF2e',
    tabs: {
      home: 'Home',
      campaign: 'Campaign',
      xp: 'Advancement',
      encounters: 'Encounter',
      generator: 'Treasure',
      quest: 'Quest',
      projects: 'Saved',
      account: 'Account',
    },
    home: {
      badge: 'Pathfinder 2e Toolkit',
      heroTitle: 'Build tighter adventures, treasure pacing, and encounter prep.',
      heroSubtitle:
        'Shift the toolkit toward a more tactical, level-aware prep flow with advancement, treasure, encounter pressure, and quest planning tuned for Pathfinder-style campaigns.',
      primaryCta: 'Plan Advancement',
      sectionTitle: 'Prep Boards',
      sectionSubtitle: 'Choose the board that fits level-based prep, treasure pacing, encounter pressure, and campaign continuity.',
      campaign: {
        label: 'Campaign',
        title: 'Campaign Hub',
        body: 'Track party direction, faction pressure, scenario prep, and saved planning notes in one place.',
      },
      xp: {
        label: 'Advancement',
        title: 'Advancement Planner',
        body: 'Map level pacing, milestone beats, and the cadence of major progression moments across a campaign.',
      },
      encounters: {
        label: 'Encounter',
        title: 'Encounter Planner',
        body: 'Balance enemy roles, terrain, waves, and tactical pressure before the table reaches the fight.',
      },
      generator: {
        label: 'Treasure',
        title: 'Treasure Planner',
        body: 'Shape item bundles, valuables, and reward packages that feel deliberate instead of random.',
      },
      quest: {
        label: 'Quest',
        title: 'Quest Builder',
        body: 'Draft clear objectives, complications, and consequences for the next scenario beat.',
      },
      projects: {
        label: 'Saved',
        title: 'Saved Prep',
        body: 'Reopen saved prep, refine existing drafts, and keep your scenario notes organized.',
      },
      proTitle: 'Campaign Pro',
      proBody: 'Your account has full access. Keep building scenarios without save limits.',
    },
    modeIdentity: {
      title: 'Pathfinder leans into level-banded scenario prep and tighter tactical language.',
      body:
        'It keeps the app focused on level-aware encounter planning, scenario structure, and deliberate reward pacing instead of fifth-edition dungeon cadence.',
      highlights: [
        'Encounters speak in severity, enemy level, and tactical pressure instead of CR-style pacing.',
        'Treasure and advancement are framed around level bands and parcel-like planning.',
        'Campaign prep emphasizes scenario flow, pressure tracks, and explicit chapter structure.',
      ],
    },
    campaign: {
      title: 'Campaign Hub',
      description:
        'Organize party direction, campaign prep, faction pressure, and saved planning notes with a Pathfinder-style tone.',
      selectorLabel: 'Game',
      selectorHelper:
        'Switch the app into a Pathfinder-style voice for labels, copy, and saved prep.',
      groupLabel: 'Party Name',
      groupPlaceholder: 'The Ashen Company',
      notesPlaceholder: 'Recap, unresolved hooks, next-session prep, NPC reminders, treasure follow-up...',
      summaryPlaceholder: 'What is the core premise of this campaign, and how does it evolve as the party levels?',
      objectivePlaceholder: 'What is the party trying to resolve before the next major downtime or travel beat?',
    },
    xp: {
      title: 'Advancement Planner',
      description:
        'Plan advancement pace, compare progression styles, and estimate how long the party takes to reach major level milestones.',
    },
    encounters: {
      title: 'Encounter Planner',
      description:
        'Build encounters with tactical roles, terrain pressure, wave structure, and party composition in mind.',
    },
    generator: {
      title: 'Treasure Planner',
      description:
        'Build more intentional treasure by combining source, rarity, theme, and reward pacing advice.',
    },
    quest: {
      title: 'Quest Builder',
      description:
        'Build stronger quest structure with hooks, twists, consequences, alternate resolutions, and faction pressure.',
    },
    projects: {
      title: 'Saved Prep',
      description: 'View and manage your saved encounters, treasure, quests, and campaign notes.',
    },
  },
};

export const GAME_SYSTEM_OPTIONS = Object.values(GAME_SYSTEMS).map((system) => ({
  id: system.id,
  label: system.label,
  shortLabel: system.shortLabel,
}));

export function getGameSystem(systemId: GameSystemId) {
  return GAME_SYSTEMS[systemId];
}

export function resolveGameSystemId(value?: string | null): GameSystemId {
  if (!value) {
    return DEFAULT_GAME_SYSTEM_ID;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue in GAME_SYSTEMS) {
    return normalizedValue as GameSystemId;
  }

  if (
    normalizedValue.includes('dnd') ||
    normalizedValue.includes('d&d') ||
    normalizedValue.includes('dungeons') ||
    normalizedValue.includes('5e')
  ) {
    return 'dnd5e';
  }

  if (
    normalizedValue.includes('pathfinder') ||
    normalizedValue.includes('pf2') ||
    normalizedValue.includes('pf 2')
  ) {
    return 'pathfinder2e';
  }

  return DEFAULT_GAME_SYSTEM_ID;
}
