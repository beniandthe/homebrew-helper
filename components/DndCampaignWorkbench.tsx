import { Dispatch, SetStateAction, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppInput } from '@/components/AppInput';
import { BodyText, Label } from '@/components/AppText';
import { SystemPanel } from '@/components/SystemPanel';
import { Colors, Spacing } from '@/constants/theme';
import {
  buildDndCampaignWorkbenchSnapshot,
  createDndInventoryItem,
  createDndNpc,
  createDndPartyMember,
  DND_ARMOR_REFERENCE,
  DND_CLASS_REFERENCE,
  DND_GEAR_REFERENCE,
  DND_MONSTER_REFERENCE,
  DND_SPECIES_REFERENCE,
  DND_WEAPON_REFERENCE,
  type DndInventoryItem,
  type DndNpc,
  type DndPartyMember,
  type DndPartyTreasury,
} from '@/lib/dnd5eCampaignKit';
import { type DndThreatClockEntry } from '@/lib/dndCampaignLedger';
import { getSystemPresentation } from '@/lib/systemPresentation';

type DndCampaignWorkbenchProps = {
  partyRoster: DndPartyMember[];
  setPartyRoster: Dispatch<SetStateAction<DndPartyMember[]>>;
  sharedInventory: DndInventoryItem[];
  setSharedInventory: Dispatch<SetStateAction<DndInventoryItem[]>>;
  partyTreasury: DndPartyTreasury;
  setPartyTreasury: Dispatch<SetStateAction<DndPartyTreasury>>;
  npcRoster: DndNpc[];
  setNpcRoster: Dispatch<SetStateAction<DndNpc[]>>;
  threatClocks: DndThreatClockEntry[];
};

