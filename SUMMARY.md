# Salon Dashboard Redesign — Summary

Branch: `feat/salon-dashboard-redesign` (3 commits, not merged, not deployed).

> Note: this file previously held an unrelated summary from the `chore/overnight-tests`
> branch (2026-06-01). That branch has its own history in git log; this file is
> replaced per this task's Phase 4 instructions rather than appended to, since the
> two pieces of work are unrelated.

## What changed, file by file

### DB migrations (`supabase/migrations/`)
- `027_salon_dashboard_layout_and_theme.sql` — `salon_profiles.dashboard_layout` (jsonb), `salon_profiles.page_theme` (jsonb), `vitrine_flavours.is_signature` (bool), `vitrine_flavours.signature_position` (int). No new RLS needed — existing owner-scoped UPDATE policies on both tables already cover any column.
- `028_salon_covers_bucket.sql` — new public `salon-covers` storage bucket + owner-scoped INSERT/UPDATE/DELETE policies (path convention `{place_id}/{timestamp}.webp`, ownership checked via `salon_profiles`).
- `029_salon_analytics_owner_tier_gating.sql` — new `salon_owner_tier_ok(place_id, min_tier)` helper (`SECURITY DEFINER`, `SET search_path = ''`) + hardens the 4 pre-existing analytics RPCs (`salon_visits_by_week`, `salon_top_flavours`, `salon_weather_stats`, `salon_monthly_ratings`) with the same owner+tier check folded into their `WHERE` clause, so unauthorized calls return zero rows instead of relying solely on the Next.js route to gate access.
- `030_salon_analytics_new_functions.sql` — 5 new hardened analytics functions: `salon_flavour_performance`, `salon_visitor_recurrence`, `salon_dow_distribution`, `salon_rating_histogram`, `salon_vitrine_conversion`.
- `031_salon_dashboard_advisor_hardening.sql` — follow-up fixing two real `get_advisors` findings on the objects above (see Security section below).
- `032_vitrine_flavours_resolved_add_signature.sql` — adds `is_signature`/`signature_position` to the `vitrine_flavours_resolved` view so the public page's pinned-flavours query needs no second round trip.

### App code
- **Dashboard** (`app/salon/[place_id]/dashboard/`): `page.tsx` and `DashboardClient.tsx` rewritten; `AnalyticsSection.tsx` deleted; new `HeaderCard.tsx`, `ProfileSettingsForm.tsx`, `BillingCard.tsx`; new `widgets/` directory with 15 widget components, a registry, a customize-mode grid, and shared helpers (`LockedPlaceholder`, `UpgradeButton`, `WidgetFrame`, `CustomizeBar`).
- **Public page**: `app/salon/[place_id]/page.tsx` and `SalonPageClient.tsx` updated to render `page_theme`. New `src/lib/salonPageTheme.ts` (accent presets, theme resolution/defaults, cover-photo URL helper).
- `FlavourBoard.tsx` — added optional `is_signature`/`signature_position` to the `VitrineFlavour` type.

## Decisions and rationale

1. **Signature flavours: new columns, not a `page_theme` array.** `vitrine_flavours.is_signature` + `signature_position` (your approved default) — keeps ordering/validity as real columns rather than an array of ids that could go stale if a flavour is deleted.
2. **Cover photos: new `salon-covers` bucket, not reusing `salon-logos`.** (your approved default) Also added the RLS policies `salon-logos` is missing, on the new bucket only, without touching `salon-logos` itself.
3. **`page_theme` has no `opening_hours` key.** Opening hours already have a complete system (`hours_override`/`hours_google`/`hours_fetched_at` + `OpeningHoursEditor`). The Page Appearance widget links to it instead of duplicating storage.
4. **Dropped, not carried into a dedicated widget:** the old `AnalyticsSection`'s "weather when people visit" condition chips, and the Pro monthly-rating trend line. Neither was in the widget matrix you approved. The underlying RPCs (`salon_weather_stats`, `salon_monthly_ratings`) remain in the DB, hardened, unused by the UI — cheap to resurface later if wanted.
5. **Accent applied only to solid-fill surfaces, never as foreground text on the cream body.** See Contrast section — this is what makes all 6 presets safe regardless of pick.
6. **`page_appearance` widget is never centrally blurred.** Its tier is `"free"` in the registry so every owner sees and can edit the free-tier fields (accent, announcement, social links); Basic/Pro-only fields (cover photo; section visibility + pinned flavours) are gated by a small inline `TierGate` inside the widget instead, dimmed with their own upgrade CTA.
7. **CSV export is client-side, no new endpoint.** It formats the already-fetched Pro analytics arrays into one CSV and triggers a browser download — matches the tier-gating already done server-side for the underlying data.

