# Design Request Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, no-login form at `/permintaan-desain` where anyone can submit a design request (flyer, social post, banner, brochure, etc.) with a complete creative brief. Submission uploads any reference files to Supabase Storage and creates a new page directly in the team's existing Notion "Tasks" database — no new Supabase table, no new admin page in this site.

**Architecture:** The public page posts `multipart/form-data` (fields + files) to a new Cloudflare Pages Function (`functions/design-request.ts`). That Function rate-limits and honeypot-checks the request, uploads any files to a new public Supabase Storage bucket via the existing anon key, then calls the Notion API (via a new `functions/_lib/notion.ts` helper) to create a page in the Notion "Tasks" data source with the brief written into the page body.

**Tech Stack:** React + TypeScript + Zod (existing app), Cloudflare Pages Functions (existing `functions/` directory, same pattern as `functions/flyer-image.ts`), raw `fetch` against the Supabase Storage REST API and the Notion REST API (no new npm dependencies — matches the existing `functions/_lib/data.ts` pattern of plain `fetch` rather than a client library).

## Global Constraints

- No new Supabase table. Notion's existing "Tasks" data source is the only record store for requests.
- No new admin page in this site. The team manages requests inside Notion.
- Notion "Tasks" data source confirmed live during design: database id `2b0dd69e-0003-81ba-b8e8-fdd1c0b67c0f` (the page's own id, used as `parent.database_id` in the classic Notion API), with exactly these relevant existing properties: `Client` (select: Musafar/Habi/Musaland), `Priority` (select: High/Medium/Low), `Due` (date), `Status` (status: Back Log/Not Started/In Progress/Done/Archived), `Task name` (title). This plan populates only these — no schema changes to that shared database.
- Route for the public page: `/permintaan-desain`. Route for the Cloudflare Function: `/design-request` (matches `functions/design-request.ts`'s file path, same naming split already used for `/flyer-print` (page) vs `/flyer-image` (function)).
- No test framework exists in this repo — verification is `npx tsc -p tsconfig.app.json --noEmit` / `npx tsc -p functions/tsconfig.json --noEmit` (root `tsconfig.json` is a no-op solution-style config, confirmed earlier this project's history) plus standalone `tsx`-run check scripts for pure functions, plus manual browser verification.
- **Cloudflare account action required, outside this plan's code changes:** the user must create a Notion internal integration, share the "Tasks" database with it, and set its secret as the `NOTION_API_KEY` Cloudflare Pages environment variable (plus `NOTION_TASKS_DATABASE_ID`, see Task 2). This cannot be done by an agent — flag it and treat live-Notion verification as the user's step, same as the Browser Rendering account enablement earlier in this project's history.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260731000000_design_request_attachments_bucket.sql` | New public Storage bucket + RLS policies allowing anyone to upload/view attachments. |
| `functions/_lib/env.ts` (modify) | Add `NOTION_API_KEY` and `NOTION_TASKS_DATABASE_ID` to `Env`. |
| `functions/_lib/notion.ts` | Pure payload-building function + the actual Notion API call. No React, no Cloudflare-specific types beyond `Env` — testable via a standalone script. |
| `functions/design-request.ts` | The Pages Function: honeypot + rate limit, multipart parsing, file upload to Storage, calls the Notion helper, returns a JSON response. |
| `src/pages/DesignRequest.tsx` | The public form page: fields, validation, a self-contained image/PDF file picker, submits `FormData` to `/design-request`. |
| `src/App.tsx` (modify) | Lazy import + public route registration for `/permintaan-desain`. |

---

### Task 1: Storage bucket for attachments

**Files:**
- Create: `supabase/migrations/20260731000000_design_request_attachments_bucket.sql`

**Interfaces:**
- Produces: a Storage bucket named `design-request-attachments`, publicly readable, insertable by anyone — consumed by Task 3's upload logic via the bucket name string `"design-request-attachments"`.

- [ ] **Step 1: Write the migration**

```sql
-- Public storage bucket for design-request-form attachments (reference
-- images/logos/examples). Public + open INSERT because the request form
-- itself has no login - matches the "packages" table's public SELECT
-- policy precedent for public-facing, non-sensitive content.
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-request-attachments', 'design-request-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Design request attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-request-attachments');

CREATE POLICY "Anyone can upload design request attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'design-request-attachments');
```

- [ ] **Step 2: Apply the migration**

This project has no CI/automated migration step (confirmed: no migration command in `package.json`, no migration step in `.github/workflows/`) — migrations are applied directly against the linked project (`project_id` in `supabase/config.toml`). Run: `npx supabase db push`.
Expected: migration applies with no errors; `design-request-attachments` appears as a bucket in the Supabase dashboard's Storage section, marked Public.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260731000000_design_request_attachments_bucket.sql
git commit -m "feat: add public storage bucket for design request attachments"
```

---

### Task 2: Notion API helper

**Files:**
- Modify: `functions/_lib/env.ts`
- Create: `functions/_lib/notion.ts`
- Test: `functions/_lib/notion.check.ts` (temporary, run via `tsx`, deleted at the end of this task — matches the verification pattern already used for `flyerData.check.ts` earlier in this project's history)

**Interfaces:**
- Produces (consumed by Task 3):
  - `interface DesignRequestInput { category: string; title: string; description: string; dimensions: string; keyCopy: string | null; inspirationLink: string | null; requesterName: string; requesterWhatsapp: string; deadline: string; priority: "Low" | "Medium" | "High"; fileUrls: { name: string; url: string }[]; }`
  - `function buildDesignRequestPage(input: DesignRequestInput, databaseId: string): Record<string, unknown>` — pure, no network.
  - `function createNotionPage(env: Env, payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }>`

- [ ] **Step 1: Add the env vars**

In `functions/_lib/env.ts`, change:

```typescript
export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  BROWSER: BrowserWorker;
}
```

to:

```typescript
export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  BROWSER: BrowserWorker;
  NOTION_API_KEY?: string;
  NOTION_TASKS_DATABASE_ID?: string;
}
```

(Optional, not required with a fallback like the Supabase vars — a Notion API key is a real secret with no safe public default, so `functions/design-request.ts` in Task 3 must explicitly check both are set before using them and fail clearly if not.)

- [ ] **Step 2: Write `functions/_lib/notion.ts`**

```typescript
import type { Env } from "./env";

export interface DesignRequestInput {
  category: string;
  title: string;
  description: string;
  dimensions: string;
  keyCopy: string | null;
  inspirationLink: string | null;
  requesterName: string;
  requesterWhatsapp: string;
  deadline: string; // "YYYY-MM-DD"
  priority: "Low" | "Medium" | "High";
  fileUrls: { name: string; url: string }[];
}

type NotionRichText = { type: "text"; text: { content: string; link?: { url: string } | null } };

function text(content: string, url?: string): NotionRichText {
  return { type: "text", text: { content, link: url ? { url } : null } };
}

function paragraph(...richText: NotionRichText[]) {
  return { object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: richText } };
}

