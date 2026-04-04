# RPG Toolkit

An Expo Router app for web and iPhone that ships RPG prep tools, Supabase-backed accounts and saves, and Stripe-powered web subscriptions.

## Current product surface

- XP curve calculator
- Encounter builder
- Loot generator
- Quest/faction generator
- Campaign Hub for Pro users
- Supabase auth, profiles, realtime save counts, and saved projects
- Stripe Checkout + customer portal for web billing

## Stack

- Expo SDK 55
- Expo Router
- React Native + Web
- Supabase Auth, Postgres, Realtime, and Edge Functions
- Stripe Billing
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
- Stripe secret keys, webhook secrets, and the Supabase service-role key belong only in local `.env`, Supabase secrets, or GitHub secrets.
- See [SECURITY.md](/C:/Users/rossm/rpg-toolkit-starter/SECURITY.md) for private vulnerability reporting.

## Operational notes

- The app’s Pro entitlement logic is centralized in [billing.ts](/C:/Users/rossm/rpg-toolkit-starter/lib/billing.ts) and [AppStateContext.tsx](/C:/Users/rossm/rpg-toolkit-starter/contexts/AppStateContext.tsx).
- Stripe webhooks and billing portal redirects are implemented in `supabase/functions/`.
- `APP_URL` is the server-side source of truth for Stripe return URLs.
- `EXPO_PUBLIC_APP_URL` is used as a non-web auth redirect fallback in [authRedirect.ts](/C:/Users/rossm/rpg-toolkit-starter/lib/authRedirect.ts), while web uses `window.location.origin`.
- `EXPO_PUBLIC_SUPPORT_EMAIL` feeds the public support address rendered on the landing and legal pages.
- Launch and post-launch checks live in [launch-monitoring.md](/C:/Users/rossm/rpg-toolkit-starter/docs/launch-monitoring.md).
