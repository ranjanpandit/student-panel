"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  MonitorSmartphone,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { getStudentAttemptPath, getThemePresentation } from "@/lib/exam-theme";

export default function ExamInstructions() {
  const { id } = useParams();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadExam() {
      try {
        const res = await fetch(`/api/exams/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Unable to load exam details");
        }

        if (mounted) {
          setExam(data.exam);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load exam details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadExam();
    return () => {
      mounted = false;
    };
  }, [id]);

  const instructionItems = useMemo(() => {
    if (!exam?.instructions) {
      return [];
    }

    return exam.instructions
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [exam?.instructions]);

  const themeMeta = getThemePresentation(exam?.exam_theme);

  async function startExam() {
    if (!agreed) return;

    try {
      const targetPath = getStudentAttemptPath(id, exam?.exam_theme);
      const popup = window.open(
        targetPath,
        `exam-window-${id}`,
        "popup=yes,width=1440,height=900,resizable=yes,scrollbars=yes"
      );

      if (!popup) {
        throw new Error("POPUP_BLOCKED");
      }

      popup.focus();
      window.sessionStorage.setItem("activeExamPopup", `exam-window-${id}`);
    } catch {
      alert("Please allow popups for this site so the exam can open in a new window.");
    }
  }

  if (loading) {
    return <div className="glass-panel h-80 animate-pulse bg-white/60" />;
  }

  if (error || !exam) {
    return (
      <div className="glass-panel px-6 py-12 text-center">
        <p className="font-display text-3xl tracking-[-0.04em] text-slate-950">Exam details unavailable</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{error || "This exam could not be loaded right now."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:px-8">
          <p className="eyebrow border-white/15 bg-white/10 text-cyan-100">{themeMeta.label} Assessment</p>
          <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] sm:text-5xl">{exam.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Review the exam rules and launch conditions before you begin. The test opens in fullscreen mode for a clearer, monitored workspace.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <p className="eyebrow">Overview</p>
              <h2 className="mt-4 section-title text-[2rem]">Exam snapshot</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoCard label="Theme" value={themeMeta.label} />
                <InfoCard label="Duration" value={`${exam.duration_minutes} minutes`} />
                <InfoCard label="Questions" value={`${exam.total_questions || 0}`} />
                <InfoCard label="Total marks" value={`${exam.total_marks || 0}`} />
                <InfoCard label="Section switching" value={exam.allow_section_switch ? "Allowed" : "Locked by test settings"} />
              </div>
            </div>

            <div className="glass-panel p-6">
              <p className="eyebrow">Instructions</p>
              <h2 className="mt-4 section-title text-[2rem]">Candidate guidelines</h2>

              {instructionItems.length ? (
                <div className="mt-6 space-y-4">
                  {instructionItems.map((item, index) => (
                    <div key={`${index}-${item}`} className="rounded-[24px] border border-slate-200 bg-white/80 px-5 py-4 text-sm leading-7 text-slate-700">
                      <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">{String(index + 1).padStart(2, "0")}</span>
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InstructionCard number="01" title="Navigation" copy="Move between questions using the navigator without losing your current progress." tone="sky" />
                  <InstructionCard number="02" title="Auto-save" copy="Responses are saved during the exam so progress stays protected." tone="emerald" />
                  <InstructionCard number="03" title="Proctoring" copy="Leaving fullscreen or switching away from the exam may be flagged." tone="rose" />
                  <InstructionCard number="04" title="Submission" copy="The assessment is submitted automatically when the timer reaches zero." tone="amber" />
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 text-amber-600" size={20} />
                <p className="text-sm leading-7 text-amber-900">
                  I understand that unfair means are prohibited and that fullscreen or tab-switch violations may trigger submission or be recorded against my attempt.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-6">
              <p className="eyebrow">Readiness</p>
              <h2 className="mt-4 section-title text-[2rem]">System check</h2>

              <div className="mt-6 space-y-4">
                <CheckRow icon={<CheckCircle2 size={16} />} label="Exam availability" value="Verified" />
                <CheckRow icon={<CheckCircle2 size={16} />} label="Session rules" value="Loaded" />
                <CheckRow icon={<MonitorSmartphone size={16} />} label="Fullscreen access" value="Required on start" tone="sky" />
                <CheckRow icon={<ShieldCheck size={16} />} label="Attempt mode" value={themeMeta.label} tone="sky" />
                <CheckRow icon={<Clock3 size={16} />} label="Timer" value={`${exam.duration_minutes} min`} tone="sky" />
              </div>
            </div>

            <div className="glass-panel p-6">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                <span className="text-sm leading-6 text-slate-600">I have read the instructions and I am ready to begin the assessment in a quiet environment.</span>
              </label>

              <button
                disabled={!agreed}
                onClick={startExam}
                className={`mt-6 w-full rounded-2xl px-5 py-3.5 text-sm font-semibold transition ${
                  agreed ? "bg-slate-950 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                Start {themeMeta.label} exam
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="soft-panel px-5 py-5">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InstructionCard({ number, title, copy, tone }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/80 p-5">
      <div className={`inline-flex rounded-2xl px-3 py-2 text-sm font-semibold ${tones[tone]}`}>{number}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
    </div>
  );
}

function CheckRow({ icon, label, value, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
      <div className="flex items-center gap-3 text-sm text-slate-700">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
        <span>{label}</span>
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{value}</span>
    </div>
  );
}
