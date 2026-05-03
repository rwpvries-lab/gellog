# Gellog — Product Requirements Document (As Implemented)

**Document type:** PRD reflecting the **current** product and technical state of the repository and configured backend behaviour, not a future roadmap.

**Stack (observed):** Next.js App Router (16.x), React 19, TypeScript, Tailwind CSS v4, Supabase (Auth, Postgres, RLS, Storage), Stripe (subscriptions + salon checkout flows), Web Push subscriptions, Google Places–style APIs (server routes for autocomplete / details / reverse geocode).

**Primary surfaces:** Mobile-first web app with bottom navigation for signed-in users; marketing landing for anonymous visitors.

---

## 1. Product vision

Gellog is a **gelato / ice cream logging and discovery** product: users record visits (salon, flavours, ratings, photos, notes), browse a **social feed**, explore **salons on a map**, manage a **personal profile**, and **salon owners** can claim salons, manage a public **flavour board (vitrine)**, and view **analytics**. Optional **premium subscription** (Stripe) and **push notification** plumbing exist.

---

## 2. Goals (implemented)

1. **Diary:** Create, read, update, delete personal ice cream logs with rich metadata (salon, flavours, ratings, vessel, weather, price, visibility, photo privacy).
2. **Social:** Public feed of logs; likes and threaded comments on logs; friendships / following model (schema + UI patterns as present in app).
3. **Places:** Link logs to Google `place_id` and coordinates; salon detail pages; map discovery with ice-cream–relevant filtering.
4. **Salon operators:** Claim flow, multi-salon cap signal (`get_owner_salon_count` / `owner_salon_status`), vitrine flavours, dashboard analytics RPCs, optional Stripe checkout for salon offering.
5. **Trust & privacy:** Log visibility (`public` / `friends` / `private`); photo visibility (`public` / `friends`); hide price from others; legal pages (terms, privacy).
6. **Flavour visuals:** System `flavours` table (Supabase) with colours and scoop assets; client helpers and asset generation script for cone/cup scoop SVGs.

---

## 3. User roles

| Role | Capabilities (high level) |
|------|---------------------------|
| **Anonymous** | Marketing home, signup/login, read public content where RLS allows. |
| **Authenticated user** | Full logging, feed, map, search, profile, likes, comments, follow graph, settings, push opt-in, subscription checkout/portal. |
| **Salon owner (claimed)** | Dashboard for owned salons: vitrine, analytics, weather card, flavour board, claim cap awareness. |

---

## 4. Information architecture & routes

### 4.1 Marketing & auth

| Route | Purpose |
|-------|---------|
| `/` | Redirects signed-in users to `/feed`; otherwise `HomeLanding` (marketing). |
| `/login`, `/signup` | Supabase auth flows. |
| `/auth/callback` | OAuth / magic link callback. |

### 4.2 Core app (signed-in; bottom nav)

| Route | Purpose |
|-------|---------|
| `/feed` → ice cream feed | Primary home feed of logs (`/icecream/feed` is canonical in nav; `/feed` also matched). |
| `/map` | Map of salons / places with ice-cream relevance filtering. |
| `/search` | User and content discovery. |
| `/icecream/profile` | Current user’s gelato profile (activity, passport strip, settings entry, etc.). |
| `/icecream/logs/new` | Create log (multi-flavour, ratings, vessel picker, weather capture, photo, visibility). |
| `/icecream/logs/edit/[id]` | Edit existing log. |
| `/log/[id]` | Log detail: full card, comments, likes, directions. |
| `/log` | Entry / redirect behaviour as implemented. |

### 4.3 Salons

| Route | Purpose |
|-------|---------|
| `/salon/[place_id]` | Public salon page. |
| `/salon/[place_id]/claim` | Claim initiation for unclaimed / eligible salons. |
| `/salon/[place_id]/dashboard` | Owner dashboard: analytics, vitrine, flavour board, weather. |
| `/my-salons` | List / manage salons relevant to the current user (claimed salons UX). |

### 4.4 Profile & social graph

| Route | Purpose |
|-------|---------|
| `/profile/[username]` | Public profile: recent logs, stats copy, follow affordances. |
| `/profile/[username]/connections` | Followers / following style connections UI. |
| `/profile` | Profile routing helper as implemented. |

### 4.5 Account & legal

| Route | Purpose |
|-------|---------|
| `/settings` | Account settings (Stripe portal entry, preferences as wired). |
| `/privacy`, `/terms` | Legal documents (also mirrored under `src/app/` for certain layouts). |
| `/icecream/passport` | Passport-style visualisation of user gelato activity. |

### 4.6 Server API routes (`app/api`)

| Area | Routes |
|------|--------|
| **Places** | `autocomplete`, `details`, `lookup-name`, `reverse-geocode` — server-side Google Places usage with Supabase session where applicable. |
| **Stripe** | `checkout`, `portal`, `webhook`, `salon-checkout` — billing and salon-specific purchase path. |

