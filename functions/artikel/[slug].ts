import { fetchArticleBySlug, fetchMarketingPixels, fetchPublishedArticles, fetchWebsiteSettings } from "../_lib/data";
import { escapeHtml, formatDateId, renderShell, sanitizeBodyHtml, truncateDescription } from "../_lib/render";
import type { Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug as string;
  const [article, settings, pixels] = await Promise.all([
    fetchArticleBySlug(context.env, slug),
    fetchWebsiteSettings(context.env),
    fetchMarketingPixels(context.env),
  ]);

  if (!article) {
    return new Response("Artikel tidak ditemukan", { status: 404 });
  }

  const canonical = `https://musafartour.com/artikel/${article.slug}`;
  const description = truncateDescription(article.meta_description || article.excerpt || article.title);
  const siteName = settings?.site_name || "Musafar Tour";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description,
        image: article.featured_image || undefined,
        datePublished: article.created_at,
        dateModified: article.updated_at || article.created_at,
        author: { "@type": "Organization", name: article.author_name || "Tim Musafar Tour" },
        publisher: {
          "@type": "Organization",
          "@id": "https://musafartour.com/#organization",
          name: siteName,
          logo: { "@type": "ImageObject", url: "https://musafartour.com/logo.webp" },
        },
        mainEntityOfPage: canonical,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: "https://musafartour.com/" },
          { "@type": "ListItem", position: 2, name: "Artikel", item: "https://musafartour.com/artikel" },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical },
        ],
      },
    ],
  };

  const related = (await fetchPublishedArticles(context.env, 4))
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  const bodyContent = `
<div class="breadcrumb"><a href="/">Beranda</a> / <a href="/artikel">Artikel</a> / ${escapeHtml(article.title)}</div>
${article.category ? `<div class="meta">${escapeHtml(article.category)}</div>` : ""}
<h1>${escapeHtml(article.title)}</h1>
<div class="meta">Oleh ${escapeHtml(article.author_name || "Tim Musafar Tour")} &middot; ${formatDateId(article.created_at)}</div>
${article.featured_image ? `<img src="${escapeHtml(article.featured_image)}" alt="${escapeHtml(article.title)}" style="width:100%;border-radius:12px;margin-bottom:24px" />` : ""}
${article.excerpt ? `<div class="excerpt">${escapeHtml(article.excerpt)}</div>` : ""}
<article>${sanitizeBodyHtml(article.content)}</article>
<div class="cta">
  <p>Sedang mempertimbangkan umroh? Konsultasikan kebutuhan perjalanan Anda dengan tim Musafar Tour.</p>
  <a href="https://wa.me/${escapeHtml(settings?.whatsapp_number || "6281917403797")}" target="_blank" rel="noopener">Chat via WhatsApp</a>
</div>
${
  related.length
    ? `<div style="margin-top:48px">
<h2 style="font-size:1.2rem">Artikel Lainnya</h2>
<div class="card-list">
${related
  .map(
    (a) => `<a class="card" href="/artikel/${escapeHtml(a.slug)}"><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.excerpt || "")}</p></a>`
  )
  .join("\n")}
</div>
</div>`
    : ""
}`;

  const html = renderShell({
    title: `${article.title} - Musafar Tour`,
    description,
    canonical,
    ogImage: article.featured_image || undefined,
    jsonLd,
    bodyContent,
    settings,
    pixels,
  });

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600" },
  });
};
