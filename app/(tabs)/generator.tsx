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

type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type RewardType = 'gear' | 'gold' | 'consumable' | 'material';
type RewardSource = 'boss' | 'chest' | 'quest' | 'vendor' | 'faction';
type RewardTheme = 'arcane' | 'divine' | 'cursed' | 'martial' | 'wilderness' | 'noble';
type BundleStyle = 'lean' | 'balanced' | 'generous';

type LootProjectData = {
  playerLevel?: number;
  enemyTier?: number;
  rewardType?: RewardType;
  rarity?: LootRarity;
  rewardSource?: RewardSource;
  rewardTheme?: RewardTheme;
  bundleStyle?: BundleStyle;
  prepNotes?: string;
};

type CampaignOption = {
  id: string;
  name: string;
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
  const [rewardSource, setRewardSource] = useState<RewardSource>('chest');
  const [rewardTheme, setRewardTheme] = useState<RewardTheme>('martial');
  const [bundleStyle, setBundleStyle] = useState<BundleStyle>('balanced');
  const [prepNotes, setPrepNotes] = useState('');
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

  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

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

  async function loadCampaignOptions() {
    if (!supabase || !sessionUserId) return;

    try {
      setLoadingCampaigns(true);

      const { data, error } = await supabase
        .from('saved_projects')
        .select('id, name')
        .eq('user_id', sessionUserId)
        .eq('tool_type', 'campaign_hub')
        .order('updated_at', { ascending: false });

      if (error) {
        showMessage('Campaign load failed', error.message);
        return;
      }

      setCampaignOptions((data ?? []) as CampaignOption[]);
    } finally {
      setLoadingCampaigns(false);
    }
  }

  useEffect(() => {
    if (isPro) {
      loadCampaignOptions();
    } else {
      setCampaignOptions([]);
      setLoadingCampaigns(false);
    }
  }, [sessionUserId, currentProjectId, isPro]);

  useEffect(() => {
    if (!isPro) {
      setSelectedCampaignId('');
    }
  }, [isPro]);

  useEffect(() => {
    async function loadProject() {
      if (!supabase) return;
      if (!sessionUserId) return;

      if (!params.projectId) {
        setLoadedProjectName(null);
        setCurrentProjectId(null);
        setSelectedCampaignId('');
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
          showMessage('Load failed', error.message);
          return;
        }

        const projectData = (data?.data ?? {}) as LootProjectData;

        if (typeof data?.campaign_id === 'string' && isPro) {
          setSelectedCampaignId(data.campaign_id);
        } else {
          setSelectedCampaignId('');
        }

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

        if (
          projectData.rewardSource === 'boss' ||
          projectData.rewardSource === 'chest' ||
          projectData.rewardSource === 'quest' ||
          projectData.rewardSource === 'vendor' ||
          projectData.rewardSource === 'faction'
        ) {
          setRewardSource(projectData.rewardSource);
        }

        if (
          projectData.rewardTheme === 'arcane' ||
          projectData.rewardTheme === 'divine' ||
          projectData.rewardTheme === 'cursed' ||
          projectData.rewardTheme === 'martial' ||
          projectData.rewardTheme === 'wilderness' ||
          projectData.rewardTheme === 'noble'
        ) {
          setRewardTheme(projectData.rewardTheme);
        }

        if (
          projectData.bundleStyle === 'lean' ||
          projectData.bundleStyle === 'balanced' ||
          projectData.bundleStyle === 'generous'
        ) {
          setBundleStyle(projectData.bundleStyle);
        }

        if (typeof projectData.prepNotes === 'string') {
          setPrepNotes(projectData.prepNotes);
        }

        setLoadedProjectName(data?.name ?? 'Loaded project');
        setCurrentProjectId(data?.id ?? null);
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [params.projectId, sessionUserId, isPro]);

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
              ? 2.15
              : 3.1;

    const sourceMultiplier =
      rewardSource === 'boss'
        ? 1.4
        : rewardSource === 'chest'
          ? 1.15
          : rewardSource === 'quest'
            ? 1.25
            : rewardSource === 'vendor'
              ? 0.95
              : 1.2;

    const bundleMultiplier =
      bundleStyle === 'lean'
        ? 0.85
        : bundleStyle === 'balanced'
          ? 1
          : 1.25;

    const baseGold = parsedPlayerLevel * parsedEnemyTier * 12;
    const goldAmount = Math.round(baseGold * rarityMultiplier * sourceMultiplier * bundleMultiplier);

    const themedItems: Record<RewardTheme, Record<RewardType, string[]>> = {
      arcane: {
        gear: ['Runed Focus', 'Spellthread Cloak', 'Sigil Rod', 'Aether Band', 'Moonglass Dagger'],
        gold: ['Mage Stipend', 'Sealed Coin Tube', 'Arcane Treasury Token', 'Guild Payout', 'Star Mint Scrip'],
        consumable: ['Mana Tonic', 'Blink Dust', 'Scroll of Sparks', 'Elixir of Clarity', 'Ward Oil'],
        material: ['Aether Crystal', 'Spellglass Shard', 'Runic Ink', 'Leyroot Fiber', 'Moonstone Dust'],
      },
      divine: {
        gear: ['Blessed Shield', 'Sunmetal Charm', 'Saint’s Cloak', 'Votive Blade', 'Halo Pendant'],
        gold: ['Temple Tithe', 'Pilgrim Offering', 'Consecrated Coin Roll', 'Relic Fund', 'Blessed Purse'],
        consumable: ['Healing Draught', 'Holy Water Flask', 'Incense Bundle', 'Prayer Candle Kit', 'Purity Tonic'],
        material: ['Silver Filament', 'Blessed Resin', 'Sanctified Ash', 'Dawn Petal', 'Halo Sand'],
      },
      cursed: {
        gear: ['Hexbound Ring', 'Blood-etched Knife', 'Wailing Locket', 'Shadowmail', 'Marked Bow'],
        gold: ['Black Coin Pouch', 'Forbidden Tribute', 'Grave Mint Coins', 'Night Tax Chest', 'Sin Ledger Voucher'],
        consumable: ['Rot Flask', 'Nightshade Tonic', 'Ash Smoke Bomb', 'Curse Ink Vial', 'Bone Elixir'],
        material: ['Witchbone Dust', 'Rot Resin', 'Shade Thread', 'Black Salt', 'Grave Wax'],
      },
      martial: {
        gear: ['Iron Blade', 'Hunter Bow', 'Runed Shield', 'Traveler Armor', 'Moon Dagger'],
        gold: ['Mercenary Purse', 'War Chest Coins', 'Captain’s Payout', 'Field Bounty', 'Supply Voucher'],
        consumable: ['Battle Tonic', 'Fire Flask', 'Sharpening Oil', 'Smoke Bomb', 'Stamina Draught'],
        material: ['Iron Ore', 'Hardened Leather', 'Weapon Resin', 'Steel Rivets', 'Arrow Fletching'],
      },
      wilderness: {
        gear: ['Thorn Knife', 'Ranger Hood', 'Bone Charm', 'Mosscloak', 'Trail Bow'],
        gold: ['Ranger Cache', 'Hunter’s Purse', 'Frontier Scrip', 'Camp Payout', 'Forest Trade Coin'],
        consumable: ['Antidote Kit', 'Healing Herb Pack', 'Beast Lure', 'Trail Ration Bundle', 'Camouflage Paste'],
        material: ['Ancient Bark', 'Beast Pelt', 'Green Resin', 'Feather Bundle', 'Spirit Herb'],
      },
      noble: {
        gear: ['Signet Rapier', 'Velvet Mantle', 'House Brooch', 'Court Dagger', 'Gilded Buckler'],
        gold: ['Estate Purse', 'Court Reward', 'Tax Ledger Coin', 'Patron’s Gift', 'Silkbound Pouch'],
        consumable: ['Perfumed Tonic', 'Courtly Elixir', 'Fine Oil Flask', 'Banquet Reserve', 'Luxury Remedy'],
        material: ['Silk Thread', 'Gold Leaf', 'Fine Leather', 'Pearl Dust', 'Polished Lacquer'],
      },
    };

    const flavorNotes: Record<RewardSource, string> = {
      boss: 'Boss rewards should feel memorable and include at least one standout element.',
      chest: 'Chest rewards should feel discoverable and satisfying without overshadowing milestone rewards.',
      quest: 'Quest rewards should reflect story effort, faction trust, or completion significance.',
      vendor: 'Vendor rewards should be practical and priced like curated stock, not dramatic treasure spikes.',
      faction: 'Faction rewards should reinforce identity, loyalty, and world politics.',
    };

    const itemPool = themedItems[rewardTheme][rewardType];
    const seed =
      parsedPlayerLevel * 7 +
      parsedEnemyTier * 13 +
      rewardTheme.length * 5 +
      rewardSource.length * 3 +
      rarity.length;

    const itemIndex = seed % itemPool.length;
    const itemName = itemPool[itemIndex];

    const bonusPool =
      bundleStyle === 'lean'
        ? ['small currency bonus', 'one practical extra consumable', 'minor crafting add-on']
        : bundleStyle === 'balanced'
          ? ['supplemental crafting materials', 'backup consumable pack', 'small secondary item']
          : ['bonus rare material bundle', 'secondary themed item', 'extra coin cache'];

    const bonusItem = bonusPool[seed % bonusPool.length];

    const practicalAdvice: string[] = [];

    if (rewardSource === 'boss') {
      practicalAdvice.push('Boss rewards feel best when at least one item changes future player choices.');
    }
    if (rewardType === 'gold' && rarity !== 'common') {
      practicalAdvice.push('High-rarity pure gold can feel flat. Consider pairing it with one named item or hook.');
    }
    if (rewardType === 'material') {
      practicalAdvice.push('Material rewards are stronger when tied to crafting, upgrades, or a known NPC artisan.');
    }
    if (rewardSource === 'vendor') {
      practicalAdvice.push('Vendor rewards should stay useful and dependable rather than wildly swingy.');
    }
    if (bundleStyle === 'generous') {
      practicalAdvice.push('Generous bundles are best used for bosses, milestone quests, or major world progress.');
    }
    if (practicalAdvice.length === 0) {
      practicalAdvice.push('This reward bundle is broadly usable as-is for a typical session reward.');
    }

    return {
      itemName,
      bonusItem,
      goldAmount,
      flavorNote: flavorNotes[rewardSource],
      practicalAdvice,
      rewardSummary: `${rarity} ${rewardTheme} ${rewardType} reward from a ${rewardSource} source.`,
    };
  }, [playerLevel, enemyTier, rewardType, rarity, rewardSource, rewardTheme, bundleStyle]);

  function buildPayload() {
    return {
      playerLevel: Number.parseInt(playerLevel || '1', 10),
      enemyTier: Number.parseInt(enemyTier || '1', 10),
      rewardType,
      rarity,
      rewardSource,
      rewardTheme,
      bundleStyle,
      prepNotes,
      result,
    };
  }

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

      const payload = buildPayload();
      const timestampName = `Loot - ${new Date().toLocaleString()}`;

      if (!asNew && currentProjectId) {
        const { error } = await supabase
          .from('saved_projects')
          .update({
            name: loadedProjectName ?? timestampName,
            data: payload,
            updated_at: new Date().toISOString(),
            campaign_id: null,
          })
          .eq('id', currentProjectId)
          .eq('user_id', sessionUserId);

        if (error) {
          showMessage('Update failed', error.message);
          return;
        }

        await refreshAppState();
        setSelectedCampaignId('');
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
          campaign_id: null,
        })
        .select()
        .single();

      if (error) {
        showMessage('Save failed', error.message);
        return;
      }

      setLoadedProjectName(data?.name ?? timestampName);
      setCurrentProjectId(data?.id ?? null);
      setSelectedCampaignId('');
      await refreshAppState();

      showMessage('Saved', 'Your loot project was saved successfully.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsNew() {
    await handleSaveProject(true);
  }

  async function handleSaveToCampaign() {
    if (!supabase) {
      showMessage('Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      showMessage('Sign in required', 'Go to the Account tab and sign in before saving to a campaign.');
      return;
    }

    if (!isPro) {
      showMessage('Pro required', 'Campaign workspaces are available on Pro.');
      return;
    }

    if (!selectedCampaignId) {
      showMessage('Select a campaign', 'Choose a campaign before adding this project.');
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();
      const timestampName = loadedProjectName ?? `Loot - ${new Date().toLocaleString()}`;

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
          showMessage('Campaign update failed', error.message);
          return;
        }

        await refreshAppState();
        showMessage('Campaign updated', 'This project is now linked to the selected campaign.');
        return;
      }

      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: sessionUserId,
          name: timestampName,
          tool_type: 'loot_generator',
          data: payload,
          campaign_id: selectedCampaignId,
        })
        .select()
        .single();

      if (error) {
        showMessage('Campaign save failed', error.message);
        return;
      }

      setLoadedProjectName(data?.name ?? timestampName);
      setCurrentProjectId(data?.id ?? null);
      await refreshAppState();

      showMessage('Added to campaign', 'This project was saved into the selected campaign.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Heading>Reward Designer</Heading>
        <BodyText>
          Build more useful treasure by combining source, theme, rarity, bundle feel, and practical reward advice.
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
        <Label>Campaign Link</Label>

        {!isPro ? (
          <View style={styles.proLockedBlock}>
            <View style={styles.proLockedHeader}>
              <Label style={styles.proLockedTitle}>★ Pro only</Label>
              <BodyText style={styles.proLockedText}>
                Link this reward setup to a Campaign Hub workspace.
              </BodyText>
            </View>

            <View style={styles.lockedPillRow}>
              <View style={[styles.pill, styles.lockedPill]}>
                <BodyText style={styles.lockedPillText}>none</BodyText>
              </View>
              <View style={[styles.pill, styles.lockedPill]}>
                <BodyText style={styles.lockedPillText}>Campaign Alpha</BodyText>
              </View>
              <View style={[styles.pill, styles.lockedPill]}>
                <BodyText style={styles.lockedPillText}>Boss Arc</BodyText>
              </View>
            </View>

            <BodyText style={styles.proLockedHint}>
              Upgrade to Pro to organize XP, encounters, loot, and quests inside a shared campaign workspace.
            </BodyText>

            <Pressable onPress={handleUpgradePress} style={styles.inlineUpgradeButton}>
              <Label style={styles.inlineUpgradeButtonText}>Get Pro</Label>
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
              onPress={() => setSelectedCampaignId('')}
              style={[styles.pill, selectedCampaignId === '' && styles.pillSelected]}
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
                  onPress={() => setSelectedCampaignId(campaign.id)}
                  style={[styles.pill, selected && styles.pillSelected]}
                >
                  <BodyText style={selected ? styles.pillTextSelected : undefined}>
                    {campaign.name}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <BodyText>No saved campaigns yet. Create one in Campaign Hub to link this project.</BodyText>
        )}

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

        <Label>Reward Source</Label>
        <View style={styles.pillRow}>
          {(['boss', 'chest', 'quest', 'vendor', 'faction'] as RewardSource[]).map((option) => {
            const selected = rewardSource === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRewardSource(option)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Reward Theme</Label>
        <View style={styles.pillRow}>
          {(['arcane', 'divine', 'cursed', 'martial', 'wilderness', 'noble'] as RewardTheme[]).map((option) => {
            const selected = rewardTheme === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRewardTheme(option)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {option}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>Bundle Style</Label>
        <View style={styles.pillRow}>
          {(['lean', 'balanced', 'generous'] as BundleStyle[]).map((option) => {
            const selected = bundleStyle === option;

            return (
              <Pressable
                key={option}
                onPress={() => setBundleStyle(option)}
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
          value={prepNotes}
          onChangeText={setPrepNotes}
          placeholder="Boss cache, faction-issued reward, reward tied to blacksmith upgrade path..."
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

            <Pressable
              onPress={handleSaveToCampaign}
              disabled={saving || loadingSession || !isPro || !selectedCampaignId}
              style={[
                styles.campaignButton,
                (saving || loadingSession || !isPro || !selectedCampaignId) && styles.saveButtonDisabled,
              ]}
            >
              <Label style={styles.campaignButtonText}>
                {!isPro
                  ? 'Add to Campaign'
                  : currentProjectId && selectedCampaignId
                    ? 'Update Campaign'
                    : 'Add to Campaign'}
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
                ? 'Loaded project detected. You can update it, save a new copy, or add it to a campaign.'
                : 'Signed in. Saving is enabled.'}
            </BodyText>
          ) : (
            <BodyText>Not signed in. You can generate loot, but not save yet.</BodyText>
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
        <Label>Reward Summary</Label>
        <View style={styles.resultRow}>
          <BodyText>{result.rewardSummary}</BodyText>
          <BodyText>Featured item: {result.itemName}</BodyText>
          <BodyText>Bonus add-on: {result.bonusItem}</BodyText>
          <BodyText>Gold value: {result.goldAmount}</BodyText>
        </View>
      </Card>

      <Card>
        <Label>Source Guidance</Label>
        <View style={styles.resultRow}>
          <BodyText>{result.flavorNote}</BodyText>
        </View>
      </Card>

      <Card>
        <Label>Practical Reward Advice</Label>
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