import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { AppInput } from '@/components/AppInput';
import { BodyText, Label } from '@/components/AppText';
import { DndCampaignWorkbench } from '@/components/DndCampaignWorkbench';
import { DisclosurePanel } from '@/components/DisclosurePanel';
import { GameSystemPicker } from '@/components/GameSystemPicker';
import { RulesetIdentityCard } from '@/components/RulesetIdentityCard';
import { Screen } from '@/components/Screen';
import { SystemHero } from '@/components/SystemHero';
import { SystemPanel } from '@/components/SystemPanel';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';
import { getCampaignSystemConfig, type CampaignTone } from '@/lib/campaignSystemConfig';
import {
    buildDndCampaignWorkbenchSnapshot,
    createDndPartyTreasury,
    readDndInventoryItems,
    readDndNpcRoster,
    readDndPartyMembers,
    readDndPartyTreasury,
    type DndInventoryItem,
    type DndNpc,
    type DndPartyMember,
    type DndPartyTreasury,
} from '@/lib/dnd5eCampaignKit';
import {
    readDndEncounterLedger,
    readDndThreatClocks,
    readDndTreasureLedger,
    readDndTreasuryAwards,
    type DndEncounterLedgerEntry,
    type DndThreatClockEntry,
    type DndTreasureLedgerEntry,
    type DndTreasuryAwardEntry,
} from '@/lib/dndCampaignLedger';
import { buildSeed, pickManyFromPool } from '@/lib/generation';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { fetchLatestSaveAccess } from '@/lib/projectAccess';
import { getSystemPresentation } from '@/lib/systemPresentation';
import {
    getProjectRoute,
    getProjectSummary,
    getProjectSystemId,
    getProjectSystemShortLabel,
    getProjectToolBadge,
    getProjectToolLabel,
    type ProjectData,
} from '@/lib/projectPresentation';
import { resolveGameSystemId, type GameSystemId } from '@/lib/gameSystems';
import { getCampaignHubUpsell } from '@/lib/subscriptionUi';

const CAMPAIGN_TONE_OPTIONS: CampaignTone[] = ['heroic', 'grim', 'mystic', 'political', 'sandbox'];

function isCampaignTone(value: unknown): value is CampaignTone {
    return typeof value === 'string' && CAMPAIGN_TONE_OPTIONS.includes(value as CampaignTone);
}

