import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const repoRoot = process.cwd();
const nodeRequire = createRequire(import.meta.url);
const tsModuleCache = new Map();

function runTypecheck() {
  const configPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('Unable to locate tsconfig.json');
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repoRoot);
  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length === 0) {
    return;
  }

  const formatHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => repoRoot,
    getNewLine: () => '\n',
  };

  throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));
}

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function resolveLocalModule(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.json`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.mjs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve module: ${basePath}`);
}

function loadTsModule(modulePath) {
  const resolvedPath = resolveLocalModule(modulePath);

  if (!resolvedPath.endsWith('.ts') && !resolvedPath.endsWith('.tsx')) {
    return nodeRequire(resolvedPath);
  }

  if (tsModuleCache.has(resolvedPath)) {
    return tsModuleCache.get(resolvedPath);
  }

  const source = fs.readFileSync(resolvedPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: resolvedPath,
  });

  const module = { exports: {} };
  tsModuleCache.set(resolvedPath, module.exports);

  const localRequire = (specifier) => {
    if (specifier.startsWith('@/')) {
      return loadTsModule(path.join(repoRoot, specifier.slice(2)));
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      return loadTsModule(path.resolve(path.dirname(resolvedPath), specifier));
    }

    return nodeRequire(specifier);
  };

  const wrapped = `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`;
  const compiled = vm.runInThisContext(wrapped, { filename: resolvedPath });
  compiled(module.exports, localRequire, module, resolvedPath, path.dirname(resolvedPath));

  tsModuleCache.set(resolvedPath, module.exports);
  return module.exports;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

function hasActiveProAccess(profile, nowMs) {
  if (!profile) return false;
  if (Boolean(profile.is_pro)) return true;

  if (!profile.current_period_end) return false;

  const periodEndMs = Date.parse(profile.current_period_end);
  if (!Number.isFinite(periodEndMs)) return false;

  return periodEndMs > nowMs;
}

function getPlanSummary({ isSignedIn, loading, loadingBillingState, profile, nowMs }) {
  const effectivePro = hasActiveProAccess(profile, nowMs);
  if (!isSignedIn) return 'Not signed in. Sign in to view and manage your plan.';
  if (loading || loadingBillingState) return 'Loading plan...';

  if (effectivePro && profile.cancel_at_period_end && profile.current_period_end) {
    return 'Pro has been canceled and remains active until end-of-period.';
  }

  if (effectivePro) return 'Pro is active and renews automatically.';

  return 'Free plan active. You can save up to 3 total projects.';
}

const results = [];

results.push(
  await test('TypeScript compiles without errors', async () => {
    runTypecheck();
  })
);

