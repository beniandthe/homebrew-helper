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

type SavedProject = {
  id: string;
  user_id: string;
  name: string;
  tool_type: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ProjectFilter = 'all' | 'xp' | 'encounter' | 'loot' | 'quest';

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
      xp: 'xp_calculator',
      encounter: 'encounter_calculator',
      loot: 'loot_generator',
      quest: 'quest_generator',
    };

    return projects.filter((project) => project.tool_type === toolTypeMap[activeFilter]);
  }, [projects, activeFilter]);

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
        showMessage('Load failed', error.message);
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

  function handleStartRename(projectId: string, currentName: string) {
    setRenamingId(projectId);
    setRenameValue(currentName);
  }

  async function handleRename(projectId: string) {
    if (!supabase) return;

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      showMessage('Invalid name', 'Project name cannot be empty.');
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
        showMessage('Rename failed', error.message);
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
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDelete(projectId: string) {
    if (!supabase) return;

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Delete this project? This cannot be undone.')
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Delete project', 'This cannot be undone.', [
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
        showMessage('Delete failed', error.message);
        return;
      }

      setProjects((current) => current.filter((project) => project.id !== projectId));
      await refreshAppState();
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

  return (
    <Screen>
      <Card>
        <Heading>My Projects</Heading>
        <BodyText>
          View and manage saved calculator and generator projects.
        </BodyText>
      </Card>
      <Card>
        <Label>Filter</Label>
        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'xp', label: 'XP' },
              { key: 'encounter', label: 'Encounter' },
              { key: 'loot', label: 'Loot' },
              { key: 'quest', label: 'Quest' },
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
      {loadingSession ? (
        <Card>
          <View style={styles.row}>
            <ActivityIndicator />
            <BodyText>Checking account...</BodyText>
          </View>
        </Card>
      ) : !userId ? (
        <Card>
          <Label>Sign in required</Label>
          <BodyText>
            Go to the Account tab and sign in to view saved projects.
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
          renderItem={({ item }) => (
            <Card>
              <View style={styles.projectHeader}>
                <Pressable
                  style={styles.projectInfo}
                  onPress={() => {
                    if (renamingId === item.id) return;

                    if (item.tool_type === 'xp_calculator') {
                      router.push({
                        pathname: '/xp',
                        params: { projectId: item.id },
                      });
                      return;
                    }

                    if (item.tool_type === 'encounter_calculator') {
                      router.push({
                        pathname: '/encounters',
                        params: { projectId: item.id },
                      });
                      return;
                    }

                    if (item.tool_type === 'loot_generator') {
                      router.push({
                        pathname: '/generator',
                        params: { projectId: item.id },
                      });
                      return;
                    }

                    if (item.tool_type === 'quest_generator') {
                      router.push({
                        pathname: '/quest',
                        params: { projectId: item.id },
                      });
                      return;
                    }

                    showMessage('Not supported yet', 'Open/load is only wired for XP, Encounter, Loot, and Quest projects right now.');
                  }}
                >
                  {renamingId === item.id ? (
                    <View style={styles.renameBlock}>
                      <Label>Rename project</Label>
                      <AppInput
                        value={renameValue}
                        onChangeText={setRenameValue}
                        placeholder="Enter project name"
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
                      <Label>{item.name}</Label>
                      <BodyText>{item.tool_type}</BodyText>
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
                      <Label>Edit</Label>
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
          )}
          ListEmptyComponent={
            <Card>
              {loadingProjects ? (
                <View style={styles.row}>
                  <ActivityIndicator />
                  <BodyText>Loading projects...</BodyText>
                </View>
              ) : (
                <>
                  <Label>No matching projects</Label>
                  <BodyText>
                    {activeFilter === 'all'
                      ? 'Save something from one of the toolkit screens, then come back here.'
                      : `You do not have any ${activeFilter} projects yet.`}
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
});