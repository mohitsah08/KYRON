# KYRON authentication: status report (2026-10-30)

Nothing has been committed or deployed. All changes are in the local working tree.

## Root cause of `initialMode is not defined`

Two Claude sessions edited `client/src/pages/AuthPage.tsx` at the same time and overwrote each other. The file that ended up on disk was a half-merged version: it still had a `useEffect` reading `initialMode` after the declaration had been removed, and it called `resendVerificationEmail` from an auth context that no longer had it. The page has been replaced with one consistent implementation. The modes now come from the route (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`), and `/auth?mode=…` still works for older links.

## Test results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Sign In opens the auth page | PASS | Clicking the navbar button opened `/login` in the browser, with no console errors |
| 2 | Get Started opens registration | PASS | Navbar button opened `/signup` showing "Create your KYRON account" |
| 3 | No `initialMode` error | PASS | `/login`, `/signup`, `/auth?mode=register` loaded directly with no errors, and `tsc` is clean |
| 4 | Login with valid credentials | NOT RUN | Needs a verified test account (see below) |
| 5 | Invalid credentials show a clear error | PASS | Showed "That email and password don't match." |
| 6 | Signup and email verification | NOT RUN (code ready) | Email confirmation is ON in Supabase. I didn't create a real account, to avoid sending verification emails |
| 7 | Forgot / reset password | PARTIAL PASS | Reset request returns the neutral "Check your email" screen. Invalid and expired reset links show the right state. A full reset needs a real inbox |
| 8 | Google OAuth | BLOCKED BY MANUAL CONFIGURATION | Google provider is disabled in Supabase. The button starts the real Supabase OAuth flow once it's enabled. Until then it shows "Google sign-in isn't enabled for KYRON yet" |
| 9 | GitHub OAuth | BLOCKED BY MANUAL CONFIGURATION | Same situation: GitHub provider is disabled |
| 10 | OAuth callback creates a session | PARTIAL PASS | Cancelled (`access_denied`) and expired-link callbacks show the correct screens. A successful callback can't be tested until a provider is enabled |
| 11 | Profile creation | NOT RUN LIVE | The trigger `on_auth_user_created` exists. A hardening migration (below) is waiting for approval |
| 12 | Session persists after refresh | NOT RUN | Needs #4. The code uses a single `onAuthStateChange` listener with `INITIAL_SESSION` |
| 13 | Logout | NOT RUN | Needs #4 |
| 14 | Protected routes reject logged-out users | PASS | `/dashboard` redirected to `/login?next=%2Fdashboard`, and `/creator/submit` redirected the same way |
| 15 | Public marketplace accessible | PASS | `/skills` loaded while logged out |
| 16 | Production build | PASS | `npm run build` succeeded, and no server secrets were found in `dist/client` |
| — | Automated tests | PASS | `npm test`: 73 of 73 pass, including the new `tests/auth.test.ts` |
| — | Open-redirect protection | PASS | `?next=https://evil.example` is ignored. Covered by unit tests |
| — | Mobile layout | PASS | Checked at 375px |

## Manual configuration needed (Supabase dashboard, project `slkmbmixdqczcjmmnnhc`)

1. **Authentication → URL Configuration**
   - Site URL: your production domain.
   - Redirect URLs: add `http://localhost:5173/**` and `https://<production-domain>/**`. The app redirects to `/auth/callback` (email verification and OAuth) and `/reset-password`.
   - I couldn't read the production domain: the Vercel project sits under the `mohitsah08` scope, and this connection isn't authorized for it.
2. **Authentication → Providers → Google**: enable it, then paste a Google Cloud OAuth client ID and secret. In Google Cloud, set the authorized redirect URI to `https://slkmbmixdqczcjmmnnhc.supabase.co/auth/v1/callback`.
3. **Authentication → Providers → GitHub**: enable it, then paste a GitHub OAuth App client ID and secret. Set the GitHub app's callback URL to `https://slkmbmixdqczcjmmnnhc.supabase.co/auth/v1/callback`.
4. **Apply the hardening migration** `supabase/migrations/20261029180000_auth_profile_hardening.sql`. An automatic safety check blocked me from running it on the live database.
   - It closes a live leak: the public browser key can currently read every profile's email, password hash (42 legacy rows), credits and role.
   - It also stops users from changing their own role, credits or email.
   - It limits avatar uploads to the user's own folder (2 MB, images only).
   - It makes the signup trigger handle taken usernames and Google/GitHub profile data. Without this, an OAuth signup whose name collides with an existing username fails with "Database error saving new user".
   - It drops no tables or rows.

## To finish the live tests

Give me a test inbox I can use (or confirm one), plus your OK to create one test account. I'll then run login, refresh persistence, logout, profile edit and avatar upload end to end, and delete the test account afterwards.

## Changed files

- `client/src/pages/AuthPage.tsx`: rewritten. Includes login, signup, forgot, reset and callback screens, plus Google and GitHub buttons.
- `client/src/context/AuthContext.tsx`: one auth listener, deduped profile loading, `signInWithProvider`, `resendVerification`, and error mapping.
- `client/src/components/ProtectedRoute.tsx`: waits for the session check, then redirects to `/login?next=…`.
- `client/src/components/Navbar.tsx`: Sign In and Get Started buttons, avatar with initials fallback, and a dropdown with My Dashboard, My Profile, Creator Studio, Account Settings and Sign Out.
- `client/src/App.tsx`: auth routes and `/profile`.
- `client/src/utils/authHelpers.ts` (new): validation, redirect sanitising, error messages.
- `client/src/utils/supabase.ts`: exports its URL and key.
- `client/src/vite-env.d.ts` (new).
- `client/src/pages/TeamSettingsPage.tsx`: validation, real verified status, member-since date, avatar type and size checks.
- `client/src/pages/CreatorProfilePage.tsx`: restored missing imports, which would have crashed "My Profile".
- `SkillCard.tsx`, `SkillDetailPage.tsx`, `SubmitSkillPage.tsx`, `SellPage.tsx`: their login prompts now return the user to where they were.
- `server/routes/auth.ts`: profile update validation. The legacy password endpoints are turned off outside tests, which also disables the hardcoded `admin@kyron.dev` demo login.
- `server/middleware/auth.ts`: never trusts the built-in fallback JWT secret outside tests.
- `tests/auth.test.ts` (new) and `supabase/migrations/20261029180000_auth_profile_hardening.sql` (new).
