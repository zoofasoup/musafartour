# Marketing Content Audit Trail + Flyer Generator — Design Spec

## Context

Two related but separate problems, both raised in the same conversation:

**(A)** The team has many interconnected marketing-facing content sources (packages, hero section, testimonials, website settings, etc.) edited by different people, with no visibility into who changed what and when. Confirmed during discovery that this gap is real: a `sync-seats-5min` pg_cron job exists on the live database, running every 5 minutes, that was never captured in any migration file — nobody has a record of who added it or when.

**(B)** The team manually redesigns a "Paket Umroh" seat-availability flyer (1080x1920px, for WhatsApp/social sharing) in an external design tool whenever seat counts change. This manual step is frequently forgotten, so the flyer goes stale relative to the real seat data — which, notably, already syncs automatically from a Google Sheet into `packages.slots_total` / `packages.slots_filled` every 5 minutes. The data is fresh; the flyer isn't.

## Part A — Content Change Log + Notification

### Data model

New table `content_change_log`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `table_name` | text | e.g. `packages`, `hero_section` |
| `record_id` | uuid | the changed row's id |
| `action` | text | `insert` / `update` / `delete` |
| `changed_by` | uuid | `auth.uid()` at time of change, nullable (system/cron changes) |
| `changed_by_email` | text | snapshot of the user's email at change time — stored, not joined live, so the log stays readable if the user is later removed from the team |
| `diff` | jsonb | `{ column: { old, new } }` for changed columns only (update), full row (insert/delete) |
| `summary` | text | human-readable one-liner, e.g. `"Updated slots_filled: 12 → 15 on Umroh Nyaman (29 Jul 2026)"` |
| `created_at` | timestamptz | |

RLS: SELECT for `admin`/`superadmin` only (this is a governance tool, not a per-role feature). No app-level INSERT policy needed — every row is written by the trigger function running as the table owner.

### Triggers

One generic trigger function (`log_content_change()`), attached via `AFTER INSERT OR UPDATE OR DELETE` triggers to: `packages`, `departure_schedules`, `hero_section`, `testimonials`, `faq_items`, `gallery_images`, `website_settings`, `selling_points`.

Behavior:
- Diffs `to_jsonb(OLD)` vs `to_jsonb(NEW)` on UPDATE, excluding `updated_at`/`created_at` from the comparison (these change on every save regardless of real edits and would make the log pure noise).
- If the excluded-column diff is empty (i.e. nothing meaningful changed), skip logging entirely — no row written.
- On INSERT/DELETE, logs the full row as the diff.
- Resolves `changed_by_email` from `auth.users` at the moment of the trigger firing.
- Because this runs at the database trigger level, it captures changes made through the admin UI **and** anything done directly via SQL/dashboard (like the undocumented cron job) — this is the actual point of putting it here instead of in application code.

### Admin UI

- New page `/admin/activity-log`: reverse-chronological feed, filterable by table name, each row showing who / what table / when / the diff (old → new per changed field) and the `summary` line.
- Notification: a bell icon in `AdminLayout`'s header showing a count of log rows created since the current admin's last visit. Backed by a small `user_notification_state` table (`user_id` PK, `last_seen_activity_at`), updated when the admin opens the activity log page. No external service (WhatsApp/email) — everything stays inside the existing admin panel. Pushed alerts (WhatsApp/email) are a real option later but need a new provider account; out of scope for this build.
- Access: `/admin/activity-log` and the bell gated to `admin`/`superadmin`.

## Part B — Flyer Generator

### Canvas and safe zone

Fixed output: **1080×1920px**, matching the existing design exactly. Measured directly against the team's actual background asset (`~ Update Seat.png` on the user's Desktop, 1080×1920):

| Zone | Y range | Contents |
|---|---|---|
| Header | 0–480 | logo, PPIU text, title, plane graphic, "2026" badge (static, pre-baked into the background image) |
| **Safe zone (table)** | **480–1790** (height ≈1310px), x: 40–1040 | where the generated table renders |
| Footer | 1790–1920 | contact icons, WhatsApp numbers, socials, bank payment bar, address (static, pre-baked into the background image) |

