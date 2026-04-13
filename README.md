# RPG Toolkit

An Expo Router app for web and mobile that ships RPG prep tools, Supabase-backed accounts and saves, Stripe-powered web subscriptions, and RevenueCat-backed native subscription plumbing for iOS and Android.

## Current product surface

- XP curve calculator
- Encounter builder
- Loot generator
- Quest/faction generator
- Campaign Hub for Pro users
- Supabase auth, profiles, realtime save counts, and saved projects
- Stripe Checkout + customer portal for web billing
- RevenueCat-backed native billing layer for App Store / Google Play subscriptions

## Stack

- Expo SDK 55
- Expo Router
- React Native + Web
- Supabase Auth, Postgres, Realtime, and Edge Functions
- Stripe Billing
- RevenueCat React Native SDK
- EAS Hosting and EAS Workflows

## Local setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy [.env.example](/C:/Users/rossm/rpg-toolkit-starter/.env.example) to `.env` and fill in the values you need for local development.
3. Start the app
   ```bash
   npm run web
   ```
   or
   ```bash
   npm run ios
   ```

## Quality checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run export:web`
- `npm run check`

## Deployment

### Web

- EAS Hosting workflows live in [.eas/workflows/deploy.yml](/C:/Users/rossm/rpg-toolkit-starter/.eas/workflows/deploy.yml) and [.eas/workflows/pr-preview.yml](/C:/Users/rossm/rpg-toolkit-starter/.eas/workflows/pr-preview.yml).
- Expo environment names are pinned in [eas.json](/C:/Users/rossm/rpg-toolkit-starter/eas.json) so build/update/deploy jobs use consistent `development`, `preview`, and `production` environments.
- After your production site URL changes, update the Supabase `APP_URL` secret so Stripe returns to the right pricing page.

### Native Billing

- Add `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to the Expo client environment before testing native subscriptions.
- Add `REVENUECAT_SECRET_API_KEY` and `REVENUECAT_ENTITLEMENT_ID` to Supabase secrets before deploying the `sync-revenuecat-customer` and `revenuecat-webhook` Edge Functions.
- Add `REVENUECAT_WEBHOOK_AUTH_HEADER` in Supabase and configure the same Authorization header value in the RevenueCat webhook settings before going live.
- Point a RevenueCat webhook at the deployed `revenuecat-webhook` function so renewals, cancellations, restores, and store-side changes continue syncing back into `profiles`.
- Native purchase buttons stay in preview mode until the RevenueCat public SDK key for the current platform is present.
- Test purchases from a development build or store build, not Expo Go, because native in-app purchase flows require the RevenueCat SDK to run in a real native client.

### Supabase

- Edge Function deployment settings live in [config.toml](/C:/Users/rossm/rpg-toolkit-starter/supabase/config.toml).
- Database schema source of truth lives in [schema.sql](/C:/Users/rossm/rpg-toolkit-starter/supabase/schema.sql) and tracked migrations in `supabase/migrations/`.
- GitHub Actions deploy Supabase changes from [.github/workflows/supabase-deploy.yml](/C:/Users/rossm/rpg-toolkit-starter/.github/workflows/supabase-deploy.yml).

Required GitHub configuration:

- Secret: `SUPABASE_ACCESS_TOKEN`
- Secret: `SUPABASE_DB_PASSWORD`
- Variable: `SUPABASE_PROJECT_REF`

## Security notes

- `.env` files stay untracked.
- `EXPO_PUBLIC_*` values are client-visible and should never contain secrets.
- `EXPO_PUBLIC_APP_URL` and `EXPO_PUBLIC_SUPPORT_EMAIL` are used in the client bundle, so keep them aligned with the production site URL and public contact address before exporting or deploying web.
- Stripe secret keys, RevenueCat secret keys, webhook secrets, and the Supabase service-role key belong only in local `.env`, Supabase secrets, or GitHub secrets.
- See [SECURITY.md](/C:/Users/rossm/rpg-toolkit-starter/SECURITY.md) for private vulnerability reporting.

## Operational notes

- The app’s Pro entitlement logic is centralized in [billing.ts](/C:/Users/rossm/rpg-toolkit-starter/lib/billing.ts), [AppStateContext.tsx](/C:/Users/rossm/rpg-toolkit-starter/contexts/AppStateContext.tsx), and [BillingContext.tsx](/C:/Users/rossm/rpg-toolkit-starter/contexts/BillingContext.tsx).
- Stripe webhooks, RevenueCat sync/webhook functions, and billing portal redirects are implemented in `supabase/functions/`.
- `APP_URL` is the server-side source of truth for Stripe return URLs.
- `EXPO_PUBLIC_APP_URL` is used as a non-web auth redirect fallback in [authRedirect.ts](/C:/Users/rossm/rpg-toolkit-starter/lib/authRedirect.ts), while web uses `window.location.origin`.
- Native billing keys are read from [.env.example](/C:/Users/rossm/rpg-toolkit-starter/.env.example) and wired through [billingConfig.ts](/C:/Users/rossm/rpg-toolkit-starter/lib/billingConfig.ts) and [revenueCat.ts](/C:/Users/rossm/rpg-toolkit-starter/lib/revenueCat.ts).
- `EXPO_PUBLIC_SUPPORT_EMAIL` feeds the public support address rendered on the landing and legal pages.
- Launch and post-launch checks live in [launch-monitoring.md](/C:/Users/rossm/rpg-toolkit-starter/docs/launch-monitoring.md).