results.push(
  await test('D&D campaign link context derives threat, loot, and party pressure correctly', async () => {
    const { buildDndCampaignLinkContext, getDndRewardRecipientCandidates } = loadTsModule('lib/dndCampaignLinkContext');

    const context = buildDndCampaignLinkContext({
      campaignName: 'Ashes of Dunmere',
      partyName: 'Lantern Company',
      mainFaction: 'Temple of the Dawn',
      levelBand: 'Tier 2 (levels 5-10)',
      currentObjective: 'seal the crypt breach',
      partyRoster: [
        {
          id: 'pc-1',
          name: 'Theren',
          species: 'Human',
          className: 'Fighter',
          background: 'Soldier',
          level: '5',
          armorClass: '18',
          hitPoints: '44',
          passivePerception: '12',
          signatureItem: 'Longsword',
          notes: 'Leads the front line.',
        },
        {
          id: 'pc-2',
          name: 'Iria',
          species: 'Elf',
          className: 'Wizard',
          background: 'Sage',
          level: '6',
          armorClass: '14',
          hitPoints: '31',
          passivePerception: '15',
          signatureItem: 'Spellbook',
          notes: 'Primary ritualist.',
        },
      ],
      sharedInventory: [
        {
          id: 'item-1',
          name: 'Potion of Healing',
          category: 'Consumable',
          quantity: '2',
          holder: 'Shared',
          rarity: 'Common',
          attunement: 'No',
          notes: '',
        },
        {
          id: 'item-2',
          name: 'Pearl of Power',
          category: 'Magic item',
          quantity: '1',
          holder: 'Iria',
          rarity: 'Rare',
          attunement: 'Yes',
          notes: '',
        },
      ],
      partyTreasury: {
        gp: '325',
        sp: '40',
        cp: '',
        special: 'opal signet',
        notes: '',
      },
      npcRoster: [
        {
          id: 'npc-1',
          name: 'Sister Maelin',
          species: 'Human',
          role: 'Patron',
          affiliation: 'Temple of the Dawn',
          disposition: 'Ally',
          hook: 'Needs the breach sealed before the festival.',
        },
      ],
      threatClocks: [
        {
          id: 'clock-1',
          sourceProjectId: 'enc-1',
          projectName: 'Crypt Hold',
          title: 'Ghoul pressure beneath the abbey',
          status: 'escalating',
          segmentsFilled: 4,
          segmentsTotal: 6,
          linkedNpcId: 'npc-1',
          linkedNpcName: 'Sister Maelin',
          linkedFaction: 'Temple of the Dawn',
          escalationTag: 'Under Siege',
          difficulty: 'Hard',
          enemyRole: 'Undead host',
          verdict: 'Dangerous',
          fallout: 'Pilgrims stop arriving by dusk.',
          latestBeat: 'The crypt doors crack open after compline.',
          updatedAt: '2026-04-14T00:00:00.000Z',
        },
      ],
    });

    assert.ok(context);
    assert.equal(context.partySize, 2);
    assert.equal(context.averageLevel, 6);
    assert.equal(context.tierLabel, 'Tier 2');
    assert.match(context.treasurySummary, /325 gp/);
    assert.equal(context.attunementItems[0], 'Pearl of Power');
    assert.equal(context.consumableItems[0], 'Potion of Healing');
    assert.match(context.threatSummaryLines[0], /Sister Maelin/);
    assert.match(context.npcPressureLines[0], /Under Siege/);
    assert.match(context.factionPressureLines[0], /Temple of the Dawn/);
    assert.match(context.defaultEncounterNote, /seal the crypt breach/);
    assert.match(context.defaultTreasureNote, /Attunement slots are already under pressure/);

    const arcaneCandidates = getDndRewardRecipientCandidates(context, 'arcane');
    assert.deepEqual(
      arcaneCandidates.map((entry) => entry.name),
      ['Iria']
    );
  })
);

results.push(
  await test('D&D ledger readers normalize threat clocks and treasury awards safely', async () => {
    const { readDndThreatClocks, readDndTreasuryAwards } = loadTsModule('lib/dndCampaignLedger');

    const clocks = readDndThreatClocks([
      {
        id: 'clock-1',
        sourceProjectId: 'enc-1',
        projectName: 'Crypt Hold',
        title: 'Abbey panic',
        status: 'bad-status',
        segmentsFilled: 9,
        segmentsTotal: 4,
        linkedNpcId: 'npc-1',
        linkedNpcName: 'Sister Maelin',
        linkedFaction: 'Temple of the Dawn',
        escalationTag: 'Exposed',
        difficulty: 'Hard',
        enemyRole: 'Ghoul pack',
        verdict: 'Dangerous',
        fallout: 'The bells toll through the district.',
        latestBeat: 'Refugees flood the square.',
        updatedAt: '2026-04-14T00:00:00.000Z',
      },
    ]);

    assert.equal(clocks.length, 1);
    assert.equal(clocks[0].status, 'active');
    assert.equal(clocks[0].segmentsTotal, 4);
    assert.equal(clocks[0].segmentsFilled, 4);
    assert.equal(clocks[0].linkedFaction, 'Temple of the Dawn');

    const awards = readDndTreasuryAwards([
      {
        id: 'award-1',
        sourceProjectId: 'loot-1',
        projectName: 'River Cache',
        amountGp: -250,
        note: 'Boss hoard',
        updatedAt: '2026-04-14T00:00:00.000Z',
      },
    ]);

    assert.equal(awards.length, 1);
    assert.equal(awards[0].amountGp, 0);
  })
);

