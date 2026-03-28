"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import Link from "next/link";
import { Menu, LayoutDashboard, FileText } from "lucide-react";

import Header from "@/components/layout/Header";
import { useStore } from "@/lib/store";
import { useAuthStore } from "@/lib/authStore";
import { usePermissionStore } from "@/lib/permissionStore";

export default function Providers({ children }) {
  const pathname = usePathname();

  const {
    sidebarOpen,
    mobileSidebarOpen,
    toggleSidebar,
    toggleMobileSidebar,
    darkMode,
  } = useStore();

  const { token, hydrated, loadUser } = useAuthStore();

  /* Load auth once */
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /* Load permissions once */
  useEffect(() => {
    if (token) {
      usePermissionStore.getState().loadPermissions();
    }
  }, [token]);

  /* Redirect if not logged in */
  useEffect(() => {
    if (hydrated && !token && pathname !== "/login") {
      window.location.href = "/login";
    }
  }, [hydrated, token, pathname]);

  if (!hydrated) return null;

  const menuItems = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard size={18} /> },
    { label: "Forms", href: "/forms", icon: <FileText size={18} /> },
  ];

  return (
    <div className={darkMode ? "dark" : ""}>
      <Toaster />

      {mobileSidebarOpen && (
        <div
          onClick={toggleMobileSidebar}
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
        />
      )}

      <div className="flex bg-gray-100 dark:bg-gray-900 min-h-screen">
        {token && pathname !== "/login" && (
          <aside
            className={`${
              sidebarOpen ? "w-64" : "w-20"
            } fixed md:static z-30 bg-white dark:bg-gray-800 shadow h-screen p-4 transition-all`}
          >
            <button onClick={toggleSidebar} className="mb-6 hidden md:block">
              <Menu />
            </button>

            <nav className="space-y-3">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {item.icon}
                  {sidebarOpen && item.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 p-6 ml-20 md:ml-0 text-gray-900 dark:text-white">
          {pathname !== "/login" && token && <Header />}
          {children}
        </main>
      </div>
    </div>
  );
}
