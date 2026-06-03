# Capacitor iOS Wrap — Spike Findings

Throwaway spike to decide how to ship Gellog to the iOS App Store.
Two approaches measured. **No production code was refactored.** Evidence only.

- Spike A config lives on `spike/capacitor-wrap` (this branch, uncommitted).
- Spike B config lives on `spike/static-export` (separate branch, committed there only).
- Nothing committed to `main`.

Environment: Next.js 16.1.6 (App Router, Turbopack), React 19, Supabase SSR
(cookie sessions), Stripe, Google Places, deployed on Vercel.

---

## Option A — Remote-URL wrapper (native shell loads the live site)

### What was done
- Installed `@capacitor/cli`, `@capacitor/core`, `@capacitor/ios` (all 8.4.0).
- `capacitor.config.ts` with `server.url: "https://gellog.app"` and a throwaway
  `webDir` (`capacitor-webdir/` — one placeholder `index.html`, unused at runtime).
- `npx cap add ios` → **succeeded.** Native Xcode project generated at `ios/`.
- `npx cap doctor ios` → **"iOS looking great 👌"**.
- Generated `ios/App/App/capacitor.config.json` confirms the embedded
  `server.url` is `https://gellog.app`.
- Confirmed `https://gellog.app` is live (Vercel, `307 → https://www.gellog.app → 200`).
  Note: the apex redirects to `www`; the config should point straight at
  `https://www.gellog.app` to skip a redirect hop on every cold launch.

### What the user sees on launch
The app icon opens a full-screen native iOS shell (a `WKWebView`) that immediately
loads the live, Vercel-hosted Gellog app. It is the **exact production web app** —
same SSR, same Supabase cookie auth, same Stripe, same Google Maps — running inside
a native window with no Safari chrome (no URL bar, no tabs). Client routing, the
PWA feel, and every server-rendered page work unchanged because nothing is bundled
locally; the WebView is pointed at the internet. Requires network connectivity to do
anything (no offline shell). Deploying a fix = a normal Vercel deploy; no App Store
resubmission needed for web changes.

### Pros
- **Effort: ~hours.** Zero application refactor. The native project already builds.
- One codebase, one deploy pipeline. Web and iOS never diverge.
- All current server-side features keep working as-is: SSR, middleware auth refresh,
  co-located API routes, Stripe webhooks, server Supabase reads under RLS.
- Instant updates — ship via Vercel, no review latency for web changes.
- Native plugins (push, camera, geolocation, IAP) can be added incrementally later.

### Cons
- **App Store Guideline 4.2 (Minimum Functionality) risk — the headline issue.**
  Apple explicitly rejects apps that are "primarily a repackaged website" or "a
  marketing wrapper" offering nothing a mobile browser can't. A WebView pointed at a
  URL with no native capability is the textbook 4.2 rejection. To clear review the
  app realistically must add genuine native value — push notifications (the codebase
  already has `push_subscriptions`), camera capture for logging, native geolocation,
  offline behaviour, share sheets, Sign in with Apple. The wrapper builds in hours;
  **getting it _approved_ is the real work** and is non-deterministic (depends on the
  reviewer).
- **Guideline 3.1.1 (In-App Purchase):** the €2.99 Ice Cream+ / salon subscriptions
  currently use Stripe. Apple requires IAP for digital subscriptions consumed in-app.
  A WebView paywall does not satisfy this and is a hard rejection vector. Likely needs
  StoreKit/IAP for the consumer tier, or careful "reader app" / external-purchase
  positioning — a meaningful, separate workstream regardless of A vs B.
- WebView UX papercuts: pull-to-refresh, scroll bounce, safe-area insets, keyboard
  avoidance, file/photo pickers, deep links, and `navigator.geolocation` permission
  prompts all need native shimming to feel non-web.
- Hard dependency on the live site being up; a Vercel incident bricks the app.
- Auth cookies inside `WKWebView` (third-party cookie / ITP) need verification.

---

## Option B — Static export (`output: 'export'`) + remote Vercel APIs

The measurement that matters: can the app be exported to a static bundle that ships
inside the Capacitor binary and talks to Vercel over HTTPS? Added `output: 'export'`
and `images.unoptimized: true`; ran `next build`; **fixed nothing.**

### Captured build output (verbatim, abridged)
```
⚠ Specified "headers" will not automatically work with "output: export".
✓ Compiled successfully in 14.9s
  Collecting page data using 11 workers ...
Error: export const dynamic = "force-static"/export const revalidate not configured
       on route "/api/salon/[place_id]/peak" with "output: export".
Error: export const dynamic = "force-static"/export const revalidate not configured
       on route "/api/places/lookup-name" with "output: export".
> Build error occurred
Error: Failed to collect page data for /api/salon/[place_id]/peak
```

**The build aborts during "Collecting page data" on the first co-located API routes
and never reaches the pages.** Next.js fails fast: it cannot enumerate a "full" list
of page-level errors while the API route handlers are present, because those throw
first. Producing a longer error list would require *deleting all API routes* — i.e.
fixing — which the spike forbids. The remaining categories below therefore come from
static analysis of the codebase, which is comprehensive and certain.

### Categorised failures