export function DndCampaignWorkbench({
  partyRoster,
  setPartyRoster,
  sharedInventory,
  setSharedInventory,
  partyTreasury,
  setPartyTreasury,
  npcRoster,
  setNpcRoster,
  threatClocks,
}: DndCampaignWorkbenchProps) {
  const palette = getSystemPresentation('dnd5e').palette;
  const snapshot = useMemo(
    () =>
      buildDndCampaignWorkbenchSnapshot({
        partyRoster,
        inventory: sharedInventory,
        treasury: partyTreasury,
        npcRoster,
      }),
    [partyRoster, sharedInventory, partyTreasury, npcRoster]
  );
  const assignedItemsByHolder = useMemo(() => {
    const next = new Map<string, DndInventoryItem[]>();

    for (const item of sharedInventory) {
      const holderKey = item.holder.trim().toLowerCase();
      if (!holderKey) {
        continue;
      }

      const existing = next.get(holderKey) ?? [];
      existing.push(item);
      next.set(holderKey, existing);
    }

    return next;
  }, [sharedInventory]);
  const activeThreats = useMemo(
    () => threatClocks.filter((entry) => entry.status !== 'resolved'),
    [threatClocks]
  );
  const npcThreatsById = useMemo(() => {
    const next = new Map<string, DndThreatClockEntry[]>();

    for (const entry of activeThreats) {
      const key = entry.linkedNpcId.trim();
      if (!key) {
        continue;
      }

      const existing = next.get(key) ?? [];
      existing.push(entry);
      next.set(key, existing);
    }

    return next;
  }, [activeThreats]);
  const factionThreatsByName = useMemo(() => {
    const next = new Map<string, DndThreatClockEntry[]>();

    for (const entry of activeThreats) {
      const key = entry.linkedFaction.trim().toLowerCase();
      if (!key) {
        continue;
      }

      const existing = next.get(key) ?? [];
      existing.push(entry);
      next.set(key, existing);
    }

    return next;
  }, [activeThreats]);

  function updatePartyMember(id: string, field: keyof DndPartyMember, value: string) {
    setPartyRoster((current) =>
      current.map((member) => (member.id === id ? { ...member, [field]: value } : member))
    );
  }

  function removePartyMember(id: string) {
    setPartyRoster((current) => current.filter((member) => member.id !== id));
  }

  function updateInventoryItem(id: string, field: keyof DndInventoryItem, value: string) {
    setSharedInventory((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeInventoryItem(id: string) {
    setSharedInventory((current) => current.filter((item) => item.id !== id));
  }

  function updateNpc(id: string, field: keyof DndNpc, value: string) {
    setNpcRoster((current) =>
      current.map((npc) => (npc.id === id ? { ...npc, [field]: value } : npc))
    );
  }

  function removeNpc(id: string) {
    setNpcRoster((current) => current.filter((npc) => npc.id !== id));
  }

  function updateTreasury(field: keyof DndPartyTreasury, value: string) {
    setPartyTreasury((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <SystemPanel systemId="dnd5e" tone="accent">
        <Label>5e Campaign Command</Label>
        <BodyText>
          This hub now behaves like a Dungeon Master binder: party sheets, shared loot,
          treasury, NPC web, and quick SRD-safe references all live inside the campaign.
        </BodyText>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: palette.heroBorder }]}>
            <Label style={styles.summaryValue}>{snapshot.partyCount}</Label>
            <BodyText>Party sheets</BodyText>
          </View>
          <View style={[styles.summaryCard, { borderColor: palette.heroBorder }]}>
            <Label style={styles.summaryValue}>{snapshot.inventoryCount}</Label>
            <BodyText>Tracked items</BodyText>
          </View>
          <View style={[styles.summaryCard, { borderColor: palette.heroBorder }]}>
            <Label style={styles.summaryValue}>{snapshot.npcCount}</Label>
            <BodyText>Named NPCs</BodyText>
          </View>
        </View>

        <View style={styles.resultList}>
          <BodyText>{snapshot.averageLevelLabel}</BodyText>
          <BodyText>{snapshot.highestPassiveLabel}</BodyText>
          <BodyText>{snapshot.treasurySummary}</BodyText>
        </View>

        <Label>Party coverage</Label>
        <View style={styles.resultList}>
          {snapshot.partyCoverage.map((entry) => (
            <BodyText key={entry}>{entry}</BodyText>
          ))}
        </View>
      </SystemPanel>

      <SystemPanel systemId="dnd5e">
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleBlock}>
            <Label>Party Sheets</Label>
            <BodyText>
              Track species, class, background, AC, HP, passive Perception, signature gear,
              and session notes for the adventuring party.
            </BodyText>
          </View>
          <Pressable
            onPress={() => setPartyRoster((current) => [...current, createDndPartyMember()])}
            style={[styles.primaryButton, { backgroundColor: palette.accent }]}
          >
            <Label style={styles.primaryButtonText}>Add Party Member</Label>
          </Pressable>
        </View>

        {partyRoster.length === 0 ? (
          <BodyText>No party sheets yet. Add the first hero to start building the roster.</BodyText>
        ) : (
          <View style={styles.cardStack}>
            {partyRoster.map((member, index) => {
              const assignedItems = assignedItemsByHolder.get(member.name.trim().toLowerCase()) ?? [];

              return (
                <View
                  key={member.id}
                  style={[styles.workCard, { borderColor: palette.heroBorder, backgroundColor: palette.panelMuted }]}
                >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.sectionTitleBlock}>
                    <Label>Hero {index + 1}</Label>
                    <BodyText>{member.name.trim() || 'Unnamed adventurer'}</BodyText>
                    {assignedItems.length > 0 ? (
                      <BodyText style={styles.assignmentText}>
                        Assigned gear: {assignedItems.map((item) => item.name).join(', ')}
                      </BodyText>
                    ) : null}
                  </View>
                  <Pressable onPress={() => removePartyMember(member.id)} style={styles.secondaryButton}>
                    <Label style={styles.secondaryButtonText}>Remove</Label>
                  </Pressable>
                </View>

                <Label>Name</Label>
                <AppInput
                  value={member.name}
                  onChangeText={(value) => updatePartyMember(member.id, 'name', value)}
                  placeholder="Theren Ashbow"
                />

                <View style={styles.gridRow}>
                  <View style={styles.gridField}>
                    <Label>Species</Label>
                    <AppInput
                      value={member.species}
                      onChangeText={(value) => updatePartyMember(member.id, 'species', value)}
                      placeholder="Human"
                    />
                  </View>
                  <View style={styles.gridField}>
                    <Label>Class</Label>
                    <AppInput
                      value={member.className}
                      onChangeText={(value) => updatePartyMember(member.id, 'className', value)}
                      placeholder="Fighter"
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridField}>
                    <Label>Background</Label>
                    <AppInput
                      value={member.background}
                      onChangeText={(value) => updatePartyMember(member.id, 'background', value)}
                      placeholder="Soldier"
                    />
                  </View>
                  <View style={styles.numericField}>
                    <Label>Level</Label>
                    <AppInput
                      value={member.level}
                      onChangeText={(value) => updatePartyMember(member.id, 'level', value)}
                      placeholder="1"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.numericField}>
                    <Label>AC</Label>
                    <AppInput
                      value={member.armorClass}
                      onChangeText={(value) => updatePartyMember(member.id, 'armorClass', value)}
                      placeholder="16"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.numericField}>
                    <Label>HP</Label>
                    <AppInput
                      value={member.hitPoints}
                      onChangeText={(value) => updatePartyMember(member.id, 'hitPoints', value)}
                      placeholder="12"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.numericField}>
                    <Label>Passive Perception</Label>
                    <AppInput
                      value={member.passivePerception}
                      onChangeText={(value) => updatePartyMember(member.id, 'passivePerception', value)}
                      placeholder="12"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Label>Signature Item / Spell / Hook</Label>
                <AppInput
                  value={member.signatureItem}
                  onChangeText={(value) => updatePartyMember(member.id, 'signatureItem', value)}
                  placeholder="Longsword, holy symbol, thieves' tools..."
                />

                <Label>Notes</Label>
                <AppInput
                  value={member.notes}
                  onChangeText={(value) => updatePartyMember(member.id, 'notes', value)}
                  placeholder="Owes a favor to the temple quartermaster. Hates goblins."
                  multiline
                />
                </View>
              );
            })}
          </View>
        )}
      </SystemPanel>

      <SystemPanel systemId="dnd5e">
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleBlock}>
            <Label>Shared Inventory & Treasury</Label>
            <BodyText>
              Track weapons, armor, treasure, potions, scrolls, attunement-bound items, and
              the party coin purse in one ledger.
            </BodyText>
          </View>
          <Pressable
            onPress={() => setSharedInventory((current) => [...current, createDndInventoryItem()])}
            style={[styles.primaryButton, { backgroundColor: palette.accent }]}
          >
            <Label style={styles.primaryButtonText}>Add Item</Label>
          </Pressable>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.numericField}>
            <Label>GP</Label>
            <AppInput
              value={partyTreasury.gp}
              onChangeText={(value) => updateTreasury('gp', value)}
              placeholder="120"
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.numericField}>
            <Label>SP</Label>
            <AppInput
              value={partyTreasury.sp}
              onChangeText={(value) => updateTreasury('sp', value)}
              placeholder="45"
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.numericField}>
            <Label>CP</Label>
            <AppInput
              value={partyTreasury.cp}
              onChangeText={(value) => updateTreasury('cp', value)}
              placeholder="12"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Label>Special currency or valuables</Label>
        <AppInput
          value={partyTreasury.special}
          onChangeText={(value) => updateTreasury('special', value)}
          placeholder="Moonstones, temple scrip, infernal promissory note..."
        />

        <Label>Treasury notes</Label>
        <AppInput
          value={partyTreasury.notes}
          onChangeText={(value) => updateTreasury('notes', value)}
          placeholder="What still needs appraisal, fencing, or attunement?"
          multiline
        />

        <View style={styles.resultList}>
          {snapshot.inventoryHighlights.map((entry) => (
            <BodyText key={entry}>{entry}</BodyText>
          ))}
        </View>

        {sharedInventory.length === 0 ? (
          <BodyText>No tracked loot yet. Start with potions, magic items, coin, and signature gear.</BodyText>
        ) : (
          <View style={styles.cardStack}>
            {sharedInventory.map((item, index) => (
              <View
                key={item.id}
                style={[styles.workCard, { borderColor: palette.heroBorder, backgroundColor: palette.panelMuted }]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.sectionTitleBlock}>
                    <Label>Item {index + 1}</Label>
                    <BodyText>{item.name.trim() || 'Unnamed loot entry'}</BodyText>
                  </View>
                  <Pressable onPress={() => removeInventoryItem(item.id)} style={styles.secondaryButton}>
                    <Label style={styles.secondaryButtonText}>Remove</Label>
                  </Pressable>
                </View>

                <Label>Name</Label>
                <AppInput
                  value={item.name}
                  onChangeText={(value) => updateInventoryItem(item.id, 'name', value)}
                  placeholder="Bag of Holding"
                />

                <View style={styles.gridRow}>
                  <View style={styles.gridField}>
                    <Label>Category</Label>
                    <AppInput
                      value={item.category}
                      onChangeText={(value) => updateInventoryItem(item.id, 'category', value)}
                      placeholder="Magic item"
                    />
                  </View>
                  <View style={styles.numericField}>
                    <Label>Quantity</Label>
                    <AppInput
                      value={item.quantity}
                      onChangeText={(value) => updateInventoryItem(item.id, 'quantity', value)}
                      placeholder="1"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridField}>
                    <Label>Holder</Label>
                    <AppInput
                      value={item.holder}
                      onChangeText={(value) => updateInventoryItem(item.id, 'holder', value)}
                      placeholder="Shared"
                    />
                  </View>
                  <View style={styles.gridField}>
                    <Label>Rarity</Label>
                    <AppInput
                      value={item.rarity}
                      onChangeText={(value) => updateInventoryItem(item.id, 'rarity', value)}
                      placeholder="Uncommon"
                    />
                  </View>
                </View>

                <Label>Requires attunement?</Label>
                <AppInput
                  value={item.attunement}
                  onChangeText={(value) => updateInventoryItem(item.id, 'attunement', value)}
                  placeholder="Yes or No"
                />

                <Label>Notes</Label>
                <AppInput
                  value={item.notes}
                  onChangeText={(value) => updateInventoryItem(item.id, 'notes', value)}
                  placeholder="Recovered from the river shrine. Still needs Identify."
                  multiline
                />
              </View>
            ))}
          </View>
        )}
      </SystemPanel>

      <SystemPanel systemId="dnd5e">
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleBlock}>
            <Label>NPC Web</Label>
            <BodyText>
              Track patrons, allies, rivals, guides, faction officers, and recurring villains
              that keep the campaign grounded.
            </BodyText>
          </View>
          <Pressable
            onPress={() => setNpcRoster((current) => [...current, createDndNpc()])}
            style={[styles.primaryButton, { backgroundColor: palette.accent }]}
          >
            <Label style={styles.primaryButtonText}>Add NPC</Label>
          </Pressable>
        </View>

        <View style={styles.resultList}>
          {snapshot.npcHighlights.map((entry) => (
            <BodyText key={entry}>{entry}</BodyText>
          ))}
        </View>

        {npcRoster.length === 0 ? (
          <BodyText>No named NPCs yet. Start with a patron, a rival, or a local guide.</BodyText>
        ) : (
          <View style={styles.cardStack}>
            {npcRoster.map((npc, index) => {
              const directThreats = npcThreatsById.get(npc.id) ?? [];
              const factionThreats = npc.affiliation.trim().length > 0
                ? factionThreatsByName.get(npc.affiliation.trim().toLowerCase()) ?? []
                : [];

              return (
                <View
                  key={npc.id}
                  style={[styles.workCard, { borderColor: palette.heroBorder, backgroundColor: palette.panelMuted }]}
                >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.sectionTitleBlock}>
                    <Label>NPC {index + 1}</Label>
                    <BodyText>{npc.name.trim() || 'Unnamed contact'}</BodyText>
                    {directThreats.length > 0 ? (
                      <BodyText style={styles.assignmentText}>
                        Direct pressure: {directThreats.map((entry) => entry.escalationTag || entry.title).join(', ')}
                      </BodyText>
                    ) : null}
                    {directThreats.length === 0 && factionThreats.length > 0 ? (
                      <BodyText style={styles.assignmentText}>
                        Faction pressure: {factionThreats.map((entry) => entry.title).join(', ')}
                      </BodyText>
                    ) : null}
                  </View>
                  <Pressable onPress={() => removeNpc(npc.id)} style={styles.secondaryButton}>
                    <Label style={styles.secondaryButtonText}>Remove</Label>
                  </Pressable>
                </View>

                <Label>Name</Label>
                <AppInput
                  value={npc.name}
                  onChangeText={(value) => updateNpc(npc.id, 'name', value)}
                  placeholder="Sister Maelin"
                />

                <View style={styles.gridRow}>
                  <View style={styles.gridField}>
                    <Label>Species</Label>
                    <AppInput
                      value={npc.species}
                      onChangeText={(value) => updateNpc(npc.id, 'species', value)}
                      placeholder="Human"
                    />
                  </View>
                  <View style={styles.gridField}>
                    <Label>Role</Label>
                    <AppInput
                      value={npc.role}
                      onChangeText={(value) => updateNpc(npc.id, 'role', value)}
                      placeholder="Patron"
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridField}>
                    <Label>Affiliation</Label>
                    <AppInput
                      value={npc.affiliation}
                      onChangeText={(value) => updateNpc(npc.id, 'affiliation', value)}
                      placeholder="Temple of the Dawn"
                    />
                  </View>
                  <View style={styles.gridField}>
                    <Label>Disposition</Label>
                    <AppInput
                      value={npc.disposition}
                      onChangeText={(value) => updateNpc(npc.id, 'disposition', value)}
                      placeholder="Ally"
                    />
                  </View>
                </View>

                <Label>Hook / leverage / secret</Label>
                <AppInput
                  value={npc.hook}
                  onChangeText={(value) => updateNpc(npc.id, 'hook', value)}
                  placeholder="Will fund the delve if the relic returns to the temple."
                  multiline
                />
                </View>
              );
            })}
          </View>
        )}
      </SystemPanel>

      <SystemPanel systemId="dnd5e">
        <Label>SRD Field Guide</Label>
        <BodyText>
          These quick references make the D&D lock feel like a working DM tool instead of a
          renamed generic tab set. They stay in SRD-safe territory while giving you concrete
          species, class, weapon, armor, item, and monster anchors.
        </BodyText>

        <ReferenceSection
          title="Species Bench"
          items={DND_SPECIES_REFERENCE.map((entry) => ({
            key: entry.name,
            title: entry.name,
            body: entry.note,
          }))}
        />

        <ReferenceSection
          title="Class Bench"
          items={DND_CLASS_REFERENCE.map((entry) => ({
            key: entry.name,
            title: entry.name,
            body: entry.note,
          }))}
        />

        <ReferenceSection
          title="Weapon Bench"
          items={DND_WEAPON_REFERENCE.map((entry) => ({
            key: entry.name,
            title: `${entry.name} - ${entry.damage}`,
            subtitle: `${entry.category} - ${entry.properties}`,
            body: entry.note,
          }))}
        />

        <ReferenceSection
          title="Armor Bench"
          items={DND_ARMOR_REFERENCE.map((entry) => ({
            key: entry.name,
            title: `${entry.name} - ${entry.armorClass}`,
            subtitle: entry.category,
            body: entry.note,
          }))}
        />

        <ReferenceSection
          title="Gear & Magic Calls"
          items={DND_GEAR_REFERENCE.map((entry) => ({
            key: entry.name,
            title: entry.name,
            body: entry.note,
          }))}
        />

        <ReferenceSection
          title="Monster Bench"
          items={DND_MONSTER_REFERENCE.map((entry) => ({
            key: entry.name,
            title: `${entry.name} - ${entry.challenge}`,
            subtitle: `${entry.creatureType} | AC ${entry.armorClass} | HP ${entry.hitPoints} | ${entry.speed}`,
            body: entry.signature,
          }))}
        />
      </SystemPanel>
    </>
  );
}

