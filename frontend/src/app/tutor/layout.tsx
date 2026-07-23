"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import Link from "next/link";
import api from "@/services/api";
import { 
  User, LayoutDashboard, Calendar, CreditCard, 
  Settings, LogOut, Loader2, BookOpen, CalendarDays, ClipboardList
} from "lucide-react";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, role, logout } = useStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?msg=unauthorized");
    } else if (role !== "Tutor") {
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
          <p className="text-sm font-semibold">Authenticating tutor session...</p>
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
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r py-6 px-4 shrink-0 text-left">
        <div className="px-3 pb-6 border-b mb-6">
          <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">Tutor Portal</span>
        </div>
        
        <div className="flex-1 flex flex-col gap-1.5">
          <Link href="/tutor/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <LayoutDashboard className="h-4.5 w-4.5 text-primary-500" />
            Dashboard
          </Link>
          <Link href="/tutor/availability" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <CalendarDays className="h-4.5 w-4.5 text-indigo-500" />
            My Schedule
          </Link>
          <Link href="/tutor/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition">
            <User className="h-4.5 w-4.5 text-slate-400" />
            My Profile
          </Link>
        </div>

        <div className="border-t pt-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-sm font-semibold text-slate-600 dark:text-slate-350 transition text-left"
          >
            <LogOut className="h-4.5 w-4.5 text-slate-400" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
