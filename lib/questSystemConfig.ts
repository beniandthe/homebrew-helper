import type { GameSystemId } from '@/lib/gameSystems';

export type QuestTone = 'heroic' | 'grim' | 'mystic' | 'political';
export type QuestScope = 'personal' | 'local' | 'regional' | 'faction';
export type QuestStructure = 'one-shot' | 'three-part';
export type ResolutionStyle = 'combat' | 'diplomacy' | 'stealth' | 'choice-driven';
export type FactionImpact = 'minor' | 'moderate' | 'major';

type QuestLabels = {
  factionName: string;
  objectiveSeed: string;
  tone: string;
  scope: string;
  structure: string;
  resolutionStyle: string;
  factionImpact: string;
  notes: string;
  notesPlaceholder: string;
  rerollButton: string;
  hook: string;
  siteFrame: string;
  complication: string;
  reward: string;
  arc: string;
  sceneIdeas: string;
  twistLead: string;
  alternateResolutionLead: string;
  rewardLead: string;
  consequenceLead: string;
  factionPressureLead: string;
};

export type QuestSystemConfig = {
  defaults: {
    factionName: string;
    objectiveSeed: string;
    tone: QuestTone;
    scope: QuestScope;
    structure: QuestStructure;
    resolutionStyle: ResolutionStyle;
    factionImpact: FactionImpact;
  };
  labels: QuestLabels;
  toneLabels: Record<QuestTone, string>;
  scopeLabels: Record<QuestScope, string>;
  structureLabels: Record<QuestStructure, string>;
  resolutionLabels: Record<ResolutionStyle, string>;
  impactLabels: Record<FactionImpact, string>;
  toneHooks: Record<QuestTone, string>;
  scopeHooks: Record<QuestScope, string>;
  twists: Record<QuestTone, string[]>;
  complications: Record<ResolutionStyle, string[]>;
  rewardsByImpact: Record<FactionImpact, string[]>;
  consequencesByImpact: Record<FactionImpact, string[]>;
  altResolution: Record<ResolutionStyle, string>;
  factionPressure: Record<FactionImpact, string>;
  questArc: Record<QuestStructure, string[]>;
  siteFrames: Record<QuestScope, string[]>;
  sceneIdeas: string[];
  objectiveTemplate: (factionName: string, objectiveSeed: string) => string;
};

