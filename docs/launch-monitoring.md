# Launch Monitoring

## Goal

Catch billing, auth, deploy, and public-site regressions early during launch week and establish a lightweight steady-state check after that.

## First 72 hours

Check these at least twice per day:

- Stripe Dashboard
  - recent Checkout sessions
  - failed payments
  - webhook deliveries for `stripe-webhook`
  - subscription cancellations, resumes, and invoice failures
- Supabase Dashboard
  - Edge Function logs for `create-checkout-session`
  - Edge Function logs for `create-customer-portal-session`
  - Edge Function logs for `stripe-webhook`
  - Auth email delivery behavior and signup confirmations
  - database size and auth/service health on the free plan
- Expo / production site
  - [https://homebrewhelper.expo.app](https://homebrewhelper.expo.app)
  - pricing page loads
  - privacy and terms pages load
  - one account signup and login sanity check if anything looks off
- GitHub
  - Actions failures on `CI`, `Supabase Deploy`, and `Production Smoke`
  - Dependabot pull requests
  - secret scanning alerts and push protection blocks
- Support inbox
  - `admin@homebrew-helper.com`
  - look for verification, billing, or save-state complaints

## Weekly steady-state checks

- review Stripe failed payments and canceled subscriptions
- review Supabase function logs for recurring errors
- review GitHub Actions failures
- review Dependabot PRs
- confirm production site still serves public routes

## Trigger conditions

Treat these as same-day investigation items:

- any user reports of paying without getting Pro access
- any webhook delivery failures in Stripe
- any repeated `stripe-webhook` errors in Supabase logs
- verification emails failing or landing on the wrong page
- production public pages failing the smoke workflow
- unexpected spikes in auth failures or save failures

## Repo-side protections in place

- `CI` runs on pushes and pull requests
- `Supabase Deploy` runs only on pushes to `main`
- `Production Smoke` runs daily and on demand
- `CODEOWNERS` is present for future protected-branch review rules
- `SECURITY.md` defines private reporting
- Dependabot watches npm packages and GitHub Actions

## GitHub settings to enable manually

These are dashboard settings and are not stored in git:

1. Branch protection on `main`
   - require a pull request before merging
   - require at least 1 approval
   - require status checks to pass
   - include `CI` as a required check
2. Secret scanning alerts
3. Push protection

## Launch checklist

Before or during launch day:

- confirm Stripe is using live key, live price, and live webhook secret
- confirm Supabase `APP_URL` matches production
- confirm auth email verification still works end to end
- run `Production Smoke` manually once after any deploy
