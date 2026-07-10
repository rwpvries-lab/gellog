# Gellog — Claude Code Context

## What this app is
Gellog is a mobile-first PWA for logging and discovering gelato / ice cream ("Strava for gelato"). Users record salon visits with flavours, ratings, photos and notes; browse a social feed; explore salons on a map; and manage a personal profile with a passport that stamps cities visited. Salon owners can claim their salon, manage a public flavour board (vitrine), and view analytics.

## Stack
- **Framework:** Next.js 15 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Postgres, Auth, RLS, Storage)
- **Payments:** Stripe (user subscriptions + salon checkout)
- **Places:** Google Places API (via server-side API routes)
- **Weather:** Open-Meteo
- **Deployment:** Vercel

## Supabase project
- **Project ID:** `dsnfqdpwvaxeghliytyi`
- **ALWAYS use the Supabase MCP tools** — not the CLI (it's not configured and will fail)
  - Schema changes → `apply_migration`
  - Data queries → `execute_sql`
  - Schema inspection → `list_tables` (use `verbose=true`)
- **Before writing any DB-touching code, call `list_tables` first** — don't assume column names from docs or memory
- Treat the deployed Supabase DB as the source of truth, not migration files
- **Migrations are dual-write:** apply via `apply_migration` **and** commit the SQL to `supabase/migrations/`. The "DB is source of truth" rule above governs *schema inspection* — it does not excuse skipping the committed `.sql` file. Both are always required for repo parity.
- `pg_trgm` extension is enabled — `similarity()` is available for fuzzy search
- Seed data in batches of 20–40 rows

## Design system
- **Primary:** Terracotta `#A85530` (deepened from `#C66B3D` for WCAG AA compliance)
- **Background:** Cream `#FBF5E8`
- **Secondary:** Forest `#1B5E52`
- **Headings:** Fraunces (serif) — replaces the previous teal palette
- **Body/UI:** system sans-serif via Tailwind
- **Feel:** Mediterranean, summery, premium Apple-aesthetic
- Never revert to the old teal palette
- Contrast rule: terracotta on cream passes AA — document any new forbidden pairings rather than assuming they're safe

## Key conventions
- Mobile-first; bottom navigation for signed-in users (hidden during log creation flow)
- App Router conventions throughout (`page.tsx`, `layout.tsx`, server components where possible)
- Supabase client: `src/lib/supabase/client.ts` (browser), `server.ts` (server), `admin.ts` (service role)
- **Middleware is `proxy.ts`**, not `middleware.ts` (Next.js 16 rename) — exported function is `proxy`, not `middleware`
- Server-only imports guarded with `import 'server-only'`
- Icons from `lucide-react`; charts via `recharts`
- No test suite currently — verify changes manually

## User roles
| Role | Access |
|------|--------|
| Anonymous | Marketing landing, signup/login, public content |
| Authenticated | Logging, feed, map, search, profile, social graph, settings |
| Salon owner | Dashboard, vitrine, analytics, flavour board, claim flow |

## Pricing tiers
- **User:** Free (no limiters) / Ice Cream+ at €2.99/month (enablers only)
- **Salon:** Basic €9/month / Pro €29/month
- Stripe is in live mode

## Native app (Capacitor — iOS / Android)
- **Approach: Option A — remote-URL wrapper, NOT static export.** `webDir` (`capacitor-webdir/`) is just a placeholder loading screen; the native shell loads the live hosted app via Capacitor `server.url` (pointed at the `www` host to skip the apex redirect). Lives on `feature/capacitor-ios`.
- **Why static export (`output: 'export'`) was ruled out:** Gellog depends on server-side features that static export breaks — API routes (`app/api/places/*`, `app/api/stripe/*`), middleware (`proxy.ts`), and server components / SSR. Export would also force `next/image` `unoptimized`. Wrapping the deployed Vercel app keeps the full server stack intact with zero architectural compromise.
- **"Option A + native plugins"** = the remote wrapper plus genuine native features layered on for Apple approval + UX: push notifications, geolocation, camera, Sign in with Apple. Apple rejects bare repackaged websites, so at least one real native capability must ship.
- **Native-only divergence:** consumer Stripe upgrade/payment UI is hidden in the native iOS build (Apple IAP policy on digital subscriptions). Web and native payment surfaces intentionally differ here.
- **Reuse for future projects (e.g. 30 Seconds):** Option A is the fast path when a product is *already* a deployed web app that needs server features — wrap remote + add native plugins. Choose a true native rewrite only when the product genuinely needs it (offline-first, App-Store-only party games, IAP-first revenue), per the Decisions Log.

### Android build notes
- `gradle.properties` pins `org.gradle.java.home` to Android Studio's bundled JBR (Java 21) — this path is machine-specific. Any CI environment needs its own JDK 17+ via `JAVA_HOME` instead of relying on this property.

## Route map (quick reference)
- `/` — marketing landing (redirects signed-in → `/feed`)
- `/icecream/feed` — main feed
- `/icecream/logs/new` — create log (3-step flow: Where → What → Finishing touches)
- `/icecream/logs/edit/[id]` — edit log
- `/log/[id]` — log detail (comments, likes)
- `/map` — salon map
- `/search` — user/salon discovery
- `/icecream/profile` — current user profile
- `/profile/[username]` — public profile
- `/salon/[place_id]` — public salon page
- `/salon/[place_id]/claim` — claim flow
- `/salon/[place_id]/dashboard` — owner dashboard
- `/my-salons` — manage claimed salons
- `/settings` — account + Stripe portal
- `app/api/places/*` — server-side Places API routes
- `app/api/stripe/*` — Stripe checkout / webhook / portal

## Log creation flow (3 steps)
The `/icecream/logs/new` flow uses a reducer + submission architecture. **Never touch the reducer or submission logic when fixing step UI bugs.**

1. **Where** — salon search (Google Places autocomplete). Known issue: search must not auto-commit on keystroke; wait for explicit selection.
2. **What** — flavour selection via vitrine component (full vitrine UI, not flavour pills). Flavours must be deletable after being added.
3. **Finishing touches** — notes, photo, overall visit rating, vessel, visibility.

Star ratings must render with filled state. CTA buttons must have terracotta background (`#A85530`), not render as text links.

## Data model (core tables)
- `profiles` — username, avatar, `default_visibility`, subscription fields
- `ice_cream_logs` — main log table; salon geo, visibility, weather, vessel, photo/price privacy
- `log_flavours` — per-log flavour rows with ratings, tags, advanced dimensions
- `friendships` — follower/following edges
- `salon_profiles` — claimed salons, place_id, owner
- `vitrine_flavours` — public flavour board per salon
- `log_likes`, `log_comments` — engagement
- `flavours` — global flavour catalogue (~79 canonical flavours) with colours and scoop asset URLs (`cone_url`, `cup_url`)
- `push_subscriptions` — web push opt-ins
- `flavour_suggestions` — user-suggested flavours toward salons

## Flavour / SVG asset system
- **`<Gelato>` component** — token-based SVG illustration system with four container variants: `scoop`, `cone`, `cup`, `vitrine`
- Three-layer token system: base colour, drizzle, crumble
- ~79 canonical flavours seeded in Supabase
- Fuzzy resolver: `resolve_flavour()` function in DB with `pg_trgm` + `similarity()`
- Two convenience views deployed for flavour lookup
- SVG scoop assets live in `public/assets/scoops/` named `{slug}-cone.svg` and `{slug}-cup.svg`
- Client helper: `src/lib/flavour-scoop.ts` — `useFlavourScoop` hook, `getFlavourScoopUrl`
- **Known gap:** some client code may still reference legacy `{slug}.svg` paths instead of `-cone`/`-cup` — align when touching this area

## Known gaps / ongoing work
- Scoop filename unification: generator uses `-cone`/`-cup`; some UI may still use legacy single-file paths
- Base `flavours` table DDL may not be in repo migrations (only `ALTER` in 014) — DB is source of truth
- README is still default Next.js boilerplate
- Step 2 of the log flow should use real vitrine components, not flavour pills (deferred, not yet implemented)

## Critical failure modes to avoid
- **Stale context:** Old files in the project root (e.g. deprecated handoff folders with old teal references) will bias output toward the wrong palette or old component structure. Archive or delete outdated reference files before major rebuilds. Attach current screenshots + mockups explicitly.
- **Assuming column names:** Always call `list_tables verbose=true` before writing any DB-touching code. The table is `ice_cream_logs`, not `logs`. Join table structure may differ from what docs suggest.
- **Over-correcting on bug fixes:** Distinguish real bugs from working-as-designed behaviour before writing fix prompts. Don't touch reducer/submission logic when fixing step UI.
- **Re-using stale components:** When rebuilding a step, wipe the step file and rebuild from the current mockup. Preserve reducer and submission logic separately.

## Dev workflow
- **Parallel / multi-agent work: use git worktrees, not copied folders.** `git worktree add ../gellog-agent-b <branch>` shares the same underlying repo, so branches, commits and pushes are visible across both instantly — no fetch/pull dance, no drift. Copied folders caused real stale-branch drift (a billing-renewal fix was once stranded on an old branch in a copy) — the multi-folder form of the documented stale-context regression risk.

## What NOT to do
- Don't run `npx supabase` CLI commands — they'll fail
- Don't assume DB column names — always check with `list_tables` first
- Don't push to `main` without asking
- Don't add unnecessary abstractions or error handling for impossible cases
- Don't add comments that just describe what the code does
- Don't revert to the old teal colour palette under any circumstances
