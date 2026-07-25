export interface Topic {
  id: string;
  topic: string;
  kind: "evergreen" | "trending";
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  meta_description: string;
  excerpt: string;
  body_html: string;
  tags: string[];
  category: string;
}

export interface QaFailure {
  rule: string;
  detail: string;
}

export interface QaResult {
  passed: boolean;
  failures: QaFailure[];
}

export interface Config {
  supabaseUrl: string;
  supabaseServiceKey: string;
  anthropicApiKey: string;
  model: string;
  articlesPerDay: number;
  maxTrendingPerDay: number;
  qaMinWords: number;
  publishStatus: "dry-run" | "draft" | "publish";
}

export interface TopicRunDetail {
  topic: string;
  kind: "evergreen" | "trending";
  outcome: "published" | "skipped" | "dry-run-passed" | "dry-run-failed";
  regenerated: boolean;
  reasons?: string[];
  title?: string;
  slug?: string;
  word_count?: number;
}
