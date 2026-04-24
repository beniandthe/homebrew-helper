import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppState } from '@/contexts/AppStateContext';
import { ProCard } from '@/components/ProCard';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { AppInput } from '@/components/AppInput';
import { BodyText, Label } from '@/components/AppText';
import { DisclosurePanel } from '@/components/DisclosurePanel';
import { Screen } from '@/components/Screen';
import { SystemHero } from '@/components/SystemHero';
import { SystemPanel } from '@/components/SystemPanel';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { buildDndCampaignLinkContext } from '@/lib/dndCampaignLinkContext';
import {
  getCampaignLinkPreview,
  NO_CAMPAIGN_OPTION_LABEL,
} from '@/lib/campaignLinkPreview';
import {
  syncDndEncounterLedgerEntry,
  syncDndThreatClockEntry,
  type DndEncounterLedgerEntry,
  type DndThreatClockEntry,
  type DndThreatClockStatus,
} from '@/lib/dndCampaignLedger';
import { buildSeed, pickManyFromPool } from '@/lib/generation';
import {
  getEncounterSystemConfig,
  type EncounterDifficulty,
  type EnemyRole,
  type TerrainType,
} from '@/lib/encounterSystemConfig';
import { getGameSystem, resolveGameSystemId, type GameSystemId } from '@/lib/gameSystems';
import { getSystemPresentation } from '@/lib/systemPresentation';
import {
  applyCampaignSystemToPayload,
  fetchCampaignOptionById,
  fetchCampaignOptions,
  fetchLatestSaveAccess,
  getErrorMessage,
  type CampaignOption,
} from '@/lib/projectAccess';
import { getCampaignLinkUpsell, getFreeLimitUpsell } from '@/lib/subscriptionUi';

const DIFFICULTY_OPTIONS: EncounterDifficulty[] = ['easy', 'standard', 'hard', 'deadly'];
const ENEMY_ROLE_OPTIONS: EnemyRole[] = ['brute', 'skirmisher', 'controller', 'artillery', 'boss'];
const TERRAIN_OPTIONS: TerrainType[] = ['open', 'cover-heavy', 'hazardous', 'chokepoint', 'elevated'];
const THREAT_STATUS_OPTIONS: DndThreatClockStatus[] = ['lurking', 'active', 'escalating', 'contained', 'resolved'];
const ESCALATION_TAG_OPTIONS = ['Alerted', 'Hunted', 'Exposed', 'Under Siege', 'On the Run'];

function isEncounterDifficulty(value: unknown): value is EncounterDifficulty {
  return typeof value === 'string' && DIFFICULTY_OPTIONS.includes(value as EncounterDifficulty);
}

function isEnemyRole(value: unknown): value is EnemyRole {
  return typeof value === 'string' && ENEMY_ROLE_OPTIONS.includes(value as EnemyRole);
}

function isTerrainType(value: unknown): value is TerrainType {
  return typeof value === 'string' && TERRAIN_OPTIONS.includes(value as TerrainType);
}

function isThreatClockStatus(value: unknown): value is DndThreatClockStatus {
  return typeof value === 'string' && THREAT_STATUS_OPTIONS.includes(value as DndThreatClockStatus);
}

function getRecommendedThreatClock(difficulty: EncounterDifficulty) {
  switch (difficulty) {
    case 'easy':
      return { filled: 2, total: 4 };
    case 'hard':
      return { filled: 4, total: 6 };
    case 'deadly':
      return { filled: 5, total: 6 };
    case 'standard':
    default:
      return { filled: 3, total: 4 };
  }
}

function formatThreatClockStatusLabel(value: DndThreatClockStatus) {
  switch (value) {
    case 'lurking':
      return 'Lurking';
    case 'active':
      return 'Active';
    case 'escalating':
      return 'Escalating';
    case 'contained':
      return 'Contained';
    case 'resolved':
      return 'Resolved';
    default:
      return value;
  }
}

function getDefaultEscalationTag(difficulty: EncounterDifficulty) {
  switch (difficulty) {
    case 'easy':
      return 'Alerted';
    case 'hard':
      return 'Hunted';
    case 'deadly':
      return 'Under Siege';
    case 'standard':
    default:
      return 'Exposed';
  }
}

type EncounterProjectData = {
  partyLevel?: number;
  partySize?: number;
  enemyCount?: number;
  enemyLevel?: number;
  difficulty?: EncounterDifficulty;
  enemyRole?: EnemyRole;
  terrainType?: TerrainType;
  waveCount?: number;
  frontlineCount?: number;
  supportCount?: number;
  controlCount?: number;
  strikerCount?: number;
  encounterNotes?: string;
  threatTitle?: string;
  threatStatus?: DndThreatClockStatus;
  threatClockFilled?: number;
  threatClockTotal?: number;
  linkedNpcId?: string;
  linkedNpcName?: string;
  linkedFaction?: string;
  escalationTag?: string;
  sessionFallout?: string;
  systemId?: GameSystemId;
  systemName?: string;
};

