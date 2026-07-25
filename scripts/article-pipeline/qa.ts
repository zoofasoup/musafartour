import type { Config, GeneratedArticle, QaFailure, QaResult } from "./types";

const BANNED_WORDS = ["menyelami", "mengarungi", "ranah", "permadani"];
const CLOSING_BOILERPLATE = ["semoga bermanfaat", "jangan ragu"];
const FATWA_PHRASES = [
  "hukumnya wajib",
  "wajib hukumnya",
  "itu haram",
  "adalah haram",
  "adalah wajib",
  "hukumnya haram",
  "haram hukumnya",
];
const PRICE_PATTERNS = [/\brp\.?\s?[\d.,]+/i, /\bidr\s?[\d.,]+/i, /\busd\s?[\d.,]+/i, /\$\s?[\d.,]+/];

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function firstParagraphRepeatsTitle(bodyHtml: string, title: string): boolean {
  const firstParaMatch = bodyHtml.match(/<p>(.*?)<\/p>/is);
  if (!firstParaMatch) return false;
  const firstPara = stripHtml(firstParaMatch[1]).toLowerCase();
  const tWords = titleWords(title);
  if (tWords.size === 0) return false;
  let overlap = 0;
  for (const w of tWords) {
    if (firstPara.includes(w)) overlap++;
  }
  return overlap / tWords.size >= 0.7;
}

function normalizedSlugOrTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const aWords = new Set(normalizedSlugOrTitle(a).split(" ").filter(Boolean));
  const bWords = new Set(normalizedSlugOrTitle(b).split(" ").filter(Boolean));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let intersection = 0;
  for (const w of aWords) if (bWords.has(w)) intersection++;
  const union = new Set([...aWords, ...bWords]).size;
  return intersection / union;
}

export function runQaGate(
  article: GeneratedArticle,
  config: Config,
  existingTitlesAndSlugs: { title: string; slug: string }[]
): QaResult {
  const failures: QaFailure[] = [];
  const plainText = stripHtml(article.body_html);
  const wc = wordCount(plainText);

  if (wc < config.qaMinWords) {
    failures.push({ rule: "word_count", detail: `Hanya ${wc} kata, minimal ${config.qaMinWords}.` });
  }

  for (const existing of existingTitlesAndSlugs) {
    if (existing.slug === article.slug) {
      failures.push({ rule: "duplicate", detail: `Slug sudah dipakai: ${article.slug}` });
      break;
    }
    if (similarity(existing.title, article.title) >= 0.6) {
      failures.push({ rule: "duplicate", detail: `Judul terlalu mirip dengan artikel yang sudah ada: "${existing.title}"` });
      break;
    }
  }

  if (article.body_html.includes("—")) {
    failures.push({ rule: "ai_tell", detail: "Mengandung em dash (—)." });
  }

  const lowerBody = article.body_html.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerBody.includes(word)) {
      failures.push({ rule: "ai_tell", detail: `Mengandung kata terlarang: "${word}".` });
    }
  }
  if (/bukan sekadar/i.test(article.body_html)) {
    failures.push({ rule: "ai_tell", detail: 'Mengandung pola "bukan sekadar X, tapi Y".' });
  }
  for (const phrase of CLOSING_BOILERPLATE) {
    if (lowerBody.includes(phrase)) {
      failures.push({ rule: "ai_tell", detail: `Mengandung penutup basa-basi: "${phrase}".` });
    }
  }
  if (firstParagraphRepeatsTitle(article.body_html, article.title)) {
    failures.push({ rule: "ai_tell", detail: "Paragraf pembuka mengulang judul secara harfiah." });
  }

  for (const phrase of FATWA_PHRASES) {
    if (lowerBody.includes(phrase)) {
      failures.push({ rule: "fatwa", detail: `Menyatakan hukum fiqh sebagai fakta mutlak: "${phrase}".` });
    }
  }
  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(article.body_html)) {
      failures.push({ rule: "price", detail: "Menyebutkan harga atau nominal spesifik." });
      break;
    }
  }

  const subheadingCount = (article.body_html.match(/<h[23][ >]/gi) || []).length;
  if (subheadingCount < 2) {
    failures.push({ rule: "subheadings", detail: `Hanya ${subheadingCount} subjudul H2/H3, minimal 2.` });
  }

  const metaLen = article.meta_description.length;
  if (metaLen < 140 || metaLen > 155) {
    failures.push({ rule: "meta_length", detail: `Meta description ${metaLen} karakter, harus 140-155.` });
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(article.slug)) {
    failures.push({ rule: "slug_format", detail: `Slug tidak valid: "${article.slug}".` });
  }

  return { passed: failures.length === 0, failures };
}