/**
 * Builds the Notion API `POST /v1/pages` payload for one design request.
 * Pure and network-free so it can be checked without a live Notion token.
 * Only populates properties confirmed to already exist on the shared
 * "Tasks" data source (Client/Priority/Due/Status/Task name) - everything
 * else (category, requester, brief, files) goes into the page body instead
 * of new custom properties, since that database is shared across other
 * clients (Musafar/Habi/Musaland) and isn't this feature's to restructure.
 */
export function buildDesignRequestPage(input: DesignRequestInput, databaseId: string): Record<string, unknown> {
  const children: unknown[] = [
    { object: "block", type: "heading_2", heading_2: { rich_text: [text("Design Brief")] } },
    paragraph(text(`Category: ${input.category}`)),
    paragraph(text(`Requested by: ${input.requesterName} — ${input.requesterWhatsapp}`)),
    paragraph(text(`Dimensions / Placement: ${input.dimensions}`)),
    paragraph(text(`Objective: ${input.description}`)),
  ];

  if (input.keyCopy) {
    children.push(paragraph(text("Key copy to include:")));
    children.push(paragraph(text(input.keyCopy)));
  }

  if (input.inspirationLink) {
    children.push(paragraph(text("Inspiration: "), text(input.inspirationLink, input.inspirationLink)));
  }

  if (input.fileUrls.length > 0) {
    children.push({ object: "block", type: "heading_3", heading_3: { rich_text: [text("Reference files")] } });
    for (const file of input.fileUrls) {
      children.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [text(file.name, file.url)] },
      });
    }
  }

  return {
    parent: { database_id: databaseId },
    properties: {
      "Task name": { title: [{ text: { content: `[${input.category}] ${input.title}` } }] },
      Client: { select: { name: "Musafar" } },
      Priority: { select: { name: input.priority } },
      Due: { date: { start: input.deadline } },
      Status: { status: { name: "Not Started" } },
    },
    children,
  };
}