const HOME_CONFIG: QuestSystemConfig = {
  defaults: {
    factionName: 'Crimson Pact',
    objectiveSeed: 'Recover a stolen relic',
    tone: 'heroic',
    scope: 'local',
    structure: 'one-shot',
    resolutionStyle: 'choice-driven',
    factionImpact: 'moderate',
  },
  labels: {
    factionName: 'Faction Name',
    objectiveSeed: 'Adventure Seed',
    tone: 'Tone',
    scope: 'Scope',
    structure: 'Adventure Shape',
    resolutionStyle: 'Likely Resolution',
    factionImpact: 'Faction Impact',
    notes: 'GM Notes',
    notesPlaceholder: 'Important NPC, reveal in act 2, clue hidden in chapel, consequence if players refuse...',
    rerollButton: 'Reroll Adventure Beats',
    hook: 'Adventure Hook',
    siteFrame: 'Adventure Site',
    complication: 'Complication & Reveal',
    reward: 'Payoff & Fallout',
    arc: 'Adventure Path',
    sceneIdeas: 'Scene Beats',
    twistLead: 'Reveal',
    alternateResolutionLead: 'Alternate Route',
    rewardLead: 'Payoff',
    consequenceLead: 'Fallout',
    factionPressureLead: 'World Pressure',
  },
  toneLabels: {
    heroic: 'heroic',
    grim: 'gritty',
    mystic: 'strange',
    political: 'intrigue',
  },
  scopeLabels: {
    personal: 'personal',
    local: 'settlement',
    regional: 'region',
    faction: 'faction',
  },
  structureLabels: {
    'one-shot': 'single session',
    'three-part': 'short arc',
  },
  resolutionLabels: {
    combat: 'fight',
    diplomacy: 'parley',
    stealth: 'infiltration',
    'choice-driven': 'hard choice',
  },
  impactLabels: {
    minor: 'minor',
    moderate: 'campaign-relevant',
    major: 'campaign-shaping',
  },
  toneHooks: {
    heroic: 'A plea for help offers a chance to protect people from rising danger.',
    grim: 'A simple mission reveals betrayal, sacrifice, and consequences with no clean answer.',
    mystic: 'Ancient powers stir beneath the surface, twisting motives and reality alike.',
    political: 'Every step alters alliances, leverage, and who gets to control the story next.',
  },
  scopeHooks: {
    personal: 'The central conflict revolves around one person, companion, rival, or bloodline.',
    local: 'The fate of a town, district, outpost, or shrine depends on the outcome.',
    regional: 'Roads, settlements, and multiple powers across the region are affected.',
    faction: 'The mission may change how a faction survives, grows, or fractures.',
  },
  twists: {
    heroic: [
      'The presumed victim willingly disappeared to protect someone else.',
      'The enemy is trying to stop a worse threat from emerging.',
      'Success requires saving both the target and the supposed villain.',
      'A celebrated hero fabricated evidence to force action.',
    ],
    grim: [
      'The reward is funded by an atrocity the patron hopes you never learn.',
      'The missing person caused the disaster and is hiding it.',
      'Victory demands sacrificing an ally, reputation, or future resource.',
      'A trusted contact has been coerced and now works against the party.',
    ],
    mystic: [
      'The relic is sentient and has chosen the wrong bearer.',
      'The location exists in two states at once and the party must choose one.',
      'An omen reveals the patron has been guided by a false divine sign.',
      'Each use of magic rewrites one remembered detail of the mission.',
    ],
    political: [
      'The public reason for the mission is a cover for a power reshuffle.',
      'A rival faction wants the same outcome, but for opposite reasons.',
      'Evidence exists that could collapse a treaty if exposed.',
      'The mission contract has conflicting clauses written by different sponsors.',
    ],
  },
  complications: {
    combat: [
      'The objective is protected by a force stronger than expected.',
      'The battlefield shifts midway, splitting the party or changing lines of attack.',
      'Defeating the enemy quickly risks destroying the very thing the party came to recover.',
      'Killing the leader ends the fight but voids key intelligence.',
    ],
    diplomacy: [
      'The opposing side will negotiate, but only if a painful truth is admitted first.',
      'An ally undermines talks by pushing for vengeance.',
      'The party must convince two enemies at once, each with incompatible demands.',
      'A deadline forces a ceasefire decision before all evidence is gathered.',
    ],
    stealth: [
      'The target location has layered watch rotations and magical detection.',
      'An informant provides an entry point, but their loyalty is questionable.',
      'Remaining unseen becomes harder once the objective is moved unexpectedly.',
      'The extraction route is trapped and only partially mapped.',
    ],
    'choice-driven': [
      'Every path forward saves one group while exposing another to danger.',
      'A secret changes who truly deserves the reward or blame.',
      'The easiest solution strengthens the wrong faction long term.',
      'A promised reward can only be claimed by betraying an ally.',
    ],
  },
  rewardsByImpact: {
    minor: ['temporary goodwill with a local contact', 'modest pay and a useful rumor', 'safe access to a small restricted area'],
    moderate: ['faction influence and a named ally', 'a rare cache of resources or equipment', 'political leverage over a recurring NPC or group'],
    major: ['control of a strategic route, asset, or stronghold', 'a powerful relic or binding oath from a major figure', 'lasting faction realignment in the campaign world'],
  },
  consequencesByImpact: {
    minor: ['a neighborhood or outpost changes hands quietly', 'a trusted NPC loses standing', 'future prices or access shift slightly'],
    moderate: ['a faction gains or loses public legitimacy', 'regional patrols, laws, or recruitment begin to shift', 'an allied group becomes dependent on the party\'s choices'],
    major: ['war accelerates or a truce becomes possible', 'a major faction fractures internally', 'the campaign map changes in a visible and lasting way'],
  },
  altResolution: {
    combat: 'A direct assault is possible, but a quieter solution could preserve allies and intelligence.',
    diplomacy: 'Talks can work, but pressure, leverage, or a show of force may still be needed.',
    stealth: 'A covert route exists, but discovery could transform the mission into open conflict.',
    'choice-driven': 'There is no perfect route; the best ending depends on who the party chooses to protect.',
  },
  factionPressure: {
    minor: 'This quest affects local standing and immediate trust.',
    moderate: 'This quest could noticeably shift faction leverage.',
    major: 'This quest can reshape campaign-level faction power.',
  },
  questArc: {
    'one-shot': [
      'Act 1: The party receives the hook and learns what is truly at stake.',
      'Act 2: The complication forces a harder route than expected.',
      'Act 3: The twist reframes the ending and the consequence lands immediately.',
    ],
    'three-part': [
      'Part 1: Initial mission and false understanding of the conflict.',
      'Part 2: The complication grows, revealing new enemies, motives, or divided loyalties.',
      'Part 3: The twist forces a final choice that determines the lasting consequence.',
    ],
  },
  siteFrames: {
    personal: [
      'a family crypt, hidden study, or private manor wing',
      'a shrine, grave, or workshop tied to one bloodline',
      'a rival\'s safehouse or personal hunting lodge',
      'a secluded tower room where only one NPC truly belongs',
    ],
    local: [
      'a watchtower, shrine cellar, or gang-held block near town',
      'a mine entrance, old chapel, or flooded warehouse under the settlement',
      'a roadside fort, bridge, or mill caught in the conflict',
      'a district landmark the locals thought was already safe',
    ],
    regional: [
      'a ruined keep, forest barrow, or pass-defending stronghold',
      'a trade road outpost, cursed battlefield, or wilderness shrine',
      'a forgotten vault, canyon settlement, or border fort',
      'a landmark site that multiple powers now race to control',
    ],
    faction: [
      'a guild vault, temple archive, or banner hall under pressure',
      'a command post, prison, or embassy tied to faction power',
      'a hidden depot, ritual site, or headquarters annex',
      'a politically sensitive site the faction cannot afford to lose publicly',
    ],
  },
  sceneIdeas: [
    'An NPC ally asks for a side favor that complicates timing.',
    'A neutral party offers assistance in exchange for a future debt.',
    'Evidence appears that reframes who initiated the conflict.',
    'A countdown event forces the party to split their priorities.',
    'A moral witness observes the party and later reports on their actions.',
    'A secondary objective can secure a stronger ending if completed in time.',
    'A trusted map is outdated because borders changed since it was made.',
    'A celebration scene hides a covert exchange relevant to the main quest.',
    'A wounded enemy offers a bargain that reveals hidden command structure.',
    'The party finds proof that an earlier side quest was connected all along.',
  ],
  objectiveTemplate: (factionName, objectiveSeed) => `${factionName} needs someone to ${objectiveSeed.toLowerCase()}.`,
};

