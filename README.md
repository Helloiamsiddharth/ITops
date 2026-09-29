# IT Ops Platform (Vite + React + Firebase, hosted on GitHub Pages)

## Setup
1. Firebase console: create project → enable **Auth → Email/Password**, create **Firestore**.
2. Auth → Settings → **Authorized domains**: add `<your-github-username>.github.io`.
3. Publish `firestore.rules` (Firestore → Rules, or `firebase deploy --only firestore:rules`).
4. `cp .env.example .env`, fill values; `npm install && npm run dev`.
5. **Seed admin:** sign up once with `siddharth.bohara@kapower.us` — that exact email is auto-created as an active `admin` (enforced by the rules).
   To promote a Super Admin, edit that user's `role` to `super_admin` in the Firestore console (rules only let super admins change roles afterward).
6. GitHub: push to `main`, then Settings → Pages → Source = **GitHub Actions**, and add repo secrets `VITE_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._APP_ID`.
7. First Analytics/Logger load may log a Firestore "create index" link in the console — click it once.

Note: Firebase web config values are public by design; security comes from the Firestore rules.
Uses HashRouter + `base: './'` so it works under `/<repo>/` on Pages.
