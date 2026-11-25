"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Application } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-700 text-gray-300",
  researching: "bg-blue-900 text-blue-300",
  scoring: "bg-purple-900 text-purple-300",
  scored: "bg-indigo-900 text-indigo-300",
  call_booked: "bg-emerald-900 text-emerald-300",
  passed: "bg-gray-800 text-gray-500",
  funded: "bg-yellow-900 text-yellow-300",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage (primary) since DB is not persistent on serverless
    try {
      const stored = JSON.parse(localStorage.getItem("allin_apps") || "[]");
      setApps(stored);
    } catch {}
    setLoading(false);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Applications</h1>
          <p className="text-gray-400 text-sm">{apps.length} in pipeline</p>
        </div>
        <Link href="/applications/new" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + New Application
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500 animate-pulse text-sm">Loading...</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No applications yet.</p>
          <Link href="/applications/new" className="text-emerald-500 underline text-sm">Submit the first one</Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-widest">
                <th className="text-left px-5 py-3">Company</th>
                <th className="text-left px-5 py-3">Sector</th>
                <th className="text-left px-5 py-3">Stage</th>
                <th className="text-left px-5 py-3">Founders</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <Link href={`/applications/${app.id}`} className="text-white font-medium hover:text-emerald-400 transition-colors">
                      {app.company_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{app.sector || "—"}</td>
                  <td className="px-5 py-3 text-gray-300">{app.stage || "—"}</td>
                  <td className="px-5 py-3 text-gray-300">{app.founder_names || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${STATUS_COLORS[app.status] || "bg-gray-700 text-gray-300"}`}>
                      {app.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(app.submitted_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