---

## 5. Functional requirements (implemented)

### 5.1 Ice cream logs (`ice_cream_logs`)

**Create / edit (`NewIceCreamLogForm`, `EditIceCreamLogForm`):**

- Salon: name + **Google place** metadata (`place_id`, address, city, lat/lng) via `SalonInput`.
- **Visit datetime** with scroll-wheel style date/time picker; validation so “today” cannot be in the future.
- **Overall rating** (stars).
- **Flavours:** up to three rows; per-flavour rating; optional advanced dimensions (texture, originality, intensity, presentation); dietary tags; duplicate-name guard; “many flavours” confirmation pattern.
- **Vessel:** cup vs cone (nullable); illustrated picker using asset-based vessel art and **dynamic scoop** from flavour data (`VesselIllustration` + `useFlavourScoop` / templates).
- **Notes** free text.
- **Photo:** file picker, client-side resize (`resizeImageBeforeUpload`), upload to Supabase Storage (`log-photos` bucket per migration naming), **photo_visibility** (`public` | `friends`).
- **Price:** optional decimal; **hide from others** checkbox (`price_hidden_from_others`).
- **Visibility** of the log: `public` | `friends` | `private` (log + profile default visibility in schema).
- **Weather (today only):** browser geolocation + Open-Meteo style fetch; stores temp, feels-like, code/label, optional UV on the log; graceful degradation, retry, unsupported browser messaging.
- **Vitrine suggestions:** when salon has `place_id`, loads visible `vitrine_flavours` for tap-to-fill suggestions.
- **Post-save:** optional flavour suggestion pipeline toward salon (`flavour_suggestions` / vitrine-related tables as implemented).

**Feed & detail (`FeedCard`, `IceCreamFeedClient`, `LogDetailClient`):**

- Card layouts: **feed hero** when photo visible; collapsed vs expanded flavour list; metadata chips (visibility, weather line, time ago).
- **Likes:** `log_likes` table; toggle like; counts on card and detail.
- **Comments:** `log_comments`; threaded replies; edit/delete where owner; deep link `#comments`.
- **Directions** sheet when lat/lng present (Apple Maps / Google Maps / copy coords).
- **Share** native share or clipboard fallback.
- **Owner actions** on own logs on profile surfaces: edit, delete with confirm.
- **Friends-only photo** placeholder when viewer is not allowed to see binary.
- **Price** hidden from non-owner when `price_hidden_from_others`.

### 5.2 Map (`MapClient`, `map/page`)

- Displays salon / place markers with **ice cream salon heuristic** (`looksLikeIceCreamSalon`).
- Uses server places APIs; location permission messaging (`locationMessages`).
- Return-to behaviour for picking a salon (e.g. redirect back to log flow).

### 5.3 Search (`search/page`)

- Profile / user discovery and salon-related search patterns (autocomplete integration as wired).

### 5.4 Profile (`icecream/profile/*`, `Profile*` components)

- Activity sections, heatmap (`IceCreamHeatmap`), rollup sheets, summary cards, passport strip.
- Feed of user’s logs reusing `FeedCard`.
- Avatar upload path with image utils and storage policies.

### 5.5 Salon pages & owner dashboard

- **Public salon page:** vitrine-visible flavours, CTA to log / visit, narrative when empty.
- **Claim flow:** forms capture claim metadata; integrates owner cap helpers (`ownerSalonCap`).
- **Dashboard:** analytics sections calling RPCs (`salon_visits_by_week`, `salon_top_flavours`, `salon_weather_stats`, `salon_monthly_ratings`); **FlavourBoard** merged vitrine + legacy suggestions; **weather forecast** card for dashboard; multi-salon navigation.

### 5.6 Subscriptions & monetisation (Stripe)

- **User premium:** `profiles.subscription_tier` (`free` | `premium`), `stripe_customer_id`, `subscription_expires_at`; **DB trigger** prevents clients from self-updating subscription fields (service role / webhook only).
- **Checkout & portal** API routes; **webhook** route processes Stripe events.
- **Salon checkout** route for salon-specific Stripe offering.

### 5.7 Push notifications

- `push_subscriptions` table with RLS (users manage own rows).
- Client helpers (`push.ts`) and UI prompts (`NotifPromptBanner`) for permission + subscribe.

### 5.8 Flavour system & assets

**Database (`public.flavours`):**

- Intended as canonical flavour metadata: slug, colours, inclusions JSON, `source`, timestamps.
- Migration `014_flavours_asset_urls.sql` adds **`cone_url`** and **`cup_url`** text columns for per-flavour SVG paths (e.g. `/assets/scoops/{slug}-cone.svg`).

