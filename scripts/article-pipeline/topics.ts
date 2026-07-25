import type { SupabaseClient } from "@supabase/supabase-js";
import type { Config, Topic } from "./types";
import { fetchTrendingUmrohTopic } from "./trends";

export async function selectTopicsForRun(
  supabase: SupabaseClient,
  config: Config
): Promise<{ topics: Topic[]; trendingUsed: boolean }> {
  let trendingUsed = false;
  const selected: Topic[] = [];

  if (config.maxTrendingPerDay > 0) {
    const trendingTopic = await fetchTrendingUmrohTopic();
    if (trendingTopic) {
      const { data: existing } = await supabase
        .from("article_pipeline_topics")
        .select("id")
        .eq("topic", trendingTopic)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from("article_pipeline_topics")
          .insert({ topic: trendingTopic, kind: "trending" })
          .select("id, topic, kind")
          .single();
        if (!error && inserted) {
          selected.push(inserted as Topic);
          trendingUsed = true;
        }
      }
    }
  }

  const evergreenSlots = config.articlesPerDay - selected.length;
  if (evergreenSlots > 0) {
    const { data: evergreen, error } = await supabase
      .from("article_pipeline_topics")
      .select("id, topic, kind")
      .eq("status", "pending")
      .eq("kind", "evergreen")
      .order("created_at", { ascending: true })
      .limit(evergreenSlots);

    if (error) throw error;
    selected.push(...((evergreen || []) as Topic[]));
  }

  return { topics: selected, trendingUsed };
}
