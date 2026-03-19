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

type CurveType = 'linear' | 'smooth' | 'steep';
type ProgressionPreset = 'slow' | 'standard' | 'heroic' | 'brutal' | 'custom';
type ProgressionMode = 'xp' | 'milestone';

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
};

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function XpCalculatorScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();

  const [loadingProject, setLoadingProject] = useState(false);
  const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [levels, setLevels] = useState('20');
  const [baseXp, setBaseXp] = useState('100');
  const [growthFactor, setGrowthFactor] = useState('1.3');
  const [curveType, setCurveType] = useState<CurveType>('smooth');

  const [progressionPreset, setProgressionPreset] = useState<ProgressionPreset>('standard');
  const [progressionMode, setProgressionMode] = useState<ProgressionMode>('xp');
  const [encountersPerSession, setEncountersPerSession] = useState('2');
  const [encountersPerLevel, setEncountersPerLevel] = useState('4');
  const [progressionNotes, setProgressionNotes] = useState('');

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

  function applyPreset(preset: ProgressionPreset) {
    setProgressionPreset(preset);

    if (preset === 'slow') {
      setBaseXp('140');
      setGrowthFactor('1.4');
      setCurveType('steep');
      setEncountersPerLevel('6');
      return;
    }

    if (preset === 'standard') {
      setBaseXp('100');
      setGrowthFactor('1.3');
      setCurveType('smooth');
      setEncountersPerLevel('4');
      return;
    }

    if (preset === 'heroic') {
      setBaseXp('80');
      setGrowthFactor('1.18');
      setCurveType('smooth');
      setEncountersPerLevel('3');
      return;
    }

    if (preset === 'brutal') {
      setBaseXp('160');
      setGrowthFactor('1.45');
      setCurveType('steep');
      setEncountersPerLevel('7');
      return;
    }
  }

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

        const projectData = (data?.data ?? {}) as XpProjectData;

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

        setLoadedProjectName(data?.name ?? 'Loaded project');
        setCurrentProjectId(data?.id ?? null);
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [params.projectId, sessionUserId]);

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
            ? parsedBaseXp * level
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

    let pacingAssessment = 'Balanced long-form pacing.';
    if (parsedEncountersPerLevel <= 3) pacingAssessment = 'Fast, heroic pacing with frequent advancement.';
    if (parsedEncountersPerLevel >= 6) pacingAssessment = 'Slow-burn pacing suited for long campaigns or gritty systems.';
    if (progressionMode === 'milestone') pacingAssessment = 'Milestone pacing prioritizes narrative beats over combat math.';

    const milestoneSuggestions = [
      `Level 3: establish subclass, specialization, or defining class identity.`,
      `Level ${Math.max(4, Math.floor(parsedLevels * 0.35))}: grant a major gear, faction, or narrative unlock.`,
      `Level ${Math.max(6, Math.floor(parsedLevels * 0.6))}: introduce a strong power spike or campaign shift.`,
      `Level ${parsedLevels}: reserve for endgame mastery, capstone, or finale content.`,
    ];

    const practicalAdvice: string[] = [];

    if (progressionMode === 'milestone') {
      practicalAdvice.push('Use milestone mode when campaign pacing should follow story victories rather than encounter frequency.');
    } else {
      practicalAdvice.push('XP mode works best when encounter count and challenge are relatively consistent session to session.');
    }

    if (parsedEncountersPerSession === 1) {
      practicalAdvice.push('One encounter per session can make XP pacing feel very slow unless rewards are large or milestone beats are frequent.');
    }

    if (parsedEncountersPerLevel >= 6) {
      practicalAdvice.push('High encounters-per-level pacing can create grind unless each level meaningfully changes player options.');
    }

    if (curveType === 'steep') {
      practicalAdvice.push('Steep curves are strongest when late-game levels are intentionally rare and dramatic.');
    }

    if (curveType === 'linear') {
      practicalAdvice.push('Linear curves are easier to communicate and tune, but may feel less dramatic over time.');
    }

    if (practicalAdvice.length === 0) {
      practicalAdvice.push('This progression setup should be broadly usable for a typical campaign arc.');
    }

    return {
      rows,
      totalEncounterCount,
      estimatedSessionsToCap,
      pacingAssessment,
      milestoneSuggestions,
      practicalAdvice,
    };
  }, [
    levels,
    baseXp,
    growthFactor,
    curveType,
    progressionMode,
    encountersPerSession,
    encountersPerLevel,
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
        levels: Number.parseInt(levels || '1', 10),
        baseXp: Number.parseInt(baseXp || '1', 10),
        growthFactor: Number.parseFloat(growthFactor || '1'),
        curveType,
        progressionPreset,
        progressionMode,
        encountersPerSession: Number.parseInt(encountersPerSession || '1', 10),
        encountersPerLevel: Number.parseInt(encountersPerLevel || '1', 10),
        progressionNotes,
        result,
      };

      const timestampName = `XP Planner - ${new Date().toLocaleString()}`;

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
        showMessage('Updated', 'Your progression project was updated successfully.');
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
          tool_type: 'xp_calculator',
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

      showMessage('Saved', 'Your progression project was saved successfully.');
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
        <Heading>Progression Planner</Heading>
        <BodyText>
          Plan leveling pace, compare advancement styles, and estimate how long a campaign takes to reach key milestones.
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
          {currentProjectId ? <BodyText>ID: {currentProjectId}</BodyText> : null}
        </Card>
      ) : null}

      <Card>
        <Label>Progression Preset</Label>
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
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Progression Mode</Label>
        <View style={styles.pillRow}>
          {(['xp', 'milestone'] as ProgressionMode[]).map((option) => {
            const selected = progressionMode === option;

            return (
              <Pressable
                key={option}
                onPress={() => setProgressionMode(option)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Number of Levels</Label>
        <AppInput
          value={levels}
          onChangeText={setLevels}
          keyboardType="numeric"
          placeholder="20"
        />

        <Label>Base XP</Label>
        <AppInput
          value={baseXp}
          onChangeText={(value) => {
            setProgressionPreset('custom');
            setBaseXp(value);
          }}
          keyboardType="numeric"
          placeholder="100"
        />

        <Label>Growth Factor</Label>
        <AppInput
          value={growthFactor}
          onChangeText={(value) => {
            setProgressionPreset('custom');
            setGrowthFactor(value);
          }}
          keyboardType="decimal-pad"
          placeholder="1.3"
        />

        <Label>Curve Type</Label>
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
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Encounters per Session</Label>
        <AppInput
          value={encountersPerSession}
          onChangeText={setEncountersPerSession}
          keyboardType="numeric"
          placeholder="2"
        />

        <Label>Expected Encounters per Level</Label>
        <AppInput
          value={encountersPerLevel}
          onChangeText={setEncountersPerLevel}
          keyboardType="numeric"
          placeholder="4"
        />

        <Label>Progression Notes</Label>
        <AppInput
          value={progressionNotes}
          onChangeText={setProgressionNotes}
          placeholder="Subclass unlock at 3, faction milestone at 6, artifact tier at 10..."
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
        <Label>Pacing Summary</Label>
        <View style={styles.resultRow}>
          <BodyText>{result.pacingAssessment}</BodyText>
          <BodyText>Estimated total encounters: {result.totalEncounterCount}</BodyText>
          <BodyText>Estimated sessions to cap: {result.estimatedSessionsToCap}</BodyText>
        </View>
      </Card>

      <Card>
        <Label>Leveling Preview</Label>
        {progressionMode === 'milestone' ? (
          <BodyText>Milestone mode is active. Advancement is guided by story beats rather than XP totals.</BodyText>
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
      </Card>

      <Card>
        <Label>Milestone Suggestions</Label>
        <View style={styles.resultRow}>
          {result.milestoneSuggestions.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </Card>

      <Card>
        <Label>Practical Advice</Label>
        <View style={styles.resultRow}>
          {result.practicalAdvice.map((entry, index) => (
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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