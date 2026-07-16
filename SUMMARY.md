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

## Open questions

1. Want the dashboard UI exercised behind auth in a follow-up? Would need either a test-owner login or a go-ahead to create one throwaway claimed test salon (a mutation, so held off here).
2. The `salon-logos` upload bug (zero successful uploads ever) — worth a dedicated fix branch soon, since it's silently broken today.
3. Fine to leave `salon_weather_stats`/`salon_monthly_ratings` hardened-but-unused in the DB, or would you rather they get dropped since nothing calls them now?
4. Want the outlined "top flavours" pills and phone/website link color converted to the accent system too in a follow-up, now that the contrast-safe pairing pattern exists?

Branch is push-ready (not yet pushed), not merged, not deployed.
