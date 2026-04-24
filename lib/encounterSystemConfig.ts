import type { GameSystemId } from '@/lib/gameSystems';

export type EncounterDifficulty = 'easy' | 'standard' | 'hard' | 'deadly';
export type EnemyRole = 'brute' | 'skirmisher' | 'controller' | 'artillery' | 'boss';
export type TerrainType = 'open' | 'cover-heavy' | 'hazardous' | 'chokepoint' | 'elevated';

type EncounterLabels = {
  partyLevel: string;
  partySize: string;
  partyRoleMix: string;
  frontline: string;
  support: string;
  control: string;
  striker: string;
  enemyCount: string;
  enemyLevel: string;
  difficulty: string;
  enemyRole: string;
  terrain: string;
  waveCount: string;
  notes: string;
  notesPlaceholder: string;
  rerollButton: string;
  assessment: string;
  warnings: string;
  builderNotes: string;
  lineupIdeas: string;
  tacticalBeats: string;
  partyBudget: string;
  enemyBudget: string;
  difference: string;
  verdict: string;
};

type EncounterAdvice = {
  openTerrain: string;
  hazardousTerrain: string;
  artillery: string;
  controller: string;
  multiWave: string;
  noSupport: string;
  noFrontline: string;
  heavyControl: string;
  deadlyMultiWave: string;
  default: string;
  actionEconomyHigh: string;
  actionEconomyLow: string;
  actionEconomyStable: string;
  bossSolo: string;
  bossPair: string;
  bossDefault: string;
};

export type EncounterSystemConfig = {
  defaults: {
    partyLevel: string;
    partySize: string;
    enemyCount: string;
    enemyLevel: string;
    difficulty: EncounterDifficulty;
    enemyRole: EnemyRole;
    terrainType: TerrainType;
    waveCount: string;
    frontlineCount: string;
    supportCount: string;
    controlCount: string;
    strikerCount: string;
  };
  labels: EncounterLabels;
  difficultyLabels: Record<EncounterDifficulty, string>;
  enemyRoleLabels: Record<EnemyRole, string>;
  terrainLabels: Record<TerrainType, string>;
  multipliers: {
    partyUnitValue: number;
    enemyUnitValue: number;
    difficulty: Record<EncounterDifficulty, number>;
    enemyRole: Record<EnemyRole, number>;
    terrain: Record<TerrainType, number>;
    waveStep: number;
    partyRoleWeights: {
      frontline: number;
      support: number;
      control: number;
      striker: number;
    };
  };
  verdictThresholds: {
    undertuned: number;
    dangerous: number;
    boss: number;
  };
  verdictLabels: {
    balanced: string;
    undertuned: string;
    dangerous: string;
    boss: string;
  };
  advice: EncounterAdvice;
  lineupIdeas: Record<EnemyRole, string[]>;
  tacticalBeatPool: string[];
};

