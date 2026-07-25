import { fetchAllPublishedSlugs } from "./_lib/data";
import type { Env } from "./_lib/env";

const STATIC_URLS: { loc: string; changefreq: string; priority: string }[] = [
  { loc: "https://musafartour.com/", changefreq: "daily", priority: "1.0" },
  { loc: "https://musafartour.com/paket-umroh", changefreq: "daily", priority: "0.9" },
  { loc: "https://musafartour.com/wisata-halal", changefreq: "weekly", priority: "0.8" },
  { loc: "https://musafartour.com/haji-khusus", changefreq: "weekly", priority: "0.8" },
  { loc: "https://musafartour.com/tentang-kami", changefreq: "monthly", priority: "0.7" },
  { loc: "https://musafartour.com/galeri", changefreq: "weekly", priority: "0.6" },
  { loc: "https://musafartour.com/kontak", changefreq: "monthly", priority: "0.7" },
  { loc: "https://musafartour.com/artikel", changefreq: "weekly", priority: "0.8" },
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const articles = await fetchAllPublishedSlugs(context.env);

  const staticEntries = STATIC_URLS.map(
    (u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  );

  const articleEntries = articles.map(
    (a) =>
      `  <url>\n    <loc>https://musafartour.com/artikel/${a.slug}</loc>\n    <lastmod>${a.created_at.slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...articleEntries].join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
