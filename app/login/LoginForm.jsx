"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      document.cookie = `student_token=${data.token}; path=/`;
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-slate-950 px-7 py-10 text-white shadow-[0_40px_100px_rgba(15,23,42,0.25)] sm:px-10 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_22%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Sparkles size={14} />
                Student Assessment Workspace
              </span>
              <h1 className="mt-8 font-display text-5xl leading-none tracking-[-0.05em] sm:text-6xl">
                Clarity for every exam day.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Review your schedule, enter secure assessments, and track performance from one polished student panel.
              </p>
            </div>

            <div className="grid gap-4 pt-10 sm:grid-cols-3">
              <FeatureCard
                title="Secure"
                copy="Protected exam flow with guided instructions and focused layouts."
              />
              <FeatureCard
                title="Organized"
                copy="A cleaner dashboard for exams, results, progress, and profile data."
              />
              <FeatureCard
                title="Readable"
                copy="Stronger spacing, typography, and hierarchy across every major screen."
              />
            </div>
          </div>
        </section>

        <section className="glass-panel flex items-center px-5 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-400 text-white shadow-lg shadow-sky-500/30">
                <ShieldCheck size={24} />
              </div>
              <p className="eyebrow">Login</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.04em] text-slate-900">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Sign in to continue to your student dashboard and active assessments.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="space-y-4">
              <Field
                label="Email address"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Field
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={login}
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Enter dashboard"}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
              Use your registered student email and portal password. If access fails, contact the exam cell before the exam window opens.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ title, copy }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
    </div>
  );
}

function Field({ label, type = "text", ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <input
        type={type}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        {...props}
      />
    </label>
  );
}
