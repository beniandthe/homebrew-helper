import type { GameSystemId } from '@/lib/gameSystems';

export type CampaignTone = 'heroic' | 'grim' | 'mystic' | 'political' | 'sandbox';

type CampaignLabels = {
  campaignName: string;
  tone: string;
  levelBand: string;
  mainFaction: string;
  summary: string;
  objective: string;
  notes: string;
  rerollButton: string;
  snapshot: string;
  storyFocus: string;
  readiness: string;
  prepAngles: string;
  nextSession: string;
  factionMoves: string;
  stakes: string;
  linkedProjects: string;
  party: string;
  primaryFaction: string;
  summaryLead: string;
  objectiveLead: string;
  pulseLead: string;
};

export type CampaignSystemConfig = {
  defaults: {
    campaignName: string;
    tone: CampaignTone;
    levelBand: string;
    partyName: string;
    mainFaction: string;
  };
  labels: CampaignLabels;
  toneLabels: Record<CampaignTone, string>;
  notesState: {
    active: string;
    empty: string;
  };
  campaignPulse: Record<CampaignTone, string>;
  prepAnglePool: string[];
  sessionLensPool: Record<CampaignTone, string[]>;
  factionMovePool: string[];
  stakePool: string[];
};

const HOME_CONFIG: CampaignSystemConfig = {
  defaults: {
    campaignName: 'Eryndor Campaign',
    tone: 'heroic',
    levelBand: 'Levels 1-5',
    partyName: 'The Ashen Company',
    mainFaction: 'Crimson Pact',
  },
  labels: {
    campaignName: 'Campaign Name',
    tone: 'Tone',
    levelBand: 'Level Band',
    mainFaction: 'Main Faction',
    summary: 'Campaign Summary',
    objective: 'Current Objective',
    notes: 'Session Notes',
    rerollButton: 'Reroll Prep Angles',
    snapshot: 'Campaign Snapshot',
    storyFocus: 'Story Focus',
    readiness: 'Session Readiness',
    prepAngles: 'Prep Angles',
    nextSession: 'Next Session Lens',
    factionMoves: 'Faction Motion',
    stakes: 'Stakes & Rewards',
    linkedProjects: 'Connected Prep',
    party: 'Party',
    primaryFaction: 'Primary faction',
    summaryLead: 'Summary',
    objectiveLead: 'Current objective',
    pulseLead: 'Campaign pulse',
  },
  toneLabels: {
    heroic: 'heroic',
    grim: 'grim',
    mystic: 'mystic',
    political: 'political',
    sandbox: 'sandbox',
  },
  notesState: {
    active: 'Session notes are active and ready for ongoing prep.',
    empty: 'No session notes yet. Add recap points, hooks, or unresolved threads.',
  },
  campaignPulse: {
    heroic: 'Escalate hope versus danger each session with visible stakes and recoverable losses.',
    grim: 'Keep trade-offs costly and let victories carry visible scars.',
    mystic: 'Reveal layered truths gradually and make every discovery alter player assumptions.',
    political: 'Track factions as active agents; every move should change leverage or trust.',
    sandbox: 'Keep multiple hooks alive so the table chooses direction, pace, and pressure.',
  },
  prepAnglePool: [
    'Create a faction clock with three visible stages and one hidden tipping point.',
    'Write one consequence that lands if the party ignores the current objective.',
    'Add a non-combat obstacle that still advances the main faction storyline.',
    'Prepare one ally scene and one rival scene that react to the same decision.',
    'Reveal a clue that reframes an earlier session without invalidating it.',
    'Introduce a pressure track like time, supplies, or influence to reinforce stakes.',
    'Define one rumor that is true, one false, and one only partially true.',
    'Prepare two fallback routes if the party skips the expected objective.',
    'Map one location that can host both diplomacy and combat resolutions.',
    'Tie one reward directly to a future quest or faction negotiation.',
  ],
  sessionLensPool: {
    heroic: [
      'Open the next session with a clear threat that makes the party feel needed immediately.',
      'Give one NPC a visible reason to trust the party before the first major choice lands.',
      'Let success protect someone concrete, not just an abstract cause.',
      'Offer a hard choice between speed and safety instead of between good and evil.',
    ],
    grim: [
      'Make the cleanest solution unavailable so the party must choose what cost to absorb.',
      'Start with fallout from an earlier success to show the world pushing back.',
      'Let a trusted ally ask for help that clearly compromises something else.',
      'Put pressure on supplies, time, or reputation before the first confrontation.',
    ],
    mystic: [
      'Seed one revelation early that changes the meaning of the apparent main threat.',
      'Let a clue point in two directions so certainty becomes part of the tension.',
      'Give the party a mystery they can solve now and one they must carry forward.',
      'Tie a supernatural sign to a practical problem so mystery stays actionable.',
    ],
    political: [
      'Begin with a meeting, petition, or accusation that forces the party to pick a side publicly.',
      'Have one faction offer help that clearly comes with future leverage attached.',
      'Let a private truth conflict with the public version of events.',
      'Make access, permits, or alliances matter before swords ever leave their sheaths.',
    ],
    sandbox: [
      'Present three live leads and make each one change if ignored for too long.',
      'Use one rumor to pull the party outward and one personal hook to pull them inward.',
      'Let the world advance visibly while the party explores, rather than waiting on them.',
      'Make one side path secretly reshape the main line if pursued first.',
    ],
  },
  factionMovePool: [
    'A rival faction reframes the party\'s last success as a threat to stability.',
    'A quiet ally asks for proof before offering deeper support.',
    'An enemy force changes tactics after studying the party\'s usual approach.',
    'A neutral broker offers access only if the party resolves a smaller side dispute first.',
    'A local power begins rewarding informants who can track the party\'s movements.',
    'A resource shortage makes one faction more desperate and less predictable.',
    'One NPC overreaches in the party\'s name and creates fresh fallout.',
    'A hidden supporter reveals themselves only if the party takes a public risk.',
  ],
  stakePool: [
    'A reward is available now, but taking it early weakens the party\'s long-term leverage.',
    'Victory secures goodwill, but only if collateral damage stays visibly low.',
    'A shortcut exists, but using it costs trust with the wrong witness.',
    'The party can protect an asset or expose the truth, but not both cleanly.',
    'A major clue becomes harder to recover if the group focuses on the obvious threat first.',
    'Delaying the main objective creates a better tactical setup but a worse political one.',
    'Saving one community leaves another exposed unless the party finds an alternate route.',
    'A future ally is watching how the group handles power, mercy, and compromise right now.',
  ],
};