/**
 * Calls the real Notion API. `Notion-Version: 2022-06-28` is the stable
 * classic version that accepts `parent.database_id` directly - this
 * "Tasks" data source was confirmed single-source (no linked/merged
 * sources) during design, so the newer multi-data-source API surface
 * isn't needed here.
 */
export async function createNotionPage(
  env: Env,
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!env.NOTION_API_KEY || !env.NOTION_TASKS_DATABASE_ID) {
    return { ok: false, error: "Notion integration is not configured (missing NOTION_API_KEY or NOTION_TASKS_DATABASE_ID)" };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Notion API error (${res.status}): ${body.slice(0, 500)}` };
  }

  return { ok: true };
}
```

- [ ] **Step 3: Write the verification script**

```typescript
import { buildDesignRequestPage, type DesignRequestInput } from "./notion";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`FAIL ${label}: expected ${e}, got ${a}`);
  console.log(`PASS ${label}`);
}

const baseInput: DesignRequestInput = {
  category: "Flyer/Poster",
  title: "Promo Ramadan",
  description: "Flyer promo paket Ramadan untuk disebar di Instagram",
  dimensions: "IG Feed 1080x1080",
  keyCopy: null,
  inspirationLink: null,
  requesterName: "Budi",
  requesterWhatsapp: "081234567890",
  deadline: "2026-08-15",
  priority: "High",
  fileUrls: [],
};

const payload = buildDesignRequestPage(baseInput, "db-123") as any;
assertEqual(payload.parent, { database_id: "db-123" }, "parent.database_id");
assertEqual(payload.properties["Task name"].title[0].text.content, "[Flyer/Poster] Promo Ramadan", "Task name");
assertEqual(payload.properties.Client, { select: { name: "Musafar" } }, "Client hardcoded to Musafar");
assertEqual(payload.properties.Priority, { select: { name: "High" } }, "Priority mapped");
assertEqual(payload.properties.Due, { date: { start: "2026-08-15" } }, "Due mapped");
assertEqual(payload.properties.Status, { status: { name: "Not Started" } }, "Status defaults to Not Started");
assertEqual(payload.children.length, 5, "5 body blocks with no keyCopy/inspirationLink/files");

const withExtras = buildDesignRequestPage(
  {
    ...baseInput,
    keyCopy: "Diskon 20% s.d. 30 Ramadan",
    inspirationLink: "https://example.com/inspo",
    fileUrls: [{ name: "logo.png", url: "https://example.com/logo.png" }],
  },
  "db-123"
) as any;
assertEqual(withExtras.children.length, 10, "10 body blocks: 5 base + 2 keyCopy paragraphs + 1 inspiration paragraph + 1 heading_3 + 1 file item");

console.log("All notion.ts checks passed.");
```

- [ ] **Step 4: Run the verification script**

Run: `npx tsx functions/_lib/notion.check.ts`
Expected: every line prints `PASS ...`, ending with `All notion.ts checks passed.` with no thrown error.

- [ ] **Step 5: Delete the temporary check script**

```bash
rm functions/_lib/notion.check.ts
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p functions/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add functions/_lib/env.ts functions/_lib/notion.ts
git commit -m "feat: add Notion API helper for design request pages"
```

---

### Task 3: Cloudflare Function (`functions/design-request.ts`)

**Files:**
- Create: `functions/design-request.ts`

**Interfaces:**
- Consumes: `DesignRequestInput`, `buildDesignRequestPage`, `createNotionPage` from `./_lib/notion`; `Env`, `getSupabaseConfig` from `./_lib/env`.
- Produces: `POST /design-request` accepting `multipart/form-data`, consumed by Task 4's form submit handler. Returns `Response` with JSON body `{ "success": true }` (200) or `{ "success": false, "error": string }` (400/429/502).

- [ ] **Step 1: Add `getSupabaseConfig` export check**

Confirm `functions/_lib/env.ts` already exports `getSupabaseConfig` (it does, from Task 2 — unchanged by this task). No action needed, just don't re-declare it.

- [ ] **Step 2: Write the Function**

```typescript
import type { Env } from "./_lib/env";
import { getSupabaseConfig } from "./_lib/env";
import { buildDesignRequestPage, createNotionPage, type DesignRequestInput } from "./_lib/notion";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPE_PREFIXES = ["image/", "application/pdf"];

function checkRateLimit(clientIP: string): { allowed: boolean } {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);

  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) rateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (record.count >= MAX_SUBMISSIONS_PER_WINDOW) return { allowed: false };
  record.count++;
  return { allowed: true };
}

function isAllowedFileType(type: string): boolean {
  return ALLOWED_FILE_TYPE_PREFIXES.some((prefix) => type.startsWith(prefix));
}

async function uploadFile(env: Env, file: File): Promise<{ name: string; url: string }> {
  const { url, anonKey } = getSupabaseConfig(env);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const res = await fetch(`${url}/storage/v1/object/design-request-attachments/${path}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: bytes,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload ${file.name}: ${res.status}`);
  }

  return { name: file.name, url: `${url}/storage/v1/object/public/design-request-attachments/${path}` };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const clientIP = context.request.headers.get("CF-Connecting-IP") || "unknown";

  const rateCheck = checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ success: false, error: "Terlalu banyak permintaan, coba lagi nanti." }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid form data" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Honeypot: a real user never sees or fills this field (hidden off-screen
  // in the form, see DesignRequest.tsx). A bot that fills every field will
  // populate it - silently pretend success without touching Notion/Storage.
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
  }

  const category = form.get("category");
  const title = form.get("title");
  const description = form.get("description");
  const dimensions = form.get("dimensions");
  const keyCopy = form.get("keyCopy");
  const inspirationLink = form.get("inspirationLink");
  const requesterName = form.get("requesterName");
  const requesterWhatsapp = form.get("requesterWhatsapp");
  const deadline = form.get("deadline");
  const priority = form.get("priority");

  const requiredStrings = { category, title, description, dimensions, requesterName, requesterWhatsapp, deadline, priority };
  for (const [key, value] of Object.entries(requiredStrings)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: `Missing required field: ${key}` }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }
  if (priority !== "Low" && priority !== "Medium" && priority !== "High") {
    return new Response(JSON.stringify({ success: false, error: "Invalid priority" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) {
    return new Response(JSON.stringify({ success: false, error: `Maksimal ${MAX_FILES} file` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(JSON.stringify({ success: false, error: `${file.name} melebihi 10MB` }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    if (!isAllowedFileType(file.type)) {
      return new Response(JSON.stringify({ success: false, error: `${file.name}: tipe file tidak didukung` }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  let fileUrls: { name: string; url: string }[] = [];
  try {
    fileUrls = await Promise.all(files.map((file) => uploadFile(context.env, file)));
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "File upload failed" }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  const input: DesignRequestInput = {
    category: category as string,
    title: title as string,
    description: description as string,
    dimensions: dimensions as string,
    keyCopy: typeof keyCopy === "string" && keyCopy.trim().length > 0 ? keyCopy : null,
    inspirationLink: typeof inspirationLink === "string" && inspirationLink.trim().length > 0 ? inspirationLink : null,
    requesterName: requesterName as string,
    requesterWhatsapp: requesterWhatsapp as string,
    deadline: deadline as string,
    priority: priority as "Low" | "Medium" | "High",
    fileUrls,
  };

  const databaseId = context.env.NOTION_TASKS_DATABASE_ID || "";
  const payload = buildDesignRequestPage(input, databaseId);
  const result = await createNotionPage(context.env, payload);

  if (!result.ok) {
    return new Response(JSON.stringify({ success: false, error: result.error }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p functions/tsconfig.json --noEmit`
Expected: no errors referencing `functions/design-request.ts`.

- [ ] **Step 4: Commit**

```bash
git add functions/design-request.ts
git commit -m "feat: add Cloudflare Function to submit design requests to Notion"
```

---

### Task 4: Public form page

**Files:**
- Create: `src/pages/DesignRequest.tsx`
- Modify: `src/App.tsx` (lazy import near the other lazy page imports, route near the other public routes like `/packages`)

**Interfaces:**
- Consumes: `POST /design-request` from Task 3, expecting `multipart/form-data` with fields `category, title, description, dimensions, keyCopy, inspirationLink, requesterName, requesterWhatsapp, deadline, priority, website (honeypot), files (0-5 File entries)`.
- Produces: route `/permintaan-desain`, consumed by whoever the team shares that link with — no other code depends on this page.

**Note on file picking:** the existing `src/components/admin/FileUpload.tsx` is NOT reused here — its internal `validateFile` hardcodes `file.type.startsWith("image/")` regardless of what `accept` prop is passed, so it would silently reject the PDF uploads this form needs to support, with a misleading "Please upload an image file" error. Rather than touch a shared component used by several admin pages for an unrelated page's needs, this task writes a small self-contained file input directly below.

- [ ] **Step 1: Write the page**

```tsx
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Upload, X } from "lucide-react";

const CATEGORIES = ["Flyer/Poster", "Social Media Post", "Banner/Ad", "Brochure/Print", "Other"] as const;
const PRIORITIES = ["Low", "Medium", "High"] as const;

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

const DIMENSION_HINTS: Record<(typeof CATEGORIES)[number], string> = {
  "Flyer/Poster": "cth: A4 print, atau 1080x1920 untuk digital",
  "Social Media Post": "cth: IG Feed 1:1, IG Story 9:16, FB Post 1200x630",
  "Banner/Ad": "cth: 1200x628 FB Ads, atau ukuran spanduk fisik (cm)",
  "Brochure/Print": "cth: A5 tri-fold, A4 4 halaman",
  Other: "Jelaskan ukuran atau tempat penggunaannya",
};

/**
 * Not `FileUpload` from components/admin - that component hardcodes
 * `file.type.startsWith("image/")` in its own validation regardless of
 * the `accept` prop, so it would silently reject the PDFs this form
 * needs to accept. Small enough to own directly here rather than change
 * a component several admin pages already depend on.
 */
function DesignFilePicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const [error, setError] = useState<string>("");

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError("");
    const incoming = Array.from(fileList);
    const combined = [...files, ...incoming];

    if (combined.length > MAX_FILES) {
      setError(`Maksimal ${MAX_FILES} file`);
      return;
    }
    for (const file of incoming) {
      const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!isAllowed) {
        setError(`${file.name}: tipe file tidak didukung (hanya gambar atau PDF)`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`${file.name} melebihi ${MAX_FILE_SIZE_MB}MB`);
        return;
      }
    }
    onChange(combined);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 border border-dashed rounded-md p-3 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
        <Upload className="h-4 w-4" />
        Pilih file gambar atau PDF
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => removeFile(i)} aria-label={`Hapus ${file.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const requestSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
  description: z.string().trim().min(10, "Jelaskan tujuan desain ini minimal 10 karakter").max(2000),
  dimensions: z.string().trim().min(2, "Ukuran/penempatan wajib diisi").max(200),
  keyCopy: z.string().trim().max(2000).optional(),
  inspirationLink: z.string().trim().max(500).optional(),
  requesterName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  requesterWhatsapp: z
    .string()
    .trim()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15)
    .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh angka"),
  deadline: z.string().min(1, "Tanggal deadline wajib diisi"),
  priority: z.enum(PRIORITIES),
});