const DND_CONFIG: QuestSystemConfig = {
  ...HOME_CONFIG,
  defaults: {
    ...HOME_CONFIG.defaults,
    factionName: 'Temple of the Dawn',
    objectiveSeed: 'recover a spell scroll from a monster-held ruin',
    resolutionStyle: 'combat',
  },
  labels: {
    ...HOME_CONFIG.labels,
    factionName: 'Patron or Faction',
    objectiveSeed: 'Adventure Goal',
    tone: 'Adventure Tone',
    scope: 'Adventure Scale',
    structure: 'Adventure Structure',
    resolutionStyle: 'Primary Approach',
    factionImpact: 'Campaign Fallout',
    notes: 'DM Adventure Notes',
    notesPlaceholder: 'Important patron, reveal in scene 2, dungeon clue location, consequence if the party delays...',
    rerollButton: 'Reroll Adventure Beats',
    hook: 'Adventure Hook',
    siteFrame: 'Adventure Site',
    complication: 'Complication & Twist',
    reward: 'Reward & Fallout',
    arc: 'Adventure Flow',
    sceneIdeas: 'Adventure Beats',
    twistLead: 'Twist',
    alternateResolutionLead: 'Fallback Route',
    rewardLead: 'Adventure Reward',
    consequenceLead: 'Fallout',
    factionPressureLead: 'Faction Pressure',
  },
  structureLabels: {
    'one-shot': 'session arc',
    'three-part': 'three-session arc',
  },
  resolutionLabels: {
    combat: 'fight',
    diplomacy: 'parley',
    stealth: 'stealth',
    'choice-driven': 'party choice',
  },
  toneHooks: {
    heroic: 'A visible threat to a settlement, relic, or caravan needs bold intervention before it spreads into a larger danger.',
    grim: 'A straightforward job reveals a deeper cost in lives, safety, or trust that the party cannot ignore.',
    mystic: 'Ancient magic, prophecy, or planar fallout twists the mission beyond its first promise.',
    political: 'The mission changes who holds leverage, patronage, or blame once the truth becomes public.',
  },
  scopeHooks: {
    personal: 'The conflict centers on one lineage, mentor, rival, or sworn companion.',
    local: 'A town, road, shrine, or dungeon entrance the party can actually visit right now is at stake.',
    regional: 'Trade roads, border forts, wilderness sites, and multiple settlements will feel the result.',
    faction: 'The mission can strengthen, fracture, or publicly expose an organized power.',
  },
  rewardsByImpact: {
    minor: ['favor with a local patron', 'coin, a potion, and one useful clue', 'safe passage or access through a guarded district'],
    moderate: ['faction leverage and a named ally', 'a magic item or spell-scroll cache tied to the next adventure', 'formal authority that changes how the party is received'],
    major: ['control of a stronghold or route', 'a major relic or binding oath', 'lasting influence over a regional power block'],
  },
  consequencesByImpact: {
    minor: ['an outpost changes hands quietly', 'a trusted NPC loses status', 'a minor enemy starts actively undermining the party'],
    moderate: ['a faction gains or loses public legitimacy', 'patrol routes, travel safety, or toll access shift', 'a neutral group now demands formal guarantees'],
    major: ['war accelerates or a truce becomes possible', 'a ruling faction fractures from within', 'the campaign map changes in a visible lasting way'],
  },
  altResolution: {
    combat: 'A direct fight works, but the smarter route may preserve allies, clues, rests, or future site access.',
    diplomacy: 'Negotiation is possible, but pressure, leverage, or a show of force may still set the terms.',
    stealth: 'A covert path exists, but discovery could turn the mission into open conflict fast.',
    'choice-driven': 'There is no clean ending; the best result depends on who the party decides to protect or betray.',
  },
  questArc: {
    'one-shot': [
      'Act 1: The patron frames the stakes, points at the site, and the party chooses an approach.',
      'Act 2: The site pushes back through monsters, hazards, or divided loyalties.',
      'Act 3: The twist reframes the finale and the consequence lands before the session ends.',
    ],
    'three-part': [
      'Part 1: The party pursues the obvious lead and learns the first version of the truth.',
      'Part 2: The adventure broadens into deeper ruins, faction pressure, or travel fallout.',
      'Part 3: The ending hinges on a choice that determines who benefits from the outcome.',
    ],
  },
  siteFrames: {
    personal: [
      'a haunted family crypt below a chapel',
      'a sealed wizard study or tower chamber',
      'a noble manor cellar hiding one bloodline\'s shame',
      'a private shrine or tomb tied to a single oath',
    ],
    local: [
      'a goblin-held watchtower above the old road',
      'a flooded cellar network under town',
      'a roadside shrine, bridge, or mine entrance under threat',
      'a monster-held ruin the locals avoid after dark',
    ],
    regional: [
      'a ruined dwarven hold on the frontier',
      'a forest barrow field or wilderness shrine',
      'a border fort, canyon pass, or trade-road stronghold',
      'a dragon-marked valley or battlefield scarred by old magic',
    ],
    faction: [
      'a guild vault, temple archive, or war room under pressure',
      'a banner hall or barracks tied to faction command',
      'a hidden depot, ritual site, or supply fort',
      'a politically sensitive embassy or prison wing',
    ],
  },
  sceneIdeas: [
    'A Criminal, Sage, or Soldier-style contact offers help that clearly comes with strings attached.',
    'The party reaches the dungeon or site too late to stop the first visible consequence.',
    'A travel pace choice determines whether the party arrives prepared or late.',
    'A treasure clue and a moral clue point in different directions.',
    'The enemy side has a surprisingly reasonable argument.',
    'A second objective would improve the ending but stretches time, spell slots, and rests.',
    'A rival group gets to the same scene first and forces a tense decision.',
    'A spell scroll, Sending Stones, or potion cache changes the final approach.',
  ],
  objectiveTemplate: (factionName, objectiveSeed) =>
    `${factionName} briefs the party to ${objectiveSeed.toLowerCase()}.`,
};

