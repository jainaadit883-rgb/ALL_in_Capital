import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-3.8-flash"];

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return client;
}

async function tryGenerate(prompt: string, systemInstruction: string, json: boolean): Promise<string> {
  let lastError: Error | null = null;
  for (const modelName of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = getClient().getGenerativeModel({
          model: modelName,
          systemInstruction,
          ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (e: unknown) {
        const msg = String(e);
        lastError = e as Error;
        if (msg.includes("503") || msg.includes("high demand")) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        // 404 = model not available, try next model
        break;
      }
    }
  }
  throw lastError ?? new Error("All Gemini models failed");
}

export async function ask(prompt: string, systemPrompt?: string): Promise<string> {
  return tryGenerate(prompt, systemPrompt || "", false);
}

export async function askJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const system = (systemPrompt || "") + "\n\nRespond ONLY with valid JSON. No markdown fences, no explanation.";
  const raw = await tryGenerate(prompt, system, true);
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