function formatThreatClockStatusLabel(value: string) {
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

type CampaignProjectData = {
    campaignName?: string;
    systemId?: GameSystemId;
    systemName?: string;
    tone?: CampaignTone;
    levelBand?: string;
    partyName?: string;
    mainFaction?: string;
    campaignSummary?: string;
    currentObjective?: string;
    sessionNotes?: string;
    variationSeed?: number;
    partyRoster?: DndPartyMember[];
    sharedInventory?: DndInventoryItem[];
    partyTreasury?: DndPartyTreasury;
    npcRoster?: DndNpc[];
    encounterLedger?: DndEncounterLedgerEntry[];
    treasureLedger?: DndTreasureLedgerEntry[];
    threatClocks?: DndThreatClockEntry[];
    treasuryAwards?: DndTreasuryAwardEntry[];
};

type LinkedProject = {
    id: string;
    name: string;
    tool_type: string;
    updated_at: string;
    data?: ProjectData;
};

export default function CampaignScreen() {
    const params = useLocalSearchParams<{ projectId?: string }>();
    const { activeSystem, activeSystemId, setActiveSystemId } = useGameSystem();
    const campaignConfig = useMemo(() => getCampaignSystemConfig(activeSystemId), [activeSystemId]);
    const palette = useMemo(() => getSystemPresentation(activeSystemId).palette, [activeSystemId]);

    const [campaignName, setCampaignName] = useState(campaignConfig.defaults.campaignName);
    const [tone, setTone] = useState<CampaignTone>(campaignConfig.defaults.tone);
    const [levelBand, setLevelBand] = useState(campaignConfig.defaults.levelBand);
    const [partyName, setPartyName] = useState(campaignConfig.defaults.partyName);
    const [mainFaction, setMainFaction] = useState(campaignConfig.defaults.mainFaction);
    const [campaignSummary, setCampaignSummary] = useState('');
    const [currentObjective, setCurrentObjective] = useState('');
    const [sessionNotes, setSessionNotes] = useState('');
    const [variationSeed, setVariationSeed] = useState(0);
    const [partyRoster, setPartyRoster] = useState<DndPartyMember[]>([]);
    const [sharedInventory, setSharedInventory] = useState<DndInventoryItem[]>([]);
    const [partyTreasury, setPartyTreasury] = useState<DndPartyTreasury>(createDndPartyTreasury());
    const [npcRoster, setNpcRoster] = useState<DndNpc[]>([]);
    const [encounterLedger, setEncounterLedger] = useState<DndEncounterLedgerEntry[]>([]);
    const [treasureLedger, setTreasureLedger] = useState<DndTreasureLedgerEntry[]>([]);
    const [threatClocks, setThreatClocks] = useState<DndThreatClockEntry[]>([]);
    const [treasuryAwards, setTreasuryAwards] = useState<DndTreasuryAwardEntry[]>([]);

    const [loadingProject, setLoadingProject] = useState(false);
    const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [storyNotesOpen, setStoryNotesOpen] = useState(false);
    const [moreSaveActionsOpen, setMoreSaveActionsOpen] = useState(false);

    const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);

    const [statusBanner, setStatusBanner] = useState<{
        title?: string;
        message: string;
        variant: StatusBannerVariant;
    } | null>(null);

    const {
        userId: sessionUserId,
        isPro,
        loading: loadingSession,
        refreshAppState,
    } = useAppState();

    const maxFreeSaves = 3;
    const campaignHubUpsell = getCampaignHubUpsell();

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

    const loadLinkedProjects = useCallback(async (campaignId: string) => {
        if (!supabase || !sessionUserId) return;

        try {
            setLoadingLinks(true);

            const { data, error } = await supabase
                .from('saved_projects')
                .select('id, name, tool_type, updated_at, data')
                .eq('user_id', sessionUserId)
                .eq('campaign_id', campaignId)
                .order('updated_at', { ascending: false });

            if (error) {
                setBanner('error', 'Saved prep failed to load', error.message);
                return;
            }

            setLinkedProjects((data ?? []) as LinkedProject[]);
        } finally {
            setLoadingLinks(false);
        }
    }, [sessionUserId]);

    useEffect(() => {
        if (params.projectId || currentProjectId) {
            return;
        }

        setCampaignName(campaignConfig.defaults.campaignName);
        setTone(campaignConfig.defaults.tone);
        setLevelBand(campaignConfig.defaults.levelBand);
        setPartyName(campaignConfig.defaults.partyName);
        setMainFaction(campaignConfig.defaults.mainFaction);
        setCampaignSummary('');
        setCurrentObjective('');
        setSessionNotes('');
        setVariationSeed(0);
        setPartyRoster([]);
        setSharedInventory([]);
        setPartyTreasury(createDndPartyTreasury());
        setNpcRoster([]);
        setEncounterLedger([]);
        setTreasureLedger([]);
        setThreatClocks([]);
        setTreasuryAwards([]);
        setStoryNotesOpen(false);
        setMoreSaveActionsOpen(false);
    }, [campaignConfig, params.projectId, currentProjectId]);

    useEffect(() => {
        async function loadProject() {
            if (!supabase) return;
            if (!sessionUserId) return;
            if (!isPro) return;

            if (!params.projectId) {
                setLoadedProjectName(null);
                setCurrentProjectId(null);
                setLinkedProjects([]);
                return;
            }

            try {
                setLoadingProject(true);

                const { data, error } = await supabase
                    .from('saved_projects')
                    .select('*')
                    .eq('id', params.projectId)
                    .eq('user_id', sessionUserId)
                    .eq('tool_type', 'campaign_hub')
                    .single();

                if (error) {
                    setBanner('error', 'Load failed', error.message);
                    return;
                }

                const projectData = (data?.data ?? {}) as CampaignProjectData;

                if (typeof projectData.campaignName === 'string') setCampaignName(projectData.campaignName);

                if (projectData.systemId || projectData.systemName) {
                    setActiveSystemId(resolveGameSystemId(projectData.systemId ?? projectData.systemName));
                }

                if (isCampaignTone(projectData.tone)) {
                    setTone(projectData.tone);
                }

                if (typeof projectData.levelBand === 'string') setLevelBand(projectData.levelBand);
                if (typeof projectData.partyName === 'string') setPartyName(projectData.partyName);
                if (typeof projectData.mainFaction === 'string') setMainFaction(projectData.mainFaction);
                if (typeof projectData.campaignSummary === 'string') setCampaignSummary(projectData.campaignSummary);
                if (typeof projectData.currentObjective === 'string') setCurrentObjective(projectData.currentObjective);
                if (typeof projectData.sessionNotes === 'string') setSessionNotes(projectData.sessionNotes);
                if (typeof projectData.variationSeed === 'number') setVariationSeed(projectData.variationSeed);
                setPartyRoster(readDndPartyMembers(projectData.partyRoster));
                setSharedInventory(readDndInventoryItems(projectData.sharedInventory));
                setPartyTreasury(readDndPartyTreasury(projectData.partyTreasury));
                setNpcRoster(readDndNpcRoster(projectData.npcRoster));
                setEncounterLedger(readDndEncounterLedger(projectData.encounterLedger));
                setTreasureLedger(readDndTreasureLedger(projectData.treasureLedger));
                setThreatClocks(readDndThreatClocks(projectData.threatClocks));
                setTreasuryAwards(readDndTreasuryAwards(projectData.treasuryAwards));

                setLoadedProjectName(data?.name ?? 'Loaded campaign');
                setCurrentProjectId(data?.id ?? null);

                if (data?.id) {
                    await loadLinkedProjects(data.id);
                }
            } finally {
                setLoadingProject(false);
            }
        }

        loadProject();
    }, [params.projectId, sessionUserId, isPro, loadLinkedProjects, setActiveSystemId]);

    const dndWorkbenchSnapshot = useMemo(() => {
        if (activeSystemId !== 'dnd5e') {
            return null;
        }

        return buildDndCampaignWorkbenchSnapshot({
            partyRoster,
            inventory: sharedInventory,
            treasury: partyTreasury,
            npcRoster,
        });
    }, [activeSystemId, npcRoster, partyRoster, partyTreasury, sharedInventory]);
    const escalationWatch = useMemo(() => {
        const activeThreats = threatClocks.filter((entry) => entry.status !== 'resolved');

        return {
            npcLines: activeThreats
                .filter((entry) => entry.linkedNpcName)
                .map((entry) => `${entry.linkedNpcName} • ${entry.escalationTag || formatThreatClockStatusLabel(entry.status)} • ${entry.title}`),
            factionLines: activeThreats
                .filter((entry) => entry.linkedFaction)
                .map((entry) => `${entry.linkedFaction} • ${entry.escalationTag || formatThreatClockStatusLabel(entry.status)} • ${entry.title}`),
        };
    }, [threatClocks]);

    const heroChips = useMemo(() => {
        if (activeSystemId === 'dnd5e' && dndWorkbenchSnapshot) {
            return [
                campaignConfig.toneLabels[tone],
                levelBand || campaignConfig.defaults.levelBand,
                `${dndWorkbenchSnapshot.partyCount} party sheets`,
                `${dndWorkbenchSnapshot.inventoryCount} tracked items`,
                `${dndWorkbenchSnapshot.npcCount} NPCs`,
                `${threatClocks.filter((entry) => entry.status !== 'resolved').length} live threats`,
            ];
        }

        return [
            campaignConfig.toneLabels[tone],
            levelBand || campaignConfig.defaults.levelBand,
            partyName || 'Unnamed party',
            mainFaction || 'No patron set',
        ];
    }, [activeSystemId, campaignConfig.defaults.levelBand, campaignConfig.toneLabels, dndWorkbenchSnapshot, levelBand, mainFaction, partyName, threatClocks, tone]);

    const campaignSnapshot = useMemo(() => {
        const summary = campaignSummary.trim() || 'No campaign summary written yet.';
        const objective = currentObjective.trim() || 'No current objective set.';
        const notesState =
            sessionNotes.trim().length > 0
                ? campaignConfig.notesState.active
                : campaignConfig.notesState.empty;

        const seed = buildSeed(
            `${campaignName}|${activeSystem.label}|${tone}|${levelBand}|${partyName}|${mainFaction}|${campaignSummary}|${currentObjective}|${sessionNotes}|${variationSeed}`
        );

        return {
            summary,
            objective,
            notesState,
            toneSummary: `${campaignConfig.toneLabels[tone]} • ${levelBand} • ${activeSystem.label}`,
            campaignPulse: campaignConfig.campaignPulse[tone],
            prepAngles: pickManyFromPool(campaignConfig.prepAnglePool, 2, seed + 7),
            sessionLens: pickManyFromPool(campaignConfig.sessionLensPool[tone], 2, seed + 17),
            factionMoves: pickManyFromPool(campaignConfig.factionMovePool, 2, seed + 29),
            stakes: pickManyFromPool(campaignConfig.stakePool, 2, seed + 41),
        };
    }, [campaignName, activeSystem.label, tone, levelBand, partyName, mainFaction, campaignSummary, currentObjective, sessionNotes, variationSeed, campaignConfig]);

    const setupSummary = [
        campaignName.trim() || campaignConfig.defaults.campaignName,
        campaignConfig.toneLabels[tone],
        levelBand.trim() || campaignConfig.defaults.levelBand,
    ].join(' • ');

    const storyNotesSummary = [
        partyName.trim() || activeSystem.campaign.groupPlaceholder,
        mainFaction.trim() || 'No main faction yet',
        currentObjective.trim().length > 0 ? 'Objective ready' : 'No objective yet',
    ].join(' • ');

    const savePanelSummary = currentProjectId
        ? 'Saving updates the loaded campaign binder.'
        : 'The next save creates this campaign binder.';

    const saveHelperText = loadingSession
        ? 'Checking account...'
        : sessionUserId
            ? currentProjectId
                ? 'Loaded campaign detected. Save updates it by default, or open more options for a fresh copy.'
                : 'Signed in. Campaign binder is ready.'
            : 'Not signed in. You can plan, but not save yet.';

    const linkedProjectsSummary = currentProjectId
        ? loadingLinks
            ? 'Loading attached saves...'
            : linkedProjects.length > 0
                ? `${linkedProjects.length} saved prep entries are attached to this campaign.`
                : 'No saved prep is attached to this campaign yet.'
        : 'Save this campaign first to start attaching prep.';
    const escalationSummary =
        escalationWatch.npcLines.length + escalationWatch.factionLines.length > 0
            ? `${escalationWatch.npcLines.length + escalationWatch.factionLines.length} pressure lines are active.`
            : 'No NPC or faction pressure has been marked yet.';
    const threatClockSummary = threatClocks.length > 0
        ? `${threatClocks.length} live threat clocks are on the board.`
        : 'No threat clocks have been pushed in yet.';
    const encounterLedgerSummary = encounterLedger.length > 0
        ? `${encounterLedger.length} encounter plans have written back into this campaign.`
        : 'No encounter plans have written back into this campaign yet.';
    const treasureLedgerSummary = treasureLedger.length > 0
        ? `${treasureLedger.length} treasure awards have written back into this campaign.`
        : 'No treasure awards have written back into this campaign yet.';
    const treasuryAwardsSummary = treasuryAwards.length > 0
        ? `${treasuryAwards.length} coin awards have been posted into the treasury.`
        : 'No generated coin awards have been posted yet.';

    const lockedPreview = useMemo(() => {
        if (activeSystemId === 'dnd5e') {
            return {
                label: 'What this D&D campaign unlocks',
                highlights: [
                    'Party sheets with species, class, level, AC, HP, passive Perception, and signature gear.',
                    'Shared inventory, treasury, attunement pressure, and named NPC tracking inside one binder.',
                    'SRD-safe species, class, weapon, armor, item, and monster benches baked into the campaign.',
                ],
            };
        }

        return {
            label: 'What this Homebrew campaign unlocks',
            highlights: [
                'A flexible campaign binder for your own setting, house rules, factions, and long-form notes.',
                'Connected prep across advancement, battle, loot, and adventure screens without published canon baggage.',
                'One campaign binder for session prep, campaign pressure, and reusable homebrew notes.',
            ],
        };
    }, [activeSystemId]);

    const freeRoutePreview = useMemo(() => ([
        { label: activeSystem.tabs.xp, path: '/xp' as const },
        { label: activeSystem.tabs.encounters, path: '/encounters' as const },
        { label: activeSystem.tabs.generator, path: '/generator' as const },
        { label: activeSystem.tabs.quest, path: '/quest' as const },
        { label: activeSystem.tabs.projects, path: '/projects' as const },
    ]), [activeSystem.tabs.encounters, activeSystem.tabs.generator, activeSystem.tabs.projects, activeSystem.tabs.quest, activeSystem.tabs.xp]);

    function openLinkedProject(project: LinkedProject) {
        const pathname = getProjectRoute(project.tool_type);

        if (pathname) {
            router.push({ pathname, params: { projectId: project.id } });
            return;
        }

        setBanner('info', 'Not supported yet', 'That saved entry cannot be opened yet.');
    }

    function formatDate(dateString: string) {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    }

    async function handleSaveProject(asNew = false) {
        if (!supabase) {
            setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
            return;
        }

        if (!sessionUserId) {
            setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before saving a campaign.');
            return;
        }

        if (!isPro) {
            setBanner('info', 'Pro required', 'Campaign Hub is part of Pro.');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                campaignName,
                systemId: activeSystemId,
                systemName: activeSystem.label,
                tone,
                levelBand,
                partyName,
                mainFaction,
                campaignSummary,
                currentObjective,
                sessionNotes,
                variationSeed,
                partyRoster,
                sharedInventory,
                partyTreasury,
                npcRoster,
                encounterLedger,
                treasureLedger,
                threatClocks,
                treasuryAwards,
            };

            const timestampName = campaignName.trim() || `Campaign - ${new Date().toLocaleString()}`;

            if (!asNew && currentProjectId) {
                const { error } = await supabase
                    .from('saved_projects')
                    .update({
                        name: timestampName,
                        data: payload,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', currentProjectId)
                    .eq('user_id', sessionUserId);

                if (error) {
                    setBanner('error', 'Update failed', error.message);
                    return;
                }

                setLoadedProjectName(timestampName);
                await refreshAppState();
                await loadLinkedProjects(currentProjectId);
                setBanner('success', 'Updated', 'Your campaign hub was updated successfully.');
                return;
            }

            if (asNew || !currentProjectId) {
                await refreshAppState();
                const latestAccess = await getLatestSaveAccess(sessionUserId);

                if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
                    setBanner(
                        'info',
                        'Free limit reached',
                        'Free accounts can keep up to 3 saved plans. Upgrade to Pro for unlimited saves and campaign binders.'
                    );
                    return;
                }
            }

            const { data, error } = await supabase
                .from('saved_projects')
                .insert({
                    user_id: sessionUserId,
                    name: timestampName,
                    tool_type: 'campaign_hub',
                    data: payload,
                })
                .select()
                .single();

            if (error) {
                setBanner('error', 'Save failed', error.message);
                return;
            }

            setLoadedProjectName(data?.name ?? timestampName);
            setCurrentProjectId(data?.id ?? null);
            setLinkedProjects([]);
            await refreshAppState();

            setBanner('success', 'Saved', 'Your campaign hub was saved successfully.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveAsNew() {
        await handleSaveProject(true);
    }

    if (!loadingSession && !isPro) {
        return (
            <Screen>
                <SystemHero
                    systemId={activeSystemId}
                    eyebrow={activeSystem.shortLabel}
                    title={activeSystem.campaign.title}
                    body={campaignHubUpsell.message}
                    chips={[activeSystem.label, campaignConfig.toneLabels[tone], levelBand]}
                >
                    <GameSystemPicker
                        value={activeSystemId}
                        onChange={setActiveSystemId}
                        label={activeSystem.campaign.selectorLabel}
                        helperText="Preview how the campaign hub changes for each game before you unlock the full binder."
                    />
                </SystemHero>

                {statusBanner ? (
                    <StatusBanner
                        title={statusBanner.title}
                        message={statusBanner.message}
                        variant={statusBanner.variant}
                        onDismiss={() => setStatusBanner(null)}
                    />
                ) : null}

                <RulesetIdentityCard system={activeSystem} label="Game Preview" showAttribution={activeSystemId === 'dnd5e'} />

                <UpgradeBanner
                    title={campaignHubUpsell.title}
                    message={campaignHubUpsell.message}
                    buttonLabel={campaignHubUpsell.buttonLabel}
                    onPress={handleUpgradePress}
                />

                <SystemPanel systemId={activeSystemId}>
                    <Label>{lockedPreview.label}</Label>
                    <View style={styles.resultRow}>
                        {lockedPreview.highlights.map((entry) => (
                            <BodyText key={entry}>• {entry}</BodyText>
                        ))}
                    </View>
                </SystemPanel>

                <SystemPanel systemId={activeSystemId} tone="muted">
                    <Label>Available on Free Right Now</Label>
                    <BodyText>
                        You can keep exploring the current game through the free planners while Campaign Hub stays locked behind Pro.
                    </BodyText>
                    <View style={styles.lockedRouteRow}>
                        {freeRoutePreview.map((entry) => (
                            <Pressable
                                key={entry.path}
                                onPress={() => router.push(entry.path)}
                                style={[styles.lockedRouteButton, { borderColor: palette.heroBorder, backgroundColor: palette.panelMuted }]}
                            >
                                <Label>{entry.label}</Label>
                            </Pressable>
                        ))}
                    </View>
                </SystemPanel>
            </Screen>
        );
    }

    return (
        <Screen>
            <SystemHero
                systemId={activeSystemId}
                eyebrow={activeSystem.shortLabel}
                title={activeSystem.campaign.title}
                body={activeSystem.campaign.description}
                chips={heroChips}
            >
                {loadedProjectName ? (
                    <View style={styles.heroMetaRow}>
                        <Label style={styles.heroMetaLabel}>Loaded campaign</Label>
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

            <RulesetIdentityCard system={activeSystem} label="Game Notes" showAttribution={false} />

            {loadingProject ? (
                <SystemPanel systemId={activeSystemId} tone="muted">
                    <View style={styles.sessionRow}>
                        <ActivityIndicator />
                        <BodyText>Loading saved campaign...</BodyText>
                    </View>
                </SystemPanel>
            ) : loadedProjectName ? (
                <SystemPanel systemId={activeSystemId} tone="muted">
                    <Label>Loaded campaign</Label>
                    <BodyText>{loadedProjectName}</BodyText>
                    <BodyText>Save now updates this campaign binder by default.</BodyText>
                </SystemPanel>
            ) : null}

            <DisclosurePanel
                systemId={activeSystemId}
                tone="accent"
                title="Campaign Setup"
                summary={setupSummary}
                defaultOpen
            >
                <GameSystemPicker
                    value={activeSystemId}
                    onChange={setActiveSystemId}
                    label={activeSystem.campaign.selectorLabel}
                    helperText={activeSystem.campaign.selectorHelper}
                />

                <Label>{campaignConfig.labels.campaignName}</Label>
                <AppInput
                    value={campaignName}
                    onChangeText={setCampaignName}
                    placeholder={campaignConfig.defaults.campaignName}
                />

                <Label>{campaignConfig.labels.tone}</Label>
                <View style={styles.pillRow}>
                    {CAMPAIGN_TONE_OPTIONS.map((option) => {
                        const selected = tone === option;
                        return (
                            <Pressable
                                key={option}
                                onPress={() => setTone(option)}
                                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {campaignConfig.toneLabels[option]}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>{campaignConfig.labels.levelBand}</Label>
                <AppInput value={levelBand} onChangeText={setLevelBand} placeholder={campaignConfig.defaults.levelBand} />

                <Label>{activeSystem.campaign.groupLabel}</Label>
                <AppInput
                    value={partyName}
                    onChangeText={setPartyName}
                    placeholder={activeSystem.campaign.groupPlaceholder}
                />

                <Label>{campaignConfig.labels.mainFaction}</Label>
                <AppInput
                    value={mainFaction}
                    onChangeText={setMainFaction}
                    placeholder={campaignConfig.defaults.mainFaction}
                />
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title="Story Notes"
                summary={storyNotesSummary}
                open={storyNotesOpen}
                onOpenChange={setStoryNotesOpen}
            >
                <Label>{campaignConfig.labels.summary}</Label>
                <AppInput
                    value={campaignSummary}
                    onChangeText={setCampaignSummary}
                    placeholder={activeSystem.campaign.summaryPlaceholder}
                    multiline
                />

                <Label>{campaignConfig.labels.objective}</Label>
                <AppInput
                    value={currentObjective}
                    onChangeText={setCurrentObjective}
                    placeholder={activeSystem.campaign.objectivePlaceholder}
                    multiline
                />

                <Label>{campaignConfig.labels.notes}</Label>
                <AppInput
                    value={sessionNotes}
                    onChangeText={setSessionNotes}
                    placeholder={activeSystem.campaign.notesPlaceholder}
                    multiline
                />

                <Pressable onPress={() => setVariationSeed((seed) => seed + 1)} style={styles.secondaryButton}>
                    <Label style={styles.secondaryButtonText}>{campaignConfig.labels.rerollButton}</Label>
                </Pressable>
            </DisclosurePanel>

            <SystemPanel systemId={activeSystemId} tone="accent">
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
                    <Label style={styles.saveButtonText}>
                        {saving ? 'Saving...' : currentProjectId ? 'Update Campaign' : 'Save Campaign'}
                    </Label>
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
                            <Label style={styles.secondaryButtonText}>Save As New</Label>
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
            </SystemPanel>

            {activeSystemId === 'dnd5e' ? (
                <DndCampaignWorkbench
                    partyRoster={partyRoster}
                    setPartyRoster={setPartyRoster}
                    sharedInventory={sharedInventory}
                    setSharedInventory={setSharedInventory}
                    partyTreasury={partyTreasury}
                    setPartyTreasury={setPartyTreasury}
                    npcRoster={npcRoster}
                    setNpcRoster={setNpcRoster}
                    threatClocks={threatClocks}
                />
            ) : null}

            {activeSystemId === 'dnd5e' ? (
                <DisclosurePanel
                    systemId={activeSystemId}
                    title="Escalation Watch"
                    summary={escalationSummary}
                >
                    <View style={styles.resultRow}>
                        {escalationWatch.npcLines.length > 0 ? (
                            escalationWatch.npcLines.map((entry, index) => (
                                <BodyText key={`${entry}-${index}`}>• NPC pressure: {entry}</BodyText>
                            ))
                        ) : null}
                        {escalationWatch.factionLines.length > 0 ? (
                            escalationWatch.factionLines.map((entry, index) => (
                                <BodyText key={`${entry}-${index}`}>• Faction pressure: {entry}</BodyText>
                            ))
                        ) : null}
                        {escalationWatch.npcLines.length === 0 && escalationWatch.factionLines.length === 0 ? (
                            <BodyText>No NPC or faction pressure has been marked from saved encounters yet.</BodyText>
                        ) : null}
                    </View>
                </DisclosurePanel>
            ) : null}

            {activeSystemId === 'dnd5e' ? (
                <DisclosurePanel
                    systemId={activeSystemId}
                    title="Active Threat Clocks"
                    summary={threatClockSummary}
                >
                    <View style={styles.resultRow}>
                        {threatClocks.length > 0 ? (
                            threatClocks.map((entry) => (
                                <View key={entry.id} style={styles.linkedProjectButton}>
                                    <Label>{entry.title || entry.projectName || 'Saved threat'}</Label>
                                    <BodyText>
                                        {formatThreatClockStatusLabel(entry.status)} • {entry.segmentsFilled}/{entry.segmentsTotal} • {entry.difficulty} • {entry.enemyRole}
                                    </BodyText>
                                    {entry.linkedNpcName ? <BodyText>NPC: {entry.linkedNpcName}</BodyText> : null}
                                    {entry.linkedFaction ? <BodyText>Faction: {entry.linkedFaction}</BodyText> : null}
                                    {entry.escalationTag ? <BodyText>Pressure: {entry.escalationTag}</BodyText> : null}
                                    <BodyText>{entry.verdict}</BodyText>
                                    {entry.latestBeat ? <BodyText>Latest beat: {entry.latestBeat}</BodyText> : null}
                                    {entry.fallout ? <BodyText>Fallout: {entry.fallout}</BodyText> : null}
                                    <BodyText>Updated: {formatDate(entry.updatedAt)}</BodyText>
                                </View>
                            ))
                        ) : (
                            <BodyText>No threat clocks have been pushed in from saved encounters yet.</BodyText>
                        )}
                    </View>
                </DisclosurePanel>
            ) : null}

            {activeSystemId === 'dnd5e' ? (
                <DisclosurePanel
                    systemId={activeSystemId}
                    title="Recent Encounter Ledger"
                    summary={encounterLedgerSummary}
                >
                    <View style={styles.resultRow}>
                        {encounterLedger.length > 0 ? (
                            encounterLedger.map((entry) => (
                                <View key={entry.id} style={styles.linkedProjectButton}>
                                    <Label>{entry.projectName || 'Saved encounter'}</Label>
                                    <BodyText>
                                        {entry.difficulty} • {entry.enemyRole} • {entry.terrainType} • {entry.verdict}
                                    </BodyText>
                                    <BodyText>
                                        Party level {entry.partyLevel}, party size {entry.partySize}
                                    </BodyText>
                                    {entry.monsterBench.length > 0 ? (
                                        <BodyText>Monster bench: {entry.monsterBench.join(', ')}</BodyText>
                                    ) : null}
                                    {entry.lineupIdeas[0] ? <BodyText>Lineup: {entry.lineupIdeas[0]}</BodyText> : null}
                                    {entry.tacticalBeats[0] ? <BodyText>Beat: {entry.tacticalBeats[0]}</BodyText> : null}
                                    <BodyText>Updated: {formatDate(entry.savedAt)}</BodyText>
                                </View>
                            ))
                        ) : (
                            <BodyText>No encounter plans have written back into this campaign yet.</BodyText>
                        )}
                    </View>
                </DisclosurePanel>
            ) : null}

            {activeSystemId === 'dnd5e' ? (
                <DisclosurePanel
                    systemId={activeSystemId}
                    title="Recent Treasure Ledger"
                    summary={treasureLedgerSummary}
                >
                    <View style={styles.resultRow}>
                        {treasureLedger.length > 0 ? (
                            treasureLedger.map((entry) => (
                                <View key={entry.id} style={styles.linkedProjectButton}>
                                    <Label>{entry.projectName || 'Saved treasure'}</Label>
                                    <BodyText>
                                        {entry.rarity} • {entry.rewardType} • {entry.rewardTheme} • {entry.rewardSource}
                                    </BodyText>
                                    <BodyText>{entry.rewardSummary}</BodyText>
                                    <BodyText>
                                        Featured: {entry.featuredItem}
                                        {entry.bonusItem ? ` • Bonus: ${entry.bonusItem}` : ''}
                                    </BodyText>
                                    <BodyText>Coin & gem value: {entry.currencyValue.toLocaleString()}</BodyText>
                                    {entry.recipientHints.length > 0 ? (
                                        <BodyText>Best fit: {entry.recipientHints[0]}</BodyText>
                                    ) : null}
                                    <BodyText>Updated: {formatDate(entry.savedAt)}</BodyText>
                                </View>
                            ))
                        ) : (
                            <BodyText>No treasure awards have written back into this campaign yet.</BodyText>
                        )}
                    </View>
                </DisclosurePanel>
            ) : null}

            {activeSystemId === 'dnd5e' ? (
                <DisclosurePanel
                    systemId={activeSystemId}
                    title="Recent Coin Awards"
                    summary={treasuryAwardsSummary}
                >
                    <View style={styles.resultRow}>
                        {treasuryAwards.length > 0 ? (
                            treasuryAwards.map((entry) => (
                                <View key={entry.id} style={styles.linkedProjectButton}>
                                    <Label>{entry.projectName || 'Saved reward'}</Label>
                                    <BodyText>{entry.amountGp.toLocaleString()} gp added to treasury</BodyText>
                                    {entry.note ? <BodyText>{entry.note}</BodyText> : null}
                                    <BodyText>Updated: {formatDate(entry.updatedAt)}</BodyText>
                                </View>
                            ))
                        ) : (
                            <BodyText>No generated coin awards have been posted into the treasury yet.</BodyText>
                        )}
                    </View>
                </DisclosurePanel>
            ) : null}

            <DisclosurePanel
                systemId={activeSystemId}
                tone="accent"
                title={campaignConfig.labels.snapshot}
                summary={campaignSnapshot.toneSummary}
                defaultOpen
            >
                <View style={styles.resultRow}>
                    <BodyText>{campaignSnapshot.toneSummary}</BodyText>
                    <BodyText>{campaignConfig.labels.party}: {partyName || 'No party name set'}</BodyText>
                    <BodyText>{campaignConfig.labels.primaryFaction}: {mainFaction || 'No faction set'}</BodyText>
                    {dndWorkbenchSnapshot ? <BodyText>Party sheets: {dndWorkbenchSnapshot.partyCount}</BodyText> : null}
                    {dndWorkbenchSnapshot ? <BodyText>Tracked items: {dndWorkbenchSnapshot.inventoryCount}</BodyText> : null}
                    {dndWorkbenchSnapshot ? <BodyText>Named NPCs: {dndWorkbenchSnapshot.npcCount}</BodyText> : null}
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.storyFocus}
                summary={campaignSnapshot.objective}
            >
                <View style={styles.resultRow}>
                    <BodyText>{campaignConfig.labels.summaryLead}: {campaignSnapshot.summary}</BodyText>
                    <BodyText>{campaignConfig.labels.objectiveLead}: {campaignSnapshot.objective}</BodyText>
                    <BodyText>{campaignConfig.labels.pulseLead}: {campaignSnapshot.campaignPulse}</BodyText>
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.readiness}
                summary={campaignSnapshot.notesState}
            >
                <View style={styles.resultRow}>
                    <BodyText>{campaignSnapshot.notesState}</BodyText>
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.prepAngles}
                summary={campaignSnapshot.prepAngles[0]}
            >
                <View style={styles.resultRow}>
                    {campaignSnapshot.prepAngles.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.nextSession}
                summary={campaignSnapshot.sessionLens[0]}
            >
                <View style={styles.resultRow}>
                    {campaignSnapshot.sessionLens.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.factionMoves}
                summary={campaignSnapshot.factionMoves[0]}
            >
                <View style={styles.resultRow}>
                    {campaignSnapshot.factionMoves.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.stakes}
                summary={campaignSnapshot.stakes[0]}
            >
                <View style={styles.resultRow}>
                    {campaignSnapshot.stakes.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </DisclosurePanel>

            <DisclosurePanel
                systemId={activeSystemId}
                title={campaignConfig.labels.linkedProjects}
                summary={linkedProjectsSummary}
            >
                {currentProjectId ? (
                    loadingLinks ? (
                        <View style={styles.sessionRow}>
                            <ActivityIndicator />
                            <BodyText>Loading saved prep...</BodyText>
                        </View>
                    ) : linkedProjects.length > 0 ? (
                        <View style={styles.resultRow}>
                            {linkedProjects.map((project) => {
                                const projectSystemId = getProjectSystemId(project.data);
                                const savedSystemLabel = getProjectSystemShortLabel(project.data);
                                const toolBadge = getProjectToolBadge(project.tool_type, projectSystemId);
                                const toolLabel = getProjectToolLabel(project.tool_type, projectSystemId);
                                const summary = getProjectSummary(project.tool_type, project.data);

                                return (
                                    <Pressable
                                        key={project.id}
                                        onPress={() => openLinkedProject(project)}
                                        style={styles.linkedProjectButton}
                                    >
                                        <View style={styles.metaPillRow}>
                                            <View style={[styles.metaPill, styles.systemPill]}>
                                                <BodyText style={styles.metaPillText}>{savedSystemLabel}</BodyText>
                                            </View>
                                            <View style={styles.metaPill}>
                                                <BodyText style={styles.metaPillText}>{toolBadge}</BodyText>
                                            </View>
                                        </View>
                                        <Label>{project.name}</Label>
                                        <BodyText>{toolLabel}</BodyText>
                                        <BodyText>{summary}</BodyText>
                                        <BodyText>Updated: {formatDate(project.updated_at)}</BodyText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : (
                        <BodyText>No saved prep is tied to this campaign yet. Pro planning screens can attach saves here.</BodyText>
                    )
                    ) : (
                        <BodyText>Save this campaign first, then you can start attaching encounters, treasure, and adventures to it.</BodyText>
                    )}
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
    primaryActionButton: {
        alignSelf: 'stretch',
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
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    resultRow: {
        gap: 8,
    },
    linkedProjectButton: {
        backgroundColor: Colors.elevated,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 12,
        gap: 4,
    },
    metaPillRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
        flexWrap: 'wrap',
    },
    metaPill: {
        backgroundColor: Colors.elevated,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    systemPill: {
        borderColor: Colors.accent,
    },
    metaPillText: {
        color: Colors.text,
    },
    lockedRouteRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    lockedRouteButton: {
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
});