const PF2_CONFIG: QuestSystemConfig = {
  ...HOME_CONFIG,
  labels: {
    ...HOME_CONFIG.labels,
    objectiveSeed: 'Scenario Objective',
    structure: 'Scenario Structure',
    notes: 'GM Scenario Notes',
    notesPlaceholder: 'Important patron, scene transition, clue in the second site, consequence if the party takes downtime first...',
    rerollButton: 'Reroll Scenario Beats',
    hook: 'Scenario Hook',
    siteFrame: 'Scenario Site',
    complication: 'Complication & Twist',
    reward: 'Reward & Fallout',
    arc: 'Scenario Flow',
    sceneIdeas: 'Scenario Beats',
    twistLead: 'Twist',
    alternateResolutionLead: 'Alternate Approach',
    rewardLead: 'Scenario Reward',
    consequenceLead: 'Fallout',
    factionPressureLead: 'Pressure',
  },
  structureLabels: {
    'one-shot': 'single scenario',
    'three-part': 'chapter arc',
  },
  resolutionLabels: {
    combat: 'combat',
    diplomacy: 'negotiation',
    stealth: 'stealth',
    'choice-driven': 'scenario choice',
  },
  toneHooks: {
    heroic: 'A clear objective needs decisive action before the next community or faction suffers.',
    grim: 'A practical mission turns costly once the party understands what failure really means.',
    mystic: 'The scenario starts simple, then opens into prophecy, strange power, or layered mystery.',
    political: 'The mission changes influence, access, and future obligations once the truth is known.',
  },
  scopeHooks: {
    personal: 'The conflict centers on one person, rival, lineage, or obligation.',
    local: 'The outcome changes the safety or future of one settlement, district, or site.',
    regional: 'Roads, trade, patrols, and multiple settlements feel the result.',
    faction: 'The mission can strengthen, fracture, or redirect an organized power.',
  },
  rewardsByImpact: {
    minor: ['goodwill with one useful contact', 'practical pay and a lead into the next site', 'temporary access or support'],
    moderate: ['faction leverage and a dependable ally', 'a treasure parcel that supports the next level band', 'official support that changes future logistics'],
    major: ['control of a route, site, or critical asset', 'a high-value reward tied to the next chapter', 'lasting influence over regional power and movement'],
  },
  consequencesByImpact: {
    minor: ['one district or site shifts quietly', 'a trusted NPC loses standing', 'future access changes in a small but noticeable way'],
    moderate: ['regional patrols, laws, or alliances begin to move', 'a faction becomes dependent on the party\'s decisions', 'neutral groups demand formal terms before aiding the party'],
    major: ['war pressure rises or a truce becomes realistic', 'a major faction fractures internally', 'the campaign map or travel pattern changes in a visible way'],
  },
  altResolution: {
    combat: 'A fight will solve the immediate problem, but a smarter route may preserve leverage or future scenario options.',
    diplomacy: 'Negotiation can work, but the party may still need pressure, proof, or a tactical fallback.',
    stealth: 'A covert route exists, but discovery can turn the scene into a much sharper problem.',
    'choice-driven': 'There is no perfect ending; the best result depends on which pressure the party accepts.',
  },
  questArc: {
    'one-shot': [
      'Act 1: The scenario objective is clear, but the real pressure is still hidden.',
      'Act 2: The complication shifts what the party must prioritize or protect.',
      'Act 3: The twist changes the fallout and determines who benefits next.',
    ],
    'three-part': [
      'Part 1: The first site or lead frames the scenario and points toward the obvious answer.',
      'Part 2: The second phase reframes motives, pressure, or who is actually in control.',
      'Part 3: The final choice sets up the next chapter and changes the campaign landscape.',
    ],
  },
  siteFrames: {
    personal: [
      'a private chamber, family site, or obligation-tied location',
      'a secure archive, hideout, or ritual room with personal stakes',
      'a rival\'s refuge or secluded contact point',
      'a site one PC can claim as uniquely theirs to solve',
    ],
    local: [
      'a district landmark, guarded site, or problem zone near one settlement',
      'a watch post, shrine, or undercroft affecting one community directly',
      'a mine, roadblock, or local strongpoint under pressure',
      'a small dungeon or site where timing matters more than distance',
    ],
    regional: [
      'a frontier site, road network pressure point, or major landmark',
      'a ruin, fort, or travel corridor with broad regional stakes',
      'a dangerous site that changes who can move safely through the area',
      'a chapter-defining location tied to multiple communities',
    ],
    faction: [
      'a command site, archive, or depot that matters to organized power',
      'a politically sensitive base, prison, or embassy-like location',
      'a ritual or logistics site tied to faction control',
      'a hidden site whose exposure would shift the campaign map',
    ],
  },
  sceneIdeas: [
    'The party can secure a stronger ending only by taking a risk that slows them down now.',
    'A patron offers support, but only if the party commits to one public version of events.',
    'A second site contains proof that changes the meaning of the first.',
    'A rival claimant wants the same outcome but for dangerous reasons.',
    'The obvious enemy is only the visible layer of the problem.',
    'A side objective directly affects what reward or fallout the party leaves with.',
    'The party must choose between speed, safety, and keeping leverage.',
    'The final scene changes how future factions respond to the group.',
  ],
};

export function getQuestSystemConfig(systemId: GameSystemId) {
  if (systemId === 'dnd5e') {
    return DND_CONFIG;
  }

  if (systemId === 'pathfinder2e') {
    return PF2_CONFIG;
  }

  return HOME_CONFIG;
}
