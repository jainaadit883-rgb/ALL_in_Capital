import { v4 as uuidv4 } from "uuid";
import { askJson } from "./claude";
import {
  insertCriterionScores,
  insertOverallScore,
  getScoresForApplication,
  getCorrectionsForCriterion,
  updateApplicationStatus,
} from "./db";
import { getOrInitThesis } from "./thesis";
import { Application, CriterionScore, OverallScore, Recommendation, ThesisCriterion } from "./types";
import { ResearchResult } from "./types";

interface RawCriterionScore {
  criterion_id: string;
  criterion_name: string;
  score: number;
  reasoning: string;
  sources: Array<{ text: string; url?: string; origin: "deck" | "form" | "web" | "not_found" }>;
  is_gap: boolean;
  gap_description: string;
}

interface RawScoringResult {
  criterion_scores: RawCriterionScore[];
  total_score: number;
  recommendation: Recommendation;
  memo: string;
}

function buildCorrectionContext(criterionName: string): string {
  const corrections = getCorrectionsForCriterion(criterionName) as Array<{
    original_score: number; corrected_score: number; reason: string;
  }>;
  if (corrections.length === 0) return "";
  return `\nPAST CORRECTIONS FOR THIS CRITERION (learn from these):\n` +
    corrections.map((c) =>
      `- Score was ${c.original_score}/10, corrected to ${c.corrected_score}/10. Reason: "${c.reason}"`
    ).join("\n");
}

export async function scoreApplication(
  app: Application,
  research: ResearchResult | null
): Promise<{ overall: OverallScore; criteria: CriterionScore[] }> {
  // Return cached if already scored
  const existing = getScoresForApplication(app.id);
  if (existing.overall) {
    const overall = existing.overall as unknown as OverallScore;
    const criteria = existing.criteria as unknown as CriterionScore[];
    if (overall.memo_text) return { overall, criteria };
  }

  const criteria = await getOrInitThesis() as ThesisCriterion[];

  updateApplicationStatus(app.id, "scoring");

  const criteriaWithCorrections = criteria.map((c) => ({
    ...c,
    correctionContext: buildCorrectionContext(c.name),
  }));

  const result = await askJson<RawScoringResult>(
    `You are a venture capital analyst at All In Capital, a Mumbai-based pre-seed fund.

You must score the following startup application against the fund's investment thesis.
Be rigorous. Source every claim. Name every gap. Do not fill in what you do not know.

=== APPLICATION ===
Company: ${app.company_name}
Sector: ${app.sector}
Stage: ${app.stage}
Founders: ${app.founder_names}
Website: ${app.website}

DECK / PITCH TEXT:
${app.deck_text.slice(0, 3000)}

FORM RESPONSES:
${app.form_responses.slice(0, 1500)}

=== EXTERNAL RESEARCH ===
${research ? `
Company: ${research.company_findings}

Founders: ${research.founder_findings}

Market: ${research.market_findings}

Research Gaps: ${research.gaps.join(", ")}
` : "No external research available."}

=== INVESTMENT THESIS CRITERIA ===
${criteriaWithCorrections.map((c, i) => `
${i + 1}. ${c.name} (Weight: ${c.weight}/10, Anti-thesis: ${c.is_anti_thesis})
   Definition: ${c.description}
   Criterion ID: ${c.id}${c.correctionContext}
`).join("")}

=== SCORING INSTRUCTIONS ===
1. Score each criterion 0-10 (10 = perfectly fits, 0 = completely fails or anti-thesis violation).
2. Anti-thesis criteria: if violated, score 0 and flag. If not applicable, score 7.
3. For each score, cite the specific source (deck claim, form response, web finding, or "not found").
4. If you cannot determine a score from available information, set is_gap: true.
5. Weighted total = sum(score × weight) / sum(weights).
6. Recommendation: "take_call" if total >= 6.5 AND no anti-thesis violations, "pass" if total < 5 OR anti-thesis violation, "more_info" otherwise.
7. Write a 3-paragraph memo as if reporting to a partner: what's compelling, what's uncertain, recommendation.

Return JSON:
{
  "criterion_scores": [
    {
      "criterion_id": "...",
      "criterion_name": "...",
      "score": 0-10,
      "reasoning": "...",
      "sources": [ { "text": "...", "url": "optional", "origin": "deck|form|web|not_found" } ],
      "is_gap": false,
      "gap_description": ""
    }
  ],
  "total_score": 0.0-10.0,
  "recommendation": "take_call|pass|more_info",
  "memo": "Partner-facing 3-paragraph memo..."
}`,
    "You are a rigorous VC analyst. Never fabricate data. Always cite sources. Name gaps explicitly."
  );

  // Persist criterion scores
  const criterionScoreRows = result.criterion_scores.map((cs) => ({
    id: uuidv4(),
    application_id: app.id,
    criterion_id: cs.criterion_id,
    criterion_name: cs.criterion_name,
    score: cs.score,
    reasoning: cs.reasoning,
    sources: cs.sources,
    is_gap: cs.is_gap,
    gap_description: cs.gap_description,
  }));
  insertCriterionScores(criterionScoreRows);

  const overallId = uuidv4();
  insertOverallScore({
    id: overallId,
    application_id: app.id,
    total_score: result.total_score,
    recommendation: result.recommendation,
    memo_text: result.memo,
  });

  const newStatus = result.recommendation === "take_call" ? "call_booked" : "scored";
  updateApplicationStatus(app.id, newStatus);

  const overall: OverallScore = {
    id: overallId,
    application_id: app.id,
    total_score: result.total_score,
    recommendation: result.recommendation,
    memo_text: result.memo,
    created_at: new Date().toISOString(),
  };

  const criteriaScores: CriterionScore[] = criterionScoreRows.map((cs) => ({
    ...cs,
    created_at: new Date().toISOString(),
  }));

  return { overall, criteria: criteriaScores };
}

export async function runBacktest(deal: {
  id: string; company_name: string; sector: string; deck_text: string;
  actual_decision: string; actual_reasoning: string;
}): Promise<{ system_score: number; system_recommendation: string; system_reasoning: string; agreed: boolean }> {
  const criteria = getThesisCriteria() as ThesisCriterion[];

  const result = await askJson<{
    total_score: number;
    recommendation: Recommendation;
    reasoning: string;
  }>(
    `Score this historical deal against the thesis. Company: ${deal.company_name}. Sector: ${deal.sector}.

Deck: ${deal.deck_text.slice(0, 2000)}

Criteria:
${criteria.map((c) => `- ${c.name} (weight ${c.weight}): ${c.description}`).join("\n")}

Return JSON: { "total_score": 0.0-10.0, "recommendation": "take_call|pass|more_info", "reasoning": "2-3 sentences" }`,
    "You are a VC analyst scoring a historical deal."
  );

  const agreed =
    (result.recommendation === "take_call" && deal.actual_decision === "funded") ||
    (result.recommendation === "pass" && deal.actual_decision === "passed");

  return {
    system_score: result.total_score,
    system_recommendation: result.recommendation,
    system_reasoning: result.reasoning,
    agreed,
  };
}
