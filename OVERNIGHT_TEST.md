# Gellog — Project Summary

- **What it is:** A mobile-first PWA ("Strava for gelato") where users log gelato/ice cream salon visits with flavours, photos, and ratings, and browse a social feed and map.
- **Stack:** Next.js 15 App Router + React 19 + TypeScript, styled with Tailwind CSS v4, backed by Supabase (Postgres, Auth, Storage) and deployed on Vercel; Stripe handles subscriptions and salon payments.
- **Core flows:** Authenticated users create logs via a 3-step flow (Where → What → Finishing touches); salon owners can claim their salon, manage a public flavour board (vitrine), and view analytics.
- **Design system:** Mediterranean/premium aesthetic — Terracotta `#A85530` on Cream `#FBF5E8`, Fraunces serif headings, mobile-first with bottom navigation; the old teal palette must never return.
- **Data model highlights:** ~79 canonical flavours with SVG scoop assets, a token-based `<Gelato>` illustration component, city-visit passport stamps, follower/following social graph, and web push notifications.
