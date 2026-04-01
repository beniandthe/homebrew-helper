import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();

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

const results = [];

results.push(
  await test('TypeScript compiles without errors', async () => {
    execSync('npm run typecheck', { stdio: 'pipe' });
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
  await test('App state persistence hooks remain wired', async () => {
    const context = read('contexts/AppStateContext.tsx');
    const supabase = read('lib/supabase.ts');

    assert.match(supabase, /persistSession:\s*typeof window !== 'undefined'/);
    assert.match(supabase, /storage:\s*Platform\.OS === 'web' \? webStorage : AsyncStorage/);
    assert.match(context, /refreshInFlightRef/);
    assert.match(context, /supabase\.auth\.onAuthStateChange/);
    assert.match(context, /AppState\.addEventListener\('change'/);
    assert.match(context, /window\.addEventListener\('storage'/);
    assert.match(context, /document\.addEventListener\('visibilitychange'/);
  })
);

results.push(
  await test('Front-end screens keep critical behavior entry points', async () => {
    const resultRow = read('components/ResultRow.tsx');
    const pricing = read('app/pricing.tsx');

    assert.match(resultRow, /<Label>\{label\}<\/Label>/);
    assert.match(resultRow, /<BodyText style=\{styles\.value\}>\{value\}<\/BodyText>/);

    assert.match(pricing, /async function handleUpgradePress/);
    assert.match(pricing, /async function handleManageSubscriptionPress/);
    assert.match(pricing, /setBanner\(/);
  })
);

results.push(
  await test('Supabase and Stripe integration contracts remain intact', async () => {
    const supabase = read('lib/supabase.ts');
    const pricing = read('app/pricing.tsx');
    const schema = read('supabase/schema.sql');

    assert.match(supabase, /createClient\(supabaseUrl, supabaseAnonKey/);
    assert.match(supabase, /detectSessionInUrl:\s*Platform\.OS === 'web'/);

    assert.match(pricing, /create-checkout-session/);
    assert.match(pricing, /create-customer-portal-session/);
    assert.match(pricing, /window\.location\.href = data\.url/);

    assert.match(schema, /create table if not exists public\.profiles/i);
    assert.match(schema, /create table if not exists public\.(saved_projects|projects)/i);

  })
);

if (results.every(Boolean)) {
  console.log('\nAll tests passed.');
  process.exit(0);
}

console.error('\nOne or more tests failed.');
process.exit(1);