type FormState = {
  category: (typeof CATEGORIES)[number];
  title: string;
  description: string;
  dimensions: string;
  keyCopy: string;
  inspirationLink: string;
  requesterName: string;
  requesterWhatsapp: string;
  deadline: string;
  priority: (typeof PRIORITIES)[number];
};

const INITIAL_STATE: FormState = {
  category: "Flyer/Poster",
  title: "",
  description: "",
  dimensions: "",
  keyCopy: "",
  inspirationLink: "",
  requesterName: "",
  requesterWhatsapp: "",
  deadline: "",
  priority: "Medium",
};

export default function DesignRequest() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = requestSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(parsed.data)) {
        body.append(key, value);
      }
      body.append("website", honeypot);
      for (const file of files) {
        body.append("files", file);
      }

      const res = await fetch("/design-request", { method: "POST", body });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengirim permintaan");
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim permintaan");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <h1 className="text-xl font-bold">Permintaan terkirim</h1>
            <p className="text-sm text-muted-foreground">
              Tim desain akan meninjau permintaanmu dan menghubungi via WhatsApp jika ada pertanyaan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-10 flex justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Permintaan Desain</CardTitle>
          <CardDescription>Isi brief lengkap di bawah supaya tim desain bisa langsung mengerjakan tanpa perlu tanya balik.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot - hidden from real users, bots that fill every field populate it */}
            <div style={{ position: "absolute", left: -9999, top: -9999 }} aria-hidden="true">
              <label>
                Website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            <div>
              <Label>Kategori Desain</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v as FormState["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Judul Singkat</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="cth: Flyer Promo Ramadan" />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label>Tujuan / Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Untuk apa desain ini, apa yang ingin disampaikan?" />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
            </div>

            <div>
              <Label>Ukuran / Penempatan</Label>
              <Input value={form.dimensions} onChange={(e) => update("dimensions", e.target.value)} placeholder={DIMENSION_HINTS[form.category]} />
              {errors.dimensions && <p className="text-sm text-destructive mt-1">{errors.dimensions}</p>}
            </div>

            <div>
              <Label>Copy/Teks Wajib Ada (opsional)</Label>
              <Textarea value={form.keyCopy} onChange={(e) => update("keyCopy", e.target.value)} placeholder="Harga, tanggal, kode promo, tagline yang harus muncul di desain" />
            </div>

            <div>
              <Label>Link Inspirasi (opsional)</Label>
              <Input value={form.inspirationLink} onChange={(e) => update("inspirationLink", e.target.value)} placeholder="https://..." />
            </div>

            <div>
              <Label>File Referensi (opsional, maks 5, 10MB masing-masing)</Label>
              <DesignFilePicker files={files} onChange={setFiles} />
            </div>

            <div>
              <Label>Nama</Label>
              <Input value={form.requesterName} onChange={(e) => update("requesterName", e.target.value)} />
              {errors.requesterName && <p className="text-sm text-destructive mt-1">{errors.requesterName}</p>}
            </div>

            <div>
              <Label>Nomor WhatsApp</Label>
              <Input value={form.requesterWhatsapp} onChange={(e) => update("requesterWhatsapp", e.target.value)} placeholder="08xxxxxxxxxx" />
              {errors.requesterWhatsapp && <p className="text-sm text-destructive mt-1">{errors.requesterWhatsapp}</p>}
            </div>

            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
              {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline}</p>}
            </div>

            <div>
              <Label>Urgensi</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v as FormState["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Mengirim..." : "Kirim Permintaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Register the lazy import in `App.tsx`**

Find the lazy import for `PublicMarketingKit` (or any nearby public page import) and add directly after it:

```typescript
const DesignRequest = lazy(() => import("./pages/DesignRequest"));
```

- [ ] **Step 3: Register the route in `App.tsx`**

Find:

```tsx
<Route path="/packages" element={<PublicMarketingKit />} />
```

Add directly after it:

```tsx
<Route path="/permintaan-desain" element={<DesignRequest />} />
```

(No changes needed to `ConditionalFloatingWhatsApp`/`TikTokPixelTracker`/`MarketingPixelsLoader` — unlike `/flyer-print`, this is a normal page real visitors see; the floating WhatsApp button and marketing pixels are fine here, same as every other public page.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Browser verification**

Start the dev server, navigate to `/permintaan-desain`.
Expected: form renders (no admin nav, no login prompt), all fields present, changing the Kategori dropdown updates the Ukuran/Penempatan placeholder hint. Submitting with empty required fields shows inline validation errors and does not call `/design-request`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DesignRequest.tsx src/App.tsx
git commit -m "feat: add public design request form page"
```

---

### Task 5: End-to-end verification (user-executed checkpoint)

**Files:** none (verification only)

- [ ] **Step 1: Set up the Notion integration (user action, cannot be done by an agent)**

In Notion: Settings → Connections → Develop or manage integrations → New integration. Name it (e.g. "Musafar Design Requests"), copy its Internal Integration Secret. Then open the "Tasks" database, click "..." → Connections → add the new integration so it can create pages there.

- [ ] **Step 2: Configure Cloudflare Pages environment variables**

In the Cloudflare Pages dashboard (or `wrangler.toml` if this project manages env vars there — check `wrangler.toml` from this project's history first): set `NOTION_API_KEY` to the integration secret from Step 1, and `NOTION_TASKS_DATABASE_ID` to `2b0dd69e-0003-81ba-b8e8-fdd1c0b67c0f`.

**If page creation fails with a 404/"could not find database" error during Step 3 below**, the id format is the likely culprit (Notion's newer multi-source database API can require the `collection://2b0dd69e-0003-81bc-8f43-000b08f12634` data-source id instead of the database id used here) — try setting `NOTION_TASKS_DATABASE_ID` to `2b0dd69e-0003-81bc-8f43-000b08f12634` instead and retry. This can only be confirmed against the real API, which wasn't available during planning.

- [ ] **Step 3: Submit a real test request**

Deploy (or run via `wrangler pages dev --remote`, matching the pattern established for `/flyer-image` earlier in this project's history), then submit a real request through `/permintaan-desain` including one file attachment.

Expected: the form shows the "Permintaan terkirim" success screen, and a new page appears in the Notion "Tasks" database with: Task name prefixed with the chosen category, Client = Musafar, Priority/Due matching what was submitted, Status = Not Started, and a page body containing the full brief plus a working link to the uploaded file.

- [ ] **Step 4: Confirm rate limiting and honeypot don't block real users**

Submit 3 requests in quick succession (should all succeed), then a 4th within the same 10-minute window (should be rejected with a 429 and a clear error toast). Confirm the hidden honeypot field is not visible or focusable when tabbing through the form.