## Contrast verification (accent presets)

Computed via a WCAG relative-luminance script, not eyeballed. Each preset pairs with whichever of cream (`#FBF5E8`, matches `--text-inverse`) or dark (`#2E1A16`, matches `--text-primary`) text clears **4.5:1** (AA, normal text) as a solid-fill surface:

| Preset | Hex | Text | Ratio |
|---|---|---|---|
| Terracotta | `#A85530` | cream | 4.82:1 |
| Forest | `#1B5E52` | cream | 6.98:1 |
| Blueberry | `#4E6CA5` | cream | 4.82:1 |
| Raspberry | `#E05A7A` | dark | 4.64:1 |
| Hazelnut | `#C49A6C` | dark | 6.42:1 |
| Mint | `#A8E6CF` | dark | 11.67:1 |

**Blueberry was adjusted** from an initial `#5B7EC0` pick — its best-case ratio (dark text) was only 4.07:1, short of AA. Darkened ~14% to `#4E6CA5` to clear the bar with cream text, keeping it recognizably the same blue.

Applied to: the primary CTA button ("Log a gelato here"/"Log a visit"), the announcement banner, and the new pinned signature-flavours row. **Not** applied to the existing "top flavours" outlined pills or phone/website link text — retrofitting those to be preset-safe would mean converting an outlined-text style to a solid-fill style, which is more visual change than "accents only" calls for; scoped out deliberately rather than risk a contrast regression there.

Accent is implemented via three CSS custom properties (`--page-accent`, `--page-accent-hover`, `--page-accent-text`) scoped to the page's `<main>`, defaulting to `var(--brand-primary)` / `var(--brand-primary-hover)` / `var(--text-inverse)` when `page_theme.accent_key` is null — same class strings as before, just reading through the variable, so the null case resolves to the identical computed color including the hover state.

## Security

**Repo-wide grep confirmed** the 4 pre-existing analytics RPCs were called from exactly one place before this change — the dashboard server component's tier-gated `Promise.all` — nothing else in the codebase invoked them. They were still reachable directly by any authenticated client via PostgREST regardless, since the functions themselves had no internal check. All 9 analytics functions (4 hardened + 5 new) now fail closed: `SECURITY DEFINER`, `SET search_path = ''`, schema-qualified references, and an internal `salon_owner_tier_ok()` check folded into each `WHERE` clause so an unauthorized call returns zero rows rather than an error (doesn't leak whether a `place_id` exists or what tier it's on).

**`get_advisors` (security) run after 029/030, two real findings on new/changed objects, both fixed in 031:**
- `anon_security_definer_function_executable` on all 10 new/hardened functions — `REVOKE ALL ... FROM PUBLIC` didn't remove `anon`'s access because this project grants `EXECUTE` to `anon`/`authenticated` directly (not only via `PUBLIC`) at function-creation time, and `CREATE OR REPLACE FUNCTION` doesn't reset prior grants. Fixed with an explicit `REVOKE EXECUTE ... FROM anon` per function. (`authenticated` keeps access by design — that's who calls these; the residual `authenticated_security_definer_function_executable` advisor note for these 10 functions is expected and accepted, same as the pre-existing `resolve_flavour_tokens`/`upsert_owner_flavour_catalogue` functions already carry.)
- `public_bucket_allows_listing` on `salon-covers` — the "Public read salon covers" SELECT policy was redundant (public buckets already serve objects via `/storage/v1/object/public/...` without any RLS check) and additionally let anyone list every file in the bucket. Dropped; cover photo display is unaffected since the app only ever constructs the public URL directly.

