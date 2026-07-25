import type { Config } from "./types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parsePublishStatus(raw: string | undefined): Config["publishStatus"] {
  if (raw === "draft" || raw === "publish") return raw;
  return "dry-run";
}

export function loadConfig(): Config {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
    articlesPerDay: Number(process.env.ARTICLES_PER_DAY) || 1,
    maxTrendingPerDay: Number(process.env.MAX_TRENDING_PER_DAY) || 1,
    qaMinWords: Number(process.env.QA_MIN_WORDS) || 900,
    publishStatus: parsePublishStatus(process.env.PUBLISH_STATUS),
  };
}