**Asset generation (`scripts/generate-flavour-scoops.js`):**

- Loads env from `.env.local` (`dotenv`).
- Reads templates from `public/assets/scoops/templates/cone.svg` and `cup.svg` (strawberry reference designs).
- Recolours only template scoop pinks (`#F9A8D4`, `#BC606D`) per flavour; injects deterministic inclusions; writes **`[slug]-cone.svg`** and **`[slug]-cup.svg`**; upserts Supabase rows including `cone_url` / `cup_url` with service role.

**Client (`src/lib/flavour-scoop.ts`):**

- `mapFlavourToSlug`, `getFlavourScoopUrl` (currently `/assets/scoops/{slug}.svg` pattern used by UI hooks), `useFlavourScoop` loads row from `flavours` with strawberry fallback.

**Note:** If the UI is migrated fully to `-cone` / `-cup` assets, `getFlavourScoopUrl` / consumers should align with `cone_url` / `cup_url` from the row; today the codebase may still reference legacy single-file paths in some places—track as incremental hardening.

### 5.9 Global UI / UX

- **Theme:** light/dark with `ThemeProvider`, persisted preference, FOUC-prevention script in root layout.
- **Bottom navigation:** Home, Map, centre **+** new log, Search, Profile; safe-area padding.
- **Splash:** `SplashWrapper` for signed-in first paint experience.
- **Toast** system for lightweight feedback (e.g. share fallback).
- **Branding:** `GellogLogo`, app icons in metadata.
- **Accessibility:** aria labels on key controls; semantic headings on marketing page.

---

## 6. Data model (Postgres / Supabase)

**Core (001 + visibility):**

- `profiles` — username, display, avatar, `default_visibility`, subscription fields (006).
- `ice_cream_logs` — user, salon, rating, notes, photo, visited_at, visibility; extended with salon geo (003), photo/price privacy (005), weather + vessel + city etc. (app writes — confirm all columns exist in deployed DB).
- `log_flavours` — per-log flavour lines + ratings + tags + advanced rating columns as used by forms.
- `friendships` — follower/following edges.

**Salon domain:**

- `salon_profiles` — `place_id`, claimed state, owner, salon meta, claim fields.
- `salon_flavours` — legacy per-salon flavour list (004).
- `vitrine_flavours` + `vitrine_visibility_log` — public board + owner audit (011).

**Engagement:**

- `log_likes`, `log_comments` — used by feed and detail (schemas live in Supabase; not all tables appear in every migration file in repo—treat deployed DB as source of truth).

**Suggestions:**

- `flavour_suggestions` — user-suggested flavours toward salons (004).

**System flavours:**

- `flavours` — global catalogue; migration 014 extends with asset URLs; RLS/policies as configured in Supabase (public read + service writes is the intended split for generated rows).

**Push:**

- `push_subscriptions` (008).

**Storage (010):**

- Buckets/policies for log photos and avatars (`log-photos`, etc.—verify exact bucket names in migration).

**Analytics RPCs (007):**

- Weekly visits, top flavours, weather stats, monthly ratings for a `place_id`.

**Owner cap (013):**

- `get_owner_salon_count`, view `owner_salon_status` for soft cap (3 verified claims).

---

## 7. Security & compliance (implemented patterns)

- **RLS** on user data, vitrine, push subscriptions, etc. (per migrations).
- **Service role** for privileged scripts (flavour generator) and Stripe webhooks.
- **Subscription field guard** on `profiles` updates (006).
- **Privacy copy** in Terms/Privacy pages listing data categories including likes/comments.

---

## 8. Non-functional requirements (observed)

- **Performance:** Next.js image optimisation for photos; lazy loading in feed.
- **Resilience:** Supabase auth cookie/session cleanup helpers in browser client; user-facing error helpers.
- **Internationalisation:** English-first UI strings.
- **Deployment:** Vercel-oriented README; environment variables for Supabase, Stripe, Places, Open-Meteo, push keys (as required by each feature).

---

## 9. Out of scope / gaps to track

- **Single source of truth for scoop filenames:** generator emits `-cone`/`-cup`; some client code may still assume `{slug}.svg` until unified.
- **`flavours` base table DDL** may live only in Supabase SQL history; repo has `ALTER` in 014—ensure base table migration is captured for greenfield installs.
- **README** is still default create-next-app text; operational runbooks live in code + migrations.

---

## 10. Success metrics (suggested for product ops)

Not instrumented in this PRD snapshot; typical KPIs would include: DAU/WAU, logs per user per week, feed engagement (likes/comments), claim conversion, premium conversion, map session → log creation funnel.

---

## 11. Revision history

| Date | Author | Notes |
|------|--------|-------|
| 2026-04-20 | Engineering | Initial PRD drafted from repository structure, key routes, migrations 001–014, and primary client modules. |