const HOME_CONFIG: EncounterSystemConfig = {
  defaults: {
    partyLevel: '3',
    partySize: '4',
    enemyCount: '4',
    enemyLevel: '3',
    difficulty: 'standard',
    enemyRole: 'brute',
    terrainType: 'open',
    waveCount: '1',
    frontlineCount: '1',
    supportCount: '1',
    controlCount: '1',
    strikerCount: '1',
  },
  labels: {
    partyLevel: 'Party Level',
    partySize: 'Party Size',
    partyRoleMix: 'Party Lineup',
    frontline: 'Frontline Fighters',
    support: 'Healers & Supports',
    control: 'Mages & Controllers',
    striker: 'Scouts & Strikers',
    enemyCount: 'Enemy Count',
    enemyLevel: 'Enemy Threat Tier',
    difficulty: 'Threat Level',
    enemyRole: 'Enemy Archetype',
    terrain: 'Battlefield',
    waveCount: 'Wave Count',
    notes: 'GM Encounter Notes',
    notesPlaceholder: 'Shield wall up front, hedge mage in back, archers on the ridge, reinforcements after the horn...',
    rerollButton: 'Reroll Battle Beats',
    assessment: 'Encounter Assessment',
    warnings: 'Table Warnings',
    builderNotes: 'GM Notes',
    lineupIdeas: 'Enemy Lineup Ideas',
    tacticalBeats: 'Battlefield Beats',
    partyBudget: 'Party budget',
    enemyBudget: 'Enemy budget',
    difference: 'Difference',
    verdict: 'Verdict',
  },
  difficultyLabels: {
    easy: 'routine',
    standard: 'standard',
    hard: 'hard',
    deadly: 'deadly',
  },
  enemyRoleLabels: {
    brute: 'fighter line',
    skirmisher: 'raider pack',
    controller: 'spellcaster cell',
    artillery: 'archer line',
    boss: 'boss monster',
  },
  terrainLabels: {
    open: 'open ground',
    'cover-heavy': 'ruins & cover',
    hazardous: 'hazard field',
    chokepoint: 'narrow choke',
    elevated: 'high ground',
  },
  multipliers: {
    partyUnitValue: 25,
    enemyUnitValue: 25,
    difficulty: {
      easy: 0.75,
      standard: 1,
      hard: 1.25,
      deadly: 1.5,
    },
    enemyRole: {
      brute: 1.1,
      skirmisher: 1,
      controller: 1.15,
      artillery: 1.2,
      boss: 1.35,
    },
    terrain: {
      open: 1,
      'cover-heavy': 1.1,
      hazardous: 1.15,
      chokepoint: 1.12,
      elevated: 1.08,
    },
    waveStep: 0.18,
    partyRoleWeights: {
      frontline: 0.05,
      support: 0.04,
      control: 0.04,
      striker: 0.03,
    },
  },
  verdictThresholds: {
    undertuned: -60,
    dangerous: 50,
    boss: 140,
  },
  verdictLabels: {
    balanced: 'On target',
    undertuned: 'Too soft',
    dangerous: 'High risk',
    boss: 'Boss fight',
  },
  advice: {
    openTerrain: 'Open terrain favors straightforward damage races. Add cover or elevation for more tactical play.',
    hazardousTerrain: 'Hazardous terrain raises pressure. Make sure players have at least one safe lane or fallback zone.',
    artillery: 'Artillery enemies need protection or spacing. Pair them with blockers or chokepoints.',
    controller: 'Controllers feel strongest when terrain restricts movement or sight lines.',
    multiWave: 'Multi-wave fights benefit from a clear mid-fight escalation trigger.',
    noSupport: 'Parties without support can struggle in attrition fights. Consider reducing wave pressure or hazards.',
    noFrontline: 'No frontline can make enemy focus fire brutal. Consider more cover or objective-based win conditions.',
    heavyControl: 'Heavy control with chokepoints can lock players out; keep at least one tactical bypass available.',
    deadlyMultiWave: 'Deadly multi-wave setups need telegraphed escalation so defeats feel fair rather than abrupt.',
    default: 'This setup is broadly playable. Tune enemy damage or terrain for final feel.',
    actionEconomyHigh: 'Enemies may overwhelm the party through sheer number of turns.',
    actionEconomyLow: 'The party may out-action this encounter unless enemies hit very hard.',
    actionEconomyStable: 'Action economy looks stable.',
    bossSolo: 'Add 2-3 support enemies or a second wave so the boss is not focus-fired.',
    bossPair: 'This boss setup is close, but 1 support unit or environmental hazard would help.',
    bossDefault: 'No special support recommendation.',
  },
  lineupIdeas: {
    brute: [
      'Shield fighters with one heavy bruiser holding the front.',
      'Raiders led by a single hard-hitting champion at a choke point.',
      'Two veteran melee threats anchoring weaker troops.',
      'A monster bruiser with smaller allies screening the back line.',
    ],
    skirmisher: [
      'Fast raiders using cover, flanks, and retreat lanes.',
      'Scouts and beasts circling the party from two angles.',
      'Ambushers breaking formation and punishing isolated targets.',
      'Mobile hunters using terrain to keep the back line unsafe.',
    ],
    controller: [
      'A spellcaster protected by loyal guards and one live hazard.',
      'A priest or witch using control effects while minions stall the front.',
      'A ritual leader backed by bodies that only exist to buy time.',
      'A battlefield shaper with one lieutenant who punishes grouped heroes.',
    ],
    artillery: [
      'Ranged attackers on high ground with one blocker on each approach lane.',
      'Crossbow or bow users behind cover forcing the party to move.',
      'A blaster in back with disposable screens in front.',
      'Snipers splitting angles so the party cannot hide behind one wall.',
    ],
    boss: [
      'A solo monster with one support wave ready when the room changes.',
      'A villain leader with bodyguards and a live room objective.',
      'A large brute with hazards doing half the real work.',
      'A named foe whose backup line arrives only if the party stalls.',
    ],
  },
  tacticalBeatPool: [
    'Enemy reinforcements arrive when a battlefield objective is touched.',
    'A destructible cover piece can be used by either side for advantage.',
    'The objective moves mid-fight, forcing both teams to reposition.',
    'The party can disable one major hazard with a skill challenge.',
    'A neutral creature can be convinced to intervene for one round.',
    'Retreat lanes open after round three, creating a split decision.',
    'An enemy lieutenant retreats to trigger traps in a fallback zone.',
    'A weather shift alters visibility and ranged pressure mid-fight.',
    'A civilian or relic target appears in danger and changes priorities.',
    'Victory requires securing two map points rather than only defeating foes.',
    'One enemy unit can be turned by dialogue if isolated from the commander.',
    'Each wave arrives with a new terrain constraint and tactical opportunity.',
  ],
};

