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

type CurveType = 'linear' | 'smooth' | 'steep';

type XpProjectData = {
  levels?: number;
  baseXp?: number;
  growthFactor?: number;
  curveType?: CurveType;
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

        setLoadedProjectName(data?.name ?? 'Loaded project');
        setCurrentProjectId(data?.id ?? null);
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [params.projectId, sessionUserId]);

  const rows = useMemo(() => {
    const parsedLevels = Math.max(1, Number.parseInt(levels || '1', 10));
    const parsedBaseXp = Math.max(1, Number.parseInt(baseXp || '1', 10));
    const parsedGrowthFactor = Math.max(1, Number.parseFloat(growthFactor || '1'));

    const multiplier =
      curveType === 'linear'
        ? 1
        : curveType === 'smooth'
          ? parsedGrowthFactor
          : parsedGrowthFactor + 0.15;

    const result = [];
    let total = 0;

    for (let level = 1; level <= parsedLevels; level += 1) {
      const xpToNext =
        curveType === 'linear'
          ? parsedBaseXp * level
          : Math.round(parsedBaseXp * Math.pow(multiplier, level - 1));

      total += xpToNext;

      result.push({
        level,
        xpToNext,
        totalXp: total,
      });
    }

    return result;
  }, [levels, baseXp, growthFactor, curveType]);

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
        rows,
      };

      const timestampName = `XP Curve - ${new Date().toLocaleString()}`;

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

        showMessage('Updated', 'Your XP project was updated successfully.');
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

      showMessage('Saved', 'Your XP calculator project was saved successfully.');
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
        <Heading>XP Curve Calculator</Heading>
        <BodyText>
          Build progression curves for leveling systems across tabletop and digital RPGs.
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
          onChangeText={setBaseXp}
          keyboardType="numeric"
          placeholder="100"
        />

        <Label>Growth Factor</Label>
        <AppInput
          value={growthFactor}
          onChangeText={setGrowthFactor}
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
                onPress={() => setCurveType(option)}
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
        <Label>Preview</Label>
        {rows.slice(0, 10).map((row) => (
          <View key={row.level} style={styles.resultRow}>
            <BodyText>Level {row.level}</BodyText>
            <BodyText>Next: {row.xpToNext.toLocaleString()} XP</BodyText>
            <BodyText>Total: {row.totalXp.toLocaleString()} XP</BodyText>
          </View>
        ))}
        {rows.length > 10 ? (
          <BodyText>Showing first 10 of {rows.length} levels.</BodyText>
        ) : null}
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