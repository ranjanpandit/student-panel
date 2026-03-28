"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  User,
  BarChart2,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Sparkles,
} from "lucide-react";

export default function StudentLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      router.replace("/login");
    }
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      description: "Overview",
    },
    {
      href: "/exam-dashboard",
      label: "My Exams",
      icon: <BookOpen size={18} />,
      description: "Assessments",
    },
    {
      href: "/result",
      label: "Results",
      icon: <BarChart2 size={18} />,
      description: "Performance",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User size={18} />,
      description: "Account",
    },
  ];

  const activeItem =
    navItems.find((item) => pathname.startsWith(item.href)) ?? navItems[0];

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <aside className="hidden w-80 shrink-0 p-5 md:block">
        <div className="glass-panel sticky top-5 flex min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden bg-slate-950/90 text-white">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-cyan-200 to-emerald-200 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Sparkles size={20} />
            </div>
            <p className="font-display text-3xl tracking-[-0.04em]">
              Testolia
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              A calm, high-clarity workspace for exams, results, and student progress.
            </p>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="space-y-2">
              {navItems.map((item) => (
                <SidebarLink key={item.href} {...item} pathname={pathname} />
              ))}
            </div>
          </nav>

          <div className="mx-4 mb-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Active Space
            </p>
            <p className="mt-3 font-display text-2xl tracking-[-0.03em]">
              {activeItem.label}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {activeItem.description}
            </p>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-5">
        <div className="hero-surface min-h-[calc(100vh-2rem)] overflow-hidden">
          <div className="border-b border-slate-200/80 bg-white/70 px-5 py-4 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Student Panel
                </p>
                <p className="font-display text-2xl tracking-[-0.03em] text-slate-900">
                  {activeItem.label}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <PanelLeft size={18} />
              </div>
            </div>
          </div>
          <div className="min-h-[calc(100vh-2rem)] p-4 sm:p-6 md:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

/* =========================
   SIDEBAR LINK
========================= */
function SidebarLink({ href, label, icon, description, pathname }) {
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-[22px] px-4 py-4 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-950 shadow-lg shadow-slate-900/10"
          : "text-slate-200 hover:bg-white/8 hover:text-white"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
          active
            ? "bg-slate-950 text-cyan-200"
            : "bg-white/8 text-slate-200 group-hover:bg-white/12"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate">{label}</div>
        <div
          className={`truncate text-xs ${
            active ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {description}
        </div>
      </div>
    </Link>
  );
}
