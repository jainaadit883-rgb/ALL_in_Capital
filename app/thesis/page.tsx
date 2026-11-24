"use client";
import { useEffect, useState } from "react";
import { ThesisCriterion } from "@/lib/types";

export default function ThesisPage() {
  const [thesis, setThesis] = useState<ThesisCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconstructing, setReconstructing] = useState(false);
  const [editing, setEditing] = useState<ThesisCriterion | null>(null);

  const load = () => {
    fetch("/api/thesis").then((r) => r.json()).then((d) => setThesis(d.thesis || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const reconstruct = async () => {
    setReconstructing(true);
    const res = await fetch("/api/thesis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reconstruct" }) });
    const data = await res.json();
    setThesis(data.thesis || []);
    setReconstructing(false);
  };

  const save = async () => {
    if (!editing) return;
    const res = await fetch("/api/thesis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upsert", criterion: editing }) });
    const data = await res.json();
    setThesis(data.thesis || []);
    setEditing(null);
  };

  const positives = thesis.filter((c) => !c.is_anti_thesis);
  const antis = thesis.filter((c) => c.is_anti_thesis);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Investment Thesis</h1>
          <p className="text-gray-400 text-sm">Scoring rubric reconstructed from public sources. Edit any criterion or re-run reconstruction.</p>
        </div>
        <button
          onClick={reconstruct}
          disabled={reconstructing}
          className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {reconstructing ? "Reconstructing..." : "Re-run AI Reconstruction"}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 animate-pulse text-sm">Loading...</div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">Positive Criteria ({positives.length})</h2>
            <div className="space-y-3">
              {positives.map((c) => (
                <div key={c.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold">{c.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">weight {c.weight}/10</span>
                    </div>
                    <button onClick={() => setEditing(c)} className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-500">Edit</button>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-2">{c.description}</p>
                  <p className="text-gray-600 text-xs">Source: {c.source}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-widest text-red-400 font-semibold mb-3">Anti-thesis Exclusions ({antis.length})</h2>
            <div className="space-y-3">
              {antis.map((c) => (
                <div key={c.id} className="bg-red-900/10 border border-red-900/40 hover:border-red-800 rounded-xl p-5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-red-300 font-semibold">{c.name}</span>
                      <span className="text-xs text-red-500 bg-red-900/30 px-2 py-0.5 rounded-full">weight {c.weight}/10</span>
                    </div>
                    <button onClick={() => setEditing(c)} className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-500">Edit</button>
                  </div>
                  <p className="text-red-200/70 text-sm leading-relaxed mb-2">{c.description}</p>
                  <p className="text-gray-600 text-xs">Source: {c.source}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-white font-semibold mb-4">Edit Criterion</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name</label>
                <input value={editing.name} onChange={(e) => setEditing((c) => c ? { ...c, name: e.target.value } : c)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea value={editing.description} onChange={(e) => setEditing((c) => c ? { ...c, description: e.target.value } : c)} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Weight (1–10)</label>
                  <input type="number" min={1} max={10} value={editing.weight} onChange={(e) => setEditing((c) => c ? { ...c, weight: Number(e.target.value) } : c)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Anti-thesis?</label>
                  <select value={editing.is_anti_thesis ? "yes" : "no"} onChange={(e) => setEditing((c) => c ? { ...c, is_anti_thesis: e.target.value === "yes" } : c)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Source</label>
                <input value={editing.source} onChange={(e) => setEditing((c) => c ? { ...c, source: e.target.value } : c)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
