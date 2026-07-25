import Anthropic from "@anthropic-ai/sdk";
import { loadConfig } from "./config";
import { createServiceClient } from "./supabaseClient";
import { selectTopicsForRun } from "./topics";
import { generateArticle } from "./generate";
import { runQaGate } from "./qa";
import { publishArticle, skipTopic } from "./publish";
import type { TopicRunDetail } from "./types";

async function main() {
  const config = loadConfig();
  const supabase = createServiceClient(config);
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

  console.log(`[article-pipeline] Starting run. publishStatus=${config.publishStatus} articlesPerDay=${config.articlesPerDay}`);

  const { data: run, error: runError } = await supabase
    .from("article_pipeline_runs")
    .insert({ publish_status: config.publishStatus })
    .select("id")
    .single();
  if (runError || !run) throw runError || new Error("Failed to create run record");
  const runId = run.id as string;

  const details: TopicRunDetail[] = [];
  let published = 0;
  let skipped = 0;
  let regenerations = 0;
  let trendingUsed = false;

  try {
    const selection = await selectTopicsForRun(supabase, config);
    trendingUsed = selection.trendingUsed;
    const topics = selection.topics;

    console.log(`[article-pipeline] Selected ${topics.length} topic(s), trendingUsed=${trendingUsed}`);

    const { data: existingArticles } = await supabase
      .from("articles")
      .select("title, slug")
      .limit(2000);
    const knownArticles = (existingArticles || []).map((a) => ({ title: a.title as string, slug: a.slug as string }));

    for (const topic of topics) {
      console.log(`[article-pipeline] Generating: "${topic.topic}" (${topic.kind})`);
      let regenerated = false;

      try {
        let article = await generateArticle(anthropic, config, topic.topic);
        let qa = runQaGate(article, config, knownArticles);

        if (!qa.passed) {
          console.log(`[article-pipeline] QA failed (attempt 1): ${qa.failures.map((f) => f.detail).join(" | ")}`);
          regenerated = true;
          regenerations++;
          article = await generateArticle(
            anthropic,
            config,
            topic.topic,
            qa.failures.map((f) => f.detail)
          );
          qa = runQaGate(article, config, knownArticles);
        }

        if (!qa.passed) {
          const reasons = qa.failures.map((f) => f.detail);
          console.log(`[article-pipeline] QA failed (attempt 2), skipping: ${reasons.join(" | ")}`);
          await skipTopic(supabase, topic, reasons.join("; "));
          skipped++;
          details.push({ topic: topic.topic, kind: topic.kind, outcome: "skipped", regenerated, reasons });
          continue;
        }

        knownArticles.push({ title: article.title, slug: article.slug });

        if (config.publishStatus === "dry-run") {
          console.log(`[article-pipeline] [dry-run] Passed QA: "${article.title}" (${article.slug})`);
          details.push({
            topic: topic.topic,
            kind: topic.kind,
            outcome: "dry-run-passed",
            regenerated,
            title: article.title,
            slug: article.slug,
          });
        } else {
          await publishArticle(supabase, config, topic, article, runId);
          published++;
          console.log(`[article-pipeline] Published (${config.publishStatus}): "${article.title}" (${article.slug})`);
          details.push({
            topic: topic.topic,
            kind: topic.kind,
            outcome: "published",
            regenerated,
            title: article.title,
            slug: article.slug,
          });
        }
      } catch (topicErr) {
        const reason = topicErr instanceof Error ? topicErr.message : String(topicErr);
        console.error(`[article-pipeline] Error on topic "${topic.topic}": ${reason}`);
        await skipTopic(supabase, topic, `Error: ${reason}`);
        skipped++;
        details.push({ topic: topic.topic, kind: topic.kind, outcome: "skipped", regenerated, reasons: [reason] });
      }
    }

    await supabase
      .from("article_pipeline_runs")
      .update({
        topics_attempted: topics.length,
        articles_published: published,
        articles_skipped: skipped,
        regenerations,
        trending_used: trendingUsed,
        details,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    console.log(
      `[article-pipeline] Run complete. attempted=${topics.length} published=${published} skipped=${skipped} regenerations=${regenerations}`
    );
  } catch (fatalErr) {
    const message = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    console.error(`[article-pipeline] Fatal error: ${message}`);
    await supabase
      .from("article_pipeline_runs")
      .update({ error: message, details, finished_at: new Date().toISOString() })
      .eq("id", runId);
    process.exitCode = 1;
  }
}

main();
