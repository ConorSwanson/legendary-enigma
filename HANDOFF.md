# Switchback — session handoff

Context carried over from the original "App build request" Claude session
(June 20 – Sep 5, 2026), which can no longer start. Read this before working
on the repo.

## The project
- **Switchback** (bundle "14ers"): iOS SwiftUI app + Express / better-sqlite3
  backend. Tracks summits (Colorado 14ers/13ers, US state highpoints, CA,
  ADK 46, NE, Catskills…), badges, feed, leaderboard, wishlist, climb invites.
- Live on the App Store: https://apps.apple.com/us/app/switchback-summit-tracker/id6784754996
- API: https://legendary-enigma-production.up.railway.app — share pages on
  https://www.getswitchback.co

## How things ship
- **Railway auto-deploys from `claude/app-build-request-v25jp2`.** That is the
  real working branch. `main` exists only so old sessions can start; don't
  delete it.
- No direct production DB access. Schema and data changes ship as
  idempotent boot-time code in `server/src/db.js` `initDb()`.
- Admin endpoints (`/api/admin/*`, `/api/users/all`, `/api/beta/list`) use the
  `x-admin-secret` header = Railway's `BETA_LIST_SECRET`.
- iOS builds are done by Conor in Xcode; Claude can't compile or run the app,
  so say so when a UI fix is unverified.
- App Store: bump `MARKETING_VERSION` above the last *approved* version (both
  Debug and Release in `project.pbxproj`). Current: **1.2 (build 4)**,
  submitted Sep 4. App Store Connect release notes reject emoji.

## Working habits Conor relied on
- Before pushing any schema change: rebuild a legacy-schema DB from
  `git show HEAD:server/src/db.js`, seed it, run the new `initDb()` on it twice
  (migration + idempotency). A `CREATE INDEX` beside a `CREATE TABLE IF NOT
  EXISTS` for a new column once crashed production — put such indexes after
  the matching `ALTER TABLE` guard.
- Exercise new endpoints against a local server before pushing; curl
  production after each deploy to confirm health.
- Commit and push finished work promptly; keep scratch files out of the repo.
- Conor works mostly from his phone and shares screenshots; keep answers
  short and give plain steps for App Store Connect / Xcode.

## Open threads
- **Photo credits**: all default mountain photos are from Wikimedia Commons
  (Public Domain, CC0, CC BY, CC BY-SA). CC BY/BY-SA ones show an inline
  "Photo: author" pill (`PhotoCreditBadge.swift`). Last open question: add a
  "Photo Credits" screen / CREDITS.md, or is inline attribution enough?
- **Toolbar pill fix** (`ToolbarSpacer`, iOS 26) was never confirmed on device.
- **Intermittent 502s** reported twice; production was healthy when checked;
  root cause unknown without Railway logs.
- **Logan Labron's posts** (Oct 2026): Conor wants them off Discover, set to
  *followers* (keeps his leaderboard rank). Admin endpoints added:
  `GET /api/admin/climbs?user=` and `POST /api/admin/climbs/visibility`.

## Artifacts (Conor's claude.ai account)
- 14ers App Icon — https://claude.ai/code/artifact/5e41d86d-a923-4352-813e-50da07e4860e
- TestFlight Submission Package — https://claude.ai/code/artifact/6681af46-e317-45ee-a491-b078bf9b419d
- TestFlight Submission Guide — https://claude.ai/code/artifact/5eb33913-61d5-4554-b6fe-625f60dd6209
- Log a Climb — Redesign Directions — https://claude.ai/code/artifact/b208db88-0315-4ee1-8ec2-dd628c5ead56
- Profile Stats — Redesign Options — https://claude.ai/code/artifact/7c1f6805-d24d-4513-a338-d0a0e2ecc74a
- Profile Stats — Scrubber + Deep Dive — https://claude.ai/code/artifact/003fd0ef-2775-473b-9805-bdc30e340cf7
- 14ers Photo Sourcing Review — https://claude.ai/code/artifact/86919286-3870-446a-ae8b-46dd74da0a65
- Invite to Climb — https://claude.ai/code/artifact/47fd7e73-4cb7-4b95-8c69-9b7d00507220
