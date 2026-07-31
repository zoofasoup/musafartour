# Design Request Form — Design Spec

**Goal:** Give anyone (staff, agents, partners — no login required) a public form to request a design (flyer, social post, banner, brochure, etc.) with a complete creative brief, so the request lands directly in the team's existing Notion "Tasks" database instead of a WhatsApp message someone has to manually turn into a task.

**Non-goals:** No new Supabase table. No admin page in the site — Notion itself is the review/management surface, using the PIC/Status/Priority workflow the team already uses there.

---

## 1. Architecture

- **Public route:** `/permintaan-desain` — no auth, follows the existing `UmrohCalculator.tsx` pattern (client-side zod validation, no admin gating).
- **Cloudflare Pages Function:** `functions/design-request.ts` — receives the validated form payload (as `multipart/form-data`, since it includes files), uploads any attached files to Supabase Storage, then calls the Notion API to create a new page in the existing "Tasks" data source.
- **No new Supabase table.** Supabase Storage is used purely as a file host (public URLs for attachments) — not as a record store. Notion is the single source of truth for the request itself, exactly as requested.
- **No new admin page in the site.** The team manages requests entirely inside Notion (Status, PIC assignment, Priority) since that's their existing workflow.

## 2. Notion mapping

Data source: the existing "Tasks" data source (`collection://2b0dd69e-0003-81bc-8f43-000b08f12634`), confirmed live via the Notion connection during design. This database is shared across multiple clients (Client select: Musafar / Habi / Musaland) — no schema changes are made to it; only existing properties are populated.

Every submission creates one new page:

| Notion Property | Type (existing) | Value set by this feature |
|---|---|---|
| Task name | title | `[<Category>] <title>` |
| Client | select | `Musafar` (hardcoded) |
| Priority | select (High/Medium/Low) | mapped directly from the form's priority field |
| Due | date | the requester's deadline date |
| Status | status | `Not Started` (default) |
| Tags | multi-select | left unset — no new tag options added |
| PIC | person | left unset — assigned manually by the team in Notion |
| Sub-tasks / Parent-task | relation | left unset |

**Page body** (the page's actual content, written as Notion blocks — not properties) holds everything the properties above can't express, formatted as a readable brief:

```
## Design Brief

**Category:** <category>
**Requested by:** <requester_name> — <requester_whatsapp>
**Dimensions / Placement:** <dimensions>
**Objective:** <description>

**Key copy to include:**
<key_copy, if provided>

**Inspiration:** <inspiration_link, if provided>

### Reference files
- [<filename>](<supabase-storage-public-url>)
- ...
```

**Setup required before this can go live (user action, not code):** create a Notion internal integration (Notion Settings → Connections → Develop or manage integrations → New integration), copy its secret token, and share the "Tasks" database with that integration (database "..." menu → Connections → add the integration). The token is then set as a Cloudflare Pages secret (`NOTION_API_KEY`), the same way `SUPABASE_SERVICE_ROLE_KEY` is already configured for other Functions. This cannot be done by an agent — it requires the user's own Notion workspace access.

## 3. Form fields (data model)

```
category            : select   — Flyer/Poster | Social Media Post | Banner/Ad | Brochure/Print | Other
title               : text     — short summary (becomes the Notion page title, prefixed with [category])
description         : textarea — objective / what it's for
dimensions          : text     — size or placement, e.g. "IG Story 1080x1920", "A4 print", "FB feed ad"
                                  (category-aware placeholder hints shown based on the selected category)
key_copy            : textarea, optional — exact text/copy that must appear (price, dates, tagline)
inspiration_link    : text, optional — URL to a reference (Pinterest board, competitor post, etc.)
files               : file upload, optional, multiple (max 5, 10MB each, image/* + application/pdf only)
requester_name      : text
requester_whatsapp  : text — validated with the same regex pattern used in BoothLead.tsx / UmrohCalculator.tsx
deadline            : date
priority            : select — Low | Medium | High (maps 1:1 to Notion's Priority property)
```

Validation: zod schema, client-side, matching the existing `leadSchema`-style pattern already used in this codebase (see `BoothLead.tsx`).

## 4. Error handling & abuse protection

- **Validation:** inline field-level errors via zod, consistent with existing forms in this codebase.
- **File limits:** max 5 files, 10MB each, `image/*` + `application/pdf` only — rejected client-side before any upload attempt.
- **Submission order:** files upload to Supabase Storage first, then the Notion page is created referencing their public URLs. If Notion page creation fails (bad token, Notion API rate limit, network error), the user sees a clear retry-friendly error message. The already-uploaded files become harmless orphans in Storage in that case — not worth building rollback/cleanup logic for a low-volume internal-facing form.
- **Abuse protection:** this route is fully public, unauthenticated, and calls a real external API (Notion) with its own rate limits — the same risk category as the `/flyer-image` endpoint hardened earlier in this project's history. Mitigations:
  - A honeypot field named e.g. `website` (a common bot-bait name), positioned off-screen via `position: absolute; left: -9999px` (not `display: none` or `visibility: hidden`, which some bots specifically detect and skip) — a real user never sees or fills it in; if it arrives non-empty, the Function silently returns a fake-success response without calling Notion.
  - A per-IP submission rate limit inside `functions/design-request.ts`: reject with a 429 if the same IP (from `CF-Connecting-IP`) has submitted more than 3 requests in a 10-minute window. Tracked in-memory per Function instance (matching the existing `rateLimitMap` pattern already used in `supabase/functions/bootstrap-admin/index.ts`) — acceptable for this low-volume, non-critical endpoint; not worth adding a durable store for.

## 5. Verification

No test framework exists in this repo. Verification is:
- `npx tsc -p tsconfig.app.json --noEmit` (app code) and the equivalent for `functions/` (matching this project's established pattern, since the root `tsconfig.json` is a solution-style config that doesn't check either).
- Manual browser verification: submit a real request through the live form (including a file attachment), then confirm in the actual Notion "Tasks" database that a new page appeared with the correct Client/Priority/Due/Status properties and a well-formatted brief body, including a working link to the uploaded file.
