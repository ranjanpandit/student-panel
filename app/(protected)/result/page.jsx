"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LineChart, Medal, XCircle } from "lucide-react";

export default function StudentResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch("/api/student/results");
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        }
      } catch {
        console.error("Failed to load results");
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  const summary = useMemo(
    () => ({
      total: results.length,
      pass: results.filter((item) => item.result_status === "pass").length,
      average: results.length
        ? Math.round(
            results.reduce((sum, item) => sum + Number(item.percentage || 0), 0) /
              results.length
          )
        : 0,
    }),
    [results]
  );

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel h-72 animate-pulse bg-white/60" />
        <div className="glass-panel h-72 animate-pulse bg-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel p-6 sm:p-8">
          <p className="eyebrow">Results</p>
          <h1 className="mt-4 font-display text-4xl tracking-[-0.05em] text-slate-900 sm:text-5xl">
            My academic performance
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
            Review published exam outcomes with stronger visual hierarchy and a clearer score summary.
          </p>
        </div>

        <div className="glass-panel grid gap-4 p-6 sm:grid-cols-3 xl:grid-cols-1">
          <SummaryCard label="Total results" value={summary.total} icon={<LineChart size={18} />} />
          <SummaryCard label="Passed" value={summary.pass} icon={<CheckCircle2 size={18} />} tone="emerald" />
          <SummaryCard label="Average %" value={summary.average} icon={<Medal size={18} />} tone="amber" />
        </div>
      </section>

      {results.length === 0 ? (
        <div className="glass-panel px-6 py-16 text-center">
          <p className="font-display text-3xl tracking-[-0.04em] text-slate-900">
            No examination records found
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-700">
            Published results will appear here when your institution releases them.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => router.push(`/result/${result.id}`)}
              className="glass-panel group flex h-full flex-col p-0 text-left transition hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]"
            >
              <div className="rounded-t-[24px] bg-slate-950 px-6 py-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  Examination
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.04em]">
                  {result.exam_title}
                </h2>
              </div>

              <div className="flex flex-1 flex-col px-6 py-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Score
                    </p>
                    <p className="mt-2 font-display text-4xl tracking-[-0.04em] text-slate-900">
                      {result.obtained_marks}
                      <span className="mx-1 text-slate-300">/</span>
                      {result.total_marks}
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                    result.result_status === "pass"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}>
                    {result.result_status === "pass" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {result.percentage}%
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      result.result_status === "pass" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${result.percentage}%` }}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                  <span>{new Date(result.created_at).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    Open details
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 font-display text-4xl tracking-[-0.04em] text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
