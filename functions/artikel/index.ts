import { fetchMarketingPixels, fetchPublishedArticles, fetchWebsiteSettings } from "../_lib/data";
import { escapeHtml, formatDateId, renderShell } from "../_lib/render";
import type { Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const [articles, settings, pixels] = await Promise.all([
    fetchPublishedArticles(context.env, 30),
    fetchWebsiteSettings(context.env),
    fetchMarketingPixels(context.env),
  ]);

  const bodyContent = `
<div class="breadcrumb"><a href="/">Beranda</a> / Artikel</div>
<h1>Artikel &amp; Tips Umroh</h1>
<p class="excerpt" style="border-bottom:none;padding-bottom:0">Panduan, tips, dan informasi praktis seputar perjalanan umroh dan haji.</p>
<div class="card-list" style="margin-top:24px">
${articles
  .map(
    (a) => `<a class="card" href="/artikel/${escapeHtml(a.slug)}">
  <h2>${escapeHtml(a.title)}</h2>
  <p>${escapeHtml(a.excerpt || "")}</p>
  <p style="margin-top:8px;font-size:12px">${formatDateId(a.created_at)}</p>
</a>`
  )
  .join("\n")}
</div>
${articles.length === 0 ? "<p>Belum ada artikel tersedia.</p>" : ""}`;

  const html = renderShell({
    title: "Artikel & Tips Umroh - Musafar Tour",
    description: "Panduan, tips, dan informasi bermanfaat seputar perjalanan umroh dan haji dari tim Musafar Tour.",
    canonical: "https://musafartour.com/artikel",
    ogImage: "https://musafartour.com/og-default.jpg",
    bodyContent,
    settings,
    pixels,
  });

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600" },
  });
};
