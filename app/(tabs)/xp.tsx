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
import { buildSeed, pickManyFromPool } from '@/lib/generation';
import { getGameSystem, resolveGameSystemId, type GameSystemId } from '@/lib/gameSystems';
import {
  getCampaignLinkPreview,
  NO_CAMPAIGN_OPTION_LABEL,
} from '@/lib/campaignLinkPreview';
import {
  applyCampaignSystemToPayload,
  fetchCampaignOptionById,
  fetchCampaignOptions,
  fetchLatestSaveAccess,
  getErrorMessage,
  type CampaignOption,
} from '@/lib/projectAccess';
import { getXpSystemConfig, type CurveType, type ProgressionMode, type ProgressionPreset } from '@/lib/systemTooling';
import { getSystemPresentation } from '@/lib/systemPresentation';
import { getCampaignLinkUpsell, getFreeLimitUpsell } from '@/lib/subscriptionUi';

type XpProjectData = {
  levels?: number;
  baseXp?: number;
  growthFactor?: number;
  curveType?: CurveType;
  progressionPreset?: ProgressionPreset;
  progressionMode?: ProgressionMode;
  encountersPerSession?: number;
  encountersPerLevel?: number;
  progressionNotes?: string;
  systemId?: GameSystemId;
  systemName?: string;
};

