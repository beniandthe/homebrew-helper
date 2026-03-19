import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';
import { ProCard } from '@/components/ProCard';
import { AppInput } from '@/components/AppInput';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type QuestTone = 'heroic' | 'grim' | 'mystic' | 'political';
type QuestScope = 'personal' | 'local' | 'regional' | 'faction';

type QuestProjectData = {
    factionName?: string;
    objectiveSeed?: string;
    tone?: QuestTone;
    scope?: QuestScope;
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
    const [loadingProject, setLoadingProject] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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
            heroic: 'A desperate plea for help reveals a chance to save innocents.',
            grim: 'What begins as a simple task exposes betrayal, loss, and hard choices.',
            mystic: 'Ancient forces stir beneath the surface, reshaping what seems possible.',
            political: 'Every move shifts alliances, leverage, and public trust.',
        };

        const scopeHooks: Record<QuestScope, string> = {
            personal: 'The conflict centers on one person, companion, or rival.',
            local: 'The fate of a town, camp, or district hangs in the balance.',
            regional: 'Multiple settlements and roads are affected by the outcome.',
            faction: 'The mission could shift a faction’s power, identity, or survival.',
        };

        const complications = [
            'A trusted contact is secretly feeding information to the enemy.',
            'The target location is already under watch by a rival group.',
            'Success requires choosing between speed and secrecy.',
            'A moral compromise would make the mission much easier.',
            'The reward offered is not what it first appears to be.',
        ];

        const rewards = [
            'access to an elite contact',
            'a rare relic cache',
            'faction influence',
            'a recruitable ally',
            'a hidden route to contested territory',
        ];

        const complicationIndex =
            (factionName.length + objectiveSeed.length + tone.length + scope.length) % complications.length;

        const rewardIndex =
            (factionName.length * 2 + objectiveSeed.length + scope.length) % rewards.length;

        return {
            pitch: `${toneHooks[tone]} ${scopeHooks[scope]}`,
            objective: `${factionName} needs someone to ${objectiveSeed.toLowerCase()}.`,
            complication: complications[complicationIndex],
            reward: rewards[rewardIndex],
        };
    }, [factionName, objectiveSeed, tone, scope]);

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
                <Heading>Quest Generator</Heading>
                <BodyText>
                    Build a quest hook from faction motive, mission seed, tone, and scope.
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

                </View>
            </Card>

            <Card>
                <Label>Generated Quest</Label>
                <View style={styles.resultRow}>
                    <BodyText>{result.pitch}</BodyText>
                    <BodyText>{result.objective}</BodyText>
                    <BodyText>Complication: {result.complication}</BodyText>
                    <BodyText>Reward: {result.reward}</BodyText>
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