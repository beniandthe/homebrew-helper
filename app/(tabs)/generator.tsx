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

type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type RewardType = 'gear' | 'gold' | 'consumable' | 'material';

type LootProjectData = {
  playerLevel?: number;
  enemyTier?: number;
  rewardType?: RewardType;
  rarity?: LootRarity;
  goldAmount?: number;
};

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function LootScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();

  const [playerLevel, setPlayerLevel] = useState('5');
  const [enemyTier, setEnemyTier] = useState('1');
  const [rewardType, setRewardType] = useState<RewardType>('gear');
  const [rarity, setRarity] = useState<LootRarity>('common');
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

        const projectData = (data?.data ?? {}) as LootProjectData;

        if (typeof projectData.playerLevel === 'number') {
          setPlayerLevel(String(projectData.playerLevel));
        }

        if (typeof projectData.enemyTier === 'number') {
          setEnemyTier(String(projectData.enemyTier));
        }

        if (
          projectData.rewardType === 'gear' ||
          projectData.rewardType === 'gold' ||
          projectData.rewardType === 'consumable' ||
          projectData.rewardType === 'material'
        ) {
          setRewardType(projectData.rewardType);
        }

        if (
          projectData.rarity === 'common' ||
          projectData.rarity === 'uncommon' ||
          projectData.rarity === 'rare' ||
          projectData.rarity === 'epic' ||
          projectData.rarity === 'legendary'
        ) {
          setRarity(projectData.rarity);
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
    const parsedPlayerLevel = Math.max(1, Number.parseInt(playerLevel || '1', 10));
    const parsedEnemyTier = Math.max(1, Number.parseInt(enemyTier || '1', 10));

    const rarityMultiplier =
      rarity === 'common'
        ? 1
        : rarity === 'uncommon'
          ? 1.25
          : rarity === 'rare'
            ? 1.6
            : rarity === 'epic'
              ? 2.1
              : 3;

    const baseGold = parsedPlayerLevel * parsedEnemyTier * 12;
    const goldAmount = Math.round(baseGold * rarityMultiplier);

    const itemPool =
      rewardType === 'gear'
        ? ['Iron Blade', 'Hunter Bow', 'Runed Shield', 'Traveler Armor', 'Moon Dagger']
        : rewardType === 'gold'
          ? ['Coin Cache', 'Treasure Purse', 'Vault Key', 'Merchant Scrip', 'Tax Chest']
          : rewardType === 'consumable'
            ? ['Healing Draught', 'Fire Flask', 'Antidote Kit', 'Smoke Bomb', 'Mana Tonic']
            : ['Iron Ore', 'Essence Shard', 'Ancient Bark', 'Beast Pelt', 'Arcane Dust'];

    const itemIndex = (parsedPlayerLevel + parsedEnemyTier + rewardType.length + rarity.length) % itemPool.length;
    const itemName = itemPool[itemIndex];

    return {
      goldAmount,
      itemName,
      rarity,
      rewardType,
    };
  }, [playerLevel, enemyTier, rewardType, rarity]);

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
        playerLevel: Number.parseInt(playerLevel || '1', 10),
        enemyTier: Number.parseInt(enemyTier || '1', 10),
        rewardType,
        rarity,
        goldAmount: result.goldAmount,
        itemName: result.itemName,
      };

      const timestampName = `Loot - ${new Date().toLocaleString()}`;

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

        showMessage('Updated', 'Your loot project was updated successfully.');
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
          tool_type: 'loot_generator',
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

      showMessage('Saved', 'Your loot project was saved successfully.');
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
        <Heading>Loot Generator</Heading>
        <BodyText>
          Generate a quick reward suggestion based on player level, enemy tier, reward type, and rarity.
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
        <Label>Player Level</Label>
        <AppInput
          value={playerLevel}
          onChangeText={setPlayerLevel}
          keyboardType="numeric"
          placeholder="5"
        />

        <Label>Enemy Tier</Label>
        <AppInput
          value={enemyTier}
          onChangeText={setEnemyTier}
          keyboardType="numeric"
          placeholder="1"
        />

        <Label>Reward Type</Label>
        <View style={styles.pillRow}>
          {(['gear', 'gold', 'consumable', 'material'] as RewardType[]).map((option) => {
            const selected = rewardType === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRewardType(option)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Rarity</Label>
        <View style={styles.pillRow}>
          {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as LootRarity[]).map((option) => {
            const selected = rarity === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRarity(option)}
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
            <BodyText>Not signed in. You can generate loot, but not save yet.</BodyText>
          )}

        </View>
      </Card>

      <Card>
        <Label>Generated Reward</Label>
        <View style={styles.resultRow}>
          <BodyText>Reward type: {result.rewardType}</BodyText>
          <BodyText>Rarity: {result.rarity}</BodyText>
          <BodyText>Item: {result.itemName}</BodyText>
          <BodyText>Gold value: {result.goldAmount}</BodyText>
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