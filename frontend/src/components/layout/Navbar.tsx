"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { 
  Menu, X, Sun, Moon, Bell, LogOut, User, BookOpen, 
  Settings, LayoutDashboard, ShieldCheck, CheckCircle
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    token, role, name, userId, isAuthenticated, logout,
    theme, toggleTheme, notifications, unreadCount, setNotifications, markAsRead
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Load notifications from server on mount & auth change
  useEffect(() => {
    if (isAuthenticated) {
      api.get("/api/notifications")
        .then((res) => setNotifications(res.data))
        .catch((err) => console.warn("Error loading notifications", err));
    }
  }, [isAuthenticated, setNotifications]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    router.push("/");
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      markAsRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadAll = async () => {
    try {
      await api.put("/api/notifications/read-all");
      // Load updated notification list
      const res = await api.get("/api/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getDashboardLink = () => {
    if (role === "Student") return "/student/dashboard";
    if (role === "Tutor") return "/tutor/dashboard";
    if (role === "Admin") return "/admin/dashboard";
    return "/";
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
              <BookOpen className="h-6 w-6" />
              <span>TutorNow</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`text-sm font-medium transition-colors ${pathname === "/" ? "text-primary-600 dark:text-primary-400" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>
              Home
            </Link>
            <Link href="/tutors" className={`text-sm font-medium transition-colors ${pathname === "/tutors" ? "text-primary-600 dark:text-primary-400" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>
              Find Tutors
            </Link>
            <Link href="/about" className={`text-sm font-medium transition-colors ${pathname === "/about" ? "text-primary-600 dark:text-primary-400" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>
              About
            </Link>
            <Link href="/faq" className={`text-sm font-medium transition-colors ${pathname === "/faq" ? "text-primary-600 dark:text-primary-400" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>
              FAQ
            </Link>
            <Link href="/contact" className={`text-sm font-medium transition-colors ${pathname === "/contact" ? "text-primary-600 dark:text-primary-400" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>
              Contact
            </Link>
          </div>

          {/* User Controls / Utility */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white dark:bg-slate-800 shadow-xl py-2 z-50">
                      <div className="px-4 py-2 border-b flex justify-between items-center">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={handleReadAll} className="text-xs text-primary-500 hover:underline">
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => notif.status === "Unread" && handleMarkRead(notif.id)}
                              className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0 ${notif.status === "Unread" ? "bg-primary-50/50 dark:bg-primary-950/20" : ""}`}
                            >
                              <div className="flex-1">
                                <p className="text-xs text-slate-800 dark:text-slate-200">{notif.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {notif.status === "Unread" && (
                                <span className="h-2 w-2 rounded-full bg-primary-500 self-center"></span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile User Dropdown */}
                <div className="relative" ref={userRef}>
                  <button 
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {name ? name.charAt(0) : "U"}
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white dark:bg-slate-800 shadow-xl py-1 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold truncate">{name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{role}</p>
                      </div>
                      <Link 
                        href={getDashboardLink()} 
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                      {role !== "Admin" && (
                        <Link 
                          href={role === "Student" ? "/student/profile" : "/tutor/profile"} 
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                        >
                          <User className="h-4 w-4" />
                          My Profile
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400">
                  Log In
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Burger Icon */}
          <div className="md:hidden flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white dark:bg-slate-900 py-3 px-4 flex flex-col gap-2 transition-all">
          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-base font-medium ${pathname === "/" ? "bg-slate-50 dark:bg-slate-800 text-primary-500" : "text-slate-600 dark:text-slate-300"}`}
          >
            Home
          </Link>
          <Link 
            href="/tutors" 
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-base font-medium ${pathname === "/tutors" ? "bg-slate-50 dark:bg-slate-800 text-primary-500" : "text-slate-600 dark:text-slate-300"}`}
          >
            Find Tutors
          </Link>
          <Link 
            href="/about" 
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-base font-medium ${pathname === "/about" ? "bg-slate-50 dark:bg-slate-800 text-primary-500" : "text-slate-600 dark:text-slate-300"}`}
          >
            About
          </Link>
          <Link 
            href="/faq" 
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-base font-medium ${pathname === "/faq" ? "bg-slate-50 dark:bg-slate-800 text-primary-500" : "text-slate-600 dark:text-slate-300"}`}
          >
            FAQ
          </Link>
          <Link 
            href="/contact" 
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-base font-medium ${pathname === "/contact" ? "bg-slate-50 dark:bg-slate-800 text-primary-500" : "text-slate-600 dark:text-slate-300"}`}
          >
            Contact
          </Link>
          
          <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <Link 
                  href={getDashboardLink()} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-2 text-base font-medium text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-2">
                <Link 
                  href="/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold border rounded-lg"
                >
                  Log In
                </Link>
                <Link 
                  href="/register" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
