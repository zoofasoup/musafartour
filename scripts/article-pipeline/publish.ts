import type { SupabaseClient } from "@supabase/supabase-js";
import type { Config, GeneratedArticle, Topic } from "./types";

export async function publishArticle(
  supabase: SupabaseClient,
  config: Config,
  topic: Topic,
  article: GeneratedArticle,
  runId: string
): Promise<void> {
  if (config.publishStatus === "dry-run") {
    return;
  }

  const status = config.publishStatus === "publish" ? "published" : "draft";
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("articles")
    .insert({
      title: article.title,
      slug: article.slug,
      content: article.body_html,
      excerpt: article.excerpt,
      category: article.category,
      tags: article.tags,
      meta_title: article.title,
      meta_description: article.meta_description,
      status,
      author_name: "Tim Musafar Tour",
      is_ai_generated: true,
      pipeline_run_id: runId,
      published_at: status === "published" ? now : null,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  const { error: topicError } = await supabase
    .from("article_pipeline_topics")
    .update({ status: "published", article_id: inserted.id })
    .eq("id", topic.id);

  if (topicError) throw topicError;
}

export async function skipTopic(supabase: SupabaseClient, topic: Topic, reason: string): Promise<void> {
  const { error } = await supabase
    .from("article_pipeline_topics")
    .update({ status: "skipped", skip_reason: reason })
    .eq("id", topic.id);
  if (error) throw error;
}
