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

const PF2_CONFIG: EncounterSystemConfig = {
  ...HOME_CONFIG,
  defaults: {
    ...HOME_CONFIG.defaults,
    partyLevel: '5',
    enemyLevel: '5',
  },
  labels: {
    ...HOME_CONFIG.labels,
    partyRoleMix: 'Party Build Mix',
    frontline: 'Defenders',
    support: 'Supports',
    control: 'Controllers',
    striker: 'Mobile Strikers',
    enemyLevel: 'Enemy Level',
    difficulty: 'Encounter Severity',
    enemyRole: 'Enemy Build',
    terrain: 'Encounter Terrain',
    notes: 'GM Encounter Notes',
    notesPlaceholder: 'Bruiser on the choke, sniper on the ledge, caster behind cover, hazard active until disabled...',
    warnings: 'Scenario Warnings',
    builderNotes: 'GM Notes',
    lineupIdeas: 'Encounter Lineup Ideas',
    tacticalBeats: 'Scenario Beat Ideas',
  },
  difficultyLabels: {
    easy: 'low',
    standard: 'moderate',
    hard: 'severe',
    deadly: 'extreme',
  },
  enemyRoleLabels: {
    brute: 'frontline bruiser',
    skirmisher: 'mobile striker',
    controller: 'control caster',
    artillery: 'sniper / blaster',
    boss: 'solo',
  },
  terrainLabels: {
    open: 'open map',
    'cover-heavy': 'cover lanes',
    hazardous: 'hazard map',
    chokepoint: 'tight choke',
    elevated: 'vertical terrain',
  },
  multipliers: {
    partyUnitValue: 30,
    enemyUnitValue: 30,
    difficulty: {
      easy: 0.7,
      standard: 1,
      hard: 1.32,
      deadly: 1.62,
    },
    enemyRole: {
      brute: 1.05,
      skirmisher: 1,
      controller: 1.12,
      artillery: 1.16,
      boss: 1.34,
    },
    terrain: {
      open: 1,
      'cover-heavy': 1.08,
      hazardous: 1.14,
      chokepoint: 1.1,
      elevated: 1.12,
    },
    waveStep: 0.15,
    partyRoleWeights: {
      frontline: 0.05,
      support: 0.04,
      control: 0.05,
      striker: 0.03,
    },
  },
  verdictThresholds: {
    undertuned: -75,
    dangerous: 60,
    boss: 155,
  },
  verdictLabels: {
    balanced: 'On curve',
    undertuned: 'Below curve',
    dangerous: 'High pressure',
    boss: 'Solo-capstone',
  },
  advice: {
    openTerrain: 'Open maps reduce the value of positioning. Add cover, elevation, or a map objective to reward movement.',
    hazardousTerrain: 'Hazards add pressure fast. Make sure the party has at least one clean path and one way to react.',
    artillery: 'Artillery enemies feel best when the frontline or terrain makes reaching them costly.',
    controller: 'Controllers shine when the map creates movement decisions rather than simply eating actions.',
    multiWave: 'Multi-wave encounters need a clear scenario beat that explains why the second pressure spike happens.',
    noSupport: 'Without support, the party may struggle in a longer fight. Consider trimming hazards or shortening the encounter.',
    noFrontline: 'No frontline means enemy focus and positioning matter more. Give the party movement options and cover.',
    heavyControl: 'Too much control in a chokepoint can feel oppressive. Leave one escape route or alternate angle intact.',
    deadlyMultiWave: 'Extreme multi-wave fights need visible warning and a strong reason for the second phase.',
    default: 'This encounter is close to table-ready. Final-tune severity, hazards, and map incentives.',
    actionEconomyHigh: 'Enemy action pressure may overwhelm the party unless terrain or objective play gives breathing room.',
    actionEconomyLow: 'The party likely controls the turn economy unless the enemies reshape the map well.',
    actionEconomyStable: 'Action pressure looks stable.',
    bossSolo: 'A solo-grade enemy usually needs support pressure, hazards, or a second stage to avoid getting collapsed.',
    bossPair: 'A two-enemy solo setup is close, but one support pressure point would make it sing.',
    bossDefault: 'No special solo support warning.',
  },
  lineupIdeas: {
    brute: [
      'A frontline bruiser with one shielded ally anchoring the map.',
      'Two durable enemies holding a narrow lane while support works behind them.',
      'A solo bruiser with one hazard acting like a second body.',
      'A commander-type foe flanked by reliable melee pressure.',
    ],
    skirmisher: [
      'Mobile strikers darting between cover lanes and flanks.',
      'Fast melee enemies using the map edges to pressure casters.',
      'Scout-style foes splitting angles before the frontline is set.',
      'A quick elite striker backed by one cheaper flanker.',
    ],
    controller: [
      'A control caster backed by bodies that only need to buy time.',
      'A debuff-heavy enemy line with one hazard doing part of the work.',
      'A battlefield shaper with one lieutenant punishing grouped heroes.',
      'Controllers using terrain to turn movement into the real tax.',
    ],
    artillery: [
      'Snipers on elevation with one lane blocker at each access point.',
      'Ranged attackers using cover and a hazard to tax safe movement.',
      'A blaster protected by one bruiser and one choke point.',
      'Backline damage dealers splitting sight lines across the map.',
    ],
    boss: [
      'A solo-grade enemy with a second-stage map change.',
      'A capstone foe plus one support piece that fixes the action economy.',
      'A large threat with hazard support and one objective the party must contest.',
      'A final-room commander whose backup arrives only if the party stalls.',
    ],
  },
  tacticalBeatPool: [
    'The map objective matters as much as the enemy HP totals.',
    'A hazard can be disabled, but doing so costs the party tempo.',
    'A reinforcement wave appears only if the enemy captain reaches a signal point.',
    'The enemies change formation once the chokepoint is broken.',
    'A side objective offers a tactical edge if claimed before round three.',
    'Terrain rewards flanking or repositioning instead of static focus fire.',
    'One enemy can be neutralized early through pressure or negotiation, changing the severity curve.',
      'The second phase changes sight lines, movement lanes, or how safe the backline feels.',
  ],
};

export function getEncounterSystemConfig(systemId: GameSystemId) {
  if (systemId === 'dnd5e') {
    return DND_CONFIG;
  }

  if (systemId === 'pathfinder2e') {
    return PF2_CONFIG;
  }

  return HOME_CONFIG;
}
