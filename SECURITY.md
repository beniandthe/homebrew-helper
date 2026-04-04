# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for security problems.

Report suspected vulnerabilities, leaked credentials, or account-access issues to:

- `admin@homebrew-helper.com`

Include:

- a short description of the issue
- steps to reproduce it
- the affected URL, route, or function if known
- screenshots or logs if they help explain the problem

## Response expectations

We aim to acknowledge reports within 3 business days and will prioritize credential exposure, authentication bypass, billing issues, and data-access problems first.

## Scope

This repo powers the public Homebrew Helper web app, including:

- Expo web app code
- Supabase schema and Edge Functions
- Stripe subscription integration
- deployment and CI/CD workflows

## Safe handling

- Never post secrets, API keys, or database credentials in a public issue or pull request.
- Never include another user’s personal data or billing details in a public report.
- If you discover an exposed secret, stop using it and report it immediately so it can be rotated.
