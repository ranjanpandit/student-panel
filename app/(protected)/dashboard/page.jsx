"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProfile({
        name: "Ranjan Kumar",
        regNo: "STU2026001",
        course: "B.Tech Computer Science",
        semester: "6th Semester",
        feeStatus: "Paid",
        feeDueDate: "2026-03-10",
      });

      setUpcomingExams([
        { id: 1, title: "Mid-Term - Data Structures", date: "Mar 18, 2026", timeLeft: "4 days", status: "Priority" },
        { id: 2, title: "Final - Database Systems", date: "Apr 05, 2026", timeLeft: "22 days", status: "Scheduled" },
        { id: 3, title: "Practical - Web Development", date: "Mar 25, 2026", timeLeft: "11 days", status: "Prepare" },
      ]);

      setAnnouncements([
        { id: 1, title: "Exam form submission open", content: "Submit your exam form by March 5, 2026.", urgency: "high", time: "2 hours ago" },
        { id: 2, title: "Hostel fee reminder", content: "Last fee payment date is March 15, 2026.", urgency: "medium", time: "Yesterday" },
        { id: 3, title: "New library resources added", content: "IEEE and Springer journals are now available.", urgency: "low", time: "3 days ago" },
      ]);

      setRecentActivity([
        { id: 1, action: "Exam form submitted", time: "Today, 11:42 AM" },
        { id: 2, action: "Fee receipt downloaded", time: "Feb 12, 2026" },
        { id: 3, action: "Profile photo updated", time: "Feb 10, 2026" },
      ]);

      setLoading(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(
    () => [
      {
        title: "Upcoming Exams",
        value: loading ? "--" : upcomingExams.length,
        note: "Next 30 days",
        icon: <BookOpen size={18} />,
        accent: "from-sky-500 to-blue-600",
      },
      {
        title: "Completed Tests",
        value: "8",
        note: "This semester",
        icon: <Award size={18} />,
        accent: "from-emerald-500 to-teal-600",
      },
      {
        title: "Pending Results",
        value: "2",
        note: "Awaiting release",
        icon: <Clock3 size={18} />,
        accent: "from-amber-500 to-orange-500",
      },
      {
        title: "Fee Status",
        value: profile?.feeStatus || "--",
        note: profile?.feeDueDate ? `Updated ${profile.feeDueDate}` : "Finance record",
        icon: <IndianRupee size={18} />,
        accent: "from-violet-500 to-indigo-600",
      },
    ],
    [loading, profile, upcomingExams.length]
  );

  const nextExam = upcomingExams[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] bg-slate-950 px-6 py-7 text-white shadow-[0_32px_90px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.24),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(52,211,153,0.18),_transparent_22%),linear-gradient(135deg,_rgba(255,255,255,0.05),_transparent)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="eyebrow border-white/15 bg-white/10 text-cyan-100">
              Student overview
            </p>
            <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] sm:text-5xl">
              {loading ? "Preparing your workspace..." : `Welcome back, ${profile?.name}`}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Your student panel is now organized around faster scanning, clearer priorities, and a calmer visual rhythm across exams, results, and records.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/exam-dashboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                View my exams
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/result"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Open results
                <TrendingUp size={16} />
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Focus card
            </p>
            <div className="mt-5 space-y-4">
              <FocusLine label="Registration" value={profile?.regNo || "Loading"} />
              <FocusLine label="Current course" value={profile?.course || "Fetching student details"} subdued />
              <FocusLine label="Semester" value={profile?.semester || "Syncing records"} subdued />
              <div className="rounded-[22px] bg-white/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                  Next key milestone
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {nextExam?.title || "No exam scheduled"}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {nextExam ? `${nextExam.date} | ${nextExam.timeLeft} left` : "Watch this space for updates."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Upcoming</p>
                <h2 className="mt-4 section-title text-[2rem]">Exam timeline</h2>
                <p className="section-copy mt-3">
                  Review your nearest assessments and keep preparation aligned with dates that matter most.
                </p>
              </div>
              <CalendarDays className="mt-1 text-sky-600" size={22} />
            </div>

            <div className="mt-6 space-y-4">
              {(loading ? Array.from({ length: 3 }) : upcomingExams).map((exam, index) => (
                <div
                  key={exam?.id || index}
                  className="soft-panel flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                        {loading ? "Loading" : exam.status}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-slate-950">
                      {loading ? "Loading exam title" : exam.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {loading ? "Loading schedule" : exam.date}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
                    {loading ? "..." : exam.timeLeft}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Progress</p>
                  <h2 className="mt-4 section-title text-[2rem]">Academic progress</h2>
                </div>
                <Sparkles className="text-emerald-600" size={20} />
              </div>

              <div className="mt-6 space-y-5">
                <ProgressRow label="Semester completion" value={72} />
                <ProgressRow label="Attendance" value={88} tone="emerald" />
              </div>
            </div>

            <div className="glass-panel p-6">
              <p className="eyebrow">Actions</p>
              <h2 className="mt-4 section-title text-[2rem]">Quick launch</h2>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <QuickAction icon={<CalendarDays size={18} />} title="Schedule" />
                <QuickAction icon={<CreditCard size={18} />} title="Pay fee" />
                <QuickAction icon={<FileText size={18} />} title="Admit card" />
                <QuickAction icon={<Download size={18} />} title="Downloads" />
                <QuickAction icon={<Award size={18} />} title="Results" />
                <QuickAction icon={<CheckCircle2 size={18} />} title="Attendance" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Alerts</p>
                <h2 className="mt-4 section-title text-[2rem]">Important notices</h2>
              </div>
              <Bell className="text-amber-500" size={20} />
            </div>

            <div className="mt-6 space-y-4">
              {(loading ? Array.from({ length: 3 }) : announcements).map((item, index) => (
                <AnnouncementCard key={item?.id || index} item={item} loading={loading} />
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <p className="eyebrow">Activity</p>
            <h2 className="mt-4 section-title text-[2rem]">Recent activity</h2>
            <div className="mt-6 space-y-4">
              {(loading ? Array.from({ length: 3 }) : recentActivity).map((item, index) => (
                <div key={item?.id || index} className="soft-panel flex items-start gap-4 px-4 py-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-sky-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {loading ? "Loading activity" : item.action}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {loading ? "..." : item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FocusLine({ label, value, subdued = false }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{label}</p>
      <p className={`mt-2 ${subdued ? "text-sm leading-6 text-slate-200" : "text-lg font-semibold text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function StatCard({ title, value, note, icon, accent }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div className={`metric-card-accent bg-gradient-to-br ${accent}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 font-display text-4xl tracking-[-0.04em] text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-600">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, tone = "sky" }) {
  const tones = {
    sky: "from-sky-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-slate-800">
        <span>{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tones[tone]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({ icon, title }) {
  return (
    <button className="soft-panel px-4 py-5 text-left transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </button>
  );
}

function AnnouncementCard({ item, loading }) {
  return (
    <div className="soft-panel px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          {loading ? "Loading alert" : item.title}
        </p>
        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
          item?.urgency === "high"
            ? "bg-rose-100 text-rose-700"
            : item?.urgency === "medium"
            ? "bg-amber-100 text-amber-700"
            : "bg-emerald-100 text-emerald-700"
        }`}>
          {loading ? "..." : item.urgency}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        {loading ? "Loading alert details" : item.content}
      </p>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
        {loading ? "..." : item.time}
      </p>
    </div>
  );
}