const DND_CONFIG: CampaignSystemConfig = {
  ...HOME_CONFIG,
  defaults: {
    ...HOME_CONFIG.defaults,
    campaignName: 'Shadows Over Emberfall',
    levelBand: 'Tier 1 (Levels 1-4)',
    partyName: 'The Ashen Company',
    mainFaction: 'Temple of the Dawn',
  },
  labels: {
    ...HOME_CONFIG.labels,
    levelBand: 'Tier of Play',
    mainFaction: 'Patron / Main Faction',
    summary: 'Campaign Summary',
    objective: 'Current Objective',
    notes: 'DM Notes',
    rerollButton: 'Reroll DM Prep Angles',
    storyFocus: 'Adventure Engine',
    readiness: 'DM Prep State',
    prepAngles: '5e Prep Angles',
    nextSession: 'Next Session Setup',
    factionMoves: 'Patron & Villain Moves',
    stakes: 'Rest Pressure & Rewards',
    linkedProjects: 'Connected Prep',
    party: 'Adventuring party',
    primaryFaction: 'Patron / primary faction',
    summaryLead: 'Campaign summary',
    objectiveLead: 'Party objective',
    pulseLead: 'DM pulse',
  },
  toneLabels: {
    heroic: 'heroic fantasy',
    grim: 'grim peril',
    mystic: 'arcane mystery',
    political: 'court intrigue',
    sandbox: 'open-table sandbox',
  },
  notesState: {
    active: 'DM notes are active and ready to support the next site, rest clock, or faction beat.',
    empty: 'No DM notes yet. Add recap points, hooks, travel pace, dungeon fallout, or NPC reminders.',
  },
  campaignPulse: {
    heroic: 'Push visible stakes, resource tension, and a clear win condition every session.',
    grim: 'Let victories cost hit points, time, trust, rests, or supplies so the world pushes back.',
    mystic: 'Treat discoveries like adventure hooks: each revelation should open a stronger site, spell, or planar danger.',
    political: 'Every faction move should reshape alliances, patron leverage, or who gets blamed.',
    sandbox: 'Offer multiple leads at once so the party chooses the next dungeon, road, or intrigue vector.',
  },
  prepAnglePool: [
    'Write one species or background hook that ties a party member to the next site or patron.',
    'Decide whether the next adventuring day supports one short rest, two, or none.',
    'Prepare one dungeon pressure point that forces resource spend before the boss scene.',
    'Add a rumor that points toward treasure but hides a second complication behind it.',
    'Sketch one faction response if the party solves the objective through diplomacy instead of combat.',
    'Write one rest-sensitive consequence if the party delays too long.',
    'Tie one reward directly to the next adventure hook so treasure keeps the story moving.',
    'Map one location that can resolve through combat, stealth, or negotiation without rewriting prep.',
    'Advance a villain clock by one step if the party spends a full session chasing side leads.',
    'Prepare one travel complication between safe rests so the road matters as much as the dungeon.',
  ],
  sessionLensPool: {
    heroic: [
      'Open with a threat the party can see, name, and choose to stop today.',
      'Put one rescue, relic, or oath on the table before combat begins.',
      'Reward bold action with momentum, not just with damage dealt.',
      'Make the next victory feel like it protects something worth caring about.',
    ],
    grim: [
      'Let the easiest route spend trust, rests, or supplies before it reaches the fight.',
      'Open on fallout from a previous win so danger feels cumulative.',
      'Give one patron a request that is useful, ugly, and hard to refuse.',
      'Force the party to choose what gets saved, not only what gets defeated.',
    ],
    mystic: [
      'Seed a magical reveal early that changes how the next dungeon or site should be read.',
      'Let one omen point toward a reward while another points toward a risk.',
      'Make the mystery alter tactics, not just lore.',
      'Use one supernatural sign to foreshadow the cost of the next decision.',
    ],
    political: [
      'Begin with a public promise or accusation that changes what the party can do quietly later.',
      'Let two patrons want the same outcome for incompatible reasons.',
      'Give the party a truth they can use now or hide for later leverage.',
      'Make access, hospitality, or reputation matter before initiative is rolled.',
    ],
    sandbox: [
      'Offer three adventure vectors and let each one worsen or improve off-screen over time.',
      'Make one side hook secretly intersect the main arc if the party bites.',
      'Use a rumor table result as a real map change, not just flavor.',
      'Let the party discover that avoiding one danger quietly strengthens another.',
    ],
  },
  factionMovePool: [
    'A rival patron tries to buy the party\'s attention before the current adventure is fully resolved.',
    'A villain lieutenant changes the shape of the next site after studying the party\'s habits.',
    'A local authority offers legal cover, but only if the party accepts visible oversight.',
    'A neutral guild will help, though it expects a future favor with real story cost.',
    'A religious or arcane group claims jurisdiction over the same problem the party wants to solve.',
    'One ally overcommits in the party\'s name and creates political fallout.',
    'A faction starts rewarding rumors about the party\'s route, rest pattern, or weaknesses.',
    'A desperate enemy uses civilians, relics, or sacred ground to change the terms of engagement.',
  ],
  stakePool: [
    'A treasure payoff is easy to claim now, but taking it closes off a cleaner alliance later.',
    'Success secures loot and goodwill only if the party keeps collateral damage visibly low.',
    'The faster route reaches the objective first, but guarantees a harder boss scene.',
    'The party can preserve clues or preserve lives, but not both without extra risk.',
    'A patron reward comes with hidden expectations that shape the next quest.',
    'Long-rest safety buys preparation, but lets the enemy finish one visible step of its plan.',
    'Mercy keeps one future contact alive, but makes the immediate job much messier.',
    'The best magic item reward points directly toward the campaign\'s next danger.',
  ],
};

