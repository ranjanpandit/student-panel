"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleX, SkipForward } from "lucide-react";

export default function ResultAnalysisPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/student/results/${id}/analysis`)
      .then((response) => response.json())
      .then(setData);
  }, [id]);

  if (!data) {
    return <div className="glass-panel h-80 animate-pulse bg-white/60" />;
  }

  const { result, questions } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="glass-panel px-5 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Analysis
          </p>
          <p className="mt-2 font-display text-2xl tracking-[-0.04em] text-slate-900">
            {result?.exam_title}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((question, index) => (
          <QuestionCard key={question.id} q={question} index={index} />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ q, index }) {
  const status =
    q.selected_option_id == null ? "skipped" : q.is_correct ? "correct" : "wrong";

  const statusMap = {
    correct: {
      label: "Correct",
      badge: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-200",
      icon: <CheckCircle2 size={16} />,
    },
    wrong: {
      label: "Wrong",
      badge: "bg-rose-100 text-rose-700",
      border: "border-rose-200",
      icon: <CircleX size={16} />,
    },
    skipped: {
      label: "Skipped",
      badge: "bg-slate-100 text-slate-600",
      border: "border-slate-200",
      icon: <SkipForward size={16} />,
    },
  };

  return (
    <div className={`glass-panel overflow-hidden border ${statusMap[status].border}`}>
      <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-slate-50/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Question {index + 1}
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusMap[status].badge}`}>
          {statusMap[status].icon}
          {statusMap[status].label}
        </span>
      </div>

      <div className="space-y-6 px-6 py-6">
        <div
          className="prose max-w-none prose-p:my-2 prose-img:rounded-xl prose-img:shadow-sm"
          dangerouslySetInnerHTML={{ __html: q.question_text }}
        />

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const isCorrect = opt.is_correct === 1;
            const isSelected = opt.id === q.selected_option_id;

            let optionClass = "border-slate-200 bg-white";
            if (isCorrect) optionClass = "border-emerald-200 bg-emerald-50";
            if (isSelected && !isCorrect) optionClass = "border-rose-200 bg-rose-50";

            return (
              <div key={opt.id} className={`rounded-[22px] border px-4 py-4 ${optionClass}`}>
                <div className="flex gap-3">
                  <span className="font-semibold text-slate-600">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: opt.option_text }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[22px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Marks awarded: <span className="font-semibold text-slate-900">{q.marks_awarded ?? 0}</span>
        </div>

        {q.explanation ? (
          <div className="rounded-[24px] bg-sky-50 px-5 py-5">
            <p className="mb-3 text-sm font-semibold text-sky-800">Explanation</p>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: q.explanation }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
