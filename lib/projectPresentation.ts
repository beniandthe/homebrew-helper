import { getGameSystem, resolveGameSystemId, type GameSystemId } from '@/lib/gameSystems';

export type ProjectData = Record<string, unknown> | null | undefined;

function getDataValue(data: ProjectData, key: string) {
  return data && typeof data === 'object' ? data[key] : undefined;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function titleizeToken(value: string) {
  return value
    .split(/[-_]/g)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function clipText(value: string, maxLength = 110) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function countNamedEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value.filter((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const name = (entry as Record<string, unknown>).name;
    return typeof name === 'string' && name.trim().length > 0;
  }).length;
}

export function getProjectSystemId(data: ProjectData): GameSystemId {
  const systemId = asString(getDataValue(data, 'systemId'));
  const systemName = asString(getDataValue(data, 'systemName'));
  return resolveGameSystemId(systemId ?? systemName);
}

export function getProjectSystemLabel(data: ProjectData) {
  return getGameSystem(getProjectSystemId(data)).label;
}

export function getProjectSystemShortLabel(data: ProjectData) {
  return getGameSystem(getProjectSystemId(data)).shortLabel;
}

export function getProjectRoute(toolType: string) {
  switch (toolType) {
    case 'campaign_hub':
      return '/campaign';
    case 'xp_calculator':
      return '/xp';
    case 'encounter_calculator':
      return '/encounters';
    case 'loot_generator':
      return '/generator';
    case 'quest_generator':
      return '/quest';
    default:
      return null;
  }
}

export function getProjectToolLabel(toolType: string, systemId: GameSystemId) {
  const system = getGameSystem(systemId);

  switch (toolType) {
    case 'campaign_hub':
      return system.campaign.title;
    case 'xp_calculator':
      return system.xp.title;
    case 'encounter_calculator':
      return system.encounters.title;
    case 'loot_generator':
      return system.generator.title;
    case 'quest_generator':
      return system.quest.title;
    default:
      return titleizeToken(toolType);
  }
}

export function getProjectToolBadge(toolType: string, systemId: GameSystemId) {
  const system = getGameSystem(systemId);

  switch (toolType) {
    case 'campaign_hub':
      return system.tabs.campaign;
    case 'xp_calculator':
      return system.tabs.xp;
    case 'encounter_calculator':
      return system.tabs.encounters;
    case 'loot_generator':
      return system.tabs.generator;
    case 'quest_generator':
      return system.tabs.quest;
    default:
      return titleizeToken(toolType);
  }
}

export function getProjectSummary(toolType: string, data: ProjectData) {
  const summary = asString(getDataValue(data, 'campaignSummary'));
  const objective = asString(getDataValue(data, 'currentObjective'));
  const notes = asString(getDataValue(data, 'sessionNotes')) ?? asString(getDataValue(data, 'prepNotes'));

  if (toolType === 'campaign_hub') {
    const partyName = asString(getDataValue(data, 'partyName'));
    const partyCount = countNamedEntries(getDataValue(data, 'partyRoster'));
    const itemCount = countNamedEntries(getDataValue(data, 'sharedInventory'));
    const npcCount = countNamedEntries(getDataValue(data, 'npcRoster'));
    const segments = [
      partyName,
      partyCount > 0 ? `${partyCount} party sheets` : null,
      itemCount > 0 ? `${itemCount} tracked items` : null,
      npcCount > 0 ? `${npcCount} NPCs` : null,
    ].filter(Boolean);

    if (segments.length > 0) {
      return clipText(segments.join(' - '));
    }

    return clipText(objective ?? summary ?? notes ?? 'Campaign planning workspace.');
  }

  if (toolType === 'xp_calculator') {
    const levels = asNumber(getDataValue(data, 'levels'));
    const progressionMode = asString(getDataValue(data, 'progressionMode'));
    const progressionPreset = asString(getDataValue(data, 'progressionPreset'));
    const segments = [
      progressionMode ? titleizeToken(progressionMode) : null,
      progressionPreset ? titleizeToken(progressionPreset) : null,
      levels ? `${levels} levels` : null,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(' • ') : 'Progression pacing and level planning.';
  }

  if (toolType === 'encounter_calculator') {
    const difficulty = asString(getDataValue(data, 'difficulty'));
    const enemyRole = asString(getDataValue(data, 'enemyRole'));
    const enemyCount = asNumber(getDataValue(data, 'enemyCount'));
    const waveCount = asNumber(getDataValue(data, 'waveCount'));
    const segments = [
      difficulty ? titleizeToken(difficulty) : null,
      enemyRole ? titleizeToken(enemyRole) : null,
      enemyCount ? `${enemyCount} enemies` : null,
      waveCount && waveCount > 1 ? `${waveCount} waves` : null,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(' • ') : 'Encounter pressure and battlefield planning.';
  }

  if (toolType === 'loot_generator') {
    const rewardType = asString(getDataValue(data, 'rewardType'));
    const rarity = asString(getDataValue(data, 'rarity'));
    const rewardTheme = asString(getDataValue(data, 'rewardTheme'));
    const rewardSource = asString(getDataValue(data, 'rewardSource'));
    const segments = [
      rarity ? titleizeToken(rarity) : null,
      rewardType ? titleizeToken(rewardType) : null,
      rewardTheme ? titleizeToken(rewardTheme) : null,
      rewardSource ? titleizeToken(rewardSource) : null,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(' • ') : 'Treasure bundles and reward flavor.';
  }

  if (toolType === 'quest_generator') {
    const tone = asString(getDataValue(data, 'tone'));
    const resolutionStyle = asString(getDataValue(data, 'resolutionStyle'));
    const factionImpact = asString(getDataValue(data, 'factionImpact'));
    const segments = [
      tone ? titleizeToken(tone) : null,
      resolutionStyle ? titleizeToken(resolutionStyle) : null,
      factionImpact ? `${titleizeToken(factionImpact)} impact` : null,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(' • ') : 'Quest structure, twists, and consequences.';
  }

  return clipText(notes ?? summary ?? 'Saved project.');
}
