"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Application, OverallScore, CriterionScore, ResearchResult } from "@/lib/types";

const RECO_STYLES: Record<string, string> = {
  take_call: "bg-emerald-900 text-emerald-300 border-emerald-700",
  pass: "bg-red-900/60 text-red-400 border-red-800",
  more_info: "bg-amber-900/60 text-amber-400 border-amber-800",
};

const RECO_LABEL: Record<string, string> = {
  take_call: "Take the call",
  pass: "Pass",
  more_info: "Need more info",
};

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="score-bar flex-1">
        <div className={`score-bar-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-white w-10 text-right">{score}/10</span>
    </div>
  );
}

function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [overall, setOverall] = useState<OverallScore | null>(null);
  const [criteria, setCriteria] = useState<CriterionScore[]>([]);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState("");
  const [correcting, setCorrecting] = useState<{ scoreId: string; criterionName: string; original: number } | null>(null);
  const [correction, setCorrection] = useState({ score: 0, reason: "" });

  const load = () => {
    fetch(`/api/applications/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setApp(d.application as Application);
        if (d.scores?.overall) setOverall(d.scores.overall as OverallScore);
        if (d.scores?.criteria) {
          const raw = d.scores.criteria as Array<Record<string, unknown>>;
          setCriteria(raw.map((c) => ({ ...(c as unknown as CriterionScore), sources: typeof c.sources === "string" ? JSON.parse(c.sources as string) : c.sources, is_gap: Boolean(c.is_gap) })));
        }
        if (d.research) {
          const r = d.research as ResearchResult & { sources: string; gaps: string };
          setResearch({ ...r, sources: typeof r.sources === "string" ? JSON.parse(r.sources) : r.sources, gaps: typeof r.gaps === "string" ? JSON.parse(r.gaps) : r.gaps });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const runResearch = async () => {
    setRunning("research");
    await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ application_id: id }) });
    load();
    setRunning("");
  };

  const runScore = async () => {
    setRunning("score");
    await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ application_id: id }) });
    load();
    setRunning("");
  };

  const submitCorrection = async () => {
    if (!correcting) return;
    await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score_id: correcting.scoreId, application_id: id, criterion_name: correcting.criterionName, original_score: correcting.original, corrected_score: correction.score, reason: correction.reason }),
    });
    setCorrecting(null);
    setCorrection({ score: 0, reason: "" });
    load();
  };

  if (loading) return <div className="text-gray-500 text-sm animate-pulse">Loading...</div>;
  if (!app) return <div className="text-red-400">Application not found.</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{app.company_name}</h1>
          <div className="flex gap-3 text-sm text-gray-400">
            {app.sector && <span>{app.sector}</span>}
            {app.stage && <span>· {app.stage}</span>}
            {app.founder_names && <span>· {app.founder_names}</span>}
          </div>
        </div>
        {overall && (
          <div className={`border rounded-lg px-4 py-2 text-sm font-semibold ${RECO_STYLES[overall.recommendation] || ""}`}>
            {RECO_LABEL[overall.recommendation] || overall.recommendation}
          </div>
        )}
      </div>

      {/* Action Bar */}
      {!overall && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 flex gap-3">
          <button
            onClick={runResearch}
            disabled={!!running}
            className="bg-blue-800 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {running === "research" ? "Researching..." : "1. Run External Research"}
          </button>
          <button
            onClick={runScore}
            disabled={!!running}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {running === "score" ? "Scoring..." : "2. Score Against Thesis"}
          </button>
        </div>
      )}

      {/* Overall Score */}
      {overall && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Overall Score</span>
            <span className="text-3xl font-bold text-white">{overall.total_score.toFixed(1)}/10</span>
          </div>
          <ScoreBar score={overall.total_score} />
          <div className="mt-5 prose prose-invert prose-sm max-w-none">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{overall.memo_text}</p>
          </div>
        </div>
      )}

      {/* Criterion Scores */}
      {criteria.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-4">Criterion Scores</h2>
          <div className="space-y-5">
            {criteria.map((cs) => (
              <div key={cs.id} className={`p-4 rounded-lg border ${cs.is_gap ? "border-amber-800 bg-amber-900/10" : "border-gray-800"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-white font-medium text-sm">{cs.criterion_name}</span>
                    {cs.is_gap && <span className="ml-2 text-xs text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-full">Gap</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{cs.score}/10</span>
                    <button
                      onClick={() => { setCorrecting({ scoreId: cs.id, criterionName: cs.criterion_name, original: cs.score }); setCorrection({ score: cs.score, reason: "" }); }}
                      className="text-xs text-gray-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded border border-gray-700 hover:border-emerald-700"
                    >
                      Correct
                    </button>
                  </div>
                </div>
                <ScoreBar score={cs.score} />
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">{cs.reasoning}</p>
                {cs.is_gap && cs.gap_description && (
                  <p className="text-amber-400 text-xs mt-1">Gap: {cs.gap_description}</p>
                )}
                {cs.sources?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cs.sources.map((s, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${s.origin === "web" ? "border-blue-800 text-blue-400" : s.origin === "not_found" ? "border-gray-700 text-gray-500" : "border-gray-700 text-gray-400"}`}>
                        {s.origin}: {s.text.slice(0, 60)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research */}
      {research && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-4">External Research</h2>
          <div className="space-y-4">
            {[["Company", research.company_findings], ["Founders", research.founder_findings], ["Market", research.market_findings]].map(([label, text]) => (
              <div key={label}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
            {research.gaps?.length > 0 && (
              <div>
                <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">Gaps — could not verify</p>
                <ul className="text-amber-300 text-sm space-y-0.5">
                  {research.gaps.map((g, i) => <li key={i}>• {g}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Deck */}
      <details className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <summary className="cursor-pointer text-sm text-gray-400 font-medium">View raw deck text</summary>
        <pre className="mt-3 text-xs text-gray-500 whitespace-pre-wrap overflow-auto max-h-80">{app.deck_text}</pre>
      </details>

      {/* Correction Modal */}
      {correcting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-1">Correct Score</h3>
            <p className="text-gray-400 text-sm mb-4">{correcting.criterionName} — was {correcting.original}/10</p>
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">New score (0–10)</label>
              <input type="number" min={0} max={10} value={correction.score} onChange={(e) => setCorrection((c) => ({ ...c, score: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Reason (optional)</label>
              <textarea value={correction.reason} onChange={(e) => setCorrection((c) => ({ ...c, reason: e.target.value }))} rows={3}
                placeholder="Why is the AI score wrong? This will train future corrections."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={submitCorrection} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save Correction</button>
              <button onClick={() => setCorrecting(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 text-sm animate-pulse">Loading...</div>}>
      <ApplicationDetail />
    </Suspense>
  );
}
