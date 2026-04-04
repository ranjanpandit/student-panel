"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, FileBarChart2 } from "lucide-react";

export default function ResultDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      const res = await fetch(`/api/student/results/${id}`);
      const data = await res.json();
      setResult(data);
      setLoading(false);
    }

    loadResult();
  }, [id]);

  const stats = useMemo(
    () =>
      result
        ? [
            { label: "Total questions", value: result.total_questions },
            { label: "Correct answers", value: result.correct },
            { label: "Wrong answers", value: result.wrong },
            { label: "Total marks", value: result.total_marks },
            { label: "Obtained marks", value: result.obtained_marks },
            { label: "Percentage", value: `${result.percentage}%` },
          ]
        : [],
    [result]
  );

  if (loading) {
    return <div className="glass-panel h-80 animate-pulse bg-white/60" />;
  }

  if (!result) {
    return (
      <div className="glass-panel px-6 py-16 text-center">
        <p className="font-display text-3xl tracking-[-0.04em] text-slate-950">
          Result not found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <ArrowLeft size={16} />
        Back to results
      </button>

      <section className="overflow-hidden rounded-[34px] bg-slate-950 text-white shadow-[0_32px_90px_rgba(15,23,42,0.18)]">
        <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow border-white/15 bg-white/10 text-cyan-100">
              Result detail
            </p>
            <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] sm:text-5xl">
              {result.exam_title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Detailed outcome summary with score, result state, and quick access to question-level analysis.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
              Final status
            </p>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              result.result_status === "pass"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}>
              {result.result_status === "pass" ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
              {result.result_status}
            </div>
            <p className="mt-6 font-display text-5xl tracking-[-0.05em] text-white">
              {result.percentage}%
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Overall score: {result.obtained_marks}/{result.total_marks}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-3 font-display text-4xl tracking-[-0.04em] text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="glass-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Analysis</p>
          <h2 className="mt-4 section-title text-[2rem]">Question-by-question review</h2>
          <p className="mt-3 section-copy">
            Open the analysis view to inspect selected answers, correct options, and explanations.
          </p>
        </div>

        <button
          onClick={() => router.push(`/result/${result.id}/analysis`)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <FileBarChart2 size={16} />
          View analysis
          <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
