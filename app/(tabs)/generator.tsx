import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppState } from '@/contexts/AppStateContext';
import { ProCard } from '@/components/ProCard';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { AppInput } from '@/components/AppInput';
import { BodyText, Label } from '@/components/AppText';
import { DisclosurePanel } from '@/components/DisclosurePanel';
import { Screen } from '@/components/Screen';
import { SystemHero } from '@/components/SystemHero';
import { SystemPanel } from '@/components/SystemPanel';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';
import { useGameSystem } from '@/contexts/GameSystemContext';
import {
  buildDndCampaignLinkContext,
  getDndRewardRecipientCandidates,
  getDndRewardRecipientSuggestions,
} from '@/lib/dndCampaignLinkContext';
import {
  syncDndCampaignInventoryItem,
  syncDndTreasureLedgerEntry,
  syncDndTreasuryAwardEntry,
  type DndTreasureLedgerEntry,
} from '@/lib/dndCampaignLedger';
import { type DndInventoryItem } from '@/lib/dnd5eCampaignKit';
import { buildSeed, pickFromPool, pickManyFromPool } from '@/lib/generation';
import { getGameSystem, resolveGameSystemId, type GameSystemId } from '@/lib/gameSystems';
import {
  getCampaignLinkPreview,
  NO_CAMPAIGN_OPTION_LABEL,
} from '@/lib/campaignLinkPreview';
import { getSystemPresentation } from '@/lib/systemPresentation';
import {
  applyCampaignSystemToPayload,
  fetchCampaignOptionById,
  fetchCampaignOptions,
  fetchLatestSaveAccess,
  getErrorMessage,
  type CampaignOption,
} from '@/lib/projectAccess';
import {
  buildRewardDetail,
  buildRewardName,
  getBundleStyleMultiplier,
  getLootRarityMultiplier,
  getRewardSourceMultiplier,
  getRewardSystemConfig,
  type BundleStyle,
  type LootRarity,
  type RewardSource,
  type RewardTheme,
  type RewardType,
} from '@/lib/systemTooling';
import { getCampaignLinkUpsell, getFreeLimitUpsell } from '@/lib/subscriptionUi';

type LootProjectData = {
  playerLevel?: number;
  enemyTier?: number;
  rewardType?: RewardType;
  rarity?: LootRarity;
  rewardSource?: RewardSource;
  rewardTheme?: RewardTheme;
  bundleStyle?: BundleStyle;
  prepNotes?: string;
  promotionHolder?: string;
  systemId?: GameSystemId;
  systemName?: string;
};

const REWARD_TYPE_OPTIONS: RewardType[] = ['gear', 'gold', 'consumable', 'material'];
const RARITY_OPTIONS: LootRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const REWARD_SOURCE_OPTIONS: RewardSource[] = ['boss', 'chest', 'quest', 'vendor', 'faction'];
const REWARD_THEME_OPTIONS: RewardTheme[] = ['arcane', 'divine', 'cursed', 'martial', 'wilderness', 'noble'];
const BUNDLE_STYLE_OPTIONS: BundleStyle[] = ['lean', 'balanced', 'generous'];

function getPromotedRewardCategory(rewardType: RewardType, itemName: string) {
  const normalized = itemName.trim().toLowerCase();

  if (rewardType === 'consumable' || normalized.includes('potion') || normalized.includes('scroll')) {
    return 'Consumable';
  }

  if (rewardType === 'material') {
    return 'Crafting material';
  }

  if (rewardType === 'gold') {
    return 'Treasure';
  }

  return 'Magic item';
}

