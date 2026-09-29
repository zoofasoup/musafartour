import { getSupabaseConfig, type Env } from "./env";

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  meta_description: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface MarketingPixels {
  meta_pixel_id?: string | null;
  meta_pixel_enabled?: boolean | null;
  tiktok_pixel_id?: string | null;
  tiktok_pixel_enabled?: boolean | null;
  ga4_id?: string | null;
  ga4_enabled?: boolean | null;
}

export interface WebsiteSettings {
  site_name: string;
  whatsapp_number: string;
  phone_number: string;
  address: string | null;
  ppiu_license_number?: string | null;
}

const ARTICLE_FIELDS =
  "id,title,slug,content,excerpt,featured_image,category,tags,meta_description,author_name,created_at,updated_at";
// Computed per request: a module-level constant froze "now" at isolate start, so
// scheduled articles stayed hidden until the worker happened to restart.
const publishedFilter = () =>
  "status=eq.published&or=(publish_at.is.null,publish_at.lte." + encodeURIComponent(new Date().toISOString()) + ")";

async function restFetch(env: Env, path: string): Promise<Response> {
  const { url, anonKey } = getSupabaseConfig(env);
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    cf: { cacheTtl: 300, cacheEverything: true },
  } as RequestInit);
}

export async function fetchArticleBySlug(env: Env, slug: string): Promise<Article | null> {
  const res = await restFetch(
    env,
    `articles?select=${ARTICLE_FIELDS}&slug=eq.${encodeURIComponent(slug)}&${publishedFilter()}&limit=1`
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Article[];
  return rows[0] || null;
}

export async function fetchPublishedArticles(env: Env, limit = 30): Promise<Article[]> {
  const res = await restFetch(
    env,
    `articles?select=${ARTICLE_FIELDS}&${publishedFilter()}&order=created_at.desc&limit=${limit}`
  );
  if (!res.ok) return [];
  return (await res.json()) as Article[];
}

export async function fetchAllPublishedSlugs(env: Env): Promise<{ slug: string; created_at: string }[]> {
  const res = await restFetch(env, `articles?select=slug,created_at&${publishedFilter()}&order=created_at.desc&limit=5000`);
  if (!res.ok) return [];
  return (await res.json()) as { slug: string; created_at: string }[];
}

/** Published packages that haven't departed yet (departed ones stay reachable but aren't advertised). */
export async function fetchUpcomingPackageSlugs(env: Env): Promise<{ slug: string; updated_at: string | null }[]> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const res = await restFetch(
    env,
    `packages?select=slug,updated_at&status=eq.published&slug=not.is.null&departure_date=gte.${today}&order=departure_date.asc&limit=1000`
  );
  if (!res.ok) return [];
  return (await res.json()) as { slug: string; updated_at: string | null }[];
}

/** Same pixel config the SPA loads, so server-rendered article pages are tracked too. */
export async function fetchMarketingPixels(env: Env): Promise<MarketingPixels> {
  try {
    const { url, anonKey } = getSupabaseConfig(env);
    const res = await fetch(`${url}/functions/v1/get-marketing-pixels`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) return {};
    return ((await res.json()) as MarketingPixels) || {};
  } catch {
    return {};
  }
}

export async function fetchWebsiteSettings(env: Env): Promise<WebsiteSettings | null> {
  const res = await restFetch(env, "website_settings?select=site_name,whatsapp_number,phone_number,address,ppiu_license_number&limit=1");
  if (!res.ok) return null;
  const rows = (await res.json()) as WebsiteSettings[];
  return rows[0] || null;
}