**(a) SSR / server components — MAJOR REFACTOR**
- `app/layout.tsx` is an `async` server component that calls the server Supabase
  client → `cookies()`. The **root layout alone forces dynamic rendering for the
  entire app**, which `output: 'export'` cannot satisfy.
- **20 `async` server pages** read auth/data server-side via `createClient()`
  (`feed`, `profile`, `passport`, `settings`, `map`, `salon/[place_id]`, `my-salons`,
  log/edit flows, …).
- **7 dynamic `[param]` routes** (`log/[id]`, `profile/[username]`,
  `salon/[place_id]`(+`/claim`,`/dashboard`), `profile/[username]/connections`,
  `logs/edit/[id]`) have **no `generateStaticParams`**, and their params are
  user-generated content that *cannot* be enumerated at build time. Static export
  requires every dynamic path to be known in advance.
- Work: convert every server page to a client component, move all data fetching to
  client-side calls against remote APIs, add loading/skeleton states, and render
  `[param]` pages purely client-side from the URL. This is most of the app's pages.

**(b) Co-located API routes — COUPLE DAYS**
- **13 API route handlers + `app/auth/callback` = 14 server endpoints**
  (`/api/places/*`, `/api/salon/[place_id]/*`, `/api/stripe/*`, `/api/weather/*`).
  Every one reads request data (`searchParams`, POST bodies, route params) → none are
  statically renderable → this is what aborts the build.
- These already run on Vercel. In the static model they stay deployed on Vercel and
  the bundled client calls them as **absolute** `https://gellog.app/api/*` URLs.
- Work: introduce an API base URL, repoint all `fetch('/api/...')` calls to absolute
  URLs, add **CORS** to every route (the app origin is now `capacitor://localhost`,
  not same-origin), and pass the Supabase auth token explicitly instead of relying on
  cookies. Mechanical but touches every route + every caller.

**(c) Server-side Supabase / auth — MAJOR REFACTOR**
- Auth is **cookie/SSR-based**: `src/middleware.ts` refreshes sessions via
  `supabase.auth.getClaims()`, and `src/lib/supabase/server.ts` reads the session from
  `cookies()` for server-side, RLS-authenticated queries.
- Static export has **no server and no middleware** → the entire cookie-session model
  is gone. Auth must be re-architected to **client-side**: `supabase-js` in the
  browser with a `localStorage` session, all reads done client-side under RLS, and the
  OAuth callback (`app/auth/callback`) reworked for a native/redirect flow (likely
  Sign in with Apple + deep link). Stripe `webhook` is server-only and stays on
  Vercel — fine.
- Work: replace SSR-cookie auth with a token model end to end; re-fetch every
  previously server-rendered query on the client. This is the deepest change.

**(d) `next/image` / export-incompatible — FEW HOURS**
- `next/image` used in **12 files**. `images.unoptimized: true` makes them work
  (optimization disabled, still functional). **Not a blocker** — already handled.
- `next.config.ts` `headers()` (the `Permissions-Policy: geolocation=(self)`) is
  **ignored** under export (build warned). The geolocation permission policy is lost
  and must be reinstated natively (Info.plist / Capacitor Geolocation) or via a meta
  tag. Minor.

**(e) Anything else — folded into (a)/(c)**
- `src/middleware.ts` is **silently dropped** by `output: 'export'` (middleware
  unsupported) — auth refresh breaks (see (c)).
- `next/font/google` (Fraunces, Plus Jakarta) in the layout — **works** under export
  (resolved at build time). OK.
- Custom `headers()` warning (see (d)).

### Rough total for Option B
**Major refactor — on the order of weeks, not days.** Categories (b) and (d) are
tractable (a couple of days + a few hours). But (a) and (c) together mean re-architecting
auth from SSR-cookie to client-token and converting ~20 server pages + 7 dynamic routes
to client-rendered data fetching — effectively rebuilding the app's data/auth layer.

---

## Recommendation

The two options are not the same kind of work. **Option A is a packaging task done in
hours; Option B is a re-architecture measured in weeks.** Spike B proved the app is
deeply SSR/cookie-coupled — the root layout alone forces dynamic rendering, 14 server
endpoints abort the export build immediately, and auth has no client-side equivalent
today — so a static bundle is a major refactor with no product benefit beyond "it runs
inside Capacitor." Critically, **neither option's hard part is the wrapper**: both face
the same two App Store gates — Guideline 4.2 (the app must do something genuinely native,
not just render the website) and Guideline 3.1.1 (digital subscriptions must use IAP, not
Stripe). Those gates are paid once and are independent of A vs B. Given that, the rational
path is **Option A: ship the remote-URL wrapper now, then invest the saved weeks into the
native capabilities that actually clear review** — push notifications (schema already
exists), native camera/geolocation for logging, Sign in with Apple, and an IAP path for
Ice Cream+. Pursue Option B only if offline support or App Store reviewers reject the
wrapper outright despite added native features — at which point the static rebuild becomes
justified. Decision is yours; this spike is evidence, not a verdict.

---

## Cleanup (this is throwaway)
- `spike/capacitor-wrap`: `git checkout -- .`; remove `capacitor.config.ts`,
  `capacitor-webdir/`, `ios/`; `npm uninstall @capacitor/cli @capacitor/core @capacitor/ios`.
- `spike/static-export`: delete the branch (`git branch -D spike/static-export`).
- Do not merge either branch to `main`.