export default function XpCalculatorScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { activeSystemId, setActiveSystemId } = useGameSystem();
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [lockedCampaignSystemId, setLockedCampaignSystemId] = useState<GameSystemId | null>(null);
  const selectedCampaign = useMemo(
    () => campaignOptions.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaignOptions, selectedCampaignId]
  );
  const effectiveSystemId = lockedCampaignSystemId ?? activeSystemId;
  const effectiveSystem = useMemo(() => getGameSystem(effectiveSystemId), [effectiveSystemId]);
  const xpConfig = useMemo(() => getXpSystemConfig(effectiveSystemId), [effectiveSystemId]);
  const palette = useMemo(() => getSystemPresentation(effectiveSystemId).palette, [effectiveSystemId]);
  const campaignLinkPreview = useMemo(() => getCampaignLinkPreview('xp', effectiveSystemId), [effectiveSystemId]);
  const dndCampaignContext = useMemo(
    () => (effectiveSystemId === 'dnd5e' ? buildDndCampaignLinkContext(selectedCampaign?.data) : null),
    [effectiveSystemId, selectedCampaign?.data]
  );

  const [loadingProject, setLoadingProject] = useState(false);
  const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [levels, setLevels] = useState(xpConfig.defaults.levels);
  const [baseXp, setBaseXp] = useState(xpConfig.defaults.baseXp);
  const [growthFactor, setGrowthFactor] = useState(xpConfig.defaults.growthFactor);
  const [curveType, setCurveType] = useState<CurveType>(xpConfig.defaults.curveType);

  const [progressionPreset, setProgressionPreset] = useState<ProgressionPreset>(xpConfig.defaults.progressionPreset);
  const [progressionMode, setProgressionMode] = useState<ProgressionMode>(xpConfig.defaults.progressionMode);
  const [encountersPerSession, setEncountersPerSession] = useState(xpConfig.defaults.encountersPerSession);
  const [encountersPerLevel, setEncountersPerLevel] = useState(xpConfig.defaults.encountersPerLevel);
  const [progressionNotes, setProgressionNotes] = useState('');
  const [variationSeed, setVariationSeed] = useState(0);
  const [appliedCampaignDefaultsId, setAppliedCampaignDefaultsId] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [moreSaveActionsOpen, setMoreSaveActionsOpen] = useState(false);

  const [saving, setSaving] = useState(false);

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
  const campaignLinkUpsell = getCampaignLinkUpsell('This progression plan');

  function setBanner(
    variant: StatusBannerVariant,
    title: string,
    message: string
  ) {
    setStatusBanner({ variant, title, message });
  }

  function applyPreset(preset: ProgressionPreset) {
    setProgressionPreset(preset);

    if (preset === 'custom') {
      return;
    }

    const presetValues = xpConfig.presets[preset];

    setBaseXp(presetValues.baseXp);
    setGrowthFactor(presetValues.growthFactor);
    setCurveType(presetValues.curveType);
    setEncountersPerLevel(presetValues.encountersPerLevel);
    setEncountersPerSession(presetValues.encountersPerSession);

    if (presetValues.progressionMode) {
      setProgressionMode(presetValues.progressionMode);
    }
  }

  async function getLatestSaveAccess(userId: string) {
    if (!supabase) {
      return { isPro: false, count: 0 };
    }

    return fetchLatestSaveAccess(supabase, userId);
  }

  function handleUpgradePress() {
    router.push('/pricing');
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

    setLevels(xpConfig.defaults.levels);
    setBaseXp(xpConfig.defaults.baseXp);
    setGrowthFactor(xpConfig.defaults.growthFactor);
    setCurveType(xpConfig.defaults.curveType);
    setProgressionPreset(xpConfig.defaults.progressionPreset);
    setProgressionMode(xpConfig.defaults.progressionMode);
    setEncountersPerSession(xpConfig.defaults.encountersPerSession);
    setEncountersPerLevel(xpConfig.defaults.encountersPerLevel);
    setProgressionNotes('');
    setVariationSeed(0);
    setAppliedCampaignDefaultsId('');
    setAdvancedOpen(false);
    setMoreSaveActionsOpen(false);
  }, [xpConfig, params.projectId, currentProjectId]);

  useEffect(() => {
    if (progressionPreset === 'custom') {
      setAdvancedOpen(true);
    }
  }, [progressionPreset]);

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

    if (dndCampaignContext.suggestedPlanLevels) {
      setLevels(String(dndCampaignContext.suggestedPlanLevels));
    }

    if (progressionNotes.trim().length === 0) {
      const seededNotes = [
        dndCampaignContext.tierLabel ? `Current tier: ${dndCampaignContext.tierLabel}.` : null,
        dndCampaignContext.averageLevel ? `Average party level: ${dndCampaignContext.averageLevel}.` : null,
        dndCampaignContext.currentObjective ? `Current objective: ${dndCampaignContext.currentObjective}.` : null,
        dndCampaignContext.partyName ? `Party: ${dndCampaignContext.partyName}.` : null,
      ]
        .filter(Boolean)
        .join(' ');

      if (seededNotes) {
        setProgressionNotes(seededNotes);
      }
    }

    setAppliedCampaignDefaultsId(selectedCampaignId);
  }, [
    appliedCampaignDefaultsId,
    currentProjectId,
    dndCampaignContext,
    effectiveSystemId,
    params.projectId,
    progressionNotes,
    selectedCampaignId,
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

        const projectData = (data?.data ?? {}) as XpProjectData;
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

        if (typeof projectData.levels === 'number') {
          setLevels(String(projectData.levels));
        }

        if (typeof projectData.baseXp === 'number') {
          setBaseXp(String(projectData.baseXp));
        }

        if (typeof projectData.growthFactor === 'number') {
          setGrowthFactor(String(projectData.growthFactor));
        }

        if (
          projectData.curveType === 'linear' ||
          projectData.curveType === 'smooth' ||
          projectData.curveType === 'steep'
        ) {
          setCurveType(projectData.curveType);
        }

        if (
          projectData.progressionPreset === 'slow' ||
          projectData.progressionPreset === 'standard' ||
          projectData.progressionPreset === 'heroic' ||
          projectData.progressionPreset === 'brutal' ||
          projectData.progressionPreset === 'custom'
        ) {
          setProgressionPreset(projectData.progressionPreset);
        }

        if (projectData.progressionMode === 'xp' || projectData.progressionMode === 'milestone') {
          setProgressionMode(projectData.progressionMode);
        }

        if (typeof projectData.encountersPerSession === 'number') {
          setEncountersPerSession(String(projectData.encountersPerSession));
        }

        if (typeof projectData.encountersPerLevel === 'number') {
          setEncountersPerLevel(String(projectData.encountersPerLevel));
        }

        if (typeof projectData.progressionNotes === 'string') {
          setProgressionNotes(projectData.progressionNotes);
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
    const parsedLevels = Math.max(1, Number.parseInt(levels || '1', 10));
    const parsedBaseXp = Math.max(1, Number.parseInt(baseXp || '1', 10));
    const parsedGrowthFactor = Math.max(1, Number.parseFloat(growthFactor || '1'));
    const parsedEncountersPerSession = Math.max(1, Number.parseInt(encountersPerSession || '1', 10));
    const parsedEncountersPerLevel = Math.max(1, Number.parseInt(encountersPerLevel || '1', 10));

    const multiplier =
      curveType === 'linear'
        ? 1
        : curveType === 'smooth'
          ? parsedGrowthFactor
          : parsedGrowthFactor + 0.15;

    const rows = [];
    let total = 0;

    for (let level = 1; level <= parsedLevels; level += 1) {
      const xpToNext =
        progressionMode === 'milestone'
          ? 0
          : curveType === 'linear'
            ? xpConfig.linearStrategy === 'flat'
              ? parsedBaseXp
              : parsedBaseXp * level
            : Math.round(parsedBaseXp * Math.pow(multiplier, level - 1));

      total += xpToNext;

      rows.push({
        level,
        xpToNext,
        totalXp: total,
      });
    }

    const totalEncounterCount = parsedLevels * parsedEncountersPerLevel;
    const estimatedSessionsToCap = Math.ceil(totalEncounterCount / parsedEncountersPerSession);

    let pacingAssessment = xpConfig.pacingAssessment.default;
    if (parsedEncountersPerLevel <= 3) pacingAssessment = xpConfig.pacingAssessment.fast;
    if (parsedEncountersPerLevel >= 6) pacingAssessment = xpConfig.pacingAssessment.slow;
    if (progressionMode === 'milestone') pacingAssessment = xpConfig.pacingAssessment.milestone;

    const seed = buildSeed(
      [
        parsedLevels,
        parsedBaseXp,
        parsedGrowthFactor,
        curveType,
        progressionPreset,
        progressionMode,
        parsedEncountersPerSession,
        parsedEncountersPerLevel,
        progressionNotes.trim(),
        variationSeed,
      ].join('|')
    );

    const practicalAdvice: string[] = [];

    if (progressionMode === 'milestone') {
      practicalAdvice.push(xpConfig.advice.milestoneMode);
    } else {
      practicalAdvice.push(xpConfig.advice.xpMode);
    }

    if (parsedEncountersPerSession === 1) {
      practicalAdvice.push(xpConfig.advice.singleSession);
    }

    if (parsedEncountersPerLevel >= 6) {
      practicalAdvice.push(xpConfig.advice.highEncounterCount);
    }

    if (curveType === 'steep') {
      practicalAdvice.push(xpConfig.advice.steepCurve);
    }

    if (curveType === 'linear') {
      practicalAdvice.push(xpConfig.advice.linearCurve);
    }

    if (practicalAdvice.length === 0) {
      practicalAdvice.push(xpConfig.advice.default);
    }

    const pacingVariants = pickManyFromPool(
      xpConfig.pacingVariantPool,
      2,
      seed + 19
    );

    const milestoneSuggestions = xpConfig.milestoneBase(parsedLevels);
    const milestoneVariantSuggestions = pickManyFromPool(xpConfig.milestoneVariants(parsedLevels), 2, seed + 41);

    const orderedMilestoneSuggestions = [...milestoneSuggestions, ...milestoneVariantSuggestions].sort((a, b) => {
      const levelA = Number.parseInt(a.match(/Level\s+(\d+)/i)?.[1] ?? '0', 10);
      const levelB = Number.parseInt(b.match(/Level\s+(\d+)/i)?.[1] ?? '0', 10);
      return levelA - levelB;
    });

    return {
      rows,
      totalEncounterCount,
      estimatedSessionsToCap,
      pacingAssessment,
      milestoneSuggestions: orderedMilestoneSuggestions,
      practicalAdvice,
      pacingVariants,
    };
  }, [
    levels,
    baseXp,
    growthFactor,
    curveType,
    progressionMode,
    encountersPerSession,
    encountersPerLevel,
    progressionPreset,
    progressionNotes,
    variationSeed,
    xpConfig,
  ]);

  const campaignPanelSummary = selectedCampaign
    ? `Locked to ${selectedCampaign.systemShortLabel} inside ${selectedCampaign.name}.`
    : isPro
      ? 'Standalone plan. Expand to link this pacing plan into a campaign binder.'
      : 'Campaign linking is available on Pro.';

  const quickSetupSummary = [
    xpConfig.presetLabels[progressionPreset],
    xpConfig.modeLabels[progressionMode],
    `${levels || xpConfig.defaults.levels} levels`,
    `${encountersPerLevel || xpConfig.defaults.encountersPerLevel} encounters per level`,
  ].join(' • ');

  const advancedSummary =
    progressionPreset === 'custom'
      ? 'Custom pacing values are active.'
      : 'Open for raw XP math, curve tuning, and detailed planner notes.';

  const savePanelSummary = currentProjectId
    ? selectedCampaign
      ? `Saving updates this plan inside ${selectedCampaign.name}.`
      : 'Saving updates the current standalone plan.'
    : selectedCampaign
      ? `The next save goes straight into ${selectedCampaign.name}.`
      : 'The next save creates a standalone progression plan.';

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
          ? 'Saving will add this plan to the selected campaign by default.'
          : 'Signed in. Save when the pacing feels right.'
      : 'Not signed in. You can calculate, but not save yet.';

  function buildPayload() {
    return {
      levels: Number.parseInt(levels || '1', 10),
      baseXp: Number.parseInt(baseXp || '1', 10),
      growthFactor: Number.parseFloat(growthFactor || '1'),
      curveType,
      progressionPreset,
      progressionMode,
      encountersPerSession: Number.parseInt(encountersPerSession || '1', 10),
      encountersPerLevel: Number.parseInt(encountersPerLevel || '1', 10),
      progressionNotes,
      systemId: effectiveSystemId,
      systemName: effectiveSystem.label,
      variationSeed,
      result,
    };
  }

  

  async function handleSaveProject(asNew = false) {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before saving this plan.');
      return;
    }

    try {
      setSaving(true);

      const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
      const timestampName = `XP Planner - ${new Date().toLocaleString()}`;
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

        await refreshAppState();
      setBanner('success', 'Updated', `Your advancement plan was updated successfully${campaignMessage}.`);
        return;
      }

      if (asNew || !currentProjectId) {
        await refreshAppState();
        const latestAccess = await getLatestSaveAccess(sessionUserId);

        if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
      setBanner('info', 'Free limit reached', 'Free accounts can keep up to 3 saved plans. Upgrade to Pro for unlimited saves.');
          return;
        }
      }
          

      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: sessionUserId,
          name: timestampName,
          tool_type: 'xp_calculator',
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
      await refreshAppState();

      setBanner('success', 'Saved', `Your advancement plan was saved successfully${campaignMessage}.`);
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
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before saving to a campaign.');
      return;
    }

    if (!isPro) {
      setBanner('info', 'Pro required', 'Campaign binders are available on Pro.');
      return;
    }

    if (!selectedCampaignId) {
      setBanner('info', 'Select a campaign', 'Choose a campaign before adding this save.');
      return;
    }

    try {
      setSaving(true);

      const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
      const timestampName = loadedProjectName ?? `XP Planner - ${new Date().toLocaleString()}`;

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

        await refreshAppState();
        setBanner('success', 'Campaign updated', 'This save is now tied to the selected campaign.');
        return;
      }

      const latestAccess = await getLatestSaveAccess(sessionUserId);

      if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
        setBanner(
          'info',
          'Free limit reached',
          'Free accounts can keep up to 3 saved plans. Upgrade to Pro for unlimited saves.'
        );
        return;
      }

      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: sessionUserId,
          name: timestampName,
          tool_type: 'xp_calculator',
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
      await refreshAppState();

      setBanner('success', 'Added to campaign', 'This plan was saved into the selected campaign.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SystemHero
        systemId={effectiveSystemId}
        eyebrow={effectiveSystem.shortLabel}
        title={effectiveSystem.xp.title}
        body={effectiveSystem.xp.description}
        chips={[
          xpConfig.modeLabels[progressionMode],
          dndCampaignContext ? dndCampaignContext.tierLabel : xpConfig.presetLabels[progressionPreset],
          `${levels || xpConfig.defaults.levels} levels`,
          selectedCampaign ? `Campaign: ${selectedCampaign.name}` : 'Standalone planner',
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
          <BodyText>Save now updates this planner by default.</BodyText>
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
              {dndCampaignContext.averageLevel ?? 'n/a'}, {dndCampaignContext.tierLabel}.
            </BodyText>
            {dndCampaignContext.currentObjective ? (
              <BodyText>Current campaign objective: {dndCampaignContext.currentObjective}</BodyText>
            ) : null}
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
        <Label>{xpConfig.labels.preset}</Label>
        <View style={styles.pillRow}>
          {(['slow', 'standard', 'heroic', 'brutal', 'custom'] as ProgressionPreset[]).map((option) => {
            const selected = progressionPreset === option;

            return (
              <Pressable
                key={option}
                onPress={() => {
                  if (option === 'custom') {
                    setProgressionPreset('custom');
                    return;
                  }

                  applyPreset(option);
                }}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {xpConfig.presetLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{xpConfig.labels.mode}</Label>
        <View style={styles.pillRow}>
          {(['xp', 'milestone'] as ProgressionMode[]).map((option) => {
            const selected = progressionMode === option;

            return (
              <Pressable
                key={option}
                onPress={() => setProgressionMode(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {xpConfig.modeLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{xpConfig.labels.levels}</Label>
        <AppInput
          value={levels}
          onChangeText={setLevels}
          keyboardType="numeric"
          placeholder={xpConfig.defaults.levels}
        />

        <Label>{xpConfig.labels.encountersPerLevel}</Label>
        <AppInput
          value={encountersPerLevel}
          onChangeText={setEncountersPerLevel}
          keyboardType="numeric"
          placeholder={xpConfig.defaults.encountersPerLevel}
        />
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title="Advanced Tuning"
        summary={advancedSummary}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      >
        <Label>{xpConfig.labels.baseXp}</Label>
        <AppInput
          value={baseXp}
          onChangeText={(value) => {
            setProgressionPreset('custom');
            setBaseXp(value);
          }}
          keyboardType="numeric"
          placeholder={xpConfig.defaults.baseXp}
        />

        <Label>{xpConfig.labels.growthFactor}</Label>
        <AppInput
          value={growthFactor}
          onChangeText={(value) => {
            setProgressionPreset('custom');
            setGrowthFactor(value);
          }}
          keyboardType="decimal-pad"
          placeholder={xpConfig.defaults.growthFactor}
        />

        <Label>{xpConfig.labels.curve}</Label>
        <View style={styles.pillRow}>
          {(['linear', 'smooth', 'steep'] as CurveType[]).map((option) => {
            const selected = curveType === option;

            return (
              <Pressable
                key={option}
                onPress={() => {
                  setProgressionPreset('custom');
                  setCurveType(option);
                }}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {xpConfig.curveLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{xpConfig.labels.encountersPerSession}</Label>
        <AppInput
          value={encountersPerSession}
          onChangeText={setEncountersPerSession}
          keyboardType="numeric"
          placeholder={xpConfig.defaults.encountersPerSession}
        />

        <Label>{xpConfig.labels.notes}</Label>
        <AppInput
          value={progressionNotes}
          onChangeText={setProgressionNotes}
          placeholder={xpConfig.labels.notesPlaceholder}
          multiline
        />

        <Pressable onPress={() => setVariationSeed((seed) => seed + 1)} style={styles.secondaryButton}>
          <Label style={styles.secondaryButtonText}>{xpConfig.labels.rerollButton}</Label>
        </Pressable>
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
          title="Campaign Party Context"
          summary={dndCampaignContext.partySummaryLines[0] ?? dndCampaignContext.treasurySummary}
        >
          <View style={styles.resultRow}>
            {dndCampaignContext.partySummaryLines.length > 0 ? (
              dndCampaignContext.partySummaryLines.map((entry, index) => (
                <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
              ))
            ) : (
              <BodyText>No hero sheets are logged in this campaign yet.</BodyText>
            )}
            <BodyText>{dndCampaignContext.treasurySummary}</BodyText>
          </View>
        </DisclosurePanel>
      ) : null}

      <SystemPanel systemId={effectiveSystemId} tone="accent">
        <Label>Progression Snapshot</Label>
        <BodyText>{result.pacingAssessment}</BodyText>

        <View style={styles.summaryStatRow}>
          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Total encounters</Label>
            <BodyText>{result.totalEncounterCount}</BodyText>
          </View>

          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Sessions to cap</Label>
            <BodyText>{result.estimatedSessionsToCap}</BodyText>
          </View>

          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Mode</Label>
            <BodyText>{xpConfig.modeLabels[progressionMode]}</BodyText>
          </View>
        </View>

        <BodyText>Next highlighted beat: {result.milestoneSuggestions[0] ?? 'No highlighted beat yet.'}</BodyText>
      </SystemPanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={xpConfig.labels.levelingPreview}
        summary={
          progressionMode === 'milestone'
            ? 'Milestone mode is active.'
            : `Showing the first ${Math.min(10, result.rows.length)} levels in the preview.`
        }
      >
        {progressionMode === 'milestone' ? (
          <BodyText>{xpConfig.labels.milestoneModeCopy}</BodyText>
        ) : (
          <>
            {result.rows.slice(0, 10).map((row) => (
              <View key={row.level} style={styles.resultRow}>
                <BodyText>Level {row.level}</BodyText>
                <BodyText>Next: {row.xpToNext.toLocaleString()} XP</BodyText>
                <BodyText>Total: {row.totalXp.toLocaleString()} XP</BodyText>
              </View>
            ))}
            {result.rows.length > 10 ? (
              <BodyText>Showing first 10 of {result.rows.length} levels.</BodyText>
            ) : null}
          </>
        )}
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={xpConfig.labels.milestoneSuggestions}
        summary={result.milestoneSuggestions.slice(0, 2).join(' • ')}
      >
        <View style={styles.resultRow}>
          {result.milestoneSuggestions.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={xpConfig.labels.practicalAdvice}
        summary={result.practicalAdvice[0]}
      >
        <View style={styles.resultRow}>
          {result.practicalAdvice.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={xpConfig.labels.optionalPacingVariants}
        summary={result.pacingVariants[0]}
      >
        <View style={styles.resultRow}>
          {result.pacingVariants.map((entry, index) => (
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
  moreActionsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  moreActionsButtonText: {
    color: Colors.text,
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
  summaryStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryStatCard: {
    minWidth: 132,
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
  },
  resultRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
});
