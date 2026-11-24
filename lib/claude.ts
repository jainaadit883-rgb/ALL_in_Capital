import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function ask(prompt: string, systemPrompt?: string): Promise<string> {
  const c = getClient();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  const response = await c.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export async function askJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const fullSystem = (systemPrompt || "") + "\n\nRespond ONLY with valid JSON. No markdown fences, no explanation.";
  const raw = await ask(prompt, fullSystem);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