export default function EncounterScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { activeSystemId, setActiveSystemId } = useGameSystem();
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [lockedCampaignSystemId, setLockedCampaignSystemId] = useState<GameSystemId | null>(null);
  const selectedCampaign = useMemo(
    () => campaignOptions.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaignOptions, selectedCampaignId]
  );
  const effectiveSystemId = lockedCampaignSystemId ?? activeSystemId;
  const effectiveSystem = useMemo(() => getGameSystem(effectiveSystemId), [effectiveSystemId]);
  const encounterConfig = useMemo(() => getEncounterSystemConfig(effectiveSystemId), [effectiveSystemId]);
  const palette = useMemo(() => getSystemPresentation(effectiveSystemId).palette, [effectiveSystemId]);
  const campaignLinkPreview = useMemo(() => getCampaignLinkPreview('encounter', effectiveSystemId), [effectiveSystemId]);
  const dndCampaignContext = useMemo(
    () => (effectiveSystemId === 'dnd5e' ? buildDndCampaignLinkContext(selectedCampaign?.data) : null),
    [effectiveSystemId, selectedCampaign?.data]
  );

  const [partyLevel, setPartyLevel] = useState(encounterConfig.defaults.partyLevel);
  const [partySize, setPartySize] = useState(encounterConfig.defaults.partySize);
  const [enemyCount, setEnemyCount] = useState(encounterConfig.defaults.enemyCount);
  const [enemyLevel, setEnemyLevel] = useState(encounterConfig.defaults.enemyLevel);

  const [difficulty, setDifficulty] = useState<EncounterDifficulty>(encounterConfig.defaults.difficulty);
  const [enemyRole, setEnemyRole] = useState<EnemyRole>(encounterConfig.defaults.enemyRole);
  const [terrainType, setTerrainType] = useState<TerrainType>(encounterConfig.defaults.terrainType);
  const [waveCount, setWaveCount] = useState(encounterConfig.defaults.waveCount);

  const [frontlineCount, setFrontlineCount] = useState(encounterConfig.defaults.frontlineCount);
  const [supportCount, setSupportCount] = useState(encounterConfig.defaults.supportCount);
  const [controlCount, setControlCount] = useState(encounterConfig.defaults.controlCount);
  const [strikerCount, setStrikerCount] = useState(encounterConfig.defaults.strikerCount);

  const [encounterNotes, setEncounterNotes] = useState('');
  const [threatTitle, setThreatTitle] = useState('');
  const [threatStatus, setThreatStatus] = useState<DndThreatClockStatus>('active');
  const [threatClockFilled, setThreatClockFilled] = useState(String(getRecommendedThreatClock(encounterConfig.defaults.difficulty).filled));
  const [threatClockTotal, setThreatClockTotal] = useState(String(getRecommendedThreatClock(encounterConfig.defaults.difficulty).total));
  const [linkedNpcId, setLinkedNpcId] = useState('');
  const [linkedFaction, setLinkedFaction] = useState('');
  const [escalationTag, setEscalationTag] = useState(getDefaultEscalationTag(encounterConfig.defaults.difficulty));
  const [sessionFallout, setSessionFallout] = useState('');
  const [variationSeed, setVariationSeed] = useState(0);
  const [appliedCampaignDefaultsId, setAppliedCampaignDefaultsId] = useState('');
  const selectedNpc = useMemo(
    () => dndCampaignContext?.npcRoster.find((npc) => npc.id === linkedNpcId) ?? null,
    [dndCampaignContext, linkedNpcId]
  );
  const factionOptions = useMemo(() => {
    if (!dndCampaignContext) {
      return [];
    }

    return Array.from(
      new Set(
        [
          dndCampaignContext.mainFaction,
          ...dndCampaignContext.npcRoster.map((npc) => npc.affiliation),
          ...dndCampaignContext.activeThreats.map((entry) => entry.linkedFaction),
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      )
    );
  }, [dndCampaignContext]);

  const [loadingProject, setLoadingProject] = useState(false);
  const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [moreSaveActionsOpen, setMoreSaveActionsOpen] = useState(false);

  const {
    userId: sessionUserId,
    isPro,
    savedProjectCount,
    loading: loadingSession,
    refreshAppState,
  } = useAppState();

  const [statusBanner, setStatusBanner] = useState<{
    title?: string;
    message: string;
    variant: StatusBannerVariant;
  } | null>(null);

  const maxFreeSaves = 3;
  const isAtFreeLimit = !isPro && savedProjectCount >= maxFreeSaves;
  const isCreatingNewProject = !currentProjectId;
  const freeLimitUpsell = getFreeLimitUpsell(maxFreeSaves);
  const campaignLinkUpsell = getCampaignLinkUpsell('This encounter');

  function setBanner(
    variant: StatusBannerVariant,
    title: string,
    message: string
  ) {
    setStatusBanner({ variant, title, message });
  }

  async function getLatestSaveAccess(userId: string) {
    if (!supabase) {
      return { isPro: false, count: 0 };
    }

    return fetchLatestSaveAccess(supabase, userId);
  }

  const loadCampaignOptions = useCallback(async () => {
    if (!supabase || !sessionUserId) return;

    try {
      setLoadingCampaigns(true);
      setCampaignOptions(await fetchCampaignOptions(supabase, sessionUserId));
    } catch (error) {
      setBanner('error', 'Campaign load failed', getErrorMessage(error));
    } finally {
      setLoadingCampaigns(false);
    }
  }, [sessionUserId]);

  const refreshSelectedCampaignData = useCallback(async () => {
    if (!supabase || !sessionUserId || !selectedCampaignId) {
      return;
    }

    try {
      const refreshed = await fetchCampaignOptionById(supabase, sessionUserId, selectedCampaignId);
      if (!refreshed) {
        return;
      }

      setCampaignOptions((current) => {
        const existing = current.find((campaign) => campaign.id === refreshed.id);
        if (!existing) {
          return [refreshed, ...current];
        }

        return current.map((campaign) => (campaign.id === refreshed.id ? refreshed : campaign));
      });
    } catch {
      // Keep the current screen usable even if the background refresh misses.
    }
  }, [selectedCampaignId, sessionUserId]);

  function handleUpgradePress() {
    router.push('/pricing');
  }

  useEffect(() => {
    if (isPro) {
      loadCampaignOptions();
    } else {
      setCampaignOptions([]);
      setLoadingCampaigns(false);
    }
  }, [sessionUserId, currentProjectId, isPro, loadCampaignOptions]);

  useEffect(() => {
    if (!isPro) {
      setSelectedCampaignId('');
    }
  }, [isPro]);

  useEffect(() => {
    if (params.projectId || currentProjectId) {
      return;
    }

    setPartyLevel(encounterConfig.defaults.partyLevel);
    setPartySize(encounterConfig.defaults.partySize);
    setEnemyCount(encounterConfig.defaults.enemyCount);
    setEnemyLevel(encounterConfig.defaults.enemyLevel);
    setDifficulty(encounterConfig.defaults.difficulty);
    setEnemyRole(encounterConfig.defaults.enemyRole);
    setTerrainType(encounterConfig.defaults.terrainType);
    setWaveCount(encounterConfig.defaults.waveCount);
    setFrontlineCount(encounterConfig.defaults.frontlineCount);
    setSupportCount(encounterConfig.defaults.supportCount);
    setControlCount(encounterConfig.defaults.controlCount);
    setStrikerCount(encounterConfig.defaults.strikerCount);
    setEncounterNotes('');
    setThreatTitle('');
    setThreatStatus('active');
    setThreatClockFilled(String(getRecommendedThreatClock(encounterConfig.defaults.difficulty).filled));
    setThreatClockTotal(String(getRecommendedThreatClock(encounterConfig.defaults.difficulty).total));
    setLinkedNpcId('');
    setLinkedFaction('');
    setEscalationTag(getDefaultEscalationTag(encounterConfig.defaults.difficulty));
    setSessionFallout('');
    setVariationSeed(0);
    setAppliedCampaignDefaultsId('');
    setAdvancedOpen(false);
    setMoreSaveActionsOpen(false);
  }, [encounterConfig, params.projectId, currentProjectId]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setAppliedCampaignDefaultsId('');
      return;
    }

    if (effectiveSystemId !== 'dnd5e' || !dndCampaignContext) {
      return;
    }

    if (params.projectId || currentProjectId || appliedCampaignDefaultsId === selectedCampaignId) {
      return;
    }

    if (dndCampaignContext.averageLevel) {
      setPartyLevel(String(dndCampaignContext.averageLevel));
      setEnemyLevel(String(dndCampaignContext.averageLevel));
    }

    if (dndCampaignContext.partySize > 0) {
      setPartySize(String(dndCampaignContext.partySize));
      setEnemyCount(String(Math.max(1, dndCampaignContext.partySize)));
    }

    setFrontlineCount(String(dndCampaignContext.roleMix.frontline));
    setSupportCount(String(dndCampaignContext.roleMix.support));
    setControlCount(String(dndCampaignContext.roleMix.control));
    setStrikerCount(String(dndCampaignContext.roleMix.striker));

    if (encounterNotes.trim().length === 0 && dndCampaignContext.defaultEncounterNote) {
      setEncounterNotes(dndCampaignContext.defaultEncounterNote);
    }

    if (threatTitle.trim().length === 0) {
      const objectiveLead = dndCampaignContext.currentObjective || dndCampaignContext.mainFaction;
      const roleLabel = encounterConfig.enemyRoleLabels[enemyRole];
      setThreatTitle(objectiveLead ? `${roleLabel} pressure around ${objectiveLead}` : `${roleLabel} threat`);
    }

    if (sessionFallout.trim().length === 0 && dndCampaignContext.activeThreats[0]) {
      setSessionFallout(`Escalation can spill into ${dndCampaignContext.activeThreats[0].title.toLowerCase()}.`);
    }

    if (linkedFaction.trim().length === 0 && dndCampaignContext.mainFaction) {
      setLinkedFaction(dndCampaignContext.mainFaction);
    }

    if (escalationTag.trim().length === 0) {
      setEscalationTag(getDefaultEscalationTag(difficulty));
    }

    setAppliedCampaignDefaultsId(selectedCampaignId);
  }, [
    appliedCampaignDefaultsId,
    currentProjectId,
    dndCampaignContext,
    effectiveSystemId,
    encounterConfig.enemyRoleLabels,
    encounterNotes,
    escalationTag,
    enemyRole,
    difficulty,
    linkedFaction,
    params.projectId,
    sessionFallout,
    selectedCampaignId,
    threatTitle,
  ]);

  useEffect(() => {
    async function loadProject() {
      if (!supabase) return;
      if (!sessionUserId) return;

      if (!params.projectId) {
        setLoadedProjectName(null);
        setCurrentProjectId(null);
        setSelectedCampaignId('');
        setLockedCampaignSystemId(null);
        return;
      }

      try {
        setLoadingProject(true);

        const { data, error } = await supabase
          .from('saved_projects')
          .select('*')
          .eq('id', params.projectId)
          .eq('user_id', sessionUserId)
          .single();

        if (error) {
          setBanner('error', 'Load failed', error.message);
          return;
        }

        const projectData = (data?.data ?? {}) as EncounterProjectData;
        let linkedCampaign: CampaignOption | null = null;

        if (typeof data?.campaign_id === 'string' && isPro) {
          setSelectedCampaignId(data.campaign_id);
          linkedCampaign = await fetchCampaignOptionById(supabase, sessionUserId, data.campaign_id);
        } else {
          setSelectedCampaignId('');
          setLockedCampaignSystemId(null);
        }

        if (linkedCampaign) {
          setLockedCampaignSystemId(linkedCampaign.systemId);
          setActiveSystemId(linkedCampaign.systemId);
        } else if (projectData.systemId || projectData.systemName) {
          setActiveSystemId(resolveGameSystemId(projectData.systemId ?? projectData.systemName));
        }

        if (typeof projectData.partyLevel === 'number') {
          setPartyLevel(String(projectData.partyLevel));
        }

        if (typeof projectData.partySize === 'number') {
          setPartySize(String(projectData.partySize));
        }

        if (typeof projectData.enemyCount === 'number') {
          setEnemyCount(String(projectData.enemyCount));
        }

        if (typeof projectData.enemyLevel === 'number') {
          setEnemyLevel(String(projectData.enemyLevel));
        }

        if (isEncounterDifficulty(projectData.difficulty)) {
          setDifficulty(projectData.difficulty);
        }

        if (isEnemyRole(projectData.enemyRole)) {
          setEnemyRole(projectData.enemyRole);
        }

        if (isTerrainType(projectData.terrainType)) {
          setTerrainType(projectData.terrainType);
        }

        if (typeof projectData.waveCount === 'number') {
          setWaveCount(String(projectData.waveCount));
        }

        if (typeof projectData.frontlineCount === 'number') {
          setFrontlineCount(String(projectData.frontlineCount));
        }

        if (typeof projectData.supportCount === 'number') {
          setSupportCount(String(projectData.supportCount));
        }

        if (typeof projectData.controlCount === 'number') {
          setControlCount(String(projectData.controlCount));
        }

        if (typeof projectData.strikerCount === 'number') {
          setStrikerCount(String(projectData.strikerCount));
        }

        if (typeof projectData.encounterNotes === 'string') {
          setEncounterNotes(projectData.encounterNotes);
        }

        if (typeof projectData.threatTitle === 'string') {
          setThreatTitle(projectData.threatTitle);
        }

        if (isThreatClockStatus(projectData.threatStatus)) {
          setThreatStatus(projectData.threatStatus);
        }

        if (typeof projectData.threatClockFilled === 'number') {
          setThreatClockFilled(String(projectData.threatClockFilled));
        }

        if (typeof projectData.threatClockTotal === 'number') {
          setThreatClockTotal(String(projectData.threatClockTotal));
        }

        if (typeof projectData.linkedNpcId === 'string') {
          setLinkedNpcId(projectData.linkedNpcId);
        }

        if (typeof projectData.linkedFaction === 'string') {
          setLinkedFaction(projectData.linkedFaction);
        }

        if (typeof projectData.escalationTag === 'string') {
          setEscalationTag(projectData.escalationTag);
        }

        if (typeof projectData.sessionFallout === 'string') {
          setSessionFallout(projectData.sessionFallout);
        }

      setLoadedProjectName(data?.name ?? 'Opened save');
        setCurrentProjectId(data?.id ?? null);
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [params.projectId, sessionUserId, isPro, setActiveSystemId]);

  const result = useMemo(() => {
    const parsedPartyLevel = Math.max(1, Number.parseInt(partyLevel || '1', 10));
    const parsedPartySize = Math.max(1, Number.parseInt(partySize || '1', 10));
    const parsedEnemyCount = Math.max(1, Number.parseInt(enemyCount || '1', 10));
    const parsedEnemyLevel = Math.max(1, Number.parseInt(enemyLevel || '1', 10));
    const parsedWaveCount = Math.max(1, Number.parseInt(waveCount || '1', 10));

    const parsedFrontline = Math.max(0, Number.parseInt(frontlineCount || '0', 10));
    const parsedSupport = Math.max(0, Number.parseInt(supportCount || '0', 10));
    const parsedControl = Math.max(0, Number.parseInt(controlCount || '0', 10));
    const parsedStriker = Math.max(0, Number.parseInt(strikerCount || '0', 10));

    const multipliers = encounterConfig.multipliers;
    const partyBudgetBase = parsedPartyLevel * parsedPartySize * multipliers.partyUnitValue;
    const enemyBudgetBase = parsedEnemyLevel * parsedEnemyCount * multipliers.enemyUnitValue;
    const difficultyMultiplier = multipliers.difficulty[difficulty];
    const enemyRoleMultiplier = multipliers.enemyRole[enemyRole];
    const terrainMultiplier = multipliers.terrain[terrainType];
    const waveMultiplier = 1 + (parsedWaveCount - 1) * multipliers.waveStep;
    const partyRoleBonus =
      parsedFrontline * multipliers.partyRoleWeights.frontline +
      parsedSupport * multipliers.partyRoleWeights.support +
      parsedControl * multipliers.partyRoleWeights.control +
      parsedStriker * multipliers.partyRoleWeights.striker;

    const adjustedPartyBudget = Math.round(partyBudgetBase * (1 + partyRoleBonus));
    const adjustedEnemyBudget = Math.round(
      enemyBudgetBase * difficultyMultiplier * enemyRoleMultiplier * terrainMultiplier * waveMultiplier
    );

    const delta = adjustedEnemyBudget - adjustedPartyBudget;
    const actionEconomyDelta = parsedEnemyCount - parsedPartySize;

    let verdict = encounterConfig.verdictLabels.balanced;
    if (delta <= encounterConfig.verdictThresholds.undertuned) verdict = encounterConfig.verdictLabels.undertuned;
    if (delta >= encounterConfig.verdictThresholds.dangerous) verdict = encounterConfig.verdictLabels.dangerous;
    if (delta >= encounterConfig.verdictThresholds.boss) verdict = encounterConfig.verdictLabels.boss;

    let actionEconomyWarning = encounterConfig.advice.actionEconomyStable;
    if (actionEconomyDelta >= 3) {
      actionEconomyWarning = encounterConfig.advice.actionEconomyHigh;
    } else if (actionEconomyDelta <= -2) {
      actionEconomyWarning = encounterConfig.advice.actionEconomyLow;
    }

    let bossSupportRecommendation = encounterConfig.advice.bossDefault;
    if (enemyRole === 'boss' && parsedEnemyCount <= 1) {
      bossSupportRecommendation = encounterConfig.advice.bossSolo;
    } else if (enemyRole === 'boss' && parsedEnemyCount === 2) {
      bossSupportRecommendation = encounterConfig.advice.bossPair;
    }

    const recommendations: string[] = [];

    if (terrainType === 'open') {
      recommendations.push(encounterConfig.advice.openTerrain);
    }
    if (terrainType === 'hazardous') {
      recommendations.push(encounterConfig.advice.hazardousTerrain);
    }
    if (enemyRole === 'artillery') {
      recommendations.push(encounterConfig.advice.artillery);
    }
    if (enemyRole === 'controller') {
      recommendations.push(encounterConfig.advice.controller);
    }
    if (parsedWaveCount >= 2) {
      recommendations.push(encounterConfig.advice.multiWave);
    }
    if (parsedSupport === 0) {
      recommendations.push(encounterConfig.advice.noSupport);
    }
    if (parsedFrontline === 0) {
      recommendations.push(encounterConfig.advice.noFrontline);
    }
    if (parsedControl >= 2 && terrainType === 'chokepoint') {
      recommendations.push(encounterConfig.advice.heavyControl);
    }
    if (difficulty === 'deadly' && parsedWaveCount >= 3) {
      recommendations.push(encounterConfig.advice.deadlyMultiWave);
    }

    if (recommendations.length === 0) {
      recommendations.push(encounterConfig.advice.default);
    }

    const seed = buildSeed(
      [
        parsedPartyLevel,
        parsedPartySize,
        parsedEnemyCount,
        parsedEnemyLevel,
        difficulty,
        enemyRole,
        terrainType,
        parsedWaveCount,
        encounterNotes.trim(),
        variationSeed,
      ].join('|')
    );

    const tacticalBeats = pickManyFromPool(encounterConfig.tacticalBeatPool, 2, seed + 13);
    const lineupIdeas = pickManyFromPool(encounterConfig.lineupIdeas[enemyRole], 2, seed + 23);

    return {
      partyBudgetBase,
      adjustedPartyBudget,
      enemyBudgetBase,
      adjustedEnemyBudget,
      delta,
      actionEconomyDelta,
      verdict,
      actionEconomyWarning,
      bossSupportRecommendation,
      recommendations,
      lineupIdeas,
      tacticalBeats,
    };
  }, [
    partyLevel,
    partySize,
    enemyCount,
    enemyLevel,
    difficulty,
    enemyRole,
    terrainType,
    waveCount,
    frontlineCount,
    supportCount,
    controlCount,
    strikerCount,
    encounterNotes,
    variationSeed,
    encounterConfig,
  ]);

  const campaignPanelSummary = selectedCampaign
    ? `Locked to ${selectedCampaign.systemShortLabel} inside ${selectedCampaign.name}.`
    : isPro
      ? 'Standalone battle plan. Expand to tie this encounter into a campaign board.'
      : 'Campaign linking is available on Pro.';

  const quickSetupSummary = [
    `Level ${partyLevel || encounterConfig.defaults.partyLevel}`,
    `${partySize || encounterConfig.defaults.partySize} heroes`,
    encounterConfig.difficultyLabels[difficulty],
    encounterConfig.enemyRoleLabels[enemyRole],
    encounterConfig.terrainLabels[terrainType],
  ].join(' • ');

  const advancedSummary = dndCampaignContext
    ? `${enemyCount || encounterConfig.defaults.enemyCount} foes • ${waveCount || encounterConfig.defaults.waveCount} waves • Threat clock write-back ready.`
    : `${enemyCount || encounterConfig.defaults.enemyCount} foes • ${waveCount || encounterConfig.defaults.waveCount} waves • Party mix and notes tucked here.`;

  const savePanelSummary = currentProjectId
    ? selectedCampaign
      ? `Saving updates this encounter inside ${selectedCampaign.name}.`
      : 'Saving updates the current standalone encounter.'
    : selectedCampaign
      ? `The next save goes straight into ${selectedCampaign.name}.`
      : 'The next save creates a standalone encounter.';

  const primarySaveLabel = saving
    ? 'Saving...'
    : currentProjectId
      ? selectedCampaignId
        ? 'Update Campaign Save'
        : 'Update Save'
      : selectedCampaignId
        ? 'Save to Campaign'
        : 'Save Plan';

  const saveHelperText = loadingSession
    ? 'Checking account...'
    : sessionUserId
      ? currentProjectId
        ? 'Save updates this plan by default. Open more options if you want a fresh copy or campaign move.'
        : selectedCampaignId
          ? 'Saving will add this encounter to the selected campaign by default.'
          : 'Signed in. Save when the battle plan feels ready.'
      : 'Not signed in. You can calculate, but not save yet.';

  function buildPayload() {
    return {
      partyLevel: Number.parseInt(partyLevel || '1', 10),
      partySize: Number.parseInt(partySize || '1', 10),
      enemyCount: Number.parseInt(enemyCount || '1', 10),
      enemyLevel: Number.parseInt(enemyLevel || '1', 10),
      difficulty,
      enemyRole,
      terrainType,
      waveCount: Number.parseInt(waveCount || '1', 10),
      frontlineCount: Number.parseInt(frontlineCount || '0', 10),
      supportCount: Number.parseInt(supportCount || '0', 10),
      controlCount: Number.parseInt(controlCount || '0', 10),
      strikerCount: Number.parseInt(strikerCount || '0', 10),
      encounterNotes,
      threatTitle,
      threatStatus,
      threatClockFilled: Number.parseInt(threatClockFilled || '0', 10),
      threatClockTotal: Number.parseInt(threatClockTotal || '0', 10),
      linkedNpcId,
      linkedNpcName: selectedNpc?.name ?? '',
      linkedFaction,
      escalationTag,
      sessionFallout,
      systemId: effectiveSystemId,
      systemName: effectiveSystem.label,
      variationSeed,
      result,
    };
  }

  function buildEncounterLedgerEntry(projectId: string, projectName: string): DndEncounterLedgerEntry | null {
    if (effectiveSystemId !== 'dnd5e') {
      return null;
    }

    return {
      id: `encounter-ledger-${projectId}`,
      sourceProjectId: projectId,
      projectName,
      savedAt: new Date().toISOString(),
      difficulty: encounterConfig.difficultyLabels[difficulty],
      enemyRole: encounterConfig.enemyRoleLabels[enemyRole],
      terrainType: encounterConfig.terrainLabels[terrainType],
      verdict: result.verdict,
      partyLevel: Number.parseInt(partyLevel || '1', 10),
      partySize: Number.parseInt(partySize || '1', 10),
      monsterBench: dndCampaignContext
        ? dndCampaignContext.monsterBench[enemyRole].map((monster) => `${monster.name} (${monster.challenge})`)
        : [],
      lineupIdeas: result.lineupIdeas,
      tacticalBeats: result.tacticalBeats,
      notes: encounterNotes.trim(),
    };
  }

  function buildThreatClockEntry(projectId: string, projectName: string): DndThreatClockEntry | null {
    if (effectiveSystemId !== 'dnd5e') {
      return null;
    }

    const recommendedClock = getRecommendedThreatClock(difficulty);
    const segmentsTotal = Math.max(1, Number.parseInt(threatClockTotal || String(recommendedClock.total), 10));
    const segmentsFilled = Math.min(
      segmentsTotal,
      Math.max(0, Number.parseInt(threatClockFilled || String(recommendedClock.filled), 10))
    );
    const roleLabel = encounterConfig.enemyRoleLabels[enemyRole];
    const fallbackTitle = dndCampaignContext?.currentObjective
      ? `${roleLabel} pressure around ${dndCampaignContext.currentObjective}`
      : `${roleLabel} threat`;

    return {
      id: `threat-clock-${projectId}`,
      sourceProjectId: projectId,
      projectName,
      title: threatTitle.trim() || fallbackTitle,
      status: threatStatus,
      segmentsFilled,
      segmentsTotal,
      linkedNpcId,
      linkedNpcName: selectedNpc?.name ?? '',
      linkedFaction: linkedFaction.trim(),
      escalationTag: escalationTag.trim(),
      difficulty: encounterConfig.difficultyLabels[difficulty],
      enemyRole: roleLabel,
      verdict: result.verdict,
      fallout: sessionFallout.trim(),
      latestBeat: result.tacticalBeats[0] ?? '',
      updatedAt: new Date().toISOString(),
    };
  }

  async function syncEncounterLedger(projectId: string, projectName: string) {
    if (!supabase || !sessionUserId || !selectedCampaignId) {
      return { synced: false, error: null as string | null };
    }

    const encounterEntry = buildEncounterLedgerEntry(projectId, projectName);
    const threatEntry = buildThreatClockEntry(projectId, projectName);
    const errors: string[] = [];
    let synced = false;

    if (encounterEntry) {
      try {
        await syncDndEncounterLedgerEntry(supabase, sessionUserId, selectedCampaignId, encounterEntry);
        synced = true;
      } catch (error) {
        errors.push(`encounter ledger: ${getErrorMessage(error)}`);
      }
    }

    if (threatEntry) {
      try {
        await syncDndThreatClockEntry(supabase, sessionUserId, selectedCampaignId, threatEntry);
        synced = true;
      } catch (error) {
        errors.push(`threat clock: ${getErrorMessage(error)}`);
      }
    }

    if (synced) {
      await refreshSelectedCampaignData();
    }

    return {
      synced,
      error: errors.length > 0 ? errors.join(' ') : null,
    };
  }

  async function handleSaveProject(asNew = false) {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before saving this plan.');
      return;
    }

    try {
      setSaving(true);

      const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
      const timestampName = `Encounter - ${new Date().toLocaleString()}`;
      const campaignMessage = selectedCampaign ? ` in ${selectedCampaign.name}` : '';

      if (!asNew && currentProjectId) {
        const { error } = await supabase
          .from('saved_projects')
          .update({
            name: loadedProjectName ?? timestampName,
            data: payload,
            updated_at: new Date().toISOString(),
            campaign_id: selectedCampaignId || null,
          })
          .eq('id', currentProjectId)
          .eq('user_id', sessionUserId);

        if (error) {
          setBanner('error', 'Update failed', error.message);
          return;
        }

        const ledgerSync = await syncEncounterLedger(currentProjectId, loadedProjectName ?? timestampName);
        await refreshAppState();
        setBanner(
          ledgerSync.error ? 'info' : 'success',
          ledgerSync.error ? 'Updated, campaign sync pending' : 'Updated',
          `Your encounter plan was updated successfully${campaignMessage}.${ledgerSync.synced ? ' Campaign board synced.' : ''}${ledgerSync.error ? ` Campaign sync failed: ${ledgerSync.error}` : ''}`
        );
        return;
      }

      if (asNew || !currentProjectId) {
        await refreshAppState();
        const latestAccess = await getLatestSaveAccess(sessionUserId);

        if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
          setBanner(
            'error',
            'Free limit reached',
            'Free accounts can keep up to 3 saved plans. Upgrade to Pro for unlimited saves.'
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: sessionUserId,
          name: timestampName,
          tool_type: 'encounter_calculator',
          data: payload,
          campaign_id: selectedCampaignId || null,
        })
        .select()
        .single();

      if (error) {
        setBanner('error', 'Save failed', error.message);
        return;
      }

      setLoadedProjectName(data?.name ?? timestampName);
      setCurrentProjectId(data?.id ?? null);
      const ledgerSync = data?.id ? await syncEncounterLedger(data.id, data.name ?? timestampName) : { synced: false, error: null as string | null };
      await refreshAppState();

      setBanner(
        ledgerSync.error ? 'info' : 'success',
        ledgerSync.error ? 'Saved, campaign sync pending' : 'Saved',
        `Your encounter plan was saved successfully${campaignMessage}.${ledgerSync.synced ? ' Campaign board synced.' : ''}${ledgerSync.error ? ` Campaign sync failed: ${ledgerSync.error}` : ''}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsNew() {
    await handleSaveProject(true);
  }

  async function handleSaveToCampaign() {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before adding this plan to a campaign.');
      return;
    }

    if (!isPro) {
      setBanner('error', 'Pro required', 'Campaign binders are available on Pro.');
      return;
    }

    if (!selectedCampaignId) {
      setBanner('error', 'Select a campaign', 'Choose a campaign before adding this save.');
      return;
    }

    try {
      setSaving(true);

      const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
      const timestampName = loadedProjectName ?? `Encounter - ${new Date().toLocaleString()}`;

      if (currentProjectId) {
        const { error } = await supabase
          .from('saved_projects')
          .update({
            name: timestampName,
            data: payload,
            updated_at: new Date().toISOString(),
            campaign_id: selectedCampaignId,
          })
          .eq('id', currentProjectId)
          .eq('user_id', sessionUserId);

        if (error) {
          setBanner('error', 'Campaign update failed', error.message);
          return;
        }

        const ledgerSync = await syncEncounterLedger(currentProjectId, timestampName);
        await refreshAppState();
        setBanner(
          ledgerSync.error ? 'info' : 'success',
          ledgerSync.error ? 'Campaign updated, sync pending' : 'Campaign updated',
          `This save is now tied to the selected campaign.${ledgerSync.synced ? ' Campaign board synced.' : ''}${ledgerSync.error ? ` Campaign sync failed: ${ledgerSync.error}` : ''}`
        );
        return;
      }

      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: sessionUserId,
          name: timestampName,
          tool_type: 'encounter_calculator',
          data: payload,
          campaign_id: selectedCampaignId,
        })
        .select()
        .single();

      if (error) {
        setBanner('error', 'Campaign save failed', error.message);
        return;
      }

      setLoadedProjectName(data?.name ?? timestampName);
      setCurrentProjectId(data?.id ?? null);
      const ledgerSync = data?.id ? await syncEncounterLedger(data.id, data.name ?? timestampName) : { synced: false, error: null as string | null };
      await refreshAppState();

      setBanner(
        ledgerSync.error ? 'info' : 'success',
        ledgerSync.error ? 'Added to campaign, sync pending' : 'Added to campaign',
        `This plan was saved into the selected campaign.${ledgerSync.synced ? ' Campaign board synced.' : ''}${ledgerSync.error ? ` Campaign sync failed: ${ledgerSync.error}` : ''}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SystemHero
        systemId={effectiveSystemId}
        eyebrow={effectiveSystem.shortLabel}
        title={effectiveSystem.encounters.title}
        body={effectiveSystem.encounters.description}
        chips={[
          encounterConfig.difficultyLabels[difficulty],
          encounterConfig.enemyRoleLabels[enemyRole],
          dndCampaignContext
            ? dndCampaignContext.partySize > 0
              ? `${dndCampaignContext.partySize}-PC party`
              : encounterConfig.terrainLabels[terrainType]
            : encounterConfig.terrainLabels[terrainType],
          selectedCampaign ? `Campaign: ${selectedCampaign.name}` : 'Standalone battle plan',
        ]}
      >
        {loadedProjectName ? (
          <View style={styles.heroMetaRow}>
            <Label style={styles.heroMetaLabel}>Opened save</Label>
            <BodyText>{loadedProjectName}</BodyText>
          </View>
        ) : null}
      </SystemHero>

      {statusBanner ? (
        <StatusBanner
          title={statusBanner.title}
          message={statusBanner.message}
          variant={statusBanner.variant}
          onDismiss={() => setStatusBanner(null)}
        />
      ) : null}

      <ProCard
        isPro={isPro}
        savedProjectCount={savedProjectCount}
        maxFreeSaves={maxFreeSaves}
        onUpgradePress={handleUpgradePress}
      />

      {loadingProject ? (
        <SystemPanel systemId={effectiveSystemId} tone="muted">
          <View style={styles.sessionRow}>
            <ActivityIndicator />
            <BodyText>Loading saved prep...</BodyText>
          </View>
        </SystemPanel>
      ) : loadedProjectName ? (
        <SystemPanel systemId={effectiveSystemId} tone="muted">
          <Label>Opened save</Label>
          <BodyText>{loadedProjectName}</BodyText>
          <BodyText>Save now updates this encounter plan by default.</BodyText>
        </SystemPanel>
      ) : null}

      <DisclosurePanel
        systemId={effectiveSystemId}
        tone="accent"
        title="Campaign Link"
        summary={campaignPanelSummary}
      >
        {!isPro ? (
          <View style={styles.proLockedBlock}>
            <View style={styles.proLockedHeader}>
              <Label style={styles.proLockedTitle}>★ {campaignLinkUpsell.lockedTitle}</Label>
              <BodyText style={styles.proLockedText}>
                {campaignLinkUpsell.lockedMessage}
              </BodyText>
            </View>

            <BodyText style={styles.proLockedHint}>
              {campaignLinkUpsell.message}
            </BodyText>

            <Pressable onPress={handleUpgradePress} style={[styles.inlineUpgradeButton, { backgroundColor: palette.accent }]}>
              <Label style={styles.inlineUpgradeButtonText}>{campaignLinkUpsell.buttonLabel}</Label>
            </Pressable>

            <Label>{campaignLinkPreview.title}</Label>
            <BodyText style={styles.proLockedHint}>{campaignLinkPreview.body}</BodyText>
            <View style={styles.resultRow}>
              {campaignLinkPreview.bullets.map((entry) => (
                <BodyText key={entry}>• {entry}</BodyText>
              ))}
            </View>
          </View>
        ) : loadingCampaigns ? (
          <View style={styles.sessionRow}>
            <ActivityIndicator />
            <BodyText>Loading campaigns...</BodyText>
          </View>
        ) : campaignOptions.length > 0 ? (
          <View style={styles.pillRow}>
            <Pressable
              onPress={() => {
                setSelectedCampaignId('');
                setLockedCampaignSystemId(null);
              }}
              style={[styles.pill, selectedCampaignId === '' && { backgroundColor: palette.accent, borderColor: palette.accent }]}
            >
              <BodyText style={selectedCampaignId === '' ? styles.pillTextSelected : undefined}>
                {NO_CAMPAIGN_OPTION_LABEL}
              </BodyText>
            </Pressable>

            {campaignOptions.map((campaign) => {
              const selected = selectedCampaignId === campaign.id;

              return (
                <Pressable
                  key={campaign.id}
                  onPress={() => {
                    setSelectedCampaignId(campaign.id);
                    setLockedCampaignSystemId(campaign.systemId);
                    setActiveSystemId(campaign.systemId);
                  }}
                  style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                >
                  <BodyText style={selected ? styles.pillTextSelected : undefined}>
                    {campaign.name} • {campaign.systemShortLabel}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <BodyText>No campaigns yet. Create one in Campaign to tie this save in.</BodyText>
        )}

        {selectedCampaign ? (
          <BodyText>Game locked to {selectedCampaign.systemName} while this plan is tied to {selectedCampaign.name}.</BodyText>
        ) : null}

        {dndCampaignContext ? (
          <View style={styles.resultRow}>
            <BodyText>
              Imported from campaign: {dndCampaignContext.partySize} hero sheets, average level{' '}
              {dndCampaignContext.averageLevel ?? 'n/a'}.
            </BodyText>
            <BodyText>
              Role mix: {dndCampaignContext.roleMix.frontline} front line, {dndCampaignContext.roleMix.support} support,{' '}
              {dndCampaignContext.roleMix.control} arcane control, {dndCampaignContext.roleMix.striker} scouts/strikers.
            </BodyText>
          </View>
        ) : null}
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        tone="accent"
        title="Quick Setup"
        summary={quickSetupSummary}
        defaultOpen
      >
        <Label>{encounterConfig.labels.partyLevel}</Label>
        <AppInput
          value={partyLevel}
          onChangeText={setPartyLevel}
          keyboardType="numeric"
          placeholder={encounterConfig.defaults.partyLevel}
        />

        <Label>{encounterConfig.labels.partySize}</Label>
        <AppInput
          value={partySize}
          onChangeText={setPartySize}
          keyboardType="numeric"
          placeholder={encounterConfig.defaults.partySize}
        />

        <Label>{encounterConfig.labels.difficulty}</Label>
        <View style={styles.pillRow}>
          {DIFFICULTY_OPTIONS.map((option) => {
            const selected = difficulty === option;

            return (
              <Pressable
                key={option}
                onPress={() => setDifficulty(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {encounterConfig.difficultyLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{encounterConfig.labels.enemyRole}</Label>
        <View style={styles.pillRow}>
          {ENEMY_ROLE_OPTIONS.map((option) => {
            const selected = enemyRole === option;

            return (
              <Pressable
                key={option}
                onPress={() => setEnemyRole(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {encounterConfig.enemyRoleLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{encounterConfig.labels.terrain}</Label>
        <View style={styles.pillRow}>
          {TERRAIN_OPTIONS.map((option) => {
            const selected = terrainType === option;

            return (
              <Pressable
                key={option}
                onPress={() => setTerrainType(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {encounterConfig.terrainLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title="Advanced Encounter Tuning"
        summary={advancedSummary}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      >
        <Label>{encounterConfig.labels.partyRoleMix}</Label>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <Label>{encounterConfig.labels.frontline}</Label>
            <AppInput value={frontlineCount} onChangeText={setFrontlineCount} keyboardType="numeric" />
          </View>
          <View style={styles.gridItem}>
            <Label>{encounterConfig.labels.support}</Label>
            <AppInput value={supportCount} onChangeText={setSupportCount} keyboardType="numeric" />
          </View>
          <View style={styles.gridItem}>
            <Label>{encounterConfig.labels.control}</Label>
            <AppInput value={controlCount} onChangeText={setControlCount} keyboardType="numeric" />
          </View>
          <View style={styles.gridItem}>
            <Label>{encounterConfig.labels.striker}</Label>
            <AppInput value={strikerCount} onChangeText={setStrikerCount} keyboardType="numeric" />
          </View>
        </View>

        <Label>{encounterConfig.labels.enemyCount}</Label>
        <AppInput
          value={enemyCount}
          onChangeText={setEnemyCount}
          keyboardType="numeric"
          placeholder={encounterConfig.defaults.enemyCount}
        />

        <Label>{encounterConfig.labels.enemyLevel}</Label>
        <AppInput
          value={enemyLevel}
          onChangeText={setEnemyLevel}
          keyboardType="numeric"
          placeholder={encounterConfig.defaults.enemyLevel}
        />

        <Label>{encounterConfig.labels.waveCount}</Label>
        <AppInput
          value={waveCount}
          onChangeText={setWaveCount}
          keyboardType="numeric"
          placeholder={encounterConfig.defaults.waveCount}
        />

        <Label>{encounterConfig.labels.notes}</Label>
        <AppInput
          value={encounterNotes}
          onChangeText={setEncounterNotes}
          placeholder={encounterConfig.labels.notesPlaceholder}
          multiline
        />

        <Pressable onPress={() => setVariationSeed((seed) => seed + 1)} style={styles.secondaryButton}>
          <Label style={styles.secondaryButtonText}>{encounterConfig.labels.rerollButton}</Label>
        </Pressable>

        {dndCampaignContext ? (
          <>
            <Label>Threat Clock Title</Label>
            <AppInput
              value={threatTitle}
              onChangeText={setThreatTitle}
              placeholder="Cult reprisals against the river district"
            />

            <Label>Threat Status</Label>
            <View style={styles.pillRow}>
              {THREAT_STATUS_OPTIONS.map((option) => {
                const selected = threatStatus === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setThreatStatus(option)}
                    style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                  >
                    <BodyText style={selected ? styles.pillTextSelected : undefined}>
                      {formatThreatClockStatusLabel(option)}
                    </BodyText>
                  </Pressable>
                );
              })}
            </View>

            <Label>Threat Pressure</Label>
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Label>Segments Filled</Label>
                <AppInput
                  value={threatClockFilled}
                  onChangeText={setThreatClockFilled}
                  keyboardType="numeric"
                  placeholder={String(getRecommendedThreatClock(difficulty).filled)}
                />
              </View>
              <View style={styles.gridItem}>
                <Label>Clock Size</Label>
                <AppInput
                  value={threatClockTotal}
                  onChangeText={setThreatClockTotal}
                  keyboardType="numeric"
                  placeholder={String(getRecommendedThreatClock(difficulty).total)}
                />
              </View>
            </View>

            <Label>Escalated NPC</Label>
            <View style={styles.pillRow}>
              <Pressable
                onPress={() => setLinkedNpcId('')}
                style={[styles.pill, linkedNpcId === '' && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={linkedNpcId === '' ? styles.pillTextSelected : undefined}>none</BodyText>
              </Pressable>
              {dndCampaignContext.npcRoster.map((npc) => {
                const selected = linkedNpcId === npc.id;

                return (
                  <Pressable
                    key={npc.id}
                    onPress={() => {
                      setLinkedNpcId(npc.id);
                      if (linkedFaction.trim().length === 0 && npc.affiliation.trim().length > 0) {
                        setLinkedFaction(npc.affiliation);
                      }
                    }}
                    style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                  >
                    <BodyText style={selected ? styles.pillTextSelected : undefined}>{npc.name}</BodyText>
                  </Pressable>
                );
              })}
            </View>

            <Label>Faction Under Pressure</Label>
            {factionOptions.length > 0 ? (
              <View style={styles.pillRow}>
                {factionOptions.map((option) => {
                  const selected = linkedFaction === option;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setLinkedFaction(option)}
                      style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                    >
                      <BodyText style={selected ? styles.pillTextSelected : undefined}>{option}</BodyText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <AppInput
              value={linkedFaction}
              onChangeText={setLinkedFaction}
              placeholder="Temple of the Dawn, Red Knives, city watch..."
            />

            <Label>Escalation Tag</Label>
            <View style={styles.pillRow}>
              {ESCALATION_TAG_OPTIONS.map((option) => {
                const selected = escalationTag === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setEscalationTag(option)}
                    style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                  >
                    <BodyText style={selected ? styles.pillTextSelected : undefined}>{option}</BodyText>
                  </Pressable>
                );
              })}
            </View>

            <Label>Session Fallout</Label>
            <AppInput
              value={sessionFallout}
              onChangeText={setSessionFallout}
              placeholder="Failure here tips a district into panic, draws a rival cell, or burns a safe route."
              multiline
            />
          </>
        ) : null}
      </DisclosurePanel>

      <SystemPanel systemId={effectiveSystemId} tone="accent">
        <Label>Save</Label>
        <BodyText>{savePanelSummary}</BodyText>

        <Pressable
          onPress={() => handleSaveProject(false)}
          disabled={saving || loadingSession}
          style={[
            styles.saveButton,
            styles.primaryActionButton,
            { backgroundColor: palette.accent },
            (saving || loadingSession) && styles.saveButtonDisabled,
          ]}
        >
          <Label style={styles.saveButtonText}>{primarySaveLabel}</Label>
        </Pressable>

        <Pressable onPress={() => setMoreSaveActionsOpen((value) => !value)} style={styles.moreActionsButton}>
          <Label style={styles.moreActionsButtonText}>
            {moreSaveActionsOpen ? 'Hide more save options' : 'More save options'}
          </Label>
        </Pressable>

        {moreSaveActionsOpen ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleSaveAsNew}
              disabled={saving || loadingSession || !sessionUserId}
              style={[styles.secondaryButton, (saving || loadingSession || !sessionUserId) && styles.saveButtonDisabled]}
            >
              <Label style={styles.secondaryButtonText}>Save New Copy</Label>
            </Pressable>

            <Pressable
              onPress={handleSaveToCampaign}
              disabled={saving || loadingSession || !isPro || !selectedCampaignId}
              style={[
                styles.campaignButton,
                { borderColor: palette.accent },
                (saving || loadingSession || !isPro || !selectedCampaignId) && styles.saveButtonDisabled,
              ]}
            >
              <Label style={styles.campaignButtonText}>
                {!isPro
                  ? 'Add to Campaign'
                  : currentProjectId && selectedCampaignId
                    ? 'Move to Campaign'
                    : 'Add to Campaign'}
              </Label>
            </Pressable>
          </View>
        ) : null}

        {loadingSession ? (
          <View style={styles.sessionRow}>
            <ActivityIndicator />
            <BodyText>Checking account...</BodyText>
          </View>
        ) : (
          <BodyText>{saveHelperText}</BodyText>
        )}

        {sessionUserId && isCreatingNewProject && isAtFreeLimit ? (
          <UpgradeBanner
            title={freeLimitUpsell.title}
            message={freeLimitUpsell.message}
            buttonLabel={freeLimitUpsell.buttonLabel}
            onPress={handleUpgradePress}
          />
        ) : null}
      </SystemPanel>

      {dndCampaignContext ? (
        <DisclosurePanel
          systemId={effectiveSystemId}
          title="Campaign Party Readiness"
          summary={dndCampaignContext.partySummaryLines[0] ?? dndCampaignContext.treasurySummary}
        >
          <View style={styles.resultRow}>
            {dndCampaignContext.partySummaryLines.length > 0 ? (
              dndCampaignContext.partySummaryLines.map((entry, index) => (
                <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
              ))
            ) : (
              <BodyText>No party sheets are logged in this campaign yet.</BodyText>
            )}
            <BodyText>{dndCampaignContext.treasurySummary}</BodyText>
            {dndCampaignContext.attunementItems.length > 0 ? (
              <BodyText>Attunement pressure: {dndCampaignContext.attunementItems.join(', ')}.</BodyText>
            ) : null}
            {dndCampaignContext.consumableItems.length > 0 ? (
              <BodyText>Consumables on hand: {dndCampaignContext.consumableItems.join(', ')}.</BodyText>
            ) : null}
          </View>
        </DisclosurePanel>
      ) : null}

      {dndCampaignContext ? (
        <DisclosurePanel
          systemId={effectiveSystemId}
          title="Campaign Threat Board"
          summary={dndCampaignContext.threatSummaryLines[0] ?? 'No active threat clocks are logged yet.'}
        >
          <View style={styles.resultRow}>
            {dndCampaignContext.threatSummaryLines.length > 0 ? (
              dndCampaignContext.threatSummaryLines.map((entry, index) => (
                <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
              ))
            ) : (
              <BodyText>No active threat clocks are logged for this campaign yet.</BodyText>
            )}
          </View>
        </DisclosurePanel>
      ) : null}

      <SystemPanel systemId={effectiveSystemId} tone="accent">
        <Label>Encounter Snapshot</Label>
        <BodyText>{encounterConfig.labels.verdict}: {result.verdict}</BodyText>
        <BodyText>{result.actionEconomyWarning}</BodyText>

        <View style={styles.summaryStatRow}>
          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Party Budget</Label>
            <BodyText>{result.adjustedPartyBudget}</BodyText>
          </View>

          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Enemy Budget</Label>
            <BodyText>{result.adjustedEnemyBudget}</BodyText>
          </View>

          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Delta</Label>
            <BodyText>{result.delta}</BodyText>
          </View>
        </View>

        <BodyText>{result.bossSupportRecommendation}</BodyText>
        <BodyText>First tactical beat: {result.tacticalBeats[0] ?? 'No tactical beat yet.'}</BodyText>
      </SystemPanel>

      {dndCampaignContext ? (
        <DisclosurePanel
          systemId={effectiveSystemId}
          title="Monster Bench"
          summary={dndCampaignContext.monsterBench[enemyRole][0]?.name ?? 'No linked monster bench yet.'}
        >
          <View style={styles.resultRow}>
            {dndCampaignContext.monsterBench[enemyRole].map((monster) => (
              <BodyText key={monster.name}>
                • {monster.name} ({monster.challenge}) - AC {monster.armorClass}, HP {monster.hitPoints}, {monster.signature}
              </BodyText>
            ))}
          </View>
        </DisclosurePanel>
      ) : null}

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={encounterConfig.labels.warnings}
        summary={result.actionEconomyWarning}
      >
        <View style={styles.resultRow}>
          <BodyText>{result.actionEconomyWarning}</BodyText>
          <BodyText>{result.bossSupportRecommendation}</BodyText>
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={encounterConfig.labels.builderNotes}
        summary={result.recommendations[0] ?? 'No builder notes yet.'}
      >
        <View style={styles.resultRow}>
          {result.recommendations.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={encounterConfig.labels.lineupIdeas}
        summary={result.lineupIdeas[0] ?? 'No lineup idea yet.'}
      >
        <View style={styles.resultRow}>
          {result.lineupIdeas.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={encounterConfig.labels.tacticalBeats}
        summary={result.tacticalBeats[0] ?? 'No tactical beat yet.'}
      >
        <View style={styles.resultRow}>
          {result.tacticalBeats.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </DisclosurePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  heroMetaRow: {
    gap: 4,
    paddingTop: Spacing.xs,
  },
  heroMetaLabel: {
    color: Colors.text,
  },
  pill: {
    backgroundColor: Colors.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pillSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillTextSelected: {
    color: '#fff',
  },
  saveRow: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  gridRow: {
    gap: Spacing.sm,
  },
  gridItem: {
    gap: 4,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    alignSelf: 'stretch',
  },
  campaignButton: {
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  campaignButtonText: {
    color: Colors.text,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.text,
  },
  moreActionsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  moreActionsButtonText: {
    color: Colors.text,
    opacity: 0.8,
  },
  proLockedBlock: {
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  proLockedHeader: {
    gap: 4,
  },
  proLockedTitle: {
    color: Colors.text,
  },
  proLockedText: {
    color: Colors.text,
    opacity: 0.85,
  },
  lockedPillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    opacity: 0.55,
  },
  lockedPill: {
    backgroundColor: Colors.elevated,
  },
  lockedPillText: {
    color: Colors.text,
  },
  proLockedHint: {
    color: Colors.text,
    opacity: 0.8,
  },
  inlineUpgradeButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  inlineUpgradeButtonText: {
    color: '#fff',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultRow: {
    gap: 6,
  },
  summaryStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryStatCard: {
    minWidth: 104,
    flexGrow: 1,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  summaryStatLabel: {
    color: Colors.mutedText,
  },
});
