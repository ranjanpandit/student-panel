"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Snapshot of exams, alerts, and activity",
    accent: "from-sky-500 via-blue-600 to-cyan-400",
  },
  {
    href: "/exam-dashboard",
    label: "My Exams",
    icon: BookOpen,
    description: "Active assessments and schedules",
    accent: "from-cyan-500 via-teal-500 to-emerald-400",
  },
  {
    href: "/result",
    label: "Results",
    icon: BarChart2,
    description: "Scores, trends, and analysis",
    accent: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    description: "Identity, academics, and finance",
    accent: "from-violet-500 via-indigo-500 to-sky-500",
  },
];

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StudentLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const activeItem =
    navItems.find((item) => isActivePath(pathname, item.href)) ?? navItems[0];

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-transparent xl:flex">
      <aside className="hidden w-[320px] shrink-0 px-5 py-5 xl:block">
        <div className="sticky top-5 flex min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-300 via-cyan-200 to-emerald-200 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Sparkles size={22} />
            </div>
            <p className="font-display text-3xl tracking-[-0.05em] text-white">Testolia</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              A focused student workspace with sharper hierarchy, stronger contrast, and calmer exam-day navigation.
            </p>
          </div>

          <div className="px-4 py-5">
            <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                    Current space
                  </p>
                  <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-white">
                    {activeItem.label}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeItem.accent} text-white shadow-lg`}>
                  <activeItem.icon size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                {activeItem.description}
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 pb-4">
            <div className="mb-3 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Navigation
              </p>
            </div>
            <div className="space-y-2">
              {navItems.map((item) => (
                <SidebarLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </nav>

          <div className="mx-4 mb-4 rounded-[24px] border border-white/12 bg-white/7 p-5">
            <div className="flex items-center gap-3 text-cyan-100">
              <CalendarDays size={18} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                Daily workflow
              </p>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Start with your dashboard, move to active exams, then review results and profile updates from one consistent flow.
            </p>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/12 px-4 py-3 text-sm font-medium text-rose-50 transition hover:bg-rose-500/22"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 pb-28 sm:px-5 sm:py-5 sm:pb-32 xl:px-0 xl:pb-5">
        <div className="hero-surface min-h-[calc(100vh-2rem)] overflow-hidden">
          <div className="border-b border-slate-200/90 bg-white/88 px-5 py-5 backdrop-blur-xl sm:px-6 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                  <span className="data-chip border-transparent bg-sky-100 text-sky-800 shadow-none">
                    Student Panel
                  </span>
                  <span className="hidden text-slate-300 sm:inline">/</span>
                  <span className="text-slate-700">{activeItem.label}</span>
                </div>
                <h1 className="mt-4 font-display text-3xl tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  {activeItem.label}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
                  {activeItem.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="data-chip text-slate-800">
                  <GraduationCap size={14} />
                  Focused workspace
                </div>
                <div className="data-chip text-slate-800">
                  <activeItem.icon size={14} />
                  Active module
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 xl:hidden"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-[calc(100vh-9rem)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
            {children}
          </div>
        </div>
      </main>

      <div className="fixed inset-x-4 bottom-4 z-50 xl:hidden">
        <div className="glass-panel overflow-hidden px-2 py-2">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-2 py-3 text-center text-[11px] font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white shadow-lg"
                      : "text-slate-800 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon size={18} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ item, pathname }) {
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-4 rounded-[24px] px-4 py-4 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.22)]"
          : "border border-transparent text-white hover:border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
          active
            ? `bg-gradient-to-br ${item.accent} text-white shadow-lg`
            : "bg-white/12 text-white group-hover:bg-white/16"
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className={`truncate ${active ? "text-slate-950" : "text-white"}`}>{item.label}</span>
          <ChevronRight
            size={16}
            className={active ? "text-slate-400" : "text-slate-300 group-hover:text-white"}
          />
        </div>
        <div className={`mt-1 truncate text-xs ${active ? "text-slate-600" : "text-slate-200/95"}`}>
          {item.description}
        </div>
      </div>
    </Link>
  );
}
