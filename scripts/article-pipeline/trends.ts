const UMROH_KEYWORDS = ["umroh", "umrah", "haji", "kabah", "ka'bah", "mekkah", "makkah", "madinah", "ihram", "ziarah", "nusuk"];

/**
 * Best-effort trending umroh topic from Google Trends' Indonesia daily RSS feed.
 * No official API exists for this, so any failure (network, format change, no
 * relevant match) is swallowed and simply yields no trending topic for the day.
 */
export async function fetchTrendingUmrohTopic(): Promise<string | null> {
  try {
    const res = await fetch("https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
      .map((m) => m[1].trim())
      .filter((t) => t && t.toLowerCase() !== "daily search trends");

    const match = titles.find((t) => {
      const lower = t.toLowerCase();
      return UMROH_KEYWORDS.some((kw) => lower.includes(kw));
    });

    return match || null;
  } catch {
    return null;
  }
}
