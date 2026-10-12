import { fetchAllPublishedSlugs, fetchUpcomingPackageSlugs } from "./_lib/data";
import type { Env } from "./_lib/env";

const STATIC_URLS: { loc: string }[] = [
  { loc: "https://musafartour.com/" },
  { loc: "https://musafartour.com/paket-umroh" },
  { loc: "https://musafartour.com/jadwal-umroh" },
  { loc: "https://musafartour.com/kalkulator" },
  { loc: "https://musafartour.com/cara-bayar" },
  { loc: "https://musafartour.com/jadi-agen" },
  { loc: "https://musafartour.com/sop-agen" },
  { loc: "https://musafartour.com/tentang-kami" },
  { loc: "https://musafartour.com/galeri" },
  { loc: "https://musafartour.com/kontak" },
  { loc: "https://musafartour.com/artikel" },
  { loc: "https://musafartour.com/kebijakan-privasi" },
  { loc: "https://musafartour.com/syarat-ketentuan" },
  { loc: "https://musafartour.com/syarat-umroh" },
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const [articles, packages] = await Promise.all([
    fetchAllPublishedSlugs(context.env),
    fetchUpcomingPackageSlugs(context.env),
  ]);

  // changefreq and priority are ignored by Google, so they are not written. lastmod only where we really know it.
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const packageEntries = packages.map(
    (p) =>
      `  <url>\n    <loc>https://musafartour.com/paket-umroh/${encodeURIComponent(p.slug)}</loc>${
        p.updated_at ? `\n    <lastmod>${p.updated_at.slice(0, 10)}</lastmod>` : ""
      }${p.banner_image ? `\n    <image:image><image:loc>${esc(p.banner_image)}</image:loc></image:image>` : ""}\n  </url>`
  );

  const staticEntries = STATIC_URLS.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n  </url>`);

  const articleEntries = articles.map(
    (a) => `  <url>\n    <loc>https://musafartour.com/artikel/${encodeURIComponent(a.slug)}</loc>\n    <lastmod>${a.created_at.slice(0, 10)}</lastmod>\n  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${[...staticEntries, ...packageEntries, ...articleEntries].join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
