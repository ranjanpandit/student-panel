"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarRange, Clock3, FileCheck2, Layers3 } from "lucide-react";
import { getThemePresentation } from "@/lib/exam-theme";

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/exams")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        setExams(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const summary = useMemo(
    () => ({
      total: exams.length,
      inProgress: exams.filter((exam) => exam.attempt_status === "in_progress").length,
      submitted: exams.filter((exam) => exam.attempt_status === "submitted").length,
    }),
    [exams]
  );

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel p-6 sm:p-8">
            <p className="eyebrow">Exams</p>
            <h1 className="page-title mt-4">My examination desk</h1>
            <p className="page-copy mt-4 max-w-2xl">Browse active tests, resume secure attempts, and review timings in a cleaner, easier-to-scan layout.</p>
          </div>

          <div className="glass-panel grid gap-4 p-6 sm:grid-cols-3 xl:grid-cols-1">
            <SummaryBox label="Total exams" value={loading ? "--" : summary.total} icon={<Layers3 size={18} />} />
            <SummaryBox label="In progress" value={loading ? "--" : summary.inProgress} icon={<Clock3 size={18} />} tone="amber" />
            <SummaryBox label="Submitted" value={loading ? "--" : summary.submitted} icon={<FileCheck2 size={18} />} tone="emerald" />
          </div>
        </section>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-panel h-72 animate-pulse bg-white/60" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="glass-panel px-6 py-16 text-center">
            <p className="font-display text-3xl tracking-[-0.04em] text-slate-950">No exams available right now</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">New assessments will appear here as soon as they are assigned to your account.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCard({ exam }) {
  const now = new Date();
  const start = new Date(exam.start_time);
  const end = new Date(exam.end_time);
  const isActive = now >= start && now <= end;
  const statusLabel =
    exam.attempt_status === "submitted"
      ? "Submitted"
      : exam.attempt_status === "in_progress"
        ? "In progress"
        : "Not started";
  const themeMeta = getThemePresentation(exam.exam_theme);

  return (
    <div className="glass-panel flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
          exam.attempt_status === "submitted"
            ? "bg-emerald-100 text-emerald-700"
            : exam.attempt_status === "in_progress"
              ? "bg-amber-100 text-amber-700"
              : "bg-sky-100 text-sky-700"
        }`}>
          {statusLabel}
        </span>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">{themeMeta.label}</div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
            isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {isActive ? "Live" : "Scheduled"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex-1">
        <h2 className="font-display text-3xl leading-tight tracking-[-0.04em] text-slate-950">{exam.title}</h2>

        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <InfoRow icon={<Clock3 size={16} />} label={`${exam.duration_minutes} minutes`} />
          <InfoRow icon={<CalendarRange size={16} />} label={`${start.toLocaleString()} to ${end.toLocaleString()}`} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Secure attempt</div>
        <ExamAction exam={exam} active={isActive} />
      </div>
    </div>
  );
}

function ExamAction({ exam, active }) {
  if (exam.attempt_status === "submitted") {
    return <span className="rounded-2xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Completed</span>;
  }

  if (!active) {
    return <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">Not active</span>;
  }

  return (
    <Link
      href={`/exams/${exam.id}/instructions`}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition ${
        exam.attempt_status === "in_progress" ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-950 hover:bg-slate-800"
      }`}
    >
      {exam.attempt_status === "in_progress" ? "Resume exam" : "Start exam"}
      <ArrowRight size={16} />
    </Link>
  );
}

function SummaryBox({ label, value, icon, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="soft-panel px-5 py-5">
      <div className="flex items-center justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-2 font-display text-4xl tracking-[-0.04em] text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-sky-700">{icon}</div>
      <p className="leading-6">{label}</p>
    </div>
  );
}
