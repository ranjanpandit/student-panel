"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, MonitorSmartphone, ShieldCheck, TriangleAlert } from "lucide-react";

export default function ExamInstructions() {
  const { id } = useParams();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  async function startExam() {
    if (!agreed) return;

    try {
      await document.documentElement.requestFullscreen();
      router.replace(`/exams/${id}/attempt`);
    } catch {
      alert("Fullscreen permission is required to secure the assessment environment.");
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:px-8">
          <p className="eyebrow border-white/15 bg-white/10 text-cyan-100">
            Secure Assessment
          </p>
          <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] sm:text-5xl">
            Examination instructions
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Review the guidelines below before you begin. The exam opens in fullscreen mode for a cleaner and more secure assessment environment.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <p className="eyebrow">Guidelines</p>
              <h2 className="mt-4 section-title text-[2rem]">General instructions</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InstructionCard
                  number="01"
                  title="Navigation"
                  copy="Move between questions using the navigator without losing your current progress."
                  tone="sky"
                />
                <InstructionCard
                  number="02"
                  title="Auto-save"
                  copy="Responses are saved during the exam, helping protect your work if something interrupts the session."
                  tone="emerald"
                />
                <InstructionCard
                  number="03"
                  title="Proctoring"
                  copy="Leaving fullscreen or switching away from the exam may be flagged during the attempt."
                  tone="rose"
                />
                <InstructionCard
                  number="04"
                  title="Final submission"
                  copy="The assessment is submitted automatically when the timer reaches zero."
                  tone="amber"
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 text-amber-600" size={20} />
                <p className="text-sm leading-7 text-amber-900">
                  I understand that unfair means are prohibited and that secure-proctoring checks may be applied during the examination.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-6">
              <p className="eyebrow">Readiness</p>
              <h2 className="mt-4 section-title text-[2rem]">System check</h2>

              <div className="mt-6 space-y-4">
                <CheckRow icon={<CheckCircle2 size={16} />} label="Browser compatibility" value="Verified" />
                <CheckRow icon={<CheckCircle2 size={16} />} label="Internet connection" value="Stable" />
                <CheckRow icon={<MonitorSmartphone size={16} />} label="Fullscreen access" value="Required on start" tone="sky" />
                <CheckRow icon={<ShieldCheck size={16} />} label="Assessment mode" value="Secure" tone="sky" />
              </div>
            </div>

            <div className="glass-panel p-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm leading-6 text-slate-600">
                  I have read the instructions and I am ready to begin the assessment in a quiet environment.
                </span>
              </label>

              <button
                disabled={!agreed}
                onClick={startExam}
                className={`mt-6 w-full rounded-2xl px-5 py-3.5 text-sm font-semibold transition ${
                  agreed
                    ? "bg-slate-950 text-white hover:bg-slate-800"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                Confirm and start exam
              </button>
            </div>
          </div>
        </section>
      </div>
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
      <div className={`inline-flex rounded-2xl px-3 py-2 text-sm font-semibold ${tones[tone]}`}>
        {number}
      </div>
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {value}
      </span>
    </div>
  );
}
