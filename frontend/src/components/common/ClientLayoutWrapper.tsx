"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import useWebSocket from "@/services/websocket";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { X, Info, CheckCircle, Bell } from "lucide-react";

interface ToastMessage {
  id: number;
  message: string;
}

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { theme, userId, token } = useStore();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Initialize WebSockets when userId is available
  useWebSocket(userId);

  // Synchronize CSS class for light/dark mode
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, [theme]);

  // Listen to window-level custom events from our WebSocket system to show toasts
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

  if (!mounted) {
    // Return structured skeleton placeholder to prevent hydration flashes
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
      <Footer />

      {/* Global Slide-In Toast Notification Portal */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 transform transition-all duration-300 translate-y-0 flex items-start gap-3 animate-bounce-short">
          <div className="p-1 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 mt-0.5">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm block">Alert Update</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