function getPromotedRewardAttunement(rewardType: RewardType, rarity: LootRarity, itemName: string) {
  const normalized = itemName.trim().toLowerCase();

  if (rewardType === 'consumable' || normalized.includes('potion') || normalized.includes('scroll')) {
    return 'No';
  }

  if (rewardType === 'gear' && (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary')) {
    return 'Review';
  }

  return 'No';
}

export default function LootScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { activeSystemId, setActiveSystemId } = useGameSystem();
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [lockedCampaignSystemId, setLockedCampaignSystemId] = useState<GameSystemId | null>(null);
  const selectedCampaign = useMemo(
    () => campaignOptions.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaignOptions, selectedCampaignId]
  );
  const effectiveSystemId = lockedCampaignSystemId ?? activeSystemId;
  const effectiveSystem = useMemo(() => getGameSystem(effectiveSystemId), [effectiveSystemId]);
  const rewardConfig = useMemo(() => getRewardSystemConfig(effectiveSystemId), [effectiveSystemId]);
  const palette = useMemo(() => getSystemPresentation(effectiveSystemId).palette, [effectiveSystemId]);
  const campaignLinkPreview = useMemo(() => getCampaignLinkPreview('loot', effectiveSystemId), [effectiveSystemId]);
  const dndCampaignContext = useMemo(
    () => (effectiveSystemId === 'dnd5e' ? buildDndCampaignLinkContext(selectedCampaign?.data) : null),
    [effectiveSystemId, selectedCampaign?.data]
  );

  const [playerLevel, setPlayerLevel] = useState(rewardConfig.defaults.playerLevel);
  const [enemyTier, setEnemyTier] = useState(rewardConfig.defaults.enemyTier);
  const [rewardType, setRewardType] = useState<RewardType>(rewardConfig.defaults.rewardType);
  const [rarity, setRarity] = useState<LootRarity>(rewardConfig.defaults.rarity);
  const [rewardSource, setRewardSource] = useState<RewardSource>(rewardConfig.defaults.rewardSource);
  const [rewardTheme, setRewardTheme] = useState<RewardTheme>(rewardConfig.defaults.rewardTheme);
  const [bundleStyle, setBundleStyle] = useState<BundleStyle>(rewardConfig.defaults.bundleStyle);
  const [prepNotes, setPrepNotes] = useState('');
  const [promotionHolder, setPromotionHolder] = useState('Shared');
  const [variationSeed, setVariationSeed] = useState(0);
  const [appliedCampaignDefaultsId, setAppliedCampaignDefaultsId] = useState('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [promotingReward, setPromotingReward] = useState<'featured' | 'bonus' | 'currency' | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [moreSaveActionsOpen, setMoreSaveActionsOpen] = useState(false);

  const {
    userId: sessionUserId,
    isPro,
    savedProjectCount,
    loading: loadingSession,
    refreshAppState,
  } = useAppState();

  const [statusBanner, setStatusBanner] = useState<{
    title?: string;
    message: string;
    variant: StatusBannerVariant;
  } | null>(null);

  const maxFreeSaves = 3;
  const isAtFreeLimit = !isPro && savedProjectCount >= maxFreeSaves;
  const isCreatingNewProject = !currentProjectId;
  const freeLimitUpsell = getFreeLimitUpsell(maxFreeSaves);
  const campaignLinkUpsell = getCampaignLinkUpsell('This reward setup');

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

  const loadCampaignOptions = useCallback(async () => {
    if (!supabase || !sessionUserId) return;

    try {
      setLoadingCampaigns(true);
      setCampaignOptions(await fetchCampaignOptions(supabase, sessionUserId));
    } catch (error) {
      setBanner('error', 'Campaign load failed', getErrorMessage(error));
    } finally {
      setLoadingCampaigns(false);
    }
  }, [sessionUserId]);

  const refreshSelectedCampaignData = useCallback(async () => {
    if (!supabase || !sessionUserId || !selectedCampaignId) {
      return;
    }

    try {
      const refreshed = await fetchCampaignOptionById(supabase, sessionUserId, selectedCampaignId);
      if (!refreshed) {
        return;
      }

      setCampaignOptions((current) => {
        const existing = current.find((campaign) => campaign.id === refreshed.id);
        if (!existing) {
          return [refreshed, ...current];
        }

        return current.map((campaign) => (campaign.id === refreshed.id ? refreshed : campaign));
      });
    } catch {
      // Keep the generator responsive even if the campaign refresh misses.
    }
  }, [selectedCampaignId, sessionUserId]);

  useEffect(() => {
    if (isPro) {
      loadCampaignOptions();
    } else {
      setCampaignOptions([]);
      setLoadingCampaigns(false);
    }
  }, [sessionUserId, currentProjectId, isPro, loadCampaignOptions]);

  useEffect(() => {
    if (!isPro) {
      setSelectedCampaignId('');
    }
  }, [isPro]);

  useEffect(() => {
    if (params.projectId || currentProjectId) {
      return;
    }

    setPlayerLevel(rewardConfig.defaults.playerLevel);
    setEnemyTier(rewardConfig.defaults.enemyTier);
    setRewardType(rewardConfig.defaults.rewardType);
    setRarity(rewardConfig.defaults.rarity);
    setRewardSource(rewardConfig.defaults.rewardSource);
    setRewardTheme(rewardConfig.defaults.rewardTheme);
    setBundleStyle(rewardConfig.defaults.bundleStyle);
    setPrepNotes('');
    setPromotionHolder('Shared');
    setVariationSeed(0);
    setAppliedCampaignDefaultsId('');
    setAdvancedOpen(false);
    setMoreSaveActionsOpen(false);
  }, [rewardConfig, params.projectId, currentProjectId]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setAppliedCampaignDefaultsId('');
      return;
    }

    if (effectiveSystemId !== 'dnd5e' || !dndCampaignContext) {
      return;
    }

    if (params.projectId || currentProjectId || appliedCampaignDefaultsId === selectedCampaignId) {
      return;
    }

    if (dndCampaignContext.averageLevel) {
      setPlayerLevel(String(dndCampaignContext.averageLevel));
    }

    if (prepNotes.trim().length === 0 && dndCampaignContext.defaultTreasureNote) {
      setPrepNotes(dndCampaignContext.defaultTreasureNote);
    }

    if (promotionHolder.trim().length === 0 || promotionHolder === 'Shared') {
      setPromotionHolder(getDndRewardRecipientCandidates(dndCampaignContext, rewardTheme)[0]?.name ?? 'Shared');
    }

    setAppliedCampaignDefaultsId(selectedCampaignId);
  }, [
    appliedCampaignDefaultsId,
    currentProjectId,
    dndCampaignContext,
    effectiveSystemId,
    params.projectId,
    prepNotes,
    promotionHolder,
    rewardTheme,
    selectedCampaignId,
  ]);

  useEffect(() => {
    async function loadProject() {
      if (!supabase) return;
      if (!sessionUserId) return;

      if (!params.projectId) {
        setLoadedProjectName(null);
        setCurrentProjectId(null);
        setSelectedCampaignId('');
        setLockedCampaignSystemId(null);
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
          setBanner('error', 'Load failed', error.message);
          return;
        }

        const projectData = (data?.data ?? {}) as LootProjectData;
        let linkedCampaign: CampaignOption | null = null;

        if (typeof data?.campaign_id === 'string' && isPro) {
          setSelectedCampaignId(data.campaign_id);
          linkedCampaign = await fetchCampaignOptionById(supabase, sessionUserId, data.campaign_id);
        } else {
          setSelectedCampaignId('');
          setLockedCampaignSystemId(null);
        }

        if (linkedCampaign) {
          setLockedCampaignSystemId(linkedCampaign.systemId);
          setActiveSystemId(linkedCampaign.systemId);
        } else if (projectData.systemId || projectData.systemName) {
          setActiveSystemId(resolveGameSystemId(projectData.systemId ?? projectData.systemName));
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

        if (typeof projectData.promotionHolder === 'string') {
          setPromotionHolder(projectData.promotionHolder);
        }

      setLoadedProjectName(data?.name ?? 'Opened save');
        setCurrentProjectId(data?.id ?? null);
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [params.projectId, sessionUserId, isPro, setActiveSystemId]);

  const result = useMemo(() => {
    const parsedPlayerLevel = Math.max(1, Number.parseInt(playerLevel || '1', 10));
    const parsedEnemyTier = Math.max(1, Number.parseInt(enemyTier || '1', 10));

    const rarityMultiplier = getLootRarityMultiplier(rarity);
    const sourceMultiplier = getRewardSourceMultiplier(rewardSource);
    const bundleMultiplier = getBundleStyleMultiplier(bundleStyle);

    const baseGold = parsedPlayerLevel * parsedEnemyTier * 12;
    const goldAmount = Math.round(baseGold * rarityMultiplier * sourceMultiplier * bundleMultiplier);

    const seed = buildSeed(
      [
        parsedPlayerLevel,
        parsedEnemyTier,
        rewardType,
        rarity,
        rewardSource,
        rewardTheme,
        bundleStyle,
        prepNotes.trim(),
        variationSeed,
      ].join('|')
    );

    const itemName = buildRewardName(rewardConfig, rewardTheme, rewardType, seed);
    const bonusItem = pickFromPool(rewardConfig.bonusPools[bundleStyle], seed, 11);

    const practicalAdvice: string[] = [];

    if (rewardSource === 'boss') {
      practicalAdvice.push(rewardConfig.advice.boss);
    }
    if (rewardType === 'gold' && rarity !== 'common') {
      practicalAdvice.push(rewardConfig.advice.rareGold);
    }
    if (rewardType === 'material') {
      practicalAdvice.push(rewardConfig.advice.material);
    }
    if (rewardSource === 'vendor') {
      practicalAdvice.push(rewardConfig.advice.vendor);
    }
    if (bundleStyle === 'generous') {
      practicalAdvice.push(rewardConfig.advice.generous);
    }
    if (practicalAdvice.length === 0) {
      practicalAdvice.push(rewardConfig.advice.default);
    }

    const encounterHooks = pickManyFromPool(rewardConfig.hookPool, 2, seed + 29);

    return {
      itemName,
      bonusItem,
      goldAmount,
      flavorNote: rewardConfig.flavorNotes[rewardSource],
      practicalAdvice,
      encounterHooks,
      itemDetail: buildRewardDetail(rewardConfig, {
        rewardType,
        rewardTheme,
        rarity,
        itemName,
      }),
      rewardSummary: rewardConfig.rewardSummary({
        rarity,
        rewardTheme,
        rewardType,
        rewardSource,
      }),
    };
  }, [playerLevel, enemyTier, rewardType, rarity, rewardSource, rewardTheme, bundleStyle, prepNotes, variationSeed, rewardConfig]);

  const rewardRecipientSuggestions = useMemo(
    () => (dndCampaignContext ? getDndRewardRecipientSuggestions(dndCampaignContext, rewardTheme) : []),
    [dndCampaignContext, rewardTheme]
  );
  const rewardRecipientCandidates = useMemo(
    () => (dndCampaignContext ? getDndRewardRecipientCandidates(dndCampaignContext, rewardTheme) : []),
    [dndCampaignContext, rewardTheme]
  );
  const promotionHolderOptions = useMemo(
    () => ['Shared', ...rewardRecipientCandidates.map((member) => member.name)],
    [rewardRecipientCandidates]
  );
  const rewardPromotionBaseKey = useMemo(
    () =>
      currentProjectId ??
      `draft-${buildSeed(
        [
          selectedCampaignId,
          rewardType,
          rarity,
          rewardTheme,
          bundleStyle,
          result.itemName,
          result.bonusItem,
          result.goldAmount,
        ].join('|')
      )}`,
    [
      bundleStyle,
      currentProjectId,
      rarity,
      result.bonusItem,
      result.goldAmount,
      result.itemName,
      rewardTheme,
      rewardType,
      selectedCampaignId,
    ]
  );

  const campaignPanelSummary = selectedCampaign
    ? `Locked to ${selectedCampaign.systemShortLabel} inside ${selectedCampaign.name}.`
    : isPro
      ? 'Standalone reward plan. Expand to tie treasure straight into a campaign ledger.'
      : 'Campaign linking is available on Pro.';

  const quickSetupSummary = [
    `Level ${playerLevel || rewardConfig.defaults.playerLevel}`,
    rewardConfig.rarityLabels[rarity],
    rewardConfig.rewardTypeLabels[rewardType],
    rewardConfig.rewardThemeLabels[rewardTheme],
  ].join(' • ');

  const advancedSummary = [
    rewardConfig.rewardSourceLabels[rewardSource],
    rewardConfig.bundleStyleLabels[bundleStyle],
    prepNotes.trim().length > 0 ? 'Prep note ready' : 'No prep note',
  ].join(' • ');

  const savePanelSummary = currentProjectId
    ? selectedCampaign
      ? `Saving updates this reward plan inside ${selectedCampaign.name}.`
      : 'Saving updates the current standalone reward plan.'
    : selectedCampaign
      ? `The next save goes straight into ${selectedCampaign.name}.`
      : 'The next save creates a standalone reward plan.';

  const primarySaveLabel = saving
    ? 'Saving...'
    : currentProjectId
      ? selectedCampaignId
        ? 'Update Campaign Save'
        : 'Update Save'
      : selectedCampaignId
        ? 'Save to Campaign'
        : 'Save Plan';

  const saveHelperText = loadingSession
    ? 'Checking account...'
    : sessionUserId
      ? currentProjectId
        ? 'Save updates this plan by default. Open more options if you want a fresh copy or campaign move.'
        : selectedCampaignId
          ? 'Saving will add this reward plan to the selected campaign by default.'
          : 'Signed in. Save when the treasure bundle feels right.'
      : 'Not signed in. You can generate treasure, but not save yet.';

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
      promotionHolder,
      systemId: effectiveSystemId,
      systemName: effectiveSystem.label,
      variationSeed,
      result,
    };
  }

  function buildTreasureLedgerEntry(projectId: string, projectName: string): DndTreasureLedgerEntry | null {
    if (effectiveSystemId !== 'dnd5e') {
      return null;
    }

    return {
      id: `treasure-ledger-${projectId}`,
      sourceProjectId: projectId,
      projectName,
      savedAt: new Date().toISOString(),
      rewardType: rewardConfig.rewardTypeLabels[rewardType],
      rarity: rewardConfig.rarityLabels[rarity],
      rewardSource: rewardConfig.rewardSourceLabels[rewardSource],
      rewardTheme: rewardConfig.rewardThemeLabels[rewardTheme],
      bundleStyle: rewardConfig.bundleStyleLabels[bundleStyle],
      featuredItem: result.itemName,
      bonusItem: result.bonusItem,
      currencyValue: result.goldAmount,
      rewardSummary: result.rewardSummary,
      recipientHints: rewardRecipientSuggestions.slice(0, 3),
      notes: prepNotes.trim(),
    };
  }

  async function syncTreasureLedger(projectId: string, projectName: string) {
    if (!supabase || !sessionUserId || !selectedCampaignId) {
      return { synced: false, error: null as string | null };
    }

    const entry = buildTreasureLedgerEntry(projectId, projectName);
    if (!entry) {
      return { synced: false, error: null as string | null };
    }

    try {
      await syncDndTreasureLedgerEntry(supabase, sessionUserId, selectedCampaignId, entry);
      await refreshSelectedCampaignData();
      return { synced: true, error: null as string | null };
    } catch (error) {
      return { synced: false, error: getErrorMessage(error) };
    }
  }

  function buildPromotedInventoryItem(slot: 'featured' | 'bonus'): DndInventoryItem | null {
    if (!dndCampaignContext) {
      return null;
    }

    const itemName = slot === 'featured' ? result.itemName : result.bonusItem;
    if (!itemName.trim()) {
      return null;
    }

    const bestHolder = promotionHolder.trim() || rewardRecipientCandidates[0]?.name || 'Shared';
    const slotLabel = slot === 'featured' ? 'featured item' : 'bonus item';

    return {
      id: `reward-${rewardPromotionBaseKey}-${slot}`,
      name: itemName,
      category: getPromotedRewardCategory(rewardType, itemName),
      quantity: '1',
      holder: bestHolder,
      rarity: rewardConfig.rarityLabels[rarity],
      attunement: getPromotedRewardAttunement(rewardType, rarity, itemName),
      notes: `Promoted from ${slotLabel} in ${loadedProjectName ?? 'linked reward setup'}. ${result.itemDetail.statLine}`,
    };
  }

  async function handlePromoteInventoryItem(slot: 'featured' | 'bonus') {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before promoting a reward.');
      return;
    }

    if (!selectedCampaignId || !dndCampaignContext) {
      setBanner('info', 'Link a campaign first', 'Select a D&D campaign before promoting rewards into its inventory.');
      return;
    }

    const nextItem = buildPromotedInventoryItem(slot);
    if (!nextItem) {
      setBanner('info', 'Nothing to add', 'Generate the reward first so there is an item to promote.');
      return;
    }

    try {
      setPromotingReward(slot);
      await syncDndCampaignInventoryItem(supabase, sessionUserId, selectedCampaignId, nextItem);
      await refreshSelectedCampaignData();
      await refreshAppState();
      setBanner(
        'success',
        'Inventory updated',
        `${nextItem.name} is now on ${selectedCampaign?.name ?? 'the linked campaign'} inventory ledger${nextItem.holder !== 'Shared' ? ` for ${nextItem.holder}` : ' in the shared stash'}.`
      );
    } catch (error) {
      setBanner('error', 'Promotion failed', getErrorMessage(error));
    } finally {
      setPromotingReward(null);
    }
  }

  async function handlePromoteCurrency() {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before posting treasure into a treasury.');
      return;
    }

    if (!selectedCampaignId || !dndCampaignContext) {
      setBanner('info', 'Link a campaign first', 'Select a D&D campaign before posting coin into the treasury.');
      return;
    }

    try {
      setPromotingReward('currency');
      await syncDndTreasuryAwardEntry(supabase, sessionUserId, selectedCampaignId, {
        id: `treasury-award-${rewardPromotionBaseKey}`,
        sourceProjectId: rewardPromotionBaseKey,
        projectName: loadedProjectName ?? 'Linked reward setup',
        amountGp: result.goldAmount,
        note: `${rewardConfig.rewardSourceLabels[rewardSource]} payout tied to ${rewardConfig.rewardThemeLabels[rewardTheme].toLowerCase()} treasure.`,
        updatedAt: new Date().toISOString(),
      });
      await refreshSelectedCampaignData();
      await refreshAppState();
      setBanner(
        'success',
        'Treasury updated',
        `${result.goldAmount.toLocaleString()} gp has been posted into ${selectedCampaign?.name ?? 'the linked campaign'} treasury.`
      );
    } catch (error) {
      setBanner('error', 'Treasury sync failed', getErrorMessage(error));
    } finally {
      setPromotingReward(null);
    }
  }

  async function handleSaveProject(asNew = false) {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before saving this plan.');
      return;
    }

    try {
      setSaving(true);

      const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
      const timestampName = `Loot - ${new Date().toLocaleString()}`;
      const campaignMessage = selectedCampaign ? ` in ${selectedCampaign.name}` : '';

      if (!asNew && currentProjectId) {
        const { error } = await supabase
          .from('saved_projects')
          .update({
            name: loadedProjectName ?? timestampName,
            data: payload,
            updated_at: new Date().toISOString(),
            campaign_id: selectedCampaignId || null,
          })
          .eq('id', currentProjectId)
          .eq('user_id', sessionUserId);

        if (error) {
          setBanner('error', 'Update failed', error.message);
          return;
        }

        const ledgerSync = await syncTreasureLedger(currentProjectId, loadedProjectName ?? timestampName);
        await refreshAppState();
        setBanner(
          ledgerSync.error ? 'info' : 'success',
          ledgerSync.error ? 'Updated, ledger pending' : 'Updated',
          `Your loot plan was updated successfully${campaignMessage}.${ledgerSync.synced ? ' Campaign ledger synced.' : ''}${ledgerSync.error ? ` Campaign ledger sync failed: ${ledgerSync.error}` : ''}`
        );
        return;
      }

      if (asNew || !currentProjectId) {
        await refreshAppState();
        const latestAccess = await getLatestSaveAccess(sessionUserId);

        if (!latestAccess.isPro && latestAccess.count >= maxFreeSaves) {
          setBanner('info', 'Free limit reached', 'Free accounts can keep up to 3 saved plans. Upgrade to Pro for unlimited saves.');
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
          campaign_id: selectedCampaignId || null,
        })
        .select()
        .single();

      if (error) {
        setBanner('error', 'Save failed', error.message);
        return;
      }

      setLoadedProjectName(data?.name ?? timestampName);
      setCurrentProjectId(data?.id ?? null);
      const ledgerSync = data?.id ? await syncTreasureLedger(data.id, data.name ?? timestampName) : { synced: false, error: null as string | null };
      await refreshAppState();

      setBanner(
        ledgerSync.error ? 'info' : 'success',
        ledgerSync.error ? 'Saved, ledger pending' : 'Saved',
        `Your loot plan was saved successfully${campaignMessage}.${ledgerSync.synced ? ' Campaign ledger synced.' : ''}${ledgerSync.error ? ` Campaign ledger sync failed: ${ledgerSync.error}` : ''}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsNew() {
    await handleSaveProject(true);
  }

  async function handleSaveToCampaign() {
    if (!supabase) {
      setBanner('error', 'Supabase not configured', 'Add your Supabase URL and anon key in the .env file.');
      return;
    }

    if (!sessionUserId) {
      setBanner('error', 'Sign in required', 'Go to the Account tab and sign in before adding this plan to a campaign.');
      return;
    }

    if (!isPro) {
      setBanner('info', 'Pro required', 'Campaign binders are available on Pro.');
      return;
    }

    if (!selectedCampaignId) {
      setBanner('error', 'Select a campaign', 'Choose a campaign before adding this save.');
      return;
    }

    try {
      setSaving(true);

      const payload = applyCampaignSystemToPayload(buildPayload(), selectedCampaign);
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
          setBanner('error', 'Campaign update failed', error.message);
          return;
        }

        const ledgerSync = await syncTreasureLedger(currentProjectId, timestampName);
        await refreshAppState();
        setBanner(
          ledgerSync.error ? 'info' : 'success',
          ledgerSync.error ? 'Campaign updated, ledger pending' : 'Campaign updated',
          `This save is now tied to the selected campaign.${ledgerSync.synced ? ' Campaign ledger synced.' : ''}${ledgerSync.error ? ` Campaign ledger sync failed: ${ledgerSync.error}` : ''}`
        );
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
        setBanner('error', 'Campaign save failed', error.message);
        return;
      }

      setLoadedProjectName(data?.name ?? timestampName);
      setCurrentProjectId(data?.id ?? null);
      const ledgerSync = data?.id ? await syncTreasureLedger(data.id, data.name ?? timestampName) : { synced: false, error: null as string | null };
      await refreshAppState();

      setBanner(
        ledgerSync.error ? 'info' : 'success',
        ledgerSync.error ? 'Added to campaign, ledger pending' : 'Added to campaign',
        `This plan was saved into the selected campaign.${ledgerSync.synced ? ' Campaign ledger synced.' : ''}${ledgerSync.error ? ` Campaign ledger sync failed: ${ledgerSync.error}` : ''}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SystemHero
        systemId={effectiveSystemId}
        eyebrow={effectiveSystem.shortLabel}
        title={effectiveSystem.generator.title}
        body={effectiveSystem.generator.description}
        chips={[
          rewardConfig.rewardTypeLabels[rewardType],
          rewardConfig.rarityLabels[rarity],
          dndCampaignContext
            ? dndCampaignContext.partySize > 0
              ? `${dndCampaignContext.partySize}-PC party`
              : rewardConfig.rewardSourceLabels[rewardSource]
            : rewardConfig.rewardSourceLabels[rewardSource],
          selectedCampaign ? `Campaign: ${selectedCampaign.name}` : 'Standalone hoard',
        ]}
      >
        {loadedProjectName ? (
          <View style={styles.heroMetaRow}>
            <Label style={styles.heroMetaLabel}>Opened save</Label>
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

      <ProCard
        isPro={isPro}
        savedProjectCount={savedProjectCount}
        maxFreeSaves={maxFreeSaves}
        onUpgradePress={handleUpgradePress}
      />

      {loadingProject ? (
        <SystemPanel systemId={effectiveSystemId} tone="muted">
          <View style={styles.sessionRow}>
            <ActivityIndicator />
            <BodyText>Loading saved prep...</BodyText>
          </View>
        </SystemPanel>
      ) : loadedProjectName ? (
        <SystemPanel systemId={effectiveSystemId} tone="muted">
          <Label>Opened save</Label>
          <BodyText>{loadedProjectName}</BodyText>
          <BodyText>Save now updates this reward plan by default.</BodyText>
        </SystemPanel>
      ) : null}

      <DisclosurePanel
        systemId={effectiveSystemId}
        tone="accent"
        title="Campaign Link"
        summary={campaignPanelSummary}
      >
        {!isPro ? (
          <View style={styles.proLockedBlock}>
            <View style={styles.proLockedHeader}>
              <Label style={styles.proLockedTitle}>★ {campaignLinkUpsell.lockedTitle}</Label>
              <BodyText style={styles.proLockedText}>
                {campaignLinkUpsell.lockedMessage}
              </BodyText>
            </View>

            <BodyText style={styles.proLockedHint}>
              {campaignLinkUpsell.message}
            </BodyText>

            <Pressable onPress={handleUpgradePress} style={[styles.inlineUpgradeButton, { backgroundColor: palette.accent }]}>
              <Label style={styles.inlineUpgradeButtonText}>{campaignLinkUpsell.buttonLabel}</Label>
            </Pressable>

            <Label>{campaignLinkPreview.title}</Label>
            <BodyText style={styles.proLockedHint}>{campaignLinkPreview.body}</BodyText>
            <View style={styles.resultRow}>
              {campaignLinkPreview.bullets.map((entry) => (
                <BodyText key={entry}>• {entry}</BodyText>
              ))}
            </View>
          </View>
        ) : loadingCampaigns ? (
          <View style={styles.sessionRow}>
            <ActivityIndicator />
            <BodyText>Loading campaigns...</BodyText>
          </View>
        ) : campaignOptions.length > 0 ? (
          <View style={styles.pillRow}>
            <Pressable
              onPress={() => {
                setSelectedCampaignId('');
                setLockedCampaignSystemId(null);
              }}
              style={[styles.pill, selectedCampaignId === '' && { backgroundColor: palette.accent, borderColor: palette.accent }]}
            >
              <BodyText style={selectedCampaignId === '' ? styles.pillTextSelected : undefined}>
                {NO_CAMPAIGN_OPTION_LABEL}
              </BodyText>
            </Pressable>

            {campaignOptions.map((campaign) => {
              const selected = selectedCampaignId === campaign.id;

              return (
                <Pressable
                  key={campaign.id}
                  onPress={() => {
                    setSelectedCampaignId(campaign.id);
                    setLockedCampaignSystemId(campaign.systemId);
                    setActiveSystemId(campaign.systemId);
                  }}
                  style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                >
                  <BodyText style={selected ? styles.pillTextSelected : undefined}>
                    {campaign.name} • {campaign.systemShortLabel}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <BodyText>No campaigns yet. Create one in Campaign to tie this save in.</BodyText>
        )}

        {selectedCampaign ? (
          <BodyText>Game locked to {selectedCampaign.systemName} while this plan is tied to {selectedCampaign.name}.</BodyText>
        ) : null}

        {dndCampaignContext ? (
          <View style={styles.resultRow}>
            <BodyText>
              Imported from campaign: average level {dndCampaignContext.averageLevel ?? 'n/a'} across{' '}
              {dndCampaignContext.partySize} hero sheets.
            </BodyText>
            <BodyText>{dndCampaignContext.treasurySummary}</BodyText>
          </View>
        ) : null}
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        tone="accent"
        title="Quick Setup"
        summary={quickSetupSummary}
        defaultOpen
      >
        <Label>{rewardConfig.labels.playerLevel}</Label>
        <AppInput
          value={playerLevel}
          onChangeText={setPlayerLevel}
          keyboardType="numeric"
          placeholder={rewardConfig.defaults.playerLevel}
        />

        <Label>{rewardConfig.labels.rewardType}</Label>
        <View style={styles.pillRow}>
          {REWARD_TYPE_OPTIONS.map((option) => {
            const selected = rewardType === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRewardType(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {rewardConfig.rewardTypeLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{rewardConfig.labels.rarity}</Label>
        <View style={styles.pillRow}>
          {RARITY_OPTIONS.map((option) => {
            const selected = rarity === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRarity(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {rewardConfig.rarityLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{rewardConfig.labels.rewardTheme}</Label>
        <View style={styles.pillRow}>
          {REWARD_THEME_OPTIONS.map((option) => {
            const selected = rewardTheme === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRewardTheme(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {rewardConfig.rewardThemeLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>
      </DisclosurePanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title="Advanced Reward Shaping"
        summary={advancedSummary}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      >
        <Label>{rewardConfig.labels.enemyTier}</Label>
        <AppInput
          value={enemyTier}
          onChangeText={setEnemyTier}
          keyboardType="numeric"
          placeholder={rewardConfig.defaults.enemyTier}
        />

        <Label>{rewardConfig.labels.rewardSource}</Label>
        <View style={styles.pillRow}>
          {REWARD_SOURCE_OPTIONS.map((option) => {
            const selected = rewardSource === option;

            return (
              <Pressable
                key={option}
                onPress={() => setRewardSource(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {rewardConfig.rewardSourceLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{rewardConfig.labels.bundleStyle}</Label>
        <View style={styles.pillRow}>
          {BUNDLE_STYLE_OPTIONS.map((option) => {
            const selected = bundleStyle === option;

            return (
              <Pressable
                key={option}
                onPress={() => setBundleStyle(option)}
                style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <BodyText style={selected ? styles.pillTextSelected : undefined}>
                  {rewardConfig.bundleStyleLabels[option]}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        <Label>{rewardConfig.labels.prepNotes}</Label>
        <AppInput
          value={prepNotes}
          onChangeText={setPrepNotes}
          placeholder={rewardConfig.labels.prepNotesPlaceholder}
          multiline
        />

        <Pressable onPress={() => setVariationSeed((seed) => seed + 1)} style={styles.secondaryButton}>
          <Label style={styles.secondaryButtonText}>{rewardConfig.labels.rerollButton}</Label>
        </Pressable>
      </DisclosurePanel>

      <SystemPanel systemId={effectiveSystemId} tone="accent">
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
          <Label style={styles.saveButtonText}>{primarySaveLabel}</Label>
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
              <Label style={styles.secondaryButtonText}>Save New Copy</Label>
            </Pressable>

            <Pressable
              onPress={handleSaveToCampaign}
              disabled={saving || loadingSession || !isPro || !selectedCampaignId}
              style={[
                styles.campaignButton,
                { borderColor: palette.accent },
                (saving || loadingSession || !isPro || !selectedCampaignId) && styles.saveButtonDisabled,
              ]}
            >
              <Label style={styles.campaignButtonText}>
                {!isPro
                  ? 'Add to Campaign'
                  : currentProjectId && selectedCampaignId
                    ? 'Move to Campaign'
                    : 'Add to Campaign'}
              </Label>
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

        {sessionUserId && isCreatingNewProject && isAtFreeLimit ? (
          <UpgradeBanner
            title={freeLimitUpsell.title}
            message={freeLimitUpsell.message}
            buttonLabel={freeLimitUpsell.buttonLabel}
            onPress={handleUpgradePress}
          />
        ) : null}
      </SystemPanel>

      {dndCampaignContext ? (
        <DisclosurePanel
          systemId={effectiveSystemId}
          title="Party Inventory Context"
          summary={dndCampaignContext.inventorySummaryLines[0] ?? dndCampaignContext.treasurySummary}
        >
          <View style={styles.resultRow}>
            {dndCampaignContext.inventorySummaryLines.length > 0 ? (
              dndCampaignContext.inventorySummaryLines.map((entry, index) => (
                <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
              ))
            ) : (
              <BodyText>No tracked party inventory is logged yet.</BodyText>
            )}
            {dndCampaignContext.trackedItemNames.length > 0 ? (
              <BodyText>Ledger snapshot: {dndCampaignContext.trackedItemNames.slice(0, 6).join(', ')}.</BodyText>
            ) : null}
          </View>
        </DisclosurePanel>
      ) : null}

      <SystemPanel systemId={effectiveSystemId} tone="accent">
        <Label>Treasure Snapshot</Label>
        <BodyText>{result.rewardSummary}</BodyText>
        <BodyText>{rewardConfig.labels.featuredItem}: {result.itemName}</BodyText>
        <BodyText>{rewardConfig.labels.itemDetail}: {result.itemDetail.description}</BodyText>
        <BodyText>{rewardConfig.labels.statLine}: {result.itemDetail.statLine}</BodyText>

        <View style={styles.summaryStatRow}>
          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Rarity</Label>
            <BodyText>{rewardConfig.rarityLabels[rarity]}</BodyText>
          </View>

          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Bundle</Label>
            <BodyText>{rewardConfig.bundleStyleLabels[bundleStyle]}</BodyText>
          </View>

          <View style={styles.summaryStatCard}>
            <Label style={styles.summaryStatLabel}>Coin</Label>
            <BodyText>{result.goldAmount}</BodyText>
          </View>
        </View>

        <BodyText>{rewardConfig.labels.bonusItem}: {result.bonusItem}</BodyText>
        {rewardRecipientSuggestions[0] ? (
          <BodyText>Best current fit: {rewardRecipientSuggestions[0]}</BodyText>
        ) : null}
      </SystemPanel>

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={rewardConfig.labels.sourceGuidance}
        summary={result.flavorNote}
      >
        <View style={styles.resultRow}>
          <BodyText>{result.flavorNote}</BodyText>
        </View>
      </DisclosurePanel>

      {dndCampaignContext ? (
        <DisclosurePanel
          systemId={effectiveSystemId}
          title="Promote Into Campaign"
          summary={`Post treasure into ${selectedCampaign?.name ?? 'the linked campaign'}.`}
        >
          <View style={styles.resultRow}>
            <BodyText>
              Post this reward straight into {selectedCampaign?.name ?? 'the linked campaign'} so the party ledger and treasury keep pace with generated treasure.
            </BodyText>

            <Label>Assign promoted items to</Label>
            <View style={styles.pillRow}>
              {promotionHolderOptions.map((option) => {
                const selected = promotionHolder === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setPromotionHolder(option)}
                    style={[styles.pill, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}
                  >
                    <BodyText style={selected ? styles.pillTextSelected : undefined}>{option}</BodyText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => handlePromoteInventoryItem('featured')}
                disabled={promotingReward !== null}
                style={[styles.secondaryButton, promotingReward !== null && styles.saveButtonDisabled]}
              >
                <Label style={styles.secondaryButtonText}>
                  {promotingReward === 'featured' ? 'Adding Featured...' : 'Promote Featured Item'}
                </Label>
              </Pressable>

              <Pressable
                onPress={() => handlePromoteInventoryItem('bonus')}
                disabled={promotingReward !== null || result.bonusItem.trim().length === 0}
                style={[
                  styles.secondaryButton,
                  (promotingReward !== null || result.bonusItem.trim().length === 0) && styles.saveButtonDisabled,
                ]}
              >
                <Label style={styles.secondaryButtonText}>
                  {promotingReward === 'bonus' ? 'Adding Bonus...' : 'Promote Bonus Item'}
                </Label>
              </Pressable>

              <Pressable
                onPress={handlePromoteCurrency}
                disabled={promotingReward !== null}
                style={[styles.campaignButton, { borderColor: palette.accent }, promotingReward !== null && styles.saveButtonDisabled]}
              >
                <Label style={styles.campaignButtonText}>
                  {promotingReward === 'currency' ? 'Posting Coin...' : 'Post Coin to Treasury'}
                </Label>
              </Pressable>
            </View>

            <BodyText>
              Best current fit: {rewardRecipientCandidates[0]?.name ?? 'Shared party stash'}.
            </BodyText>
          </View>
        </DisclosurePanel>
      ) : null}

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={rewardConfig.labels.practicalAdvice}
        summary={result.practicalAdvice[0] ?? 'No practical advice yet.'}
      >
        <View style={styles.resultRow}>
          {result.practicalAdvice.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
      </DisclosurePanel>

      {dndCampaignContext ? (
        <DisclosurePanel
          systemId={effectiveSystemId}
          title="Best Party Fits"
          summary={rewardRecipientSuggestions[0] ?? 'Shared stash is the safest fit right now.'}
        >
          <View style={styles.resultRow}>
            {rewardRecipientSuggestions.length > 0 ? (
              rewardRecipientSuggestions.map((entry, index) => (
                <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
              ))
            ) : (
              <BodyText>Shared stash is the safest fit until the party roster fills out.</BodyText>
            )}
            {dndCampaignContext.attunementItems.length > 0 ? (
              <BodyText>Current attunement watch list: {dndCampaignContext.attunementItems.join(', ')}.</BodyText>
            ) : null}
          </View>
        </DisclosurePanel>
      ) : null}

      <DisclosurePanel
        systemId={effectiveSystemId}
        title={rewardConfig.labels.encounterHooks}
        summary={result.encounterHooks[0] ?? 'No encounter hooks yet.'}
      >
        <View style={styles.resultRow}>
          {result.encounterHooks.map((entry, index) => (
            <BodyText key={`${entry}-${index}`}>• {entry}</BodyText>
          ))}
        </View>
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
  primaryActionButton: {
    alignSelf: 'stretch',
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
  moreActionsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  moreActionsButtonText: {
    color: Colors.text,
    opacity: 0.8,
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
  summaryStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryStatCard: {
    minWidth: 104,
    flexGrow: 1,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  summaryStatLabel: {
    color: Colors.mutedText,
  },
});
