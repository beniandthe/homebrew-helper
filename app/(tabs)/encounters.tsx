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

type Difficulty = 'easy' | 'standard' | 'hard' | 'deadly';

type EncounterProjectData = {
  partyLevel?: number;
  partySize?: number;
  enemyCount?: number;
  enemyLevel?: number;
  difficulty?: Difficulty;
};

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function EncounterScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();

  const [partyLevel, setPartyLevel] = useState('3');
  const [partySize, setPartySize] = useState('4');
  const [enemyCount, setEnemyCount] = useState('4');
  const [enemyLevel, setEnemyLevel] = useState('3');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
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

        const projectData = (data?.data ?? {}) as EncounterProjectData;

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

        if (
          projectData.difficulty === 'easy' ||
          projectData.difficulty === 'standard' ||
          projectData.difficulty === 'hard' ||
          projectData.difficulty === 'deadly'
        ) {
          setDifficulty(projectData.difficulty);
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
    const parsedPartyLevel = Math.max(1, Number.parseInt(partyLevel || '1', 10));
    const parsedPartySize = Math.max(1, Number.parseInt(partySize || '1', 10));
    const parsedEnemyCount = Math.max(1, Number.parseInt(enemyCount || '1', 10));
    const parsedEnemyLevel = Math.max(1, Number.parseInt(enemyLevel || '1', 10));

    const partyBudget = parsedPartyLevel * parsedPartySize * 25;
    const enemyBudget = parsedEnemyLevel * parsedEnemyCount * 25;

    const difficultyMultiplier =
      difficulty === 'easy'
        ? 0.75
        : difficulty === 'standard'
          ? 1
          : difficulty === 'hard'
            ? 1.25
            : 1.5;

    const adjustedEnemyBudget = Math.round(enemyBudget * difficultyMultiplier);
    const delta = adjustedEnemyBudget - partyBudget;

    let verdict = 'Balanced';
    if (delta <= -40) verdict = 'Under tuned';
    if (delta >= 40) verdict = 'Dangerous';
    if (delta >= 120) verdict = 'Boss-tier';

    return {
      partyBudget,
      enemyBudget,
      adjustedEnemyBudget,
      delta,
      verdict,
    };
  }, [partyLevel, partySize, enemyCount, enemyLevel, difficulty]);

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
        partyLevel: Number.parseInt(partyLevel || '1', 10),
        partySize: Number.parseInt(partySize || '1', 10),
        enemyCount: Number.parseInt(enemyCount || '1', 10),
        enemyLevel: Number.parseInt(enemyLevel || '1', 10),
        difficulty,
        result,
      };

      const timestampName = `Encounter - ${new Date().toLocaleString()}`;

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

        showMessage('Updated', 'Your encounter project was updated successfully.');
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
          tool_type: 'encounter_calculator',
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

      showMessage('Saved', 'Your encounter project was saved successfully.');
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
        <Heading>Encounter Calculator</Heading>
        <BodyText>
          Estimate whether a fight is under tuned, balanced, dangerous, or boss-tier.
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
        <Label>Party Level</Label>
        <AppInput
          value={partyLevel}
          onChangeText={setPartyLevel}
          keyboardType="numeric"
          placeholder="3"
        />

        <Label>Party Size</Label>
        <AppInput
          value={partySize}
          onChangeText={setPartySize}
          keyboardType="numeric"
          placeholder="4"
        />

        <Label>Enemy Count</Label>
        <AppInput
          value={enemyCount}
          onChangeText={setEnemyCount}
          keyboardType="numeric"
          placeholder="4"
        />

        <Label>Enemy Level</Label>
        <AppInput
          value={enemyLevel}
          onChangeText={setEnemyLevel}
          keyboardType="numeric"
          placeholder="3"
        />

        <Label>Difficulty Target</Label>
        <View style={styles.pillRow}>
          {(['easy', 'standard', 'hard', 'deadly'] as Difficulty[]).map((option) => {
            const selected = difficulty === option;

            return (
              <Pressable
                key={option}
                onPress={() => setDifficulty(option)}
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
            <BodyText>Not signed in. You can calculate, but not save yet.</BodyText>
          )}

        </View>
      </Card>

      <Card>
        <Label>Result</Label>
        <View style={styles.resultRow}>
          <BodyText>Party budget: {result.partyBudget}</BodyText>
          <BodyText>Enemy budget: {result.enemyBudget}</BodyText>
          <BodyText>Adjusted enemy budget: {result.adjustedEnemyBudget}</BodyText>
          <BodyText>Difference: {result.delta}</BodyText>
          <BodyText>Verdict: {result.verdict}</BodyText>
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
    gap: 6,
  },
});