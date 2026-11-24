import { v4 as uuidv4 } from "uuid";
import { askJson } from "./claude";
import { insertResearchResult, getResearchForApplication } from "./db";
import { Application, ResearchResult, ResearchSource } from "./types";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: true,
    }),
  });

  if (!res.ok) return [];
  const data: TavilyResponse = await res.json();
  return data.results || [];
}

export async function researchApplication(app: Application): Promise<ResearchResult> {
  const existing = getResearchForApplication(app.id) as ResearchResult | undefined;
  if (existing) return existing;

  // Run searches in parallel
  const [companyResults, founderResults, marketResults] = await Promise.all([
    tavilySearch(`${app.company_name} startup India funding news`),
    tavilySearch(`${app.founder_names} founder background LinkedIn`),
    tavilySearch(`${app.sector} market India 2024 2025 trends`),
  ]);

  const allSources: ResearchSource[] = [
    ...companyResults.map((r) => ({ url: r.url, title: r.title, snippet: r.content.slice(0, 300), relevance: "company" as const })),
    ...founderResults.map((r) => ({ url: r.url, title: r.title, snippet: r.content.slice(0, 300), relevance: "founder" as const })),
    ...marketResults.map((r) => ({ url: r.url, title: r.title, snippet: r.content.slice(0, 300), relevance: "market" as const })),
  ];

  const companySnippets = companyResults.map((r) => `[${r.url}] ${r.content.slice(0, 500)}`).join("\n\n");
  const founderSnippets = founderResults.map((r) => `[${r.url}] ${r.content.slice(0, 500)}`).join("\n\n");
  const marketSnippets = marketResults.map((r) => `[${r.url}] ${r.content.slice(0, 500)}`).join("\n\n");

  const synthesis = await askJson<{
    company_findings: string;
    founder_findings: string;
    market_findings: string;
    gaps: string[];
  }>(
    `You are researching a startup for an investment fund's triage process.

COMPANY: ${app.company_name}
SECTOR: ${app.sector}
FOUNDERS: ${app.founder_names}
WEBSITE: ${app.website}

COMPANY SEARCH RESULTS:
${companySnippets || "No results found."}

FOUNDER SEARCH RESULTS:
${founderSnippets || "No results found."}

MARKET SEARCH RESULTS:
${marketSnippets || "No results found."}

Synthesize the above into structured research findings. Be factual and cite sources inline as [source: URL].
If information was not found, say so explicitly — do not invent.

Return JSON:
{
  "company_findings": "2-3 paragraphs on the company: what they do, any news, funding history, traction signals found online",
  "founder_findings": "2-3 paragraphs on founders: backgrounds, prior companies, domain credibility, red flags if any",
  "market_findings": "1-2 paragraphs on market context: size, tailwinds, competition landscape",
  "gaps": ["list of specific things that could not be verified from public sources"]
}`,
    "You are a thorough research analyst for a venture capital fund."
  );

  const result: ResearchResult = {
    id: uuidv4(),
    application_id: app.id,
    ...synthesis,
    sources: allSources,
    created_at: new Date().toISOString(),
  };

  insertResearchResult({ ...result, sources: allSources, gaps: synthesis.gaps });
  return result;
}
