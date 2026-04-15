import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppInput } from '@/components/AppInput';
import { router } from 'expo-router';
import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/contexts/AppStateContext';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { StatusBanner, type StatusBannerVariant } from '@/components/StatusBanner';
import {
  getProjectRoute,
  getProjectSummary,
  getProjectSystemId,
  getProjectSystemLabel,
  getProjectSystemShortLabel,
  getProjectToolBadge,
  getProjectToolLabel,
  type ProjectData,
} from '@/lib/projectPresentation';

type SavedProject = {
  id: string;
  user_id: string;
  name: string;
  tool_type: string;
  data: ProjectData;
  created_at: string;
  updated_at: string;
  campaign_id?: string | null;
};

type ProjectFilter = 'all' | 'campaign' | 'xp' | 'encounter' | 'loot' | 'quest';

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function ProjectsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>('all');
  const { refreshAppState } = useAppState();
  const { activeSystem } = useGameSystem();
  const [statusBanner, setStatusBanner] = useState<{
    title?: string;
    message: string;
    variant: StatusBannerVariant;
  } | null>(null);

  function setBanner(
    variant: StatusBannerVariant,
    title: string,
    message: string
  ) {
    setStatusBanner({ variant, title, message });
  }

  useEffect(() => {
    if (!supabase) {
      setLoadingSession(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setUserId(nextSession?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'all') {
      return projects;
    }

    const toolTypeMap: Record<Exclude<ProjectFilter, 'all'>, string> = {
      campaign: 'campaign_hub',
      xp: 'xp_calculator',
      encounter: 'encounter_calculator',
      loot: 'loot_generator',
      quest: 'quest_generator',
    };

    return projects.filter((project) => project.tool_type === toolTypeMap[activeFilter]);
  }, [projects, activeFilter]);

  const campaignNameById = useMemo(() => {
    return new Map(
      projects
        .filter((project) => project.tool_type === 'campaign_hub')
        .map((project) => [project.id, project.name] as const)
    );
  }, [projects]);

  const archiveStats = useMemo(() => {
    const linkedCount = projects.filter((project) => Boolean(project.campaign_id)).length;
    const campaignCount = projects.filter((project) => project.tool_type === 'campaign_hub').length;
    const systemCounts = new Map<string, number>();

    projects.forEach((project) => {
      const key = getProjectSystemShortLabel(project.data);
      systemCounts.set(key, (systemCounts.get(key) ?? 0) + 1);
    });

    const systemBreakdown = Array.from(systemCounts.entries())
      .map(([label, count]) => `${label} ${count}`)
      .join(' • ');

    return {
      total: projects.length,
      linkedCount,
      campaignCount,
      systemBreakdown: systemBreakdown || 'No saved games yet.',
    };
  }, [projects]);

  const loadProjects = useCallback(async () => {
    if (!supabase || !userId) {
      setProjects([]);
      return;
    }

    try {
      setLoadingProjects(true);

      const { data, error } = await supabase
        .from('saved_projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        setBanner('error', 'Load failed', error.message);
        return;
        }

      setProjects((data as SavedProject[]) ?? []);
    } finally {
      setLoadingProjects(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loadingSession) {
      loadProjects();
    }
  }, [loadingSession, loadProjects]);

  useEffect(() => {
    if (!supabase || !userId) return;

    const client = supabase;
    const channel = client
      .channel(`projects-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_projects', filter: `user_id=eq.${userId}` },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId, loadProjects]);

  function handleStartRename(projectId: string, currentName: string) {
    setRenamingId(projectId);
    setRenameValue(currentName);
  }

  async function handleRename(projectId: string) {
    if (!supabase) return;

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      setBanner('error', 'Invalid name', 'Save name cannot be empty.');
      return;
    }

    try {
      setDeletingId(projectId);

      const { error } = await supabase
        .from('saved_projects')
        .update({
          name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) {
        setBanner('error', 'Rename failed', error.message);
        return;
        }

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
              ...project,
              name: trimmedName,
              updated_at: new Date().toISOString(),
            }
            : project
        )
      );

      setRenamingId(null);
      setRenameValue('');
      setBanner('success', 'Save renamed', 'Your save name was updated successfully.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDelete(projectId: string) {
    if (!supabase) return;

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Delete this save? This cannot be undone.')
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Delete save', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) return;

    try {
      setDeletingId(projectId);

      const { error } = await supabase
        .from('saved_projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        setBanner('error', 'Delete failed', error.message);
        return;
        }

      setProjects((current) => current.filter((project) => project.id !== projectId));
      await refreshAppState();
      setBanner('success', 'Save deleted', 'The save was removed successfully.');
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  const filterLabels: Record<ProjectFilter, string> = {
    all: 'All',
    campaign: activeSystem.tabs.campaign,
    xp: activeSystem.tabs.xp,
    encounter: activeSystem.tabs.encounters,
    loot: activeSystem.tabs.generator,
    quest: activeSystem.tabs.quest,
  };

  return (
    <Screen>
      <Card>
        <Heading>{activeSystem.projects.title}</Heading>
        <BodyText>{activeSystem.projects.description}</BodyText>
      </Card>

      {statusBanner ? (
        <StatusBanner
          title={statusBanner.title}
          message={statusBanner.message}
          variant={statusBanner.variant}
          onDismiss={() => setStatusBanner(null)}
        />
      ) : null}
      
      <Card>
        <Label>Show</Label>
        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: filterLabels.all },
              { key: 'campaign', label: filterLabels.campaign },
              { key: 'xp', label: filterLabels.xp },
              { key: 'encounter', label: filterLabels.encounter },
              { key: 'loot', label: filterLabels.loot },
              { key: 'quest', label: filterLabels.quest },
            ] as { key: ProjectFilter; label: string }[]
          ).map((filter) => {
            const selected = activeFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
              >
                <BodyText style={selected ? styles.filterChipTextSelected : undefined}>
                  {filter.label}
                </BodyText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {!loadingSession && userId ? (
        <Card>
          <Label>Saved At A Glance</Label>
          <View style={styles.resultRow}>
            <BodyText>Total saves: {archiveStats.total}</BodyText>
            <BodyText>{activeSystem.tabs.campaign} saves: {archiveStats.campaignCount}</BodyText>
            <BodyText>Tied to a campaign: {archiveStats.linkedCount}</BodyText>
            <BodyText>Games: {archiveStats.systemBreakdown}</BodyText>
          </View>
        </Card>
      ) : null}

      {loadingSession ? (
        <Card>
          <View style={styles.row}>
            <ActivityIndicator />
            <BodyText>Checking account...</BodyText>
          </View>
        </Card>
      ) : !userId ? (
        <Card>
          <Label>Sign in to view saves</Label>
          <BodyText>
            Go to the Account tab and sign in to view your saved prep.
          </BodyText>
        </Card>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={loadingProjects} onRefresh={loadProjects} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const projectSystemId = getProjectSystemId(item.data);
            const toolLabel = getProjectToolLabel(item.tool_type, projectSystemId);
            const toolBadge = getProjectToolBadge(item.tool_type, projectSystemId);
            const systemShortLabel = getProjectSystemShortLabel(item.data);
            const systemLabel = getProjectSystemLabel(item.data);
            const projectSummary = getProjectSummary(item.tool_type, item.data);
            const linkedCampaignName = item.campaign_id ? campaignNameById.get(item.campaign_id) : null;

            return (
              <Card>
                <View style={styles.projectHeader}>
                  <Pressable
                    style={styles.projectInfo}
                    onPress={() => {
                      if (renamingId === item.id) return;

                      const pathname = getProjectRoute(item.tool_type);

                      if (pathname) {
                        router.push({
                          pathname,
                          params: { projectId: item.id },
                        });
                        return;
                      }

                      showMessage('Not supported yet', 'That saved entry cannot be opened from here yet.');
                    }}
                  >
                    {renamingId === item.id ? (
                      <View style={styles.renameBlock}>
                        <Label>Rename save</Label>
                        <AppInput
                          value={renameValue}
                          onChangeText={setRenameValue}
                          placeholder="Enter save name"
                        />
                        <View style={styles.actionRow}>
                          <Pressable
                            onPress={() => handleRename(item.id)}
                            disabled={deletingId === item.id}
                            style={[styles.renameButton, deletingId === item.id && styles.buttonDisabled]}
                          >
                            <Label style={styles.renameButtonText}>
                              {deletingId === item.id ? 'Saving...' : 'Save Name'}
                            </Label>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              setRenamingId(null);
                              setRenameValue('');
                            }}
                            style={styles.cancelButton}
                          >
                            <Label>Cancel</Label>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.metaPillRow}>
                          <View style={[styles.metaPill, styles.systemPill]}>
                            <BodyText style={styles.metaPillText}>{systemShortLabel}</BodyText>
                          </View>
                          <View style={styles.metaPill}>
                            <BodyText style={styles.metaPillText}>{toolBadge}</BodyText>
                          </View>
                        </View>
                        <Label>{item.name}</Label>
                        <BodyText>{toolLabel}</BodyText>
                        <BodyText>{projectSummary}</BodyText>
                        <BodyText>Game: {systemLabel}</BodyText>
                        {linkedCampaignName ? (
                          <BodyText>Campaign: {linkedCampaignName}</BodyText>
                        ) : item.campaign_id ? (
                          <BodyText>Tied to a campaign</BodyText>
                        ) : null}
                        <BodyText>Updated: {formatDate(item.updated_at)}</BodyText>
                      </>
                    )}
                  </Pressable>

                  {renamingId !== item.id ? (
                    <View style={styles.sideActions}>
                      <Pressable
                        onPress={() => handleStartRename(item.id, item.name)}
                        style={styles.editButton}
                      >
                        <Label>Rename</Label>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        style={[styles.deleteButton, deletingId === item.id && styles.buttonDisabled]}
                      >
                        <Label style={styles.deleteButtonText}>
                          {deletingId === item.id ? 'Working...' : 'Delete'}
                        </Label>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <Card>
              {loadingProjects ? (
                <View style={styles.row}>
                  <ActivityIndicator />
                  <BodyText>Loading saved prep...</BodyText>
                </View>
              ) : (
                <>
                  <Label>Nothing here yet</Label>
                  <BodyText>
                    {activeFilter === 'all'
                      ? 'Save something from one of your planning screens, then come back here.'
                      : `You do not have any saved ${filterLabels[activeFilter]} entries yet.`}
                  </BodyText>
                </>
              )}
            </Card>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  projectInfo: {
    flex: 1,
    gap: 4,
  },
  renameBlock: {
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sideActions: {
    gap: Spacing.sm,
  },
  editButton: {
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  renameButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  renameButtonText: {
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteButton: {
    backgroundColor: '#b42318',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: Colors.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  filterChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  resultRow: {
    gap: 8,
  },
  metaPillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  metaPill: {
    backgroundColor: Colors.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  systemPill: {
    borderColor: Colors.accent,
  },
  metaPillText: {
    color: Colors.text,
  },
});