results.push(
  await test('D&D workbench snapshot summarizes roster and inventory without losing campaign signal', async () => {
    const { buildDndCampaignWorkbenchSnapshot } = loadTsModule('lib/dnd5eCampaignKit');

    const snapshot = buildDndCampaignWorkbenchSnapshot({
      partyRoster: [
        {
          id: 'pc-1',
          name: 'Theren',
          species: 'Human',
          className: 'Fighter',
          background: 'Soldier',
          level: '5',
          armorClass: '18',
          hitPoints: '44',
          passivePerception: '12',
          signatureItem: 'Longsword',
          notes: '',
        },
        {
          id: 'pc-2',
          name: 'Iria',
          species: 'Elf',
          className: 'Wizard',
          background: 'Sage',
          level: '6',
          armorClass: '14',
          hitPoints: '31',
          passivePerception: '15',
          signatureItem: 'Spellbook',
          notes: '',
        },
      ],
      inventory: [
        {
          id: 'item-1',
          name: 'Potion of Healing',
          category: 'Consumable',
          quantity: '2',
          holder: 'Shared',
          rarity: 'Common',
          attunement: 'No',
          notes: '',
        },
        {
          id: 'item-2',
          name: 'Pearl of Power',
          category: 'Magic item',
          quantity: '1',
          holder: 'Iria',
          rarity: 'Rare',
          attunement: 'Yes',
          notes: '',
        },
      ],
      treasury: {
        gp: '325',
        sp: '40',
        cp: '',
        special: 'opal signet',
        notes: '',
      },
      npcRoster: [
        {
          id: 'npc-1',
          name: 'Sister Maelin',
          species: 'Human',
          role: 'Patron',
          affiliation: 'Temple of the Dawn',
          disposition: 'Ally',
          hook: '',
        },
        {
          id: 'npc-2',
          name: 'Roth Vane',
          species: 'Human',
          role: 'Rival',
          affiliation: 'Red Knives',
          disposition: 'Hostile',
          hook: '',
        },
      ],
    });

    assert.equal(snapshot.partyCount, 2);
    assert.equal(snapshot.inventoryCount, 2);
    assert.equal(snapshot.npcCount, 2);
    assert.match(snapshot.averageLevelLabel, /5\.5|5/);
    assert.match(snapshot.highestPassiveLabel, /Iria \(15\)/);
    assert.match(snapshot.treasurySummary, /325 gp/);
    assert.ok(snapshot.partyCoverage.some((entry) => entry.includes('Front line covered by Theren')));
    assert.ok(snapshot.partyCoverage.some((entry) => entry.includes('Arcane pressure handled by Iria')));
    assert.ok(snapshot.inventoryHighlights.some((entry) => entry.includes('magic item')));
    assert.ok(snapshot.npcHighlights.some((entry) => entry.includes('hostile')));
  })
);

results.push(
  await test('Backend calculator behavior contract is preserved', async () => {
    const calculators = read('lib/calculators.ts');

    assert.match(calculators, /Math\.round\(baseXp \* Math\.pow\(growth \* modifier, level - 1\)\)/);
    assert.match(calculators, /partySize \* partyLevel \* 40/);
    assert.match(calculators, /seed % totalWeight/);
    assert.match(calculators, /\$\{prefix\} \$\{base\}/);
    assert.match(calculators, /questHooksByTone\[tone\]/);
  })
);