At the original design's row height (~78px including the header row), the safe zone fits **1 header row + ~15–16 data rows** — matching the current hand-designed flyer almost exactly.

### Background asset

The background is used as **one single static full-canvas image**, not split into separate header/footer crops. Since the canvas size is fixed (not flowing), the generated HTML table sits as an absolutely-positioned overlay directly on top of the safe zone; the table's own opaque row backgrounds naturally cover whatever background pixels (gradient/photo) are behind them in that zone. The footer area (1790–1920) is never covered, since the table is capped at y=1790. This means no image editing/cropping is required — the existing file is used as-is.

One additional overlay is needed: an **"Diperbarui {tanggal}"** date badge (dark rounded pill + checkmark, matching the style in the team's original filled reference), positioned top-left, regenerated with today's date on every render. The blank background asset does not have this badge baked in, so it's drawn fresh each time, not masking over an old one.

### Data source and row selection

Source: the existing `packages` table (already holds title, `date`, `duration`, `airline`, `hotel_makkah` + rating, `hotel_madinah` + rating, `price`, `slots_total`, `slots_filled`) — the same table the 5-minute Google Sheet sync already keeps current. No new table needed for flyer data.

Row → column mapping:

| Flyer column | Source |
|---|---|
| Sisa Seat | `slots_total - slots_filled` if positive and `seat_available` is true, else "Sold Out!" |
| Keberangkatan | `date`, formatted `d MMM yyyy` (Indonesian) |
| Judul Paket | `title`, with a "Bulan {month}" subtitle derived from `date` |
| Durasi & Rute | `duration` + `departure_city` (+ `transit` if present) |
| Maskapai | `airline` (text only for this version — airline logos are out of scope, `packages` has no logo asset field) |
| Hotel Makkah / Madinah | `hotel_makkah`/`hotel_madinah` + star rating columns |
| Harga | `price`, displayed exactly as the admin entered it (already free-text) |

New admin page `/admin/flyer-generator`, gated to `admin`/`superadmin`/`content_admin` (same access pattern as other marketing-facing admin pages):

- **Sidebar**: checklist of upcoming departures (soonest first, sold-out ones included and marked, not hidden), pre-checked up to the ~15–16 that fit the safe zone. Checking beyond that limit is blocked with a warning rather than silently overflowing into the footer.
- **Main preview**: the actual 1080×1920 flyer rendered live as real HTML/CSS — background image, the table for whichever rows are checked, the fresh date badge — so the on-screen preview is a true 1:1 representation of the eventual export.
- **Export**: "Download PNG" / "Download JPEG" button uses `html2canvas` (already an unused dependency in `package.json`) to snapshot the preview element client-side and trigger a browser download. No server-side rendering, no headless browser infrastructure. The live preview itself is the confirmation step the team asked for — what's on screen is what downloads.

## Out of scope (explicitly deferred, not part of this build)

- Push notifications (WhatsApp/email) for the activity log — needs a new provider integration.
- Airline logo images on the flyer.
- Automatic overflow handling (e.g. auto-picking which departures to show) — replaced by manual sidebar selection per the team's explicit preference.
- Retention/pruning policy for `content_change_log` — not needed at current expected volume.

## Verification plan

- Confirm the generic trigger fires correctly on all 8 target tables for insert/update/delete, and that no-op saves (only `updated_at` changing) produce no log row.
- Confirm `/admin/activity-log` is inaccessible to non-admin roles (RLS + route gating).
- Confirm the flyer preview at 1080×1920 pixel-matches expectations against the team's current reference image (background alignment, table position within the measured safe zone, footer never covered).
- Confirm PNG and JPEG export both produce a file at the correct canvas size and open correctly.
- Confirm selecting more rows than the safe zone allows is blocked in the UI rather than allowed to overflow visually.
