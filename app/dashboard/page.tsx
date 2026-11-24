"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardStats } from "@/lib/types";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications?stats=true")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Deal Flow Dashboard</h1>
        <p className="text-gray-400 text-sm">All In Capital · Fund II · Pre-seed</p>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <StatCard label="Total" value={stats.total_applications} />
          <StatCard label="Pending" value={stats.pending} sub="awaiting triage" />
          <StatCard label="Scored" value={stats.scored} sub="by AI" />
          <StatCard label="Calls booked" value={stats.calls_booked} />
          <StatCard label="Passed" value={stats.passed} />
          <StatCard label="Avg Score" value={stats.avg_score ? `${stats.avg_score}/10` : "—"} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/applications/new" className="group bg-gray-900 border border-gray-800 hover:border-emerald-600 rounded-xl p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center text-emerald-500 text-xl font-bold">+</div>
            <div>
              <p className="text-white font-semibold mb-1">Submit Application</p>
              <p className="text-gray-400 text-sm">Add a new inbound deal for AI triage. Paste the deck text or upload a PDF.</p>
            </div>
          </div>
        </Link>

        <Link href="/applications" className="group bg-gray-900 border border-gray-800 hover:border-emerald-600 rounded-xl p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center text-blue-400 text-xl">≡</div>
            <div>
              <p className="text-white font-semibold mb-1">Review Applications</p>
              <p className="text-gray-400 text-sm">See all applications, scores, memos, and correct any AI scores.</p>
            </div>
          </div>
        </Link>

        <Link href="/thesis" className="group bg-gray-900 border border-gray-800 hover:border-emerald-600 rounded-xl p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-900/40 flex items-center justify-center text-purple-400 text-xl">✦</div>
            <div>
              <p className="text-white font-semibold mb-1">Investment Thesis</p>
              <p className="text-gray-400 text-sm">View and edit the scoring rubric. AI-reconstructed from public sources.</p>
            </div>
          </div>
        </Link>

        <Link href="/backtest" className="group bg-gray-900 border border-gray-800 hover:border-emerald-600 rounded-xl p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center text-amber-400 text-xl">◎</div>
            <div>
              <p className="text-white font-semibold mb-1">Backtest Calibration</p>
              <p className="text-gray-400 text-sm">Run the system against past funded/passed deals. See agreement rate before trusting it.</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
