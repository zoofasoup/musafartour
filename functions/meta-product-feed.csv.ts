import { getSupabaseConfig, type Env } from "./_lib/env";

interface PackageRow {
  id: string;
  slug: string | null;
  package_name: string;
  departure_date: string;
  duration_days: number;
  route: string | null;
  banner_image: string | null;
  meta_description: string | null;
  available_tiers: string[] | null;
  package_price: { quad: number; double: number; triple: number } | null;
  hemat_package_price: { quad: number; double: number; triple: number } | null;
  five_star_package_price: { quad: number; double: number; triple: number } | null;
  pelataran_package_price: { quad: number; double: number; triple: number } | null;
  slots_total: number | null;
  slots_filled: number | null;
  is_sold_out: boolean;
}

const PACKAGE_COLUMNS =
  "id,slug,package_name,departure_date,duration_days,route,banner_image,meta_description,available_tiers,package_price,hemat_package_price,five_star_package_price,pelataran_package_price,slots_total,slots_filled,is_sold_out";

/**
 * Lowest-tier ("quad") price for a package. Tier price data is split across
 * per-tier jsonb columns; only the column matching available_tiers[0] holds
 * real values - the base package_price column is only populated for the
 * "nyaman" tier. Mirrors getQuadPrice in src/lib/flyer/flyerData.ts (that
 * file lives under src/ and can't be imported from functions/, which has
 * its own tsconfig/build - kept in sync by hand, same as the rest of this
 * function's field mapping already duplicates src/hooks/usePackages.ts).
 */
function getQuadPrice(pkg: PackageRow): number {
  const tier = pkg.available_tiers?.[0] ?? "";
  if (tier === "hemat") return pkg.hemat_package_price?.quad ?? 0;
  if (tier === "five-star") return pkg.five_star_package_price?.quad ?? 0;
  if (tier.startsWith("pelataran")) return pkg.pelataran_package_price?.quad ?? 0;
  return pkg.package_price?.quad ?? 0;
}

function isAvailable(pkg: PackageRow): boolean {
  const total = pkg.slots_total ?? 0;
  const filled = pkg.slots_filled ?? 0;
  return !pkg.is_sold_out && filled < total;
}

/** RFC4180 CSV field escaping - wrap in quotes, double any internal quotes. */
function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDateId(iso: string): string {
  const date = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const CSV_HEADER = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { url, anonKey } = getSupabaseConfig(context.env);

  const res = await fetch(
    `${url}/rest/v1/packages?select=${PACKAGE_COLUMNS}&status=eq.published&order=departure_date.asc`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
  );

  if (!res.ok) {
    return new Response("Failed to fetch packages", { status: 502 });
  }

  const packages = (await res.json()) as PackageRow[];

  const rows = packages
    // A package with no slug has no landing page to link to, and one with
    // no banner image or no resolvable price isn't a usable catalog listing
    // - skip rather than publish a broken product.
    .filter((pkg) => pkg.slug && pkg.banner_image && getQuadPrice(pkg) > 0)
    .map((pkg) => {
      // package_name alone isn't unique across departures (e.g. multiple
      // "Umroh Nyaman" entries on different dates) - the date makes each
      // catalog title distinguishable.
      const title = `${pkg.package_name} - ${formatDateId(pkg.departure_date)}`;
      const description =
        pkg.meta_description ||
        `Paket umroh ${pkg.duration_days} hari${pkg.route ? `, rute ${pkg.route}` : ""}, berangkat ${formatDateId(pkg.departure_date)}.`;
      const price = `${getQuadPrice(pkg)}.00 IDR`;
      const link = `https://musafartour.com/paket-umroh/${pkg.slug}`;

      return [
        csvField(pkg.id),
        csvField(title),
        csvField(description),
        csvField(isAvailable(pkg) ? "in stock" : "out of stock"),
        csvField("new"),
        csvField(price),
        csvField(link),
        csvField(pkg.banner_image as string),
        csvField("Musafar Tour"),
      ].join(",");
    });

  const csv = [CSV_HEADER.map(csvField).join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