const PF2_CONFIG: CampaignSystemConfig = {
  ...HOME_CONFIG,
  labels: {
    ...HOME_CONFIG.labels,
    summary: 'Campaign Summary',
    objective: 'Current Objective',
    notes: 'GM Notes',
    rerollButton: 'Reroll GM Prep Angles',
    snapshot: 'Scenario Snapshot',
    storyFocus: 'Scenario Focus',
    readiness: 'GM Readiness',
    prepAngles: 'GM Prep Angles',
    nextSession: 'Next Scenario Lens',
    factionMoves: 'Faction Motion',
    stakes: 'Pressure & Payoff',
    linkedProjects: 'Connected Prep',
  },
  toneLabels: {
    heroic: 'heroic drive',
    grim: 'gritty fallout',
    mystic: 'occult mystery',
    political: 'faction intrigue',
    sandbox: 'open scenario',
  },
  notesState: {
    active: 'GM notes are active and ready to support the next scenario.',
    empty: 'No GM notes yet. Add recap points, faction fallout, encounter pressure, or reward follow-up.',
  },
  campaignPulse: {
    heroic: 'Keep the campaign moving through clear objectives, tactical stakes, and steady progression beats.',
    grim: 'Make setbacks visible through resources, positioning, and how hard the next scenario hits.',
    mystic: 'Layer mysteries so each answer changes what the party should prepare for next.',
    political: 'Let faction pressure alter missions, access, and the structure of later scenarios.',
    sandbox: 'Keep multiple scenario paths active so the party determines pacing and focus.',
  },
  prepAnglePool: [
    'Prepare one encounter area with terrain that rewards movement and positioning rather than raw damage.',
    'Write one faction pressure beat that changes how the next scenario opens.',
    'Set one treasure handoff that clearly supports the party\'s next level band.',
    'Prepare a fallback objective in case the party bypasses the expected conflict entirely.',
    'Add one social scene where leverage matters as much as combat readiness.',
    'Map one site that supports both tactical play and a cleaner noncombat resolution path.',
    'Write one downtime or travel consequence that lands if the party postpones the main objective.',
    'Advance a regional pressure track by one step whenever the party resolves a side objective first.',
  ],
  sessionLensPool: {
    heroic: [
      'Open with a clear objective and a map or scene that rewards smart movement choices.',
      'Frame the first problem so the party can win through tactics, leverage, or speed.',
      'Put one visible community outcome behind the next success.',
      'Let the group feel competent fast, then complicate the board state.',
    ],
    grim: [
      'Make the next choice cost position, time, or support rather than only hit points.',
      'Use fallout from the last scenario to sharpen the next opening beat.',
      'Let a clean tactical plan create a dirty political result.',
      'Show one consequence the party can manage and one they must simply endure.',
    ],
    mystic: [
      'Let one clue point toward the obvious site and another point toward the real pressure behind it.',
      'Use mystery to reshape logistics, access, or what the party thinks is safe.',
      'Make the party solve one practical question before the stranger truth can matter.',
      'Treat strange power as something that changes the mission structure, not just the atmosphere.',
    ],
    political: [
      'Open with a request, demand, or accusation that changes who can help openly.',
      'Put two factions on the same side of the problem but not the same side of the solution.',
      'Give the party one truth that changes leverage and another that changes legitimacy.',
      'Make support, writs, or travel access part of the challenge from the start.',
    ],
    sandbox: [
      'Keep three scenario leads active and let each one develop while the party pursues another.',
    'Use one downtime or travel beat to reveal the world moving without the party\'s permission.',
      'Let a side objective improve the tactical shape of a later main objective.',
      'Make exploration choices visibly change pressure on settlements, roads, or factions.',
    ],
  },
  factionMovePool: [
    'A regional power adjusts patrols, taxes, or access in response to the party\'s last move.',
    'A rival faction pursues the same objective but with a riskier timetable.',
    'A useful ally asks for formal terms before offering support again.',
    'A local authority starts tracking the party as a force that must be managed, not merely welcomed.',
    'One enemy group changes terrain, timing, or logistics instead of simply hitting harder next time.',
    'A neutral broker offers help only if the party stabilizes a smaller problem first.',
    'A faction takes the party\'s success as proof they should push more aggressively now.',
    'An overlooked NPC becomes a pressure point because other powers realize the party values them.',
  ],
  stakePool: [
    'A practical payoff is available now, but taking it weakens the party\'s leverage in the next chapter.',
    'Success secures support only if the party protects both the objective and the relationship around it.',
    'A cleaner tactical route creates worse fallout once the scene becomes public.',
    'The party can preserve resources or preserve goodwill, but not perfectly both.',
    'A delayed resolution improves positioning while worsening the region\'s pressure track.',
    'The best reward supports the next level band but exposes who backed the party quietly.',
    'Saving a future ally now means giving a current advantage away.',
    'The next scenario opens differently depending on whether the party prioritizes speed, proof, or mercy here.',
  ],
};

export function getCampaignSystemConfig(systemId: GameSystemId) {
  if (systemId === 'dnd5e') {
    return DND_CONFIG;
  }

  if (systemId === 'pathfinder2e') {
    return PF2_CONFIG;
  }

  return HOME_CONFIG;
}
