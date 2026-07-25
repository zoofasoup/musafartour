import Anthropic from "@anthropic-ai/sdk";
import type { Config, GeneratedArticle } from "./types";
import { ARTICLE_TOOL, SYSTEM_PROMPT, buildRegenerationPrompt, buildUserPrompt } from "./systemPrompt";

function extractArticle(message: Anthropic.Message): GeneratedArticle {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "submit_article"
  );
  if (!toolUse) {
    throw new Error("Model did not call submit_article");
  }
  return toolUse.input as GeneratedArticle;
}

export async function generateArticle(
  client: Anthropic,
  config: Config,
  topic: string,
  previousFailures?: string[]
): Promise<GeneratedArticle> {
  const userPrompt = previousFailures?.length
    ? buildRegenerationPrompt(topic, previousFailures)
    : buildUserPrompt(topic);

  const message = await client.messages.create({
    model: config.model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [ARTICLE_TOOL],
    tool_choice: { type: "tool", name: "submit_article" },
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractArticle(message);
}