**Pre-existing findings, not touched (listed, not fixed, per scope):** `security_definer_view` on `owner_salon_status`/`log_flavours_resolved`/`vitrine_flavours_resolved`; `function_search_path_mutable` on ~12 pre-existing functions; `extension_in_public` (`unaccent`, `pg_trgm`); `rls_policy_always_true` on `feedback`/`flavour_suggestions`/`salon_profiles` INSERT policies; `materialized_view_in_api` on the peak-times views; `public_bucket_allows_listing` on `log-photos`; `auth_leaked_password_protection` disabled. None of these are new — all predate this branch.

**`salon-logos` RLS gap — verified real, read-only, NOT fixed (separate-branch item per your instruction):**
- `storage.objects` has RLS enabled.
- Zero rows exist for `bucket_id = 'salon-logos'` — no salon logo has ever been successfully stored.
- No admin/service-role client is used anywhere near the logo-upload path (`DashboardClient.tsx`/`HeaderCard.tsx` use the plain browser client).
- Together this confirms every logo-upload attempt has silently failed since launch, because there's no INSERT policy for that bucket. This predates the branch entirely and is unrelated to the redesign; flagging for a dedicated fix, not touched here.

**Also observed, not fixed (pre-existing, out of scope):** `ice_cream_logs` and `log_flavours` each carry a permissive `SELECT ... USING (true)` policy alongside a more restrictive visibility-based one — since RLS OR's multiple permissive policies together, the `true` policy means every log row (including `private`/`friends`-only ones) is already readable by anyone today, independent of anything in this branch. The new `SECURITY DEFINER` analytics functions don't change this exposure (they'd see the same rows either way), but it's worth your attention separately.

## Verification performed

- **Migrations**: all 6 applied via `apply_migration` and committed to `supabase/migrations/`.
- **Schema**: confirmed `dashboard_layout`/`page_theme` (jsonb), `is_signature`/`signature_position` (bool/int, correct defaults), `salon-covers` bucket (public) all exist as expected.
- **Owner-tier-gating, real data, read-only**: using the one real claimed salon (pro tier) and a different real user id — `salon_visits_by_week` and `salon_rating_histogram` (one hardened, one new; one Basic-gated, one Pro-gated) both returned real rows (2, 5) as the owner and **zero rows** as a different authenticated user, for the same `place_id`. Tier-ranking logic (`free < basic < pro`) verified separately via pure boolean expressions.
- **`get_advisors`**: security run twice (before/after 031); performance run once, no new findings tied to this branch's objects (all findings were pre-existing `unindexed_foreign_keys`/etc. on unrelated tables).
- **Typecheck**: `npx tsc --noEmit` — zero errors on any file touched by this branch. Remaining errors are pre-existing test-fixture issues in files this branch never touched (`logFlowReducer.test.ts`, `flavour-resolution.integration.test.ts`, `log-flavours-resolved.test.ts`, `FlavourBuilderModal.test.tsx`), confirmed via `git status` before starting.
- **Production build**: `npm run build` — compiles clean, all routes generate, twice (after Phase 2 and after Phase 3).
- **Public page, real data, read-only, no login required**: screenshotted `/salon/ChIJdcJ5YT_JxUcRrs8VDfBsIP8` (real claimed pro-tier salon, `page_theme` currently null) via Playwright against the already-running dev server — desktop + mobile (390px), light + dark, zero console errors in all four. Confirms: default terracotta CTA renders exactly as before, no announcement banner, no cover photo, no signature-flavours row — i.e. the null-`page_theme` byte-for-byte requirement holds, in both themes and both viewports.

## Needs manual verification (could not do safely under this run's constraints)

- **Dashboard UI end-to-end** (default zero-config layout, Customize mode save/reload, locked-widget teasers per tier) — requires an authenticated owner session; no login credentials for the real salon owner were available, and I was told not to improvise test data or mutate production rows. Everything server-side feeding these widgets is verified (queries, RPCs, gating); the client-side rendering itself has type-checked and build-checked but not been visually driven behind auth.
- **Public page WITH a `page_theme` set** (accent applied, announcement banner live, cover photo, pinned flavours visible) — would require setting `page_theme`/`is_signature` on the one real claimed salon, which is a mutation I declined to make per the read-only instruction. The render logic is covered by the null-theme screenshots (same code path, opposite branch of each conditional) plus typecheck/build, but not visually confirmed with real theming applied.
- **Cover photo upload / Page Appearance save flow end-to-end** — same auth constraint as above.

---

## Authenticated testing session (2026-07-18)

Tested live against the running dev server, logged in as `demo@gellog.app` via Playwright, against the demo account's own salon only. Migrations 034 not needed for schema — this session's DB changes are two RLS policy fixes (033, committed) plus the mutation log below (all reversed/cleaned up by end of session, logged per your instruction).

### Demo account restore
The account's `salon_profiles` row was missing (as you expected). Investigated rather than guessing: found a real, unclaimed `salon_profiles` row for **Zuliani's Gelato** (`ChIJkfH92SzJxUcRLdqvIvvOwxU`) that the demo account had a genuine logged visit at. You approved claiming it (UPDATE, not a fresh INSERT) over fabricating a synthetic salon. Restored via `UPDATE salon_profiles SET is_claimed=true, claim_verified=true, owner_id=<demo user id> WHERE place_id=...`.

### Mutation log (all on the demo account's own salon only)
1. Claimed "Zuliani's Gelato" for the demo account (approved restore, see above).
2. `salon_subscription_tier`: free → basic → pro → **free** (final value = original value, as instructed).
3. Added a test vitrine flavour "Pistachio Dream" (via the Flavour Builder) to verify the live vitrine preview (issue #4) — **deleted** before session end.
4. Set `page_theme` (accent=forest, announcement banner, pinned signature flavour) to verify Phase 3's public-page theming end-to-end — **reset to null** before session end.
5. Uploaded 2 test cover photos to `salon-covers` (to verify/debug the upload bug below) — **both deleted** via the Storage API before session end.
6. `dashboard_layout`: exercised hide/reorder/reset-to-default during Customize mode testing — **reset to null** (default) before session end.

Final state, verified: `salon_subscription_tier='free'`, `dashboard_layout=null`, `page_theme=null`, 0 rows in `vitrine_flavours` for this salon, 0 objects in `salon-covers` for this salon, salon still claimed by the demo account with its real name intact.

### Your reported issues — reproduced, fixed, verified

**1. Scrolling only moved the left column; right column waited for the left to finish.**
Real bug, confirmed and fixed. `aside` had `lg:sticky lg:top-6` inside a CSS grid with `items-start`. A sticky element's containing block is the full grid *row* (as tall as the longer sibling — the widget column), not its own shorter box — so the short settings sidebar stayed pinned near the top for the entire scroll of the much taller widget column, only scrolling away once the row's full height had passed. This is standard CSS behavior for a mismatched sticky sidebar, not a one-off glitch. Fix: removed the sticky positioning (`app/salon/[place_id]/dashboard/DashboardClient.tsx`) — both columns now scroll together in normal document flow; the settings column simply ends when its own content ends, exactly as you'd expect. Verified: scrolled 800px, both columns moved together, settings column's Billing card fully visible with blank space beside the still-scrolling widget column.

**4. "Can we get the vitrine displayed here instantly?"**
Real, valuable gap — the dashboard's Flavour Board only showed a flat editable list (name + eye toggle), never the actual illustrated scoop/cone "vitrine" visitors see. Added a live preview inside `FlavourBoard.tsx`: a "Live preview — what visitors see" section rendering the same `<Vitrine>` component the public page uses, filtered to visible flavours, derived from the same live `flavours` state the list already edits — so it updates immediately on add/edit/toggle, no save or navigation needed. Verified: added a flavour, it appeared in the preview instantly; the ordering/toggle interactions already exercise the same state so nothing further was needed to keep it live.

**5. "Navigation bar looks really gimmicky on laptop."**
Reproduced — but it's **not part of this redesign**. It's the app's existing global `BottomNav` (`app/components/BottomNav.tsx`), a mobile-style floating bar that renders on every signed-in page at every viewport width, confirmed identical on `/icecream/feed` (untouched by this branch). Per your own stop-condition rules for this PR ("touching shared components in ways that change behaviour for other routes" requires your sign-off), I did **not** touch it — changing it would affect literally every page in the app, not just the dashboard. Flagged as a proposal below, not fixed.

**2, 3, 6. Overall style/intuitiveness/mobile vs. desktop — see proposals below (not implemented, your call).**

### Other bugs found and fixed while testing (not on your list, but real)

- **Page Appearance `TierGate` overlay clipping**: locked sections (Cover photo, Public page sections, Signature flavours) used `absolute inset-0` overlays sized to their own blurred content's natural height — for short content (a couple of checkbox rows) that's shorter than the overlay's own text+button, so the "Upgrade" button visually overlapped the next section below it. Fixed with a `min-h-[6.5rem]` floor on the gate wrapper (`widgets/PageAppearanceWidget.tsx`).
- **Hydration mismatch in Log cleanup history**: `formatVisibilityLogInstant` formatted times with `toLocaleTimeString(undefined, ...)` — `undefined` resolves to whatever locale each environment happens to run under, and the server's and the browser's disagreed (24h vs. 12h AM/PM), throwing a React hydration error on every page load once any visibility-log entries existed. This function was copied verbatim from the original pre-redesign `DashboardClient.tsx` in Phase 2, so it predates this branch's own code but was carried into a new file — fixed by pinning the locale to `"en-GB"` everywhere in that function (`widgets/LogCleanupHistoryWidget.tsx`), matching how the rest of the app formats dates.
- **Cover photo upload was completely broken (100% failure rate)** — the most significant find this session. Root cause: 031_salon_dashboard_advisor_hardening.sql (Phase 1) dropped the only SELECT policy on `salon-covers` to close a `get_advisors` "public listing" warning, without accounting for the fact that Supabase's storage client always uploads via `INSERT ... RETURNING`, and Postgres RLS evaluates SELECT policies against the newly-inserted row to satisfy `RETURNING` — with zero SELECT policies, that implicit read fails and the *entire* upload is rejected as "row violates row-level security policy," even though the INSERT's own `WITH CHECK` passed. Diagnosed by reproducing with a trivial `WITH CHECK (true)` policy (still failed) and a raw SQL `INSERT ... RETURNING` as the `authenticated` role (failed identically, proving it wasn't the Storage API or JS SDK). Fixed in `033_salon_covers_fix_missing_select_policy.sql`: a SELECT policy scoped to `authenticated` only (not `public`/`anon`), which restores upload capability without reopening the original advisor concern (anonymous bucket enumeration). `get_advisors` now re-flags `salon-covers` for "public bucket allows listing" again — this is the *accepted, understood* residual cost of the fix (same category as the pre-existing `authenticated_security_definer_function_executable` notes already accepted in Phase 1), not a new regression: unauthenticated visitors still can't list it, only logged-in users could, via a direct PostgREST call. Verified end-to-end: uploaded a real test image, it appeared in the live preview and (before cleanup) on the public page.
- **`next/image` `fill` without `sizes`**: minor perf warning on the cover-photo images in both the widget preview and the public page. Added `sizes="(max-width: 640px) 100vw, 640px"` to both.

### Deferred verification from the original SUMMARY.md — now completed

- **Default zero-config layout at all three tiers** — screenshotted free, basic, and pro. Free/basic correctly show locked widgets blurred with tier-appropriate CTAs; basic unlocks Visits trend/Flavour performance/Recent visits/Peak times with real data; pro unlocks everything with real data (Vitrine conversion correctly showed 0% since no historical log used the exact newly-added flavour name — expected, not a bug).
- **Customize mode**: hidden a widget (Weather), reordered another (Flavour Board ahead of stats strip), reloaded — both persisted correctly (verified via full-page screenshot and a precise `<h2>` heading-order check, not just eyeballing). "Reset to default" restored both the order and the hidden widget, and that reset also persisted across reload.
- **Page appearance with a theme applied** (the specific gap called out from the first session): set accent=forest, an announcement banner with expiry, and a pinned signature flavour. Verified on the real public page in all four combinations (desktop/mobile × light/dark): announcement banner rendered in the accent color, the "Log a gelato here" CTA picked up the accent + correct paired text color, the pinned flavour appeared in a new "Signature flavours" section above the regular vitrine. Zero console errors in any combination.
- **Cover photo upload end-to-end** — see bug above; verified working after the fix.
- **Mobile (390px) and dark mode for every state above** — covered in the screenshots for tier states, customize mode, and the themed public page.

### Design/taste proposals (not implemented — your call)

For issues #2 ("doesn't look appealing"), #3 ("not intuitive"), #6 (mobile vs. desktop), here's what I actually observed while testing rather than generic guesses:

1. **Free/basic tier is a wall of near-identical locked cards.** A freshly-claimed free-tier owner sees ~10 stacked "blurred content + Upgrade to Salon Basic/Pro — €X/mo" cards in a row (Visits trend, Flavour performance, Recent visits, Peak times all Basic-locked; New vs returning, Day-of-week, Rating distribution, Vitrine conversion, Flavour Insights, Export analytics, Log cleanup all Pro-locked) — this is very likely the single biggest driver of "doesn't look appealing." Proposal: collapse consecutive locked widgets of the same tier into one combined teaser block (small preview thumbnails of each, one CTA) instead of repeating the full card+CTA pattern 5-6 times in a row.
2. **Customize mode gives every widget a second header.** The gray control bar (up/down/hide) sits *above* each widget's own title, so e.g. "Flavour Board" appears twice stacked. Proposal: overlay the controls into the widget's existing header row instead of adding a new one.
3. **No visual grouping/hierarchy.** All 14+ widgets render as identical white rounded cards in one flat list — nothing distinguishes "core" (stats, flavour board) from "deep analytics" from "page settings." Proposal: subtle section labels or grouping (e.g. a light "Analytics" divider before the chart widgets) to break up the monotony.
4. **Mobile and desktop are the same single-column stack**, just with a second settings column bolted on for desktop. Desktop's extra width isn't used by the widget grid itself. Proposal: let compact widgets (stats tiles, day-of-week heatmap, rating histogram, vitrine conversion donut) sit two-up on wide screens instead of always full-width; keep full-width for genuinely wide content (flavour board, recent visits list, trend charts).
5. **Global `BottomNav` on desktop** (issue #5) — propose adding `lg:hidden` to hide the floating mobile nav bar above some breakpoint, since the app doesn't currently have a desktop-appropriate replacement nav. This is a global change affecting every page, not just the dashboard, so it needs your explicit go-ahead and probably its own small PR rather than living inside this one.
6. **Signature-flavours picker can go stale within a session**: `PageAppearanceWidget`'s pinned-flavour list is seeded once from server-fetched props and doesn't hear about edits made in the Flavour Board widget elsewhere on the same page (e.g., deleting a flavour that's currently pinned won't remove its chip from the picker without a reload). Low severity — noticed while cleaning up test data, not fixed, since a proper fix means lifting the full live flavour list to a shared parent (bigger change than "obvious bug" scope). Flagging for a follow-up.

## Open questions

1. Any of the 6 design proposals above you want implemented now vs. left as-is?
2. The `salon-logos` upload bug (zero successful uploads ever, found in the first session) — worth checking whether it has the *same* missing-SELECT-policy root cause as the `salon-covers` bug just fixed. I did not check this — didn't want to touch `salon-logos` per your explicit "never touch" instruction on other buckets, but if you want it looked at, the fix pattern from tonight's `salon-covers` bug is a very plausible lead.
3. Fine to leave `salon_weather_stats`/`salon_monthly_ratings` hardened-but-unused in the DB, or would you rather they get dropped since nothing calls them now?
4. Want the outlined "top flavours" pills and phone/website link color converted to the accent system too in a follow-up, now that the contrast-safe pairing pattern exists?
5. Want `BottomNav` hidden on desktop (proposal #5 above)? That's the one item here that isn't purely cosmetic-optional — it's the literal issue #5 you reported, just outside this PR's blast radius by design.

Branch is push-ready, not merged, not deployed. All authenticated testing this session was against the demo account's own data only; final state confirmed clean (see mutation log).
