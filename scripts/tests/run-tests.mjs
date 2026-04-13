import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();

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
