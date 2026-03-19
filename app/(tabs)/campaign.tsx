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

type CampaignTone = 'heroic' | 'grim' | 'mystic' | 'political' | 'sandbox';

type CampaignProjectData = {
    campaignName?: string;
    systemName?: string;
    tone?: CampaignTone;
    levelBand?: string;
    partyName?: string;
    mainFaction?: string;
    campaignSummary?: string;
    currentObjective?: string;
    sessionNotes?: string;
};

function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        return;
    }

    Alert.alert(title, message);
}

export default function CampaignScreen() {
    const params = useLocalSearchParams<{ projectId?: string }>();

    const [campaignName, setCampaignName] = useState('Eryndor Campaign');
    const [systemName, setSystemName] = useState('D&D 5e');
    const [tone, setTone] = useState<CampaignTone>('heroic');
    const [levelBand, setLevelBand] = useState('Levels 1-5');
    const [partyName, setPartyName] = useState('The Ashen Company');
    const [mainFaction, setMainFaction] = useState('Crimson Pact');
    const [campaignSummary, setCampaignSummary] = useState('');
    const [currentObjective, setCurrentObjective] = useState('');
    const [sessionNotes, setSessionNotes] = useState('');

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

                const projectData = (data?.data ?? {}) as CampaignProjectData;

                if (typeof projectData.campaignName === 'string') setCampaignName(projectData.campaignName);
                if (typeof projectData.systemName === 'string') setSystemName(projectData.systemName);
                if (
                    projectData.tone === 'heroic' ||
                    projectData.tone === 'grim' ||
                    projectData.tone === 'mystic' ||
                    projectData.tone === 'political' ||
                    projectData.tone === 'sandbox'
                ) {
                    setTone(projectData.tone);
                }
                if (typeof projectData.levelBand === 'string') setLevelBand(projectData.levelBand);
                if (typeof projectData.partyName === 'string') setPartyName(projectData.partyName);
                if (typeof projectData.mainFaction === 'string') setMainFaction(projectData.mainFaction);
                if (typeof projectData.campaignSummary === 'string') setCampaignSummary(projectData.campaignSummary);
                if (typeof projectData.currentObjective === 'string') setCurrentObjective(projectData.currentObjective);
                if (typeof projectData.sessionNotes === 'string') setSessionNotes(projectData.sessionNotes);

                setLoadedProjectName(data?.name ?? 'Loaded project');
                setCurrentProjectId(data?.id ?? null);
            } finally {
                setLoadingProject(false);
            }
        }

        loadProject();
    }, [params.projectId, sessionUserId]);

    const campaignSnapshot = useMemo(() => {
        const summary = campaignSummary.trim() || 'No campaign summary written yet.';
        const objective = currentObjective.trim() || 'No current objective set.';
        const notesState =
            sessionNotes.trim().length > 0
                ? 'Session notes are active and ready for ongoing prep.'
                : 'No session notes yet. Add recap points, hooks, or unresolved threads.';

        return {
            summary,
            objective,
            notesState,
            toneSummary: `${tone} tone • ${levelBand} • ${systemName}`,
        };
    }, [campaignSummary, currentObjective, sessionNotes, tone, levelBand, systemName]);

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
                campaignName,
                systemName,
                tone,
                levelBand,
                partyName,
                mainFaction,
                campaignSummary,
                currentObjective,
                sessionNotes,
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
                    showMessage('Update failed', error.message);
                    return;
                }

                setLoadedProjectName(timestampName);
                await refreshAppState();
                showMessage('Updated', 'Your campaign hub was updated successfully.');
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
                    tool_type: 'campaign_hub',
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

            showMessage('Saved', 'Your campaign hub was saved successfully.');
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
                <Heading>Campaign Hub</Heading>
                <BodyText>
                    Organize your campaign identity, party focus, faction pressure, and session prep in one central place.
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
                        <BodyText>Loading saved campaign...</BodyText>
                    </View>
                </Card>
            ) : loadedProjectName ? (
                <Card>
                    <Label>Loaded campaign</Label>
                    <BodyText>{loadedProjectName}</BodyText>
                </Card>
            ) : null}

            <Card>
                <Label>Campaign Name</Label>
                <AppInput value={campaignName} onChangeText={setCampaignName} placeholder="Eryndor Campaign" />

                <Label>System / Ruleset</Label>
                <AppInput value={systemName} onChangeText={setSystemName} placeholder="D&D 5e" />

                <Label>Tone</Label>
                <View style={styles.pillRow}>
                    {(['heroic', 'grim', 'mystic', 'political', 'sandbox'] as CampaignTone[]).map((option) => {
                        const selected = tone === option;
                        return (
                            <Pressable
                                key={option}
                                onPress={() => setTone(option)}
                                style={[styles.pill, selected && styles.pillSelected]}
                            >
                                <BodyText style={selected ? styles.pillTextSelected : undefined}>{option}</BodyText>
                            </Pressable>
                        );
                    })}
                </View>

                <Label>Level Band</Label>
                <AppInput value={levelBand} onChangeText={setLevelBand} placeholder="Levels 1-5" />

                <Label>Party Name / Group</Label>
                <AppInput value={partyName} onChangeText={setPartyName} placeholder="The Ashen Company" />

                <Label>Main Faction</Label>
                <AppInput value={mainFaction} onChangeText={setMainFaction} placeholder="Crimson Pact" />

                <Label>Campaign Summary</Label>
                <AppInput
                    value={campaignSummary}
                    onChangeText={setCampaignSummary}
                    placeholder="What is this campaign about, at a high level?"
                    multiline
                />

                <Label>Current Objective</Label>
                <AppInput
                    value={currentObjective}
                    onChangeText={setCurrentObjective}
                    placeholder="What is the party trying to accomplish right now?"
                    multiline
                />

                <Label>Session Notes</Label>
                <AppInput
                    value={sessionNotes}
                    onChangeText={setSessionNotes}
                    placeholder="Recap, unresolved hooks, next-scene prep, NPC reminders..."
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
                                {saving ? 'Saving...' : currentProjectId ? 'Update Campaign' : 'Save Campaign'}
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
                                ? 'Loaded campaign detected. You can update it or save a new copy.'
                                : 'Signed in. Saving is enabled.'}
                        </BodyText>
                    ) : (
                        <BodyText>Not signed in. You can plan, but not save yet.</BodyText>
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
                <Label>Campaign Snapshot</Label>
                <View style={styles.resultRow}>
                    <BodyText>{campaignSnapshot.toneSummary}</BodyText>
                    <BodyText>Party: {partyName || 'No party name set'}</BodyText>
                    <BodyText>Primary faction: {mainFaction || 'No faction set'}</BodyText>
                </View>
            </Card>

            <Card>
                <Label>Story Focus</Label>
                <View style={styles.resultRow}>
                    <BodyText>Summary: {campaignSnapshot.summary}</BodyText>
                    <BodyText>Current objective: {campaignSnapshot.objective}</BodyText>
                </View>
            </Card>

            <Card>
                <Label>Session Readiness</Label>
                <View style={styles.resultRow}>
                    <BodyText>{campaignSnapshot.notesState}</BodyText>
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