"use client";
import { useEffect, useState } from "react";
import { BacktestResult, BacktestDisagreement } from "@/lib/types";

interface HistoricalDeal {
  id: string; company_name: string; actual_decision: string;
  system_recommendation: string | null; agreed: number | null; system_score: number | null;
}

export default function BacktestPage() {
  const [deals, setDeals] = useState<HistoricalDeal[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDeal, setNewDeal] = useState({ company_name: "", sector: "", deck_text: "", actual_decision: "funded", actual_reasoning: "" });

  const load = () => {
    fetch("/api/backtest").then((r) => r.json()).then((d) => { setDeals(d.deals || []); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const run = async () => {
    setRunning(true);
    const res = await fetch("/api/backtest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run" }) });
    const data = await res.json();
    if (data.total_deals) setResult(data as BacktestResult);
    load();
    setRunning(false);
  };

  const addDeal = async () => {
    await fetch("/api/backtest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_deal", ...newDeal }) });
    setNewDeal({ company_name: "", sector: "", deck_text: "", actual_decision: "funded", actual_reasoning: "" });
    setShowAdd(false);
    load();
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Backtest Calibration</h1>
          <p className="text-gray-400 text-sm">Run the system against past funded/passed deals. Know how far to trust it before it touches live decisions.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdd(true)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">+ Add Historical Deal</button>
          <button onClick={run} disabled={running || deals.length === 0} className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {running ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mb-8 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["Total Deals", result.total_deals],
              ["Agreement Rate", `${result.agreement_rate}%`],
              ["False Positives", result.false_positives],
              ["False Negatives", result.false_negatives],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                <p className="text-2xl font-bold text-white">{val}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">Trust Assessment</p>
            <p className="text-gray-300 text-sm leading-relaxed">{result.trust_assessment}</p>
          </div>

          {result.disagreements?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Disagreements</p>
              <div className="space-y-3">
                {result.disagreements.map((d: BacktestDisagreement) => (
                  <div key={d.deal_id} className="border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{d.company_name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${d.likely_wrong === "system" ? "bg-red-900/50 text-red-400" : d.likely_wrong === "partners" ? "bg-amber-900/50 text-amber-400" : "bg-gray-800 text-gray-400"}`}>
                        {d.likely_wrong === "system" ? "System likely wrong" : d.likely_wrong === "partners" ? "Partners may have been wrong" : "Unclear"}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-1">Actual: <span className="text-white">{d.actual_decision}</span> · System: <span className="text-white">{d.system_recommendation}</span> ({d.system_score}/10)</p>
                    <p className="text-gray-400 text-xs">{d.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical Deals Table */}
      {loading ? (
        <div className="text-gray-500 animate-pulse text-sm">Loading...</div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-2">No historical deals yet.</p>
          <p className="text-sm">Add past funded and passed deals to calibrate the system.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-widest">
                <th className="text-left px-5 py-3">Company</th>
                <th className="text-left px-5 py-3">Actual Decision</th>
                <th className="text-left px-5 py-3">System Score</th>
                <th className="text-left px-5 py-3">System Reco</th>
                <th className="text-left px-5 py-3">Agreed?</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-gray-800/50">
                  <td className="px-5 py-3 text-white font-medium">{d.company_name}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${d.actual_decision === "funded" ? "bg-emerald-900 text-emerald-300" : "bg-gray-800 text-gray-400"}`}>{d.actual_decision}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{d.system_score != null ? `${d.system_score}/10` : "—"}</td>
                  <td className="px-5 py-3 text-gray-300">{d.system_recommendation || "—"}</td>
                  <td className="px-5 py-3">
                    {d.agreed === null ? <span className="text-gray-600">—</span> : d.agreed === 1 ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-white font-semibold mb-4">Add Historical Deal</h3>
            <div className="space-y-3">
              <input placeholder="Company name" value={newDeal.company_name} onChange={(e) => setNewDeal((d) => ({ ...d, company_name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              <input placeholder="Sector" value={newDeal.sector} onChange={(e) => setNewDeal((d) => ({ ...d, sector: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              <select value={newDeal.actual_decision} onChange={(e) => setNewDeal((d) => ({ ...d, actual_decision: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="funded">Funded</option>
                <option value="passed">Passed</option>
              </select>
              <textarea placeholder="Reasoning behind the actual decision..." value={newDeal.actual_reasoning} onChange={(e) => setNewDeal((d) => ({ ...d, actual_reasoning: e.target.value }))} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
              <textarea placeholder="Deck text (paste relevant content)..." value={newDeal.deck_text} onChange={(e) => setNewDeal((d) => ({ ...d, deck_text: e.target.value }))} rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={addDeal} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Add Deal</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
