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

type Difficulty = 'easy' | 'standard' | 'hard' | 'deadly';
type EnemyRole = 'brute' | 'skirmisher' | 'controller' | 'artillery' | 'boss';
type TerrainType = 'open' | 'cover-heavy' | 'hazardous' | 'chokepoint' | 'elevated';

type EncounterProjectData = {
  partyLevel?: number;
  partySize?: number;
  enemyCount?: number;
  enemyLevel?: number;
  difficulty?: Difficulty;
  enemyRole?: EnemyRole;
  terrainType?: TerrainType;
  waveCount?: number;
  frontlineCount?: number;
  supportCount?: number;
  controlCount?: number;
  strikerCount?: number;
  encounterNotes?: string;
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
  const [enemyRole, setEnemyRole] = useState<EnemyRole>('brute');
  const [terrainType, setTerrainType] = useState<TerrainType>('open');
  const [waveCount, setWaveCount] = useState('1');

  const [frontlineCount, setFrontlineCount] = useState('1');
  const [supportCount, setSupportCount] = useState('1');
  const [controlCount, setControlCount] = useState('1');
  const [strikerCount, setStrikerCount] = useState('1');

  const [encounterNotes, setEncounterNotes] = useState('');

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

        if (
          projectData.enemyRole === 'brute' ||
          projectData.enemyRole === 'skirmisher' ||
          projectData.enemyRole === 'controller' ||
          projectData.enemyRole === 'artillery' ||
          projectData.enemyRole === 'boss'
        ) {
          setEnemyRole(projectData.enemyRole);
        }

        if (
          projectData.terrainType === 'open' ||
          projectData.terrainType === 'cover-heavy' ||
          projectData.terrainType === 'hazardous' ||
          projectData.terrainType === 'chokepoint' ||
          projectData.terrainType === 'elevated'
        ) {
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
    const parsedWaveCount = Math.max(1, Number.parseInt(waveCount || '1', 10));

    const parsedFrontline = Math.max(0, Number.parseInt(frontlineCount || '0', 10));
    const parsedSupport = Math.max(0, Number.parseInt(supportCount || '0', 10));
    const parsedControl = Math.max(0, Number.parseInt(controlCount || '0', 10));
    const parsedStriker = Math.max(0, Number.parseInt(strikerCount || '0', 10));

    const partyBudgetBase = parsedPartyLevel * parsedPartySize * 25;
    const enemyBudgetBase = parsedEnemyLevel * parsedEnemyCount * 25;

    const difficultyMultiplier =
      difficulty === 'easy'
        ? 0.75
        : difficulty === 'standard'
          ? 1
          : difficulty === 'hard'
            ? 1.25
            : 1.5;

    const enemyRoleMultiplier =
      enemyRole === 'brute'
        ? 1.1
        : enemyRole === 'skirmisher'
          ? 1
          : enemyRole === 'controller'
            ? 1.15
            : enemyRole === 'artillery'
              ? 1.2
              : 1.35;

    const terrainMultiplier =
      terrainType === 'open'
        ? 1
        : terrainType === 'cover-heavy'
          ? 1.1
          : terrainType === 'hazardous'
            ? 1.15
            : terrainType === 'chokepoint'
              ? 1.12
              : 1.08;

    const waveMultiplier = 1 + (parsedWaveCount - 1) * 0.18;

    const partyRoleBonus =
      parsedFrontline * 0.05 +
      parsedSupport * 0.04 +
      parsedControl * 0.04 +
      parsedStriker * 0.03;

    const adjustedPartyBudget = Math.round(partyBudgetBase * (1 + partyRoleBonus));
    const adjustedEnemyBudget = Math.round(
      enemyBudgetBase * difficultyMultiplier * enemyRoleMultiplier * terrainMultiplier * waveMultiplier
    );

    const delta = adjustedEnemyBudget - adjustedPartyBudget;
    const actionEconomyDelta = parsedEnemyCount - parsedPartySize;

    let verdict = 'Balanced';
    if (delta <= -60) verdict = 'Under tuned';
    if (delta >= 50) verdict = 'Dangerous';
    if (delta >= 140) verdict = 'Boss-tier';

    let actionEconomyWarning = 'Action economy looks stable.';
    if (actionEconomyDelta >= 3) {
      actionEconomyWarning = 'Enemies may overwhelm the party through sheer number of turns.';
    } else if (actionEconomyDelta <= -2) {
      actionEconomyWarning = 'The party may out-action this encounter unless enemies hit very hard.';
    }

    let bossSupportRecommendation = 'No special support recommendation.';
    if (enemyRole === 'boss' && parsedEnemyCount <= 1) {
      bossSupportRecommendation = 'Add 2–3 support enemies or a second wave so the boss is not focus-fired.';
    } else if (enemyRole === 'boss' && parsedEnemyCount === 2) {
      bossSupportRecommendation = 'This boss setup is close, but 1 support unit or environmental hazard would help.';
    }

    const recommendations: string[] = [];

    if (terrainType === 'open') {
      recommendations.push('Open terrain favors straightforward damage races. Add cover or elevation for more tactical play.');
    }
    if (terrainType === 'hazardous') {
      recommendations.push('Hazardous terrain raises pressure. Make sure players have at least one safe lane or fallback zone.');
    }
    if (enemyRole === 'artillery') {
      recommendations.push('Artillery enemies need protection or spacing. Pair them with blockers or chokepoints.');
    }
    if (enemyRole === 'controller') {
      recommendations.push('Controllers feel strongest when terrain restricts movement or sight lines.');
    }
    if (parsedWaveCount >= 2) {
      recommendations.push('Multi-wave fights benefit from a clear mid-fight escalation trigger.');
    }
    if (parsedSupport === 0) {
      recommendations.push('Parties without support can struggle in attrition fights. Consider reducing wave pressure or hazards.');
    }

    if (recommendations.length === 0) {
      recommendations.push('This setup is broadly playable. Tune enemy damage or terrain for final feel.');
    }

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
  ]);

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
        enemyRole,
        terrainType,
        waveCount: Number.parseInt(waveCount || '1', 10),
        frontlineCount: Number.parseInt(frontlineCount || '0', 10),
        supportCount: Number.parseInt(supportCount || '0', 10),
        controlCount: Number.parseInt(controlCount || '0', 10),
        strikerCount: Number.parseInt(strikerCount || '0', 10),
        encounterNotes,
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

        await refreshAppState();
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
        <Heading>Encounter Builder</Heading>
        <BodyText>
          Build fights with party roles, enemy behavior, terrain pressure, and wave structure in mind.
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

        <Label>Party Role Mix</Label>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <Label>Frontline</Label>
            <AppInput value={frontlineCount} onChangeText={setFrontlineCount} keyboardType="numeric" />
          </View>
          <View style={styles.gridItem}>
            <Label>Support</Label>
            <AppInput value={supportCount} onChangeText={setSupportCount} keyboardType="numeric" />
          </View>
          <View style={styles.gridItem}>
            <Label>Control</Label>
            <AppInput value={controlCount} onChangeText={setControlCount} keyboardType="numeric" />
          </View>
          <View style={styles.gridItem}>
            <Label>Striker</Label>
            <AppInput value={strikerCount} onChangeText={setStrikerCount} keyboardType="numeric" />
          </View>
        </View>
      </Card>

      <Card>
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

        <Label>Enemy Role</Label>
        <View style={styles.pillRow}>
          {(['brute', 'skirmisher', 'controller', 'artillery', 'boss'] as EnemyRole[]).map((option) => {
            const selected = enemyRole === option;

            return (
              <Pressable
                key={option}
                onPress={() => setEnemyRole(option)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Terrain</Label>
        <View style={styles.pillRow}>
          {(['open', 'cover-heavy', 'hazardous', 'chokepoint', 'elevated'] as TerrainType[]).map((option) => {
            const selected = terrainType === option;

            return (
              <Pressable
                key={option}
                onPress={() => setTerrainType(option)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Wave Count</Label>
        <AppInput
          value={waveCount}
          onChangeText={setWaveCount}
          keyboardType="numeric"
          placeholder="1"
        />

        <Label>Encounter Notes</Label>
        <AppInput
          value={encounterNotes}
          onChangeText={setEncounterNotes}
          placeholder="Boss opens with roar, reinforcements on turn 3, ritual hazard in center..."
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
            <BodyText>Not signed in. You can calculate, but not save yet.</BodyText>
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
        <Label>Encounter Assessment</Label>
        <View style={styles.resultRow}>
          <BodyText>Party budget: {result.adjustedPartyBudget}</BodyText>
          <BodyText>Enemy budget: {result.adjustedEnemyBudget}</BodyText>
          <BodyText>Difference: {result.delta}</BodyText>
          <BodyText>Verdict: {result.verdict}</BodyText>
        </View>
      </Card>

      <Card>
        <Label>Practical Warnings</Label>
        <View style={styles.resultRow}>
          <BodyText>{result.actionEconomyWarning}</BodyText>
          <BodyText>{result.bossSupportRecommendation}</BodyText>
        </View>
      </Card>

      <Card>
        <Label>Builder Notes</Label>
        <View style={styles.resultRow}>
          {result.recommendations.map((entry, index) => (
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