import { getSupabaseConfig, type Env } from "./env";
import { escapeHtml, jsonForScript, truncateDescription } from "./render";

/**
 * Server-side <head> for the single-page app.
 *
 * The SPA shell has one generic <title>/description for every URL. Browsers fix that with react-helmet-async, but
 * crawlers that do not run JavaScript, and link previews (WhatsApp, Facebook, Telegram, iMessage), only read the HTML.
 * This writes the page's own title, description, canonical, Open Graph / Twitter tags and (for packages) JSON-LD into the
 * response. Every tag carries data-rh="true", so react-helmet-async takes it over on the client instead of duplicating it.
 *
 * KEEP IN SYNC with the <SEO> props of the pages listed in STATIC (same title and description strings).
 */

const SITE = "https://musafartour.com";

export interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object;
}

const STATIC: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Musafar Tour - Paket Umroh Terpercaya 2026",
    description:
      "Paket umroh dari PT Musa Amanah Wisata, berizin resmi PPIU Kemenag. Lihat jadwal, harga, dan hotel tiap paket. DP Rp 5 juta, cicilan bebas, lunas H-30.",
  },
  "/paket-umroh": {
    title: "Paket Umroh 2026: Hemat sampai Five Star - Musafar Tour",
    description:
      "Pilih paket umroh 9 dan 12 hari, dari hemat hingga five star, berangkat setiap bulan. Berizin resmi Kemenag, DP Rp 5 juta, cicilan bebas.",
  },
  "/jadwal-umroh": {
    title: "Jadwal Keberangkatan Umroh 2026 - Musafar Tour",
    description:
      "Jadwal keberangkatan umroh Musafar Tour terbaru: tanggal, maskapai, dan sisa seat setiap rombongan. Berangkat setiap bulan dengan kuota terbatas.",
  },
  "/tentang-kami": {
    title: "Tentang Kami - Musafar Tour | Travel Umroh Ramah Keluarga",
    description:
      "Musafar Tour adalah travel umroh terpercaya, berizin resmi PPIU Kemenag, yang dirancang khusus untuk keluarga - ramah lansia dan ramah anak.",
  },
  "/galeri": {
    title: "Galeri Jamaah - Dokumentasi Perjalanan Spiritual | Musafar Tour",
    description: "Lihat dokumentasi perjalanan spiritual dan momen berharga jamaah Musafar Tour di Tanah Suci dan destinasi wisata halal lainnya.",
  },
  "/kontak": {
    title: "Kontak Kami - Musafar Tour | Hubungi Tim Musamin",
    description: "Hubungi Musafar Tour untuk konsultasi gratis tentang paket umroh dan wisata halal. WhatsApp: 0819-1740-3797. Kantor di Bekasi, buka Senin-Sabtu.",
  },
};

export async function staticHeadMeta(env: Env, path: string): Promise<HeadMeta | null> {
  const m = STATIC[path];
  if (!m) return null;
  const meta: HeadMeta = { ...m, canonical: path === "/" ? `${SITE}/` : `${SITE}${path}` };
  if (path === "/") {
    // The home page's title and description are edited in the admin (page_seo), same source as the client.
    try {
      const { url, anonKey } = getSupabaseConfig(env);
      const res = await fetch(`${url}/rest/v1/page_seo?select=meta_title,meta_description,canonical_url,og_image&page_path=eq./&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cf: { cacheTtl: 300, cacheEverything: true },
      } as RequestInit);
      if (res.ok) {
        const row = ((await res.json()) as { meta_title: string | null; meta_description: string | null; canonical_url: string | null; og_image: string | null }[])[0];
        if (row?.meta_title) meta.title = row.meta_title;
        if (row?.meta_description) meta.description = row.meta_description;
        if (row?.canonical_url) meta.canonical = row.canonical_url;
        if (row?.og_image) meta.image = row.og_image;
      }
    } catch {
      /* keep the defaults */
    }
  }
  return meta;
}

interface PkgRow {
  slug: string;
  package_name: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  banner_image: string | null;
  gallery_images: string[] | null;
  canonical_url: string | null;
  departure_date: string;
  duration_days: number;
  is_sold_out: boolean | null;
  available_tiers: string[] | null;
  package_price: { quad?: number } | null;
  hemat_package_price: { quad?: number } | null;
  pelataran_package_price: { quad?: number } | null;
  five_star_package_price: { quad?: number } | null;
}

const COLUMNS =
  "slug,package_name,meta_title,meta_description,og_image,banner_image,gallery_images,canonical_url,departure_date,duration_days,is_sold_out,available_tiers,package_price,hemat_package_price,pelataran_package_price,five_star_package_price";

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d.slice(0, 10) + "T00:00:00Z"));
const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

/** Same transform the client uses for share images (Supabase image render, 1200 px). */
function optimizedImage(url: string, width = 1200): string {
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  return `${url.slice(0, i)}/storage/v1/render/image/public/${url.slice(i + marker.length)}?width=${width}&resize=contain&quality=75`;
}

export async function packageHeadMeta(env: Env, slug: string): Promise<HeadMeta | null> {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  try {
    const { url, anonKey } = getSupabaseConfig(env);
    const res = await fetch(`${url}/rest/v1/packages?select=${COLUMNS}&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) return null;
    const p = ((await res.json()) as PkgRow[])[0];
    if (!p) return null;

    const tier = p.available_tiers?.[0] || "nyaman";
    const byTier =
      tier === "hemat" ? p.hemat_package_price : tier === "five-star" ? p.five_star_package_price : tier.startsWith("pelataran") ? p.pelataran_package_price : p.package_price;
    const quad = byTier?.quad || p.package_price?.quad || p.hemat_package_price?.quad || p.five_star_package_price?.quad || 0;

    const displayName = /^umroh\b/i.test(p.package_name) ? p.package_name : `Umroh ${p.package_name}`;
    const date = fmtDate(p.departure_date);
    const title = p.meta_title || `Paket ${displayName} ${date} - Musafar Tour`;
    const description = truncateDescription(
      p.meta_description ||
        `Daftar Paket ${displayName} bersama Musafar Tour. Berangkat ${date}, durasi ${p.duration_days} hari${quad ? `, mulai ${rupiah(quad)}/orang` : ""}.`
    );
    const canonical = p.canonical_url || `${SITE}/paket-umroh/${p.slug}`;
    const share = p.og_image || p.banner_image || p.gallery_images?.[0];
    const image = share ? optimizedImage(share) : undefined;
    const departed = p.departure_date.slice(0, 10) < new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          name: `Paket ${displayName}`,
          description,
          image,
          url: canonical,
          brand: { "@type": "Brand", name: "Musafar Tour" },
          offers: quad
            ? {
                "@type": "Offer",
                priceCurrency: "IDR",
                price: quad,
                url: canonical,
                availability: p.is_sold_out || departed ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
              }
            : undefined,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: `${SITE}/` },
            { "@type": "ListItem", position: 2, name: "Paket Umroh", item: `${SITE}/paket-umroh` },
            { "@type": "ListItem", position: 3, name: p.package_name, item: canonical },
          ],
        },
      ],
    };
    return { title, description, canonical, image, noindex: departed, jsonLd };
  } catch {
    return null;
  }
}

/** Rewrites the SPA shell's <head> with this page's own tags. Streaming; the body is untouched. */
export function applyHead(response: Response, meta: HeadMeta): Response {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const c = escapeHtml(meta.canonical);
  const img = meta.image ? escapeHtml(meta.image) : "";
  const tags = [
    `<meta name="description" content="${d}" data-rh="true" />`,
    meta.noindex ? `<meta name="robots" content="noindex, nofollow" data-rh="true" />` : "",
    `<link rel="canonical" href="${c}" data-rh="true" />`,
    `<meta property="og:url" content="${c}" data-rh="true" />`,
    `<meta property="og:title" content="${t}" data-rh="true" />`,
    `<meta property="og:description" content="${d}" data-rh="true" />`,
    img ? `<meta property="og:image" content="${img}" data-rh="true" />` : "",
    `<meta name="twitter:card" content="summary_large_image" data-rh="true" />`,
    `<meta name="twitter:title" content="${t}" data-rh="true" />`,
    `<meta name="twitter:description" content="${d}" data-rh="true" />`,
    img ? `<meta name="twitter:image" content="${img}" data-rh="true" />` : "",
    meta.jsonLd ? `<script type="application/ld+json" data-rh="true">${jsonForScript(meta.jsonLd)}</script>` : "",
  ].join("");

  return new HTMLRewriter()
    .on("title", { element: (el) => void el.setInnerContent(meta.title) })
    .on("head", { element: (el) => void el.append(tags, { html: true }) })
    .transform(response);
}
