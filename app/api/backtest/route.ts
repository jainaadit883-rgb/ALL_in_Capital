import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAllHistoricalDeals, insertHistoricalDeal, updateHistoricalDealBacktest } from "@/lib/db";
import { runBacktest } from "@/lib/scoring";
import { askJson } from "@/lib/claude";
import { BacktestResult, BacktestDisagreement } from "@/lib/types";

export async function GET() {
  try {
    const deals = getAllHistoricalDeals() as Array<{
      id: string; company_name: string; actual_decision: string;
      system_recommendation: string | null; agreed: number | null;
      system_score: number | null; actual_reasoning: string;
    }>;

    const backtested = deals.filter((d) => d.agreed !== null);
    if (backtested.length === 0) return NextResponse.json({ deals, backtested: false });

    const agreements = backtested.filter((d) => d.agreed === 1).length;
    return NextResponse.json({
      deals,
      backtested: true,
      agreement_rate: Math.round((agreements / backtested.length) * 100),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add_deal") {
      const { company_name, sector, deck_text, actual_decision, actual_reasoning } = body;
      insertHistoricalDeal({ id: uuidv4(), company_name, sector: sector || "", deck_text: deck_text || "", actual_decision, actual_reasoning: actual_reasoning || "" });
      return NextResponse.json({ success: true });
    }

    if (action === "run") {
      const deals = getAllHistoricalDeals() as Array<{
        id: string; company_name: string; sector: string; deck_text: string;
        actual_decision: string; actual_reasoning: string;
      }>;

      if (deals.length === 0) return NextResponse.json({ error: "No historical deals to backtest" }, { status: 400 });

      const results = [];
      for (const deal of deals) {
        const result = await runBacktest(deal);
        updateHistoricalDealBacktest(deal.id, result);
        results.push({ ...deal, ...result });
      }

      const agreements = results.filter((r) => r.agreed).length;
      const disagreements = results.filter((r) => !r.agreed);

      // Ask Claude to analyze disagreements
      const analysis = await askJson<{ trust_assessment: string; disagreement_analysis: BacktestDisagreement[] }>(
        `You are evaluating an AI deal triage system's calibration.

Agreement rate: ${agreements}/${results.length} (${Math.round((agreements / results.length) * 100)}%)

Disagreements:
${disagreements.map((d) => `
Company: ${d.company_name}
Actual decision: ${d.actual_decision}
System recommendation: ${d.system_recommendation}
System score: ${d.system_score}/10
System reasoning: ${d.system_reasoning}
`).join("\n---\n")}

For each disagreement, determine if the system was likely wrong or the partners were likely wrong.
Also write a 2-3 paragraph trust assessment: what can the partner trust this system for, and where should they be cautious.

Return JSON:
{
  "trust_assessment": "...",
  "disagreement_analysis": [
    { "deal_id": "...", "company_name": "...", "actual_decision": "...", "system_recommendation": "...", "system_score": 0, "likely_wrong": "system|partners|unclear", "reasoning": "..." }
  ]
}`,
        "You are a VC partner evaluating an AI tool's calibration."
      );

      const backtest: BacktestResult = {
        total_deals: results.length,
        agreements,
        agreement_rate: Math.round((agreements / results.length) * 100),
        false_positives: results.filter((r) => !r.agreed && r.actual_decision === "passed" && r.system_recommendation === "take_call").length,
        false_negatives: results.filter((r) => !r.agreed && r.actual_decision === "funded" && r.system_recommendation === "pass").length,
        disagreements: analysis.disagreement_analysis,
        trust_assessment: analysis.trust_assessment,
      };

      return NextResponse.json(backtest);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