type ReferenceSectionProps = {
  title: string;
  items: {
    key: string;
    title: string;
    subtitle?: string;
    body: string;
  }[];
};

function ReferenceSection({ title, items }: ReferenceSectionProps) {
  return (
    <View style={styles.referenceSection}>
      <Label>{title}</Label>
      <View style={styles.referenceGrid}>
        {items.map((item) => (
          <View key={item.key} style={styles.referenceCard}>
            <Label>{item.title}</Label>
            {item.subtitle ? <BodyText style={styles.referenceSubtitle}>{item.subtitle}</BodyText> : null}
            <BodyText>{item.body}</BodyText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryCard: {
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 4,
    backgroundColor: 'rgba(10, 8, 4, 0.18)',
  },
  summaryValue: {
    color: Colors.text,
    fontSize: 24,
  },
  resultList: {
    gap: 8,
  },
  sectionHeaderRow: {
    gap: Spacing.sm,
  },
  sectionTitleBlock: {
    gap: 4,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: Colors.text,
  },
  cardStack: {
    gap: Spacing.md,
  },
  workCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridField: {
    flexGrow: 1,
    flexBasis: 180,
    gap: 6,
  },
  numericField: {
    flexGrow: 1,
    flexBasis: 110,
    gap: 6,
  },
  referenceSection: {
    gap: Spacing.sm,
  },
  referenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  referenceCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
    padding: Spacing.md,
    gap: 6,
  },
  referenceSubtitle: {
    color: Colors.mutedText,
  },
  assignmentText: {
    color: Colors.mutedText,
  },
});
