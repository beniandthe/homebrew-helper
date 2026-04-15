import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppState } from '@/contexts/AppStateContext';
import { ProCard } from '@/components/ProCard';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { AppInput } from '@/components/AppInput';
import { BodyText, Label } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SystemHero } from '@/components/SystemHero';
import { SystemPanel } from '@/components/SystemPanel';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { buildDndCampaignLinkContext } from '@/lib/dndCampaignLinkContext';
import { buildSeed, pickFromPool, pickManyFromPool } from '@/lib/generation';
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
import {
  getQuestSystemConfig,
  type FactionImpact,
  type QuestScope,
  type QuestStructure,
  type QuestTone,
  type ResolutionStyle,
} from '@/lib/questSystemConfig';
import { getCampaignLinkUpsell, getFreeLimitUpsell } from '@/lib/subscriptionUi';

const QUEST_TONE_OPTIONS: QuestTone[] = ['heroic', 'grim', 'mystic', 'political'];
const QUEST_SCOPE_OPTIONS: QuestScope[] = ['personal', 'local', 'regional', 'faction'];
const QUEST_STRUCTURE_OPTIONS: QuestStructure[] = ['one-shot', 'three-part'];
const RESOLUTION_STYLE_OPTIONS: ResolutionStyle[] = ['combat', 'diplomacy', 'stealth', 'choice-driven'];
const FACTION_IMPACT_OPTIONS: FactionImpact[] = ['minor', 'moderate', 'major'];

function isQuestTone(value: unknown): value is QuestTone {
  return typeof value === 'string' && QUEST_TONE_OPTIONS.includes(value as QuestTone);
}

function isQuestScope(value: unknown): value is QuestScope {
  return typeof value === 'string' && QUEST_SCOPE_OPTIONS.includes(value as QuestScope);
}

function isQuestStructure(value: unknown): value is QuestStructure {
  return typeof value === 'string' && QUEST_STRUCTURE_OPTIONS.includes(value as QuestStructure);
}

function isResolutionStyle(value: unknown): value is ResolutionStyle {
  return typeof value === 'string' && RESOLUTION_STYLE_OPTIONS.includes(value as ResolutionStyle);
}

function isFactionImpact(value: unknown): value is FactionImpact {
  return typeof value === 'string' && FACTION_IMPACT_OPTIONS.includes(value as FactionImpact);
}

type QuestProjectData = {
    factionName?: string;
    objectiveSeed?: string;
    tone?: QuestTone;
    scope?: QuestScope;
    structure?: QuestStructure;
    resolutionStyle?: ResolutionStyle;
    factionImpact?: FactionImpact;
    questNotes?: string;
    systemId?: GameSystemId;
    systemName?: string;
};

export default function QuestScreen() {
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
  const questConfig = useMemo(() => getQuestSystemConfig(effectiveSystemId), [effectiveSystemId]);
  const palette = useMemo(() => getSystemPresentation(effectiveSystemId).palette, [effectiveSystemId]);
  const dndCampaignContext = useMemo(
    () => (effectiveSystemId === 'dnd5e' ? buildDndCampaignLinkContext(selectedCampaign?.data) : null),
    [effectiveSystemId, selectedCampaign?.data]
  );

  const [factionName, setFactionName] = useState(questConfig.defaults.factionName);
  const [objectiveSeed, setObjectiveSeed] = useState(questConfig.defaults.objectiveSeed);
  const [tone, setTone] = useState<QuestTone>(questConfig.defaults.tone);
  const [scope, setScope] = useState<QuestScope>(questConfig.defaults.scope);
  const [structure, setStructure] = useState<QuestStructure>(questConfig.defaults.structure);
  const [resolutionStyle, setResolutionStyle] = useState<ResolutionStyle>(questConfig.defaults.resolutionStyle);
  const [factionImpact, setFactionImpact] = useState<FactionImpact>(questConfig.defaults.factionImpact);
  const [questNotes, setQuestNotes] = useState('');
  const [variationSeed, setVariationSeed] = useState(0);
  const [appliedCampaignDefaultsId, setAppliedCampaignDefaultsId] = useState('');

  const [loadingProject, setLoadingProject] = useState(false);
  const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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
  const campaignLinkUpsell = getCampaignLinkUpsell('This quest');

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

        setFactionName(questConfig.defaults.factionName);
        setObjectiveSeed(questConfig.defaults.objectiveSeed);
        setTone(questConfig.defaults.tone);
        setScope(questConfig.defaults.scope);
        setStructure(questConfig.defaults.structure);
        setResolutionStyle(questConfig.defaults.resolutionStyle);
        setFactionImpact(questConfig.defaults.factionImpact);
        setQuestNotes('');
        setVariationSeed(0);
        setAppliedCampaignDefaultsId('');
    }, [questConfig, params.projectId, currentProjectId]);

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

        if (dndCampaignContext.mainFaction) {
            setFactionName(dndCampaignContext.mainFaction);
        }

        if (dndCampaignContext.defaultQuestSeed) {
            setObjectiveSeed(dndCampaignContext.defaultQuestSeed);
        }

        if (questNotes.trim().length === 0) {
            const seededNotes = [
                dndCampaignContext.currentObjective
                    ? `Current campaign objective: ${dndCampaignContext.currentObjective}.`
                    : null,
                dndCampaignContext.npcSummaryLines[0] ? `Primary NPC lead: ${dndCampaignContext.npcSummaryLines[0]}.` : null,
            ]
                .filter(Boolean)
                .join(' ');

            if (seededNotes) {
                setQuestNotes(seededNotes);
            }
        }

        setAppliedCampaignDefaultsId(selectedCampaignId);
    }, [
        appliedCampaignDefaultsId,
        currentProjectId,
        dndCampaignContext,
        effectiveSystemId,
        params.projectId,
        questNotes,
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

                const projectData = (data?.data ?? {}) as QuestProjectData;
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

                if (typeof projectData.factionName === 'string') {
                    setFactionName(projectData.factionName);
                }

                if (typeof projectData.objectiveSeed === 'string') {
                    setObjectiveSeed(projectData.objectiveSeed);
                }

                if (isQuestTone(projectData.tone)) {
                    setTone(projectData.tone);
                }

                if (isQuestScope(projectData.scope)) {
                    setScope(projectData.scope);
                }

                if (isQuestStructure(projectData.structure)) {
                    setStructure(projectData.structure);
                }

                if (isResolutionStyle(projectData.resolutionStyle)) {
                    setResolutionStyle(projectData.resolutionStyle);
                }

                if (isFactionImpact(projectData.factionImpact)) {
                    setFactionImpact(projectData.factionImpact);
                }

                if (typeof projectData.questNotes === 'string') {
                    setQuestNotes(projectData.questNotes);
                }

                setLoadedProjectName(data?.name ?? 'Loaded project');
                setCurrentProjectId(data?.id ?? null);
            } finally {
                setLoadingProject(false);
            }
        }

        loadProject();
    }, [params.projectId, sessionUserId, isPro, setActiveSystemId]);

    const result = useMemo(() => {
        const seedValue = buildSeed(
            `${factionName}|${objectiveSeed}|${tone}|${scope}|${structure}|${resolutionStyle}|${factionImpact}|${questNotes}|${variationSeed}`
        );

        return {
            hook: `${questConfig.toneHooks[tone]} ${questConfig.scopeHooks[scope]}`,
            objective: questConfig.objectiveTemplate(factionName, objectiveSeed),
            siteFrame: pickFromPool(questConfig.siteFrames[scope], seedValue, 37),
            complication: pickFromPool(questConfig.complications[resolutionStyle], seedValue, 11),
            twist: pickFromPool(questConfig.twists[tone], seedValue, 5),
            reward: pickFromPool(questConfig.rewardsByImpact[factionImpact], seedValue, 17),
            consequence: pickFromPool(questConfig.consequencesByImpact[factionImpact], seedValue, 23),
            alternateResolution: questConfig.altResolution[resolutionStyle],
            factionPressure: questConfig.factionPressure[factionImpact],
            questArc: questConfig.questArc[structure],
            sceneIdeas: pickManyFromPool(questConfig.sceneIdeas, 2, seedValue + 31),
        };
    }, [
        factionName,
        objectiveSeed,
        tone,
        scope,
        structure,
        resolutionStyle,
        factionImpact,
        questNotes,
        variationSeed,
        questConfig,
    ]);

    function buildPayload() {
        return {
            factionName,
            objectiveSeed,
            tone,
            scope,
            structure,
            resolutionStyle,
            factionImpact,
            questNotes,
            systemId: effectiveSystemId,
            systemName: effectiveSystem.label,
            variationSeed,
            result,
        };
    }

    async function handleSaveProject(asNew = false) {
        if (!supabase) {
            setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
            return;
        }

        if (!sessionUserId) {
            setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before saving a project.');
            return;
        }

        try {
            setSaving(true);

            const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
            const timestampName = `Quest - ${new Date().toLocaleString()}`;
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
                setBanner('success', 'Updated', `Your quest project was updated successfully${campaignMessage}.`);
                return;
            }

            if (asNew || !currentProjectId) {
                await refreshAppState();
                const latestAccess = await getLatestSaveAccess(sessionUserId);

                if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
                    setBanner('info', 'Free limit reached', 'Free accounts can save up to 3 projects total. Upgrade to Pro for unlimited saves.');
                    return;
                }
            }
                       
            const { data, error } = await supabase
                .from('saved_projects')
                .insert({
                    user_id: sessionUserId,
                    name: timestampName,
                    tool_type: 'quest_generator',
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

            setBanner('success', 'Saved', `Your quest project was saved successfully${campaignMessage}.`);
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
            setBanner('error', 'Pro required', 'Campaign workspaces are available on Pro.');
            return;
        }

        if (!selectedCampaignId) {
            setBanner('error', 'Select a campaign', 'Choose a campaign before adding this project.');
            return;
        }

        try {
            setSaving(true);

            const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
            const timestampName = loadedProjectName ?? `Quest - ${new Date().toLocaleString()}`;

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
                setBanner('success', 'Campaign updated', 'This project is now linked to the selected campaign.');
                return;
            }

            const { data, error } = await supabase
                .from('saved_projects')
                .insert({
                    user_id: sessionUserId,
                    name: timestampName,
                    tool_type: 'quest_generator',
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

            setBanner('success', 'Added to campaign', 'This project was saved into the selected campaign.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Screen>
            <SystemHero
                systemId={effectiveSystemId}
                eyebrow={effectiveSystem.shortLabel}
                title={effectiveSystem.quest.title}
                body={effectiveSystem.quest.description}
                chips={[
                    questConfig.toneLabels[tone],
                    questConfig.scopeLabels[scope],
                    dndCampaignContext
                        ? dndCampaignContext.npcRoster.length > 0
                            ? `${dndCampaignContext.npcRoster.length} NPC leads`
                            : questConfig.resolutionLabels[resolutionStyle]
                        : questConfig.resolutionLabels[resolutionStyle],
                    selectedCampaign ? `Campaign: ${selectedCampaign.name}` : 'Standalone adventure',
                ]}
            >
                {loadedProjectName ? (
                    <View style={styles.heroMetaRow}>
                        <Label style={styles.heroMetaLabel}>Loaded project</Label>
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
                        <BodyText>Loading saved project...</BodyText>
                    </View>
                </SystemPanel>
            ) : loadedProjectName ? (
                <SystemPanel systemId={effectiveSystemId} tone="muted">
                    <Label>Loaded project</Label>
                    <BodyText>{loadedProjectName}</BodyText>
                </SystemPanel>
            ) : null}

            <SystemPanel systemId={effectiveSystemId} tone="accent">
                <Label>Campaign Link</Label>

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
                                none
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
                    <BodyText>No saved campaigns yet. Create one in Campaign Hub to link this project.</BodyText>
                )}

                {selectedCampaign ? (
                    <BodyText>Ruleset locked to {selectedCampaign.systemName} while linked to {selectedCampaign.name}.</BodyText>
                ) : null}

                {dndCampaignContext ? (
                    <View style={styles.resultRow}>
                        <BodyText>
                            Patron lens: {dndCampaignContext.mainFaction || 'No patron set'}.
                        </BodyText>
                        {dndCampaignContext.currentObjective ? (
                            <BodyText>Campaign objective feeding this quest: {dndCampaignContext.currentObjective}</BodyText>
                        ) : null}
                    </View>
                ) : null}

                <Label>{questConfig.labels.factionName}</Label>
                <AppInput
                    value={factionName}
                    onChangeText={setFactionName}
                    placeholder={questConfig.defaults.factionName}
                />

                <Label>{questConfig.labels.objectiveSeed}</Label>
                <AppInput
                    value={objectiveSeed}
                    onChangeText={setObjectiveSeed}
                    placeholder={questConfig.defaults.objectiveSeed}
                />

                <Label>{questConfig.labels.tone}</Label>
                <View style={styles.pillRow}>
                    {QUEST_TONE_OPTIONS.map((option) => {
                        const selected = tone === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setTone(option)}
                                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {questConfig.toneLabels[option]}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>{questConfig.labels.scope}</Label>
                <View style={styles.pillRow}>
                    {QUEST_SCOPE_OPTIONS.map((option) => {
                        const selected = scope === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setScope(option)}
                                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {questConfig.scopeLabels[option]}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>{questConfig.labels.structure}</Label>
                <View style={styles.pillRow}>
                    {QUEST_STRUCTURE_OPTIONS.map((option) => {
                        const selected = structure === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setStructure(option)}
                                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {questConfig.structureLabels[option]}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>{questConfig.labels.resolutionStyle}</Label>
                <View style={styles.pillRow}>
                    {RESOLUTION_STYLE_OPTIONS.map((option) => {
                        const selected = resolutionStyle === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setResolutionStyle(option)}
                                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {questConfig.resolutionLabels[option]}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>{questConfig.labels.factionImpact}</Label>
                <View style={styles.pillRow}>
                    {FACTION_IMPACT_OPTIONS.map((option) => {
                        const selected = factionImpact === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setFactionImpact(option)}
                                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {questConfig.impactLabels[option]}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>{questConfig.labels.notes}</Label>
                <AppInput
                    value={questNotes}
                    onChangeText={setQuestNotes}
                    placeholder={questConfig.labels.notesPlaceholder}
                    multiline
                />
                <Pressable onPress={() => setVariationSeed((seed) => seed + 1)} style={styles.secondaryButton}>
                    <Label style={styles.secondaryButtonText}>{questConfig.labels.rerollButton}</Label>
                </Pressable>

                <View style={styles.saveRow}>
                    <View style={styles.actionRow}>
                        <Pressable
                            onPress={() => handleSaveProject(false)}
                            disabled={saving || loadingSession}
                            style={[
                                styles.saveButton,
                                { backgroundColor: palette.accent },
                                (saving || loadingSession) && styles.saveButtonDisabled,
                            ]}
                        >
                            <Label style={styles.saveButtonText}>
                                {saving
                                    ? 'Saving...'
                                    : currentProjectId
                                        ? selectedCampaignId
                                            ? 'Update Linked Project'
                                            : 'Update Project'
                                        : selectedCampaignId
                                            ? 'Save to Campaign'
                                            : 'Save Project'}
                            </Label>
                        </Pressable>

                        <Pressable
                            onPress={handleSaveAsNew}
                            disabled={saving || loadingSession || !sessionUserId}
                            style={[styles.secondaryButton, (saving || loadingSession || !sessionUserId) && styles.saveButtonDisabled]}
                        >
                            <Label style={styles.secondaryButtonText}>Save As New</Label>
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
                                    ? 'Link to Campaign'
                                    : currentProjectId && selectedCampaignId
                                        ? 'Relink Campaign'
                                        : 'Link to Campaign'}
                            </Label>
                        </Pressable>
                    </View>

                    {loadingSession ? (
                        <View style={styles.sessionRow}>
                            <ActivityIndicator />
                            <BodyText>Checking account...</BodyText>
                        </View>
                    ) : sessionUserId ? (
                        <BodyText>
                            {currentProjectId
                                ? 'Loaded project detected. Save respects the selected campaign automatically, or save a new copy.'
                                : selectedCampaignId
                                    ? 'Signed in. Save Project will use the selected campaign by default.'
                                    : 'Signed in. Saving is enabled.'}
                        </BodyText>
                    ) : (
                        <BodyText>Not signed in. You can generate quests, but not save yet.</BodyText>
                    )}

                    {sessionUserId && isCreatingNewProject && isAtFreeLimit ? (
                        <UpgradeBanner
                            title={freeLimitUpsell.title}
                            message={freeLimitUpsell.message}
                            buttonLabel={freeLimitUpsell.buttonLabel}
                            onPress={handleUpgradePress}
                        />
                    ) : null}
                </View>
            </SystemPanel>

            {dndCampaignContext ? (
                <SystemPanel systemId={effectiveSystemId}>
                    <Label>Campaign Hooks</Label>
                    <View style={styles.resultRow}>
                        {dndCampaignContext.partyHookLines.length > 0 ? (
                            dndCampaignContext.partyHookLines.slice(0, 4).map((entry, index) => (
                                <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                            ))
                        ) : (
                            <BodyText>No party hooks are logged in the linked campaign yet.</BodyText>
                        )}
                        {dndCampaignContext.npcSummaryLines.length > 0 ? (
                            dndCampaignContext.npcSummaryLines.slice(0, 3).map((entry, index) => (
                                <BodyText key={`npc-${entry}-${index}`}>• {entry}</BodyText>
                            ))
                        ) : (
                            <BodyText>No NPC web is logged in the linked campaign yet.</BodyText>
                        )}
                    </View>
                </SystemPanel>
            ) : null}

            <SystemPanel systemId={effectiveSystemId}>
                <Label>{questConfig.labels.hook}</Label>
                <View style={styles.resultRow}>
                    <BodyText>{result.hook}</BodyText>
                    <BodyText>{result.objective}</BodyText>
                    <BodyText>{questConfig.labels.siteFrame}: {result.siteFrame}</BodyText>
                    {dndCampaignContext?.campaignSummary ? (
                        <BodyText>Campaign frame: {dndCampaignContext.campaignSummary}</BodyText>
                    ) : null}
                </View>
            </SystemPanel>

            <SystemPanel systemId={effectiveSystemId}>
                <Label>{questConfig.labels.complication}</Label>
                <View style={styles.resultRow}>
                    <BodyText>{questConfig.labels.complication}: {result.complication}</BodyText>
                    <BodyText>{questConfig.labels.twistLead}: {result.twist}</BodyText>
                    <BodyText>{questConfig.labels.alternateResolutionLead}: {result.alternateResolution}</BodyText>
                </View>
            </SystemPanel>

            <SystemPanel systemId={effectiveSystemId}>
                <Label>{questConfig.labels.reward}</Label>
                <View style={styles.resultRow}>
                    <BodyText>{questConfig.labels.rewardLead}: {result.reward}</BodyText>
                    <BodyText>{questConfig.labels.consequenceLead}: {result.consequence}</BodyText>
                    <BodyText>{questConfig.labels.factionPressureLead}: {result.factionPressure}</BodyText>
                </View>
            </SystemPanel>

            <SystemPanel systemId={effectiveSystemId}>
                <Label>{questConfig.labels.arc}</Label>
                <View style={styles.resultRow}>
                    {result.questArc.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </SystemPanel>

            <SystemPanel systemId={effectiveSystemId}>
                <Label>{questConfig.labels.sceneIdeas}</Label>
                <View style={styles.resultRow}>
                    {result.sceneIdeas.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </SystemPanel>
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
    saveButton: {
        backgroundColor: Colors.accent,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
        gap: 8,
    },
});
