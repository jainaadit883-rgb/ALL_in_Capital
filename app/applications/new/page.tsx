"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewApplication() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "", sector: "", stage: "", founder_names: "", website: "", deck_text: "", form_responses: "",
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.text) setForm((f) => ({ ...f, deck_text: data.text }));
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create application"); setSubmitting(false); return; }
    // Save full application to localStorage so detail page works across serverless instances
    const appRecord = { ...form, id: data.id, submitted_at: new Date().toISOString(), status: "pending" };
    try {
      const existing = JSON.parse(localStorage.getItem("allin_apps") || "[]");
      localStorage.setItem("allin_apps", JSON.stringify([appRecord, ...existing]));
    } catch {}
    router.push(`/applications/${data.id}`);
  };

  const field = (key: keyof typeof form, label: string, multiline?: boolean, placeholder?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={8}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-y"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
      )}
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">New Application</h1>
      <p className="text-gray-400 text-sm mb-8">Submit a deal for AI triage. Paste the pitch deck text or upload the PDF.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {field("company_name", "Company Name *", false, "e.g. Fintech India Ltd")}
        <div className="grid grid-cols-2 gap-4">
          {field("sector", "Sector", false, "e.g. Fintech, Deeptech")}
          {field("stage", "Stage", false, "e.g. Pre-seed, Seed")}
        </div>
        {field("founder_names", "Founders", false, "e.g. Priya Sharma, Ravi Kapoor")}
        {field("website", "Website", false, "https://")}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Deck Text *</label>
          <div className="mb-2 flex items-center gap-3">
            <label className="cursor-pointer text-xs text-emerald-400 border border-emerald-700 rounded-lg px-3 py-1.5 hover:bg-emerald-900/30 transition-colors">
              {uploading ? "Parsing PDF..." : "Upload PDF"}
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            <span className="text-gray-600 text-xs">or paste text below</span>
          </div>
          <textarea
            value={form.deck_text}
            onChange={(e) => setForm((f) => ({ ...f, deck_text: e.target.value }))}
            rows={10}
            placeholder="Paste the pitch deck content here..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-y"
            required
          />
        </div>

        {field("form_responses", "Form Responses", true, "Any additional answers the founder provided in the application form...")}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
