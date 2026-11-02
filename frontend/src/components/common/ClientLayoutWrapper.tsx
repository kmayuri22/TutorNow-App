"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import useWebSocket from "@/services/websocket";
import { supabaseSubscribeToNotifications } from "@/services/supabaseService";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { 
  X, Bell, Home, Search, LayoutDashboard, User, LogIn, Download
} from "lucide-react";

interface ToastMessage {
  id: number;
  message: string;
}

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { theme, userId, token, isAuthenticated, role, name } = useStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Initialize WebSockets when userId is available
  useWebSocket(userId);

  // Synchronize CSS class for light/dark mode & register Service Worker for PWA
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    // Force purge old PWA caches and update Service Worker
    if (typeof window !== "undefined") {
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            // Delete any old tutornow cache
            if (name.includes("tutornow") || name.includes("workbox") || name.includes("jitsi")) {
              caches.delete(name);
            }
          });
        });
      }

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.update();
          }
        });
        navigator.serviceWorker
          .register("/sw.js?v=2")
          .then((reg) => {
            reg.update();
            console.log("[PWA Service Worker] Registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA Service Worker] Registration failed:", err);
          });
      }
    }

    // Capture Android Chrome PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [theme]);

  // Real-time notification subscription via Supabase Realtime
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = supabaseSubscribeToNotifications(userId, (notif) => {
      if (notif?.message) {
        setToast({
          id: notif.id || Date.now(),
          message: notif.message,
        });

        // Clear toast after 6s
        setTimeout(() => {
          setToast(null);
        }, 6000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Listen to window-level custom events from WebSocket system to show toasts
  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      
      setToast({
        id: data.id || Date.now(),
        message: data.message,
      });

      // Clear toast automatically after 6 seconds
      const timer = setTimeout(() => {
        setToast(null);
      }, 6000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("tutor_notification", handleNotification);
    return () => window.removeEventListener("tutor_notification", handleNotification);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  const getDashboardLink = () => {
    if (role === "Student") return "/student/dashboard";
    if (role === "Tutor") return "/tutor/dashboard";
    if (role === "Admin") return "/admin/dashboard";
    return "/login";
  };

  const getProfileLink = () => {
    if (role === "Student") return "/student/profile";
    if (role === "Tutor") return "/tutor/profile";
    return "/admin/dashboard";
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors flex flex-col">
        <div className="h-16 border-b bg-white flex items-center justify-between px-8">
          <div className="w-24 h-6 bg-slate-200 rounded animate-pulse"></div>
          <div className="w-48 h-8 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <main className="flex-1 max-w-7xl mx-auto w-full p-8">
          <div className="space-y-4">
            <div className="h-40 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-20 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 pb-16 md:pb-0">
      <Navbar />

      {/* PWA Install Banner (Android / Desktop Install prompt) */}
      {showInstallBanner && installPrompt && (
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 shrink-0" />
            <span>Install TutorNow on your device for fast access & offline support</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 bg-white text-primary-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 hover:bg-white/20 rounded-md transition"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full">{children}</main>
      
      <Footer />

      {/* Responsive Mobile Bottom Navigation Bar (Phone / PWA Viewport) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-2 safe-area-bottom">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition ${
            pathname === "/" ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <Link
          href={isAuthenticated && role === "Student" ? "/student/tutors" : "/tutors"}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition ${
            pathname === "/tutors" || pathname === "/student/tutors" ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Search className="h-5 w-5" />
          <span>Find Tutors</span>
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              href={getDashboardLink()}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition ${
                pathname.includes("/dashboard") ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href={getProfileLink()}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition ${
                pathname.includes("/profile") ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition ${
              pathname === "/login" ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <LogIn className="h-5 w-5" />
            <span>Log In</span>
          </Link>
        )}
      </div>

      {/* Global Slide-In Toast Notification Portal */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 transform transition-all duration-300 translate-y-0 flex items-start gap-3 animate-bounce-short">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 mt-0.5">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <span className="font-bold text-xs block">Live Notification</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
