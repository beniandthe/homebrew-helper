# RPG Toolkit Starter

A lightweight Expo + Expo Router starter for a cross-platform RPG utility app that runs on web and iPhone from one codebase.

## Included in this starter

- Home/dashboard screen
- XP Curve Calculator
- Encounter Budget Calculator
- Loot Generator
- Quest/Faction Generator
- Account screen with Supabase integration stub
- Roadmap screen for the next monetization steps
- Supabase schema for user profiles and saved projects
- EAS build config for App Store/TestFlight workflows

## Stack

- Expo
- Expo Router
- React Native + Web
- Supabase (optional, ready to wire)
- EAS Build / Submit

## Local setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and add your Supabase values if you want auth/save support.
3. Start the project
   ```bash
   npm run web
   ```
   or
   ```bash
   npm run ios
   ```

## Suggested next implementation steps

### 1) Save projects
Create a `useProjects` hook that writes calculator/generator outputs into the `projects` table.

### 2) Web monetization
Add a `/pricing` route and wire Stripe Checkout for web-only subscriptions.

### 3) iPhone monetization
Add Apple IAP after your core paid features are stable. Keep your paywall logic behind a single `isPro` gate so Stripe and Apple can share the same entitlement checks.

### 4) SEO/web growth
Add route-level metadata and dedicated landing pages such as:
- `/xp-calculator`
- `/encounter-builder`
- `/loot-generator`
- `/quest-generator`

## Notes

This repo is intentionally simple so you can ship quickly. The formulas and generator content are easy to replace once you validate what users actually want.
