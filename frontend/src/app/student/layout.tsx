"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import Link from "next/link";
import api from "@/services/api";
import {
  User, LayoutDashboard, Calendar, CreditCard,
  Settings, LogOut, Loader2, BookOpen, BrainCircuit, Library
} from "lucide-react";

// Bottom nav items for mobile
const MOBILE_NAV = [
  { href: "/student/dashboard",      label: "Dashboard",  icon: LayoutDashboard, color: "text-primary-500"  },
  { href: "/student/tutors",         label: "Find Tutors", icon: BookOpen,        color: "text-indigo-500"  },
  { href: "/student/ai-assistant",   label: "AI Tutor",    icon: BrainCircuit,    color: "text-purple-500"  },
  { href: "/student/rag-assistant",  label: "Study KB",    icon: Library,         color: "text-teal-500"    },
  { href: "/student/profile",        label: "Profile",     icon: User,            color: "text-slate-400"   },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, role, logout } = useStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?msg=unauthorized");
    } else if (role !== "Student") {
      router.push("/");
    } else {
      setAuthorized(true);
    }
  }, [isAuthenticated, role, router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold">Authenticating student session...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {
      console.warn("Logout notice:", e);
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950/20">

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r py-6 px-4 shrink-0 text-left">
        <div className="px-3 pb-6 border-b mb-6">
          <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">Student Portal</span>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <Link href="/student/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <LayoutDashboard className="h-4 w-4 text-primary-500" />
            Dashboard
          </Link>
          <Link href="/student/tutors" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Find Tutors
          </Link>
          <Link href="/student/ai-assistant" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <BrainCircuit className="h-4 w-4 text-purple-500" />
            AI Learning Assistant
          </Link>
          <Link href="/student/rag-assistant" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <Library className="h-4 w-4 text-teal-500" />
            Study Knowledge Base
          </Link>
          <Link href="/student/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <User className="h-4 w-4 text-slate-400" />
            My Profile
          </Link>
        </div>

        <div className="border-t pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-sm font-semibold text-slate-600 dark:text-slate-350 transition text-left"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Extra bottom padding on mobile so content isn't hidden behind the nav bar */}
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ─────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex items-center justify-around h-16">
          {MOBILE_NAV.map(({ href, label, icon: Icon, color }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
                  isActive
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <div className={`relative ${isActive ? "scale-110" : ""} transition-transform`}>
                  <Icon className={`h-5 w-5 ${isActive ? "text-purple-600 dark:text-purple-400" : color}`} />
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-purple-600 dark:text-purple-400" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
