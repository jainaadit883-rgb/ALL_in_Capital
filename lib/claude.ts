import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return client;
}

export async function ask(prompt: string, systemPrompt?: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function askJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: (systemPrompt || "") + "\n\nRespond ONLY with valid JSON. No markdown fences, no explanation.",
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
