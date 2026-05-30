import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODEL = "claude-3-5-haiku-latest";

export interface AiCallResult {
  text: string;
  tokensUsed: number;
  latencyMs: number;
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<AiCallResult> {
  const start = Date.now();

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const latencyMs = Date.now() - start;
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const tokensUsed =
    response.usage.input_tokens + response.usage.output_tokens;

  return { text, tokensUsed, latencyMs };
}

export async function callAIJson<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const result = await callAI(
    systemPrompt + "\n\nBALAS HANYA DENGAN JSON VALID. Tidak ada teks lain.",
    userPrompt,
    1024
  );

  const clean = result.text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as T;
}
