import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppState } from '@/contexts/AppStateContext';
import { ProCard } from '@/components/ProCard';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { AppInput } from '@/components/AppInput';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type QuestTone = 'heroic' | 'grim' | 'mystic' | 'political';
type QuestScope = 'personal' | 'local' | 'regional' | 'faction';
type QuestStructure = 'one-shot' | 'three-part';
type ResolutionStyle = 'combat' | 'diplomacy' | 'stealth' | 'choice-driven';
type FactionImpact = 'minor' | 'moderate' | 'major';

type QuestProjectData = {
    factionName?: string;
    objectiveSeed?: string;
    tone?: QuestTone;
    scope?: QuestScope;
    structure?: QuestStructure;
    resolutionStyle?: ResolutionStyle;
    factionImpact?: FactionImpact;
    questNotes?: string;
};

function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        return;
    }

    Alert.alert(title, message);
}

export default function QuestScreen() {
    const params = useLocalSearchParams<{ projectId?: string }>();

    const [factionName, setFactionName] = useState('Crimson Pact');
    const [objectiveSeed, setObjectiveSeed] = useState('Recover a stolen relic');
    const [tone, setTone] = useState<QuestTone>('heroic');
    const [scope, setScope] = useState<QuestScope>('local');
    const [structure, setStructure] = useState<QuestStructure>('one-shot');
    const [resolutionStyle, setResolutionStyle] = useState<ResolutionStyle>('choice-driven');
    const [factionImpact, setFactionImpact] = useState<FactionImpact>('moderate');
    const [questNotes, setQuestNotes] = useState('');

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

    const maxFreeSaves = 3;
    const isAtFreeLimit = !isPro && savedProjectCount >= maxFreeSaves;
    const isCreatingNewProject = !currentProjectId;

    async function getLatestSaveAccess(userId: string) {
        if (!supabase) {
            return { isPro: false, count: 0 };
        }

        const [{ data: profileData }, { count, error: countError }] = await Promise.all([
            supabase
                .from('profiles')
                .select('is_pro')
                .eq('id', userId)
                .maybeSingle(),
            supabase
                .from('saved_projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId),
        ]);

        if (countError) {
            throw countError;
        }

        return {
            isPro: Boolean(profileData?.is_pro),
            count: count ?? 0,
        };
    }

    function handleUpgradePress() {
        router.push('/pricing');
    }

    useEffect(() => {
        async function loadProject() {
            if (!supabase) return;
            if (!params.projectId) return;
            if (!sessionUserId) return;

            try {
                setLoadingProject(true);

                const { data, error } = await supabase
                    .from('saved_projects')
                    .select('*')
                    .eq('id', params.projectId)
                    .eq('user_id', sessionUserId)
                    .single();

                if (error) {
                    showMessage('Load failed', error.message);
                    return;
                }

                const projectData = (data?.data ?? {}) as QuestProjectData;

                if (typeof projectData.factionName === 'string') {
                    setFactionName(projectData.factionName);
                }

                if (typeof projectData.objectiveSeed === 'string') {
                    setObjectiveSeed(projectData.objectiveSeed);
                }

                if (
                    projectData.tone === 'heroic' ||
                    projectData.tone === 'grim' ||
                    projectData.tone === 'mystic' ||
                    projectData.tone === 'political'
                ) {
                    setTone(projectData.tone);
                }

                if (
                    projectData.scope === 'personal' ||
                    projectData.scope === 'local' ||
                    projectData.scope === 'regional' ||
                    projectData.scope === 'faction'
                ) {
                    setScope(projectData.scope);
                }

                if (projectData.structure === 'one-shot' || projectData.structure === 'three-part') {
                    setStructure(projectData.structure);
                }

                if (
                    projectData.resolutionStyle === 'combat' ||
                    projectData.resolutionStyle === 'diplomacy' ||
                    projectData.resolutionStyle === 'stealth' ||
                    projectData.resolutionStyle === 'choice-driven'
                ) {
                    setResolutionStyle(projectData.resolutionStyle);
                }

                if (
                    projectData.factionImpact === 'minor' ||
                    projectData.factionImpact === 'moderate' ||
                    projectData.factionImpact === 'major'
                ) {
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
    }, [params.projectId, sessionUserId]);

    const result = useMemo(() => {
        const toneHooks: Record<QuestTone, string> = {
            heroic: 'A plea for help offers a chance to protect people from rising danger.',
            grim: 'A simple mission reveals betrayal, sacrifice, and consequences with no clean answer.',
            mystic: 'Ancient powers stir beneath the surface, twisting motives and reality alike.',
            political: 'Every step alters alliances, leverage, and who gets to control the story next.',
        };

        const scopeHooks: Record<QuestScope, string> = {
            personal: 'The central conflict revolves around one person, companion, rival, or bloodline.',
            local: 'The fate of a town, district, outpost, or shrine depends on the outcome.',
            regional: 'Roads, settlements, and multiple powers across the region are affected.',
            faction: 'The mission may change how a faction survives, grows, or fractures.',
        };

        const twists: Record<QuestTone, string[]> = {
            heroic: [
                'The presumed victim willingly disappeared to protect someone else.',
                'The enemy is trying to stop a worse threat from emerging.',
                'Success requires saving both the target and the supposed villain.',
            ],
            grim: [
                'The reward is funded by an atrocity the patron hopes you never learn.',
                'The missing person caused the disaster and is hiding it.',
                'Victory demands sacrificing an ally, reputation, or future resource.',
            ],
            mystic: [
                'The relic is sentient and has chosen the wrong bearer.',
                'The location exists in two states at once and the party must choose one.',
                'An omen reveals the patron has been guided by a false divine sign.',
            ],
            political: [
                'The public reason for the mission is a cover for a power reshuffle.',
                'A rival faction wants the same outcome, but for opposite reasons.',
                'Evidence exists that could collapse a treaty if exposed.',
            ],
        };

        const complications: Record<ResolutionStyle, string[]> = {
            combat: [
                'The objective is protected by a force stronger than expected.',
                'The battlefield shifts midway, splitting the party or changing lines of attack.',
                'Defeating the enemy quickly risks destroying the very thing the party came to recover.',
            ],
            diplomacy: [
                'The opposing side will negotiate, but only if a painful truth is admitted first.',
                'An ally undermines talks by pushing for vengeance.',
                'The party must convince two enemies at once, each with incompatible demands.',
            ],
            stealth: [
                'The target location has layered watch rotations and magical detection.',
                'An informant provides an entry point, but their loyalty is questionable.',
                'Remaining unseen becomes harder once the objective is moved unexpectedly.',
            ],
            'choice-driven': [
                'Every path forward saves one group while exposing another to danger.',
                'A secret changes who truly deserves the reward or blame.',
                'The easiest solution strengthens the wrong faction long term.',
            ],
        };

        const rewardsByImpact: Record<FactionImpact, string[]> = {
            minor: [
                'temporary goodwill with a local contact',
                'modest pay and a useful rumor',
                'safe access to a small restricted area',
            ],
            moderate: [
                'faction influence and a named ally',
                'a rare cache of resources or equipment',
                'political leverage over a recurring NPC or group',
            ],
            major: [
                'control of a strategic route, asset, or stronghold',
                'a powerful relic or binding oath from a major figure',
                'lasting faction realignment in the campaign world',
            ],
        };

        const consequencesByImpact: Record<FactionImpact, string[]> = {
            minor: [
                'a neighborhood or outpost changes hands quietly',
                'a trusted NPC loses standing',
                'future prices or access shift slightly',
            ],
            moderate: [
                'a faction gains or loses public legitimacy',
                'regional patrols, laws, or recruitment begin to shift',
                'an allied group becomes dependent on the party’s choices',
            ],
            major: [
                'war accelerates or a truce becomes possible',
                'a major faction fractures internally',
                'the campaign map changes in a visible and lasting way',
            ],
        };

        const altResolution: Record<ResolutionStyle, string> = {
            combat: 'A direct assault is possible, but a quieter solution could preserve allies and intelligence.',
            diplomacy: 'Talks can work, but pressure, leverage, or a show of force may still be needed.',
            stealth: 'A covert route exists, but discovery could transform the mission into open conflict.',
            'choice-driven': 'There is no perfect route; the “best” ending depends on who the party chooses to protect.',
        };

        const questSeed = `${factionName}|${objectiveSeed}|${tone}|${scope}|${structure}|${resolutionStyle}|${factionImpact}`;
        let seedValue = 0;
        for (let i = 0; i < questSeed.length; i += 1) {
            seedValue += questSeed.charCodeAt(i);
        }

        const twist = twists[tone][seedValue % twists[tone].length];
        const complication = complications[resolutionStyle][seedValue % complications[resolutionStyle].length];
        const reward = rewardsByImpact[factionImpact][seedValue % rewardsByImpact[factionImpact].length];
        const consequence = consequencesByImpact[factionImpact][seedValue % consequencesByImpact[factionImpact].length];

        const hook = `${toneHooks[tone]} ${scopeHooks[scope]}`;
        const objective = `${factionName} needs someone to ${objectiveSeed.toLowerCase()}.`;

        const factionPressure =
            factionImpact === 'minor'
                ? 'This quest affects local standing and immediate trust.'
                : factionImpact === 'moderate'
                    ? 'This quest could noticeably shift faction leverage.'
                    : 'This quest can reshape campaign-level faction power.';

        const questArc =
            structure === 'one-shot'
                ? [
                    `Act 1: The party receives the hook and learns what is truly at stake.`,
                    `Act 2: The complication forces a harder route than expected.`,
                    `Act 3: The twist reframes the ending and the consequence lands immediately.`,
                ]
                : [
                    `Part 1: Initial mission and false understanding of the conflict.`,
                    `Part 2: The complication grows, revealing new enemies, motives, or divided loyalties.`,
                    `Part 3: The twist forces a final choice that determines the lasting consequence.`,
                ];

        return {
            hook,
            objective,
            complication,
            twist,
            reward,
            consequence,
            alternateResolution: altResolution[resolutionStyle],
            factionPressure,
            questArc,
        };
    }, [factionName, objectiveSeed, tone, scope, structure, resolutionStyle, factionImpact]);

    async function handleSaveProject(asNew = false) {
        if (!supabase) {
            showMessage('Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
            return;
        }

        if (!sessionUserId) {
            showMessage('Sign in required', 'Go to the Account tab and sign in before saving a project.');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                factionName,
                objectiveSeed,
                tone,
                scope,
                structure,
                resolutionStyle,
                factionImpact,
                questNotes,
                result,
            };

            const timestampName = `Quest - ${new Date().toLocaleString()}`;

            if (!asNew && currentProjectId) {
                const { error } = await supabase
                    .from('saved_projects')
                    .update({
                        name: loadedProjectName ?? timestampName,
                        data: payload,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', currentProjectId)
                    .eq('user_id', sessionUserId);

                if (error) {
                    showMessage('Update failed', error.message);
                    return;
                }

                await refreshAppState();
                showMessage('Updated', 'Your quest project was updated successfully.');
                return;
            }

            if (asNew || !currentProjectId) {
                await refreshAppState();
                const latestAccess = await getLatestSaveAccess(sessionUserId);

                if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
                    showMessage(
                        'Free limit reached',
                        'Free accounts can save up to 3 projects total. Upgrade to Pro for unlimited saves.'
                    );
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
                })
                .select()
                .single();

            if (error) {
                showMessage('Save failed', error.message);
                return;
            }

            setLoadedProjectName(data?.name ?? timestampName);
            setCurrentProjectId(data?.id ?? null);
            await refreshAppState();

            showMessage('Saved', 'Your quest project was saved successfully.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveAsNew() {
        await handleSaveProject(true);
    }

    return (
        <Screen>
            <Card>
                <Heading>Quest Builder</Heading>
                <BodyText>
                    Build practical quest structure with hooks, twists, consequences, alternate resolutions, and faction pressure.
                </BodyText>
            </Card>

            <ProCard
                isPro={isPro}
                savedProjectCount={savedProjectCount}
                maxFreeSaves={maxFreeSaves}
                onUpgradePress={handleUpgradePress}
            />

            {loadingProject ? (
                <Card>
                    <View style={styles.sessionRow}>
                        <ActivityIndicator />
                        <BodyText>Loading saved project...</BodyText>
                    </View>
                </Card>
            ) : loadedProjectName ? (
                <Card>
                    <Label>Loaded project</Label>
                    <BodyText>{loadedProjectName}</BodyText>
                </Card>
            ) : null}

            <Card>
                <Label>Faction Name</Label>
                <AppInput
                    value={factionName}
                    onChangeText={setFactionName}
                    placeholder="Crimson Pact"
                />

                <Label>Objective Seed</Label>
                <AppInput
                    value={objectiveSeed}
                    onChangeText={setObjectiveSeed}
                    placeholder="Recover a stolen relic"
                />

                <Label>Tone</Label>
                <View style={styles.pillRow}>
                    {(['heroic', 'grim', 'mystic', 'political'] as QuestTone[]).map((option) => {
                        const selected = tone === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setTone(option)}
                                style={[styles.pill, selected && styles.pillSelected]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {option}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>Scope</Label>
                <View style={styles.pillRow}>
                    {(['personal', 'local', 'regional', 'faction'] as QuestScope[]).map((option) => {
                        const selected = scope === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setScope(option)}
                                style={[styles.pill, selected && styles.pillSelected]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {option}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>Quest Structure</Label>
                <View style={styles.pillRow}>
                    {(['one-shot', 'three-part'] as QuestStructure[]).map((option) => {
                        const selected = structure === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setStructure(option)}
                                style={[styles.pill, selected && styles.pillSelected]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {option}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>Primary Resolution Style</Label>
                <View style={styles.pillRow}>
                    {(['combat', 'diplomacy', 'stealth', 'choice-driven'] as ResolutionStyle[]).map((option) => {
                        const selected = resolutionStyle === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setResolutionStyle(option)}
                                style={[styles.pill, selected && styles.pillSelected]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {option}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>Faction Impact</Label>
                <View style={styles.pillRow}>
                    {(['minor', 'moderate', 'major'] as FactionImpact[]).map((option) => {
                        const selected = factionImpact === option;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setFactionImpact(option)}
                                style={[styles.pill, selected && styles.pillSelected]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                                    {option}
                                </BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>Prep Notes</Label>
                <AppInput
                    value={questNotes}
                    onChangeText={setQuestNotes}
                    placeholder="Important NPC, reveal in act 2, clue hidden in chapel, consequence if players refuse..."
                    multiline
                />

                <View style={styles.saveRow}>
                    <View style={styles.actionRow}>
                        <Pressable
                            onPress={() => handleSaveProject(false)}
                            disabled={saving || loadingSession}
                            style={[styles.saveButton, (saving || loadingSession) && styles.saveButtonDisabled]}
                        >
                            <Label style={styles.saveButtonText}>
                                {saving ? 'Saving...' : currentProjectId ? 'Update Project' : 'Save Project'}
                            </Label>
                        </Pressable>

                        <Pressable
                            onPress={handleSaveAsNew}
                            disabled={saving || loadingSession || !sessionUserId}
                            style={[styles.secondaryButton, (saving || loadingSession || !sessionUserId) && styles.saveButtonDisabled]}
                        >
                            <Label style={styles.secondaryButtonText}>Save As New</Label>
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
                                ? 'Loaded project detected. You can update it or save a new copy.'
                                : 'Signed in. Saving is enabled.'}
                        </BodyText>
                    ) : (
                        <BodyText>Not signed in. You can generate quests, but not save yet.</BodyText>
                    )}

                    {sessionUserId && isCreatingNewProject && isAtFreeLimit ? (
                        <UpgradeBanner
                            title="Free plan limit reached"
                            message="You have used all 3 free saves. Upgrade to Pro to create additional projects."
                            buttonLabel="Upgrade to Pro"
                            onPress={handleUpgradePress}
                        />
                    ) : null}
                </View>
            </Card>

            <Card>
                <Label>Quest Hook</Label>
                <View style={styles.resultRow}>
                    <BodyText>{result.hook}</BodyText>
                    <BodyText>{result.objective}</BodyText>
                </View>
            </Card>

            <Card>
                <Label>Complication & Twist</Label>
                <View style={styles.resultRow}>
                    <BodyText>Complication: {result.complication}</BodyText>
                    <BodyText>Twist: {result.twist}</BodyText>
                    <BodyText>Alternate Resolution: {result.alternateResolution}</BodyText>
                </View>
            </Card>

            <Card>
                <Label>Reward & Consequence</Label>
                <View style={styles.resultRow}>
                    <BodyText>Reward: {result.reward}</BodyText>
                    <BodyText>Consequence: {result.consequence}</BodyText>
                    <BodyText>Faction Pressure: {result.factionPressure}</BodyText>
                </View>
            </Card>

            <Card>
                <Label>{structure === 'one-shot' ? 'Quest Flow' : 'Quest Arc'}</Label>
                <View style={styles.resultRow}>
                    {result.questArc.map((entry, index) => (
                        <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
                    ))}
                </View>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    pillRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
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
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    resultRow: {
        gap: 8,
    },
});