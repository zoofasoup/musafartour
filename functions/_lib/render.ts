import type { WebsiteSettings } from "./data";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Article bodies come from admin CMS input or the QA-gated AI pipeline, not
 * public submissions, but this still strips script/style/event-handler
 * vectors as defense in depth before serving raw HTML server-side (no
 * DOMPurify+DOM available in the Workers runtime).
 */
export function sanitizeBodyHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");
}

export function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const BRAND = {
  bg: "#f7f4ee",
  fg: "#1f1f1f",
  muted: "#6b6b6b",
  accent: "#ffb300",
  border: "#e5e0d5",
};

export function renderShell(opts: {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object;
  bodyContent: string;
  settings: WebsiteSettings | null;
}): string {
  const { title, description, canonical, ogImage, jsonLd, bodyContent, settings } = opts;
  const waNumber = settings?.whatsapp_number || "6281917403797";
  const siteName = settings?.site_name || "Musafar Tour";

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta name="author" content="${escapeHtml(siteName)}" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="id_ID" />
<meta property="og:site_name" content="${escapeHtml(siteName)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:${BRAND.bg};color:${BRAND.fg};font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;line-height:1.65}
  a{color:inherit}
  header.site{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid ${BRAND.border};background:#fff}
  header.site img{height:32px;width:auto}
  header.site nav a{margin-left:20px;font-size:14px;text-decoration:none;color:${BRAND.fg}}
  main{max-width:760px;margin:0 auto;padding:32px 20px 64px}
  .breadcrumb{font-size:13px;color:${BRAND.muted};margin-bottom:16px}
  .breadcrumb a{text-decoration:none;color:${BRAND.muted}}
  h1{font-family:Outfit,sans-serif;font-size:2rem;line-height:1.25;margin:0 0 12px}
  .meta{color:${BRAND.muted};font-size:14px;margin-bottom:24px}
  .excerpt{font-size:1.1rem;color:${BRAND.muted};font-style:italic;border-bottom:1px solid ${BRAND.border};padding-bottom:20px;margin-bottom:24px}
  article h2{font-family:Outfit,sans-serif;font-size:1.4rem;margin-top:2em}
  article h3{font-family:Outfit,sans-serif;font-size:1.15rem;margin-top:1.6em}
  article p{margin:1em 0}
  article img{max-width:100%;height:auto;border-radius:8px}
  .cta{margin-top:40px;padding:20px;background:#fff;border:1px solid ${BRAND.border};border-radius:12px;text-align:center}
  .cta a{display:inline-block;margin-top:10px;padding:10px 24px;background:${BRAND.accent};color:${BRAND.fg};border-radius:999px;text-decoration:none;font-weight:600}
  .card-list{display:grid;gap:16px}
  .card{border:1px solid ${BRAND.border};border-radius:12px;padding:16px;background:#fff;text-decoration:none;color:${BRAND.fg};display:block}
  .card h2{font-family:Outfit,sans-serif;font-size:1.1rem;margin:0 0 6px}
  .card p{color:${BRAND.muted};font-size:14px;margin:0}
  footer.site{border-top:1px solid ${BRAND.border};padding:24px;text-align:center;font-size:13px;color:${BRAND.muted}}
</style>
</head>
<body>
<header class="site">
  <a href="/"><img src="/logo.webp" alt="${escapeHtml(siteName)}" /></a>
  <nav>
    <a href="/paket-umroh">Paket Umroh</a>
    <a href="/artikel">Artikel</a>
    <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener">WhatsApp</a>
  </nav>
</header>
<main>
${bodyContent}
</main>
<footer class="site">
  &copy; ${new Date().getFullYear()} ${escapeHtml(siteName)}. <a href="/">Kembali ke musafartour.com</a>
</footer>
</body>
</html>`;
}
