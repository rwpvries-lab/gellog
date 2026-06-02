# Colour Consistency Audit
_Run: 2026-06-01 — overnight task on branch `chore/overnight-tests`_

## What was fixed (trivially safe)

| File | Line | Before | After | Reason |
|---|---|---|---|---|
| `src/components/VesselIllustration.tsx` | 249, 306 | `var(--brand-primary, #F97316)` | `var(--brand-primary, #A85530)` | Wrong fallback hex — `#F97316` is Tailwind orange-500, not terracotta |
| `app/map/MapClient.tsx` | 42 | `color = "#f97316"` | `color = "#A85530"` | Highlighted map pin hardcoded to Tailwind orange-500 |
| `src/components/UpgradeButton.tsx` | 30 | `bg-orange-500 hover:bg-orange-600 dark:bg-orange-600` | `bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-hover)]` | CTA button uses raw Tailwind orange instead of brand token |
| `app/profile/[username]/FollowButton.tsx` | 72 | `bg-orange-500 hover:bg-orange-600 ring-orange-400` | `bg-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-hover)] ring-[color:var(--border-focus)]` | Inconsistent with the already-correct "Following" state button in the same file |

---

## Needs Ruben's decision

### 1 — `EditIceCreamLogForm.tsx` — multiple orange uses
_File: `app/icecream/logs/edit/[id]/EditIceCreamLogForm.tsx`_

The edit log form contains a cluster of `orange-*` Tailwind classes. The solid buttons clearly belong to the primary brand colour, but the tint/surface classes are ambiguous. Touching this file unattended carries risk because the form logic is complex.

| Line | Class | Question |
|---|---|---|
| 734 | `ring-1 ring-orange-100` | Flavour section container ring — should this be `ring-[color:var(--brand-primary-surface)]` or is a warm orange tint intentional? |
| 743 | `bg-orange-600 hover:bg-orange-700` | "+ Add flavour" button — almost certainly should be `var(--brand-primary)` to match other CTA buttons |
| 781 | `bg-orange-600 hover:bg-orange-700` | "Yes, add it" confirm button — same question as above |
| 801 | `bg-orange-50/60 ring-1 ring-orange-100` | Per-flavour card container — warm tint; may be intentional design or should use `--brand-primary-surface` |
| 811 | `border-orange-100` | Flavour name text input border — subtle tint; same ambiguity as 801 |
| 892 | `bg-orange-100 text-orange-700 ring-orange-200` | STATUS_TAGS badge (disabled/read-only state) — probably intentionally orange to indicate salon-defined metadata; could be appropriate to keep |
| 962 | `border-orange-100` | Notes section container border — same as 811 |
| 1038 | `border-orange-100` | Notes textarea border — same |
| 1053 | `bg-orange-600 hover:bg-orange-700` | **Main "Save changes" submit button** — clearly should be `var(--brand-primary)` |

**Recommendation:** Lines 743, 781, and 1053 are clear CTA buttons that should use `var(--brand-primary)`. The tint classes (50/100-level) are less certain — they may be fine as warm decoration or may need to use `--brand-primary-surface`.

---

### 2 — `IceCreamHeatmap.tsx` line 195 — "today" ring uses `ring-orange-400`
_File: `app/icecream/profile/IceCreamHeatmap.tsx`_

The *selected* day ring already uses `ring-[color:var(--brand-primary)]`. The *today* ring uses `ring-orange-400 dark:ring-orange-500`. This could be intentional (distinguishing today from selected) or an oversight. Changing it would alter the heatmap visual.

---

### 3 — Avatar placeholder gradients use old orange + teal combination
Two files use `bg-gradient-to-br from-orange-400 to-teal-500` as an avatar placeholder background:

- `app/icecream/profile/ProfileHeader.tsx` line 313
- `app/settings/SettingsClient.tsx` line 1233

`orange-400` (`#FB923C`) is not terracotta. `teal-500` (`#14B8A6`) is not the Forest secondary (`#1B5E52`). The gradient is only visible when no avatar image is present. **Should the placeholder use terracotta + forest instead?**

---

### 4 — Public profile page background gradient
_File: `app/profile/[username]/page.tsx` line 114_

```
from-orange-50 via-white to-teal-50
```

`orange-50` is a very pale warm tint and `teal-50` is a very pale teal. Both are near-white so the visual impact is minimal. However, both reference the old Tailwind orange/teal scale rather than the design system. **Is this gradient intentional or should it use cream (`#FBF5E8`) as the start color?**

---

### 5 — MapClient unlogged pin color is old teal
_File: `app/map/MapClient.tsx` line 44_

```js
else color = "#0d9488"; // teal-600
```

The unlogged pin uses `#0d9488` (Tailwind teal-600), which is not the design system Forest secondary (`#1B5E52`). This is not an orange issue but was found in the same scan. **Should unlogged pins use `#9CA3AF` (current gray) to stay neutral, or should they use the Forest green?**

---

## False positives (intentional / correct)

| Location | Class / Value | Why it is fine |
|---|---|---|
| `app/globals.css` | `--color-orange` / `--color-orange-bg` | CSS variable aliases that map to `var(--brand-primary)` — names are legacy, values are correct |
| `app/icecream/feed/IceCreamFeedClient.tsx:300` | `var(--color-orange-bg)` | Uses the CSS variable above — resolves to brand primary surface |
| `app/icecream/logs/edit/[id]/EditIceCreamLogForm.tsx:232` | `var(--color-orange-bg)` inline style | Same CSS variable — correct |
| `app/icecream/logs/new/` | (not scanned separately — see note) | Log creation flow — not touched per task rules |