results.push(
  await test('Persistence and cross-surface app state refresh hooks remain wired', async () => {
    const context = read('contexts/AppStateContext.tsx');

    assert.match(context, /refreshInFlightRef/);
    assert.match(context, /supabase\.auth\.onAuthStateChange/);
    assert.match(context, /AppState\.addEventListener\('change'/);
    assert.match(context, /window\.addEventListener\('focus'/);
    assert.match(context, /window\.addEventListener\('pageshow'/);
    assert.match(context, /window\.addEventListener\('storage'/);
    assert.match(context, /document\.addEventListener\('visibilitychange'/);
    assert.match(context, /table: 'profiles'/);
    assert.match(context, /table: 'saved_projects'/);
  })
);

results.push(
  await test('Billing logic enforces upgrade/cancel/dont-cancel lifecycle behavior', async () => {
    const nowMs = Date.parse('2026-04-01T00:00:00.000Z');
    const nextMonth = '2026-05-01T00:00:00.000Z';

    const freeProfile = { is_pro: false, cancel_at_period_end: false, current_period_end: null };
    assert.equal(hasActiveProAccess(freeProfile, nowMs), false);

    const upgradedProfile = { is_pro: true, cancel_at_period_end: false, current_period_end: null };
    assert.equal(hasActiveProAccess(upgradedProfile, nowMs), true);
    assert.equal(
      getPlanSummary({ isSignedIn: true, loading: false, loadingBillingState: false, profile: upgradedProfile, nowMs }),
      'Pro is active and renews automatically.'
    );

    const canceledButStillActive = { is_pro: true, cancel_at_period_end: true, current_period_end: nextMonth };
    assert.equal(hasActiveProAccess(canceledButStillActive, nowMs), true);
    assert.equal(
      getPlanSummary({ isSignedIn: true, loading: false, loadingBillingState: false, profile: canceledButStillActive, nowMs }),
      'Pro has been canceled and remains active until end-of-period.'
    );

    const webhookLagStillEntitled = { is_pro: false, cancel_at_period_end: true, current_period_end: nextMonth };
    assert.equal(hasActiveProAccess(webhookLagStillEntitled, nowMs), true);

    const dontCancelProfile = { is_pro: true, cancel_at_period_end: false, current_period_end: null };
    assert.equal(hasActiveProAccess(dontCancelProfile, nowMs), true);

    const expiredProfile = { is_pro: false, cancel_at_period_end: true, current_period_end: '2026-03-01T00:00:00.000Z' };
    assert.equal(hasActiveProAccess(expiredProfile, nowMs), false);
  })
);

results.push(
  await test('Front-end enforces campaign-only lock and keeps free tabs available', async () => {
    const campaign = read('app/(tabs)/campaign.tsx');
    const xp = read('app/(tabs)/xp.tsx');
    const encounters = read('app/(tabs)/encounters.tsx');
    const generator = read('app/(tabs)/generator.tsx');
    const quest = read('app/(tabs)/quest.tsx');

    assert.match(campaign, /getCampaignHubUpsell/);
    assert.match(campaign, /UpgradeBanner/);
    assert.match(campaign, /if \(!loadingSession && !isPro\)/);

    assert.doesNotMatch(xp, /if \(!loadingSession && !isPro\)/);
    assert.doesNotMatch(encounters, /if \(!loadingSession && !isPro\)/);
    assert.doesNotMatch(generator, /if \(!loadingSession && !isPro\)/);
    assert.doesNotMatch(quest, /if \(!loadingSession && !isPro\)/);

    assert.match(xp, /UpgradeBanner/);
    assert.match(encounters, /UpgradeBanner/);
    assert.match(generator, /UpgradeBanner/);
    assert.match(quest, /UpgradeBanner/);
  })
);

results.push(
  await test('D&D screens expose promotion and escalation hooks for linked campaign workflows', async () => {
    const campaign = read('app/(tabs)/campaign.tsx');
    const encounters = read('app/(tabs)/encounters.tsx');
    const generator = read('app/(tabs)/generator.tsx');
    const workbench = read('components/DndCampaignWorkbench.tsx');

    assert.match(campaign, /Escalation Watch/);
    assert.match(campaign, /Recent Coin Awards/);
    assert.match(encounters, /Escalated NPC/);
    assert.match(encounters, /Faction Under Pressure/);
    assert.match(encounters, /Escalation Tag/);
    assert.match(generator, /Assign promoted items to/);
    assert.match(generator, /Promote Featured Item/);
    assert.match(generator, /Post Coin to Treasury/);
    assert.match(workbench, /Assigned gear:/);
    assert.match(workbench, /Direct pressure:/);
  })
);

results.push(
  await test('Supabase and Stripe integration contracts remain intact', async () => {
    const supabase = read('lib/supabase.ts');
    const pricing = read('app/pricing.tsx');
    const billingContext = read('contexts/BillingContext.tsx');
    const schema = read('supabase/schema.sql');
    const checkoutFn = read('supabase/functions/create-checkout-session/index.ts');
    const portalFn = read('supabase/functions/create-customer-portal-session/index.ts');
    const webhookFn = read('supabase/functions/stripe-webhook/index.ts');

    assert.match(supabase, /createClient\(supabaseUrl, supabaseAnonKey/);
    assert.match(supabase, /detectSessionInUrl:\s*Platform\.OS === 'web'/);

    assert.match(pricing, /useBilling\(\)/);
    assert.match(pricing, /purchasePro/);
    assert.match(pricing, /manageSubscription/);
    assert.match(billingContext, /create-checkout-session/);
    assert.match(billingContext, /create-customer-portal-session/);
    assert.match(billingContext, /window\.location\.href = data\.url/);
    assert.match(checkoutFn, /success_url: `\$\{appUrl\}\/pricing\?checkout=success/);
    assert.match(portalFn, /return_url: `\$\{appUrl\}\/pricing`/);
    assert.match(webhookFn, /subscription\.items\.data/);
    assert.doesNotMatch(webhookFn, /typeof subscription\.current_period_end/);

    assert.match(schema, /create table if not exists public\.profiles/i);
    assert.match(schema, /create table if not exists public\.(saved_projects|projects)/i);
  })
);

results.push(
  await test('Billing files use shared entitlement helper to avoid state desync', async () => {
    const billing = read('lib/billing.ts');
    const projectAccess = read('lib/projectAccess.ts');
    const context = read('contexts/AppStateContext.tsx');
    const billingContext = read('contexts/BillingContext.tsx');
    const pricing = read('app/pricing.tsx');
    const account = read('app/(tabs)/account.tsx');
    const campaign = read('app/(tabs)/campaign.tsx');
    const encounters = read('app/(tabs)/encounters.tsx');
    const generator = read('app/(tabs)/generator.tsx');
    const quest = read('app/(tabs)/quest.tsx');
    const revenueCat = read('lib/revenueCat.ts');
    const revenueCatWebhook = read('supabase/functions/revenuecat-webhook/index.ts');
    const revenueCatSync = read('supabase/functions/sync-revenuecat-customer/index.ts');
    const xp = read('app/(tabs)/xp.tsx');

    assert.match(billing, /export function hasActiveProAccess/);
    assert.match(billing, /export function markBillingReturnPending/);
    assert.match(billing, /export function getPendingBillingReturn/);
    assert.match(projectAccess, /hasActiveProAccess/);
    assert.match(projectAccess, /export async function fetchLatestSaveAccess/);
    assert.match(context, /hasActiveProAccess/);
    assert.match(context, /getPendingBillingReturn/);
    assert.match(pricing, /hasActiveProAccess/);
    assert.match(pricing, /useBilling\(\)/);
    assert.match(billingContext, /markBillingReturnPending/);
    assert.match(billingContext, /syncRevenueCatProfile/);
    assert.match(account, /billingProfile/);
    assert.match(account, /useBilling\(\)/);
    assert.match(campaign, /fetchLatestSaveAccess/);
    assert.match(encounters, /fetchLatestSaveAccess/);
    assert.match(generator, /fetchLatestSaveAccess/);
    assert.match(quest, /fetchLatestSaveAccess/);
    assert.match(xp, /fetchLatestSaveAccess/);
    assert.match(revenueCat, /react-native-purchases/);
    assert.match(revenueCat, /Purchases\.purchasePackage/);
    assert.match(revenueCatWebhook, /REVENUECAT_WEBHOOK_AUTH_HEADER/);
    assert.match(revenueCatSync, /fetchRevenueCatSubscriber/);
    assert.doesNotMatch(account, /supabase\.auth\.onAuthStateChange/);
    assert.doesNotMatch(campaign, /Boolean\(profileData\?\.is_pro\)/);
    assert.doesNotMatch(encounters, /Boolean\(profileData\?\.is_pro\)/);
    assert.doesNotMatch(generator, /Boolean\(profileData\?\.is_pro\)/);
    assert.doesNotMatch(quest, /Boolean\(profileData\?\.is_pro\)/);
    assert.doesNotMatch(xp, /Boolean\(profileData\?\.is_pro\)/);
  })
);

if (results.every(Boolean)) {
  console.log('\nAll tests passed.');
  process.exit(0);
}

console.error('\nOne or more tests failed.');
process.exit(1);