const DND_CONFIG: EncounterSystemConfig = {
  ...HOME_CONFIG,
  labels: {
    ...HOME_CONFIG.labels,
    partyRoleMix: 'Party Class Mix',
    frontline: 'Fighters / Paladins',
    support: 'Clerics / Bards',
    control: 'Wizards / Druids',
    striker: 'Rogues / Rangers',
    enemyLevel: 'CR / Threat Band',
    difficulty: 'Encounter Danger',
    enemyRole: 'Enemy Archetype',
    terrain: 'Battlefield',
    notes: 'DM Encounter Notes',
    notesPlaceholder:
      'Guard Captain on the choke, Goblin Boss on the flank, archers on the balcony, second wave after the alarm...',
    assessment: 'Encounter Assessment',
    warnings: 'DM Warnings',
    builderNotes: 'DM Encounter Coaching',
    lineupIdeas: 'Monster Lineup Ideas',
    tacticalBeats: 'Adventure Beat Ideas',
  },
  difficultyLabels: {
    easy: 'easy',
    standard: 'medium',
    hard: 'hard',
    deadly: 'deadly',
  },
  enemyRoleLabels: {
    brute: 'soldiers & bruisers',
    skirmisher: 'scouts & ambushers',
    controller: 'priests & mages',
    artillery: 'archers & blasters',
    boss: 'solo boss or lair threat',
  },
  terrainLabels: {
    open: 'open ground',
    'cover-heavy': 'ruins & half cover',
    hazardous: 'traps, fire, or spell hazard',
    chokepoint: 'doorway or bridge choke',
    elevated: 'balconies & ledges',
  },
  multipliers: {
    ...HOME_CONFIG.multipliers,
    enemyRole: {
      brute: 1.08,
      skirmisher: 1,
      controller: 1.14,
      artillery: 1.18,
      boss: 1.38,
    },
  },
  advice: {
    openTerrain: 'Open battlefields tend to collapse into a damage race. Add cover, elevation, or a site objective that matters more than hit points.',
    hazardousTerrain: 'Hazards swing 5e fights quickly. Give the party at least one clear safe route, save-based counterplay, or a disable option.',
    artillery: 'Archers and blasters need blockers, range, or elevation or they get rushed down immediately.',
    controller: 'Controllers feel strongest when terrain, concentration pressure, or sight lines already matter before the first spell lands.',
    multiWave: 'Multi-wave fights work best when the escalation trigger is obvious before it happens.',
    noSupport: 'A party without healing or support can burn out quickly in attrition fights. Soften hazard pressure or shorten the wave count.',
    noFrontline: 'No frontline means focus fire lands hard. Add cover or make the win condition about movement, not only damage.',
    heavyControl: 'Too much control in a chokepoint can lock the party out of play. Keep at least one bypass or counter option.',
    deadlyMultiWave: 'Deadly multi-wave encounters need telegraphed stakes so the wipe risk feels earned rather than abrupt.',
    default: 'This encounter should be playable as-is. Final-tune action economy, hazards, and damage output to taste.',
    actionEconomyHigh: 'The monsters may overwhelm the party through action economy alone.',
    actionEconomyLow: 'The party probably wins the action economy unless the monsters hit hard or control space well.',
    actionEconomyStable: 'Action economy looks stable.',
    bossSolo: 'A solo boss usually needs support creatures, lair pressure, or legendary-style turns to last.',
    bossPair: 'Two boss-grade enemies are close to working, but one support unit or hazard would stabilize the fight.',
    bossDefault: 'No special boss support warning.',
  },
  lineupIdeas: {
    brute: [
      'Guard Captain with a tight guard line holding the doorway.',
      'Hobgoblin Captain backed by soldiers and one shield-wall anchor.',
      'Tough Boss with two bruisers forcing the front line to commit.',
      'Ogre or giant bruiser with smaller allies screening the casters.',
    ],
    skirmisher: [
      'Goblin Boss with Goblin Minions darting between cover and escape routes.',
      'Bugbear Stalker leading fast scouts through shadows and side alleys.',
      'Pirate Captain with boarders leaping between angles and breaking formation.',
      'Wolves or quick raiders using flanks while one lieutenant pressures the back line.',
    ],
    controller: [
      'Cult priest behind zealot guards and a live ritual circle.',
      'Wizard or warlock backed by hired blades and a concentration-based battlefield effect.',
      'Druid circle defender using plants, fog, and beast allies to shape movement.',
      'Necromancer with undead bodies clogging the front while save effects hit from the rear.',
    ],
    artillery: [
      'Archers on ruined balconies with one melee blocker on each approach lane.',
      'Musket or crossbow line with half cover, one spotter, and one bodyguard.',
      'Blaster mage behind pillars while disposable guards burn the first rush.',
      'Pirate gunners on high ground forcing the party to cross open space.',
    ],
    boss: [
      'Young dragon with kobold or cultist support and collapsing cover.',
      'Sphinx of Wonder using mobility and magical pressure while minions stall the front.',
      'Hill giant or ogre tyrant with goblin handlers and a hazard-heavy room.',
      'Tough Boss or Guard Captain villain with a second wave when the room objective changes.',
    ],
  },
  tacticalBeatPool: [
    'Breaking concentration on the enemy caster drops the battlefield hazard.',
    'A short-rest refuge exists nearby, but taking it advances the villain\'s plan.',
    'Reinforcements arrive only if the party ignores a visible ritual, alarm, or portcullis lever.',
    'A site objective matters more than the monsters\' hit points and can end the fight early.',
    'A rescue target, relic, or prisoner forces the party to split focus.',
    'The boss changes tactics once the room objective is contested.',
    'A hidden route lets smart players flank the artillery line.',
    'A lair-style pulse hits at the top of the round until the party disables it.',
  ],
};

export function getEncounterSystemConfig(systemId: GameSystemId) {
  if (systemId === 'dnd5e') {
    return DND_CONFIG;
  }

  return HOME_CONFIG;
}
