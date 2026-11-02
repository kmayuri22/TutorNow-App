"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { useStore } from "@/store/useStore";
import { supabaseSubscribeToBookings } from "@/services/supabaseService";
import { 
  Calendar, Clock, Check, X, 
  Loader2, AlertCircle, TrendingUp, Users, Star, MapPin, Navigation,
  ToggleLeft, ToggleRight, ShieldCheck, IndianRupee
} from "lucide-react";
import { useRouter } from "next/navigation";

import { getSessionStatusLabel } from "@/lib/dateTime";

interface Student {
  name: string;
  email: string;
}


interface Booking {
  id: number;
  booking_date: string;
  session_time: string;
  status: string;
  payment_status: string;
  session_type: "IN_PERSON" | "VIDEO_CALL";
  student?: Student | null;
  student_name?: string;
}

interface Payment {
  id: number;
  amount: number;
  status: string;
}

export default function TutorDashboard() {
  const router = useRouter();
  const userName = useStore((state) => state.name) || "Tutor";
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalEarnings: 0.0,
    pendingRequests: 0,
    totalSessions: 0
  });

  const loadTutorData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      let bookingsList = [];
      let paymentsList = [];
      try {
        const [bookingsRes, paymentsRes, profileRes] = await Promise.all([
          api.get("/api/bookings"),
          api.get("/api/payments/history"),
          api.get("/api/auth/profile")
        ]);
        bookingsList = bookingsRes.data || [];
        paymentsList = paymentsRes.data || [];
        if (profileRes.data?.tutor_details) {
          setIsOnline(profileRes.data.tutor_details.is_online || false);
        }
      } catch (apiErr) {
        console.warn("API fetch fallback to Supabase cloud:", apiErr);
        const userId = useStore.getState().userId;
        if (userId) {
          const { supabaseGetBookings } = await import("@/services/supabaseService");
          bookingsList = await supabaseGetBookings(userId, "Tutor");
        }
      }

      setBookings(bookingsList);
      setPayments(paymentsList);

      // Calculate stats
      const totalSessions = bookingsList.filter((b: any) => b.status === "Accepted").length;
      const pendingRequests = bookingsList.filter((b: any) => b.status === "Pending").length;
      const totalEarnings = paymentsList
        .filter((p: any) => p.status === "Success")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      setStats({ totalEarnings, pendingRequests, totalSessions });
      setError(null);
    } catch (err) {
      console.error("Tutor dashboard data notice:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial fetch shows skeleton loader once
    loadTutorData(true);

    // Direct Supabase Realtime channel subscription - updates in-place with NO flicker
    const unsubscribeSupabase = supabaseSubscribeToBookings((payload) => {
      console.log("[Tutor Realtime Update]:", payload);
      loadTutorData(false);
    });

    const handleRealTimeEvent = () => {
      loadTutorData(false);
    };

    window.addEventListener("tutor_notification", handleRealTimeEvent);
    window.addEventListener("booking_status_updated", handleRealTimeEvent);
    window.addEventListener("payment_status_updated", handleRealTimeEvent);

    return () => {
      unsubscribeSupabase();
      window.removeEventListener("tutor_notification", handleRealTimeEvent);
      window.removeEventListener("booking_status_updated", handleRealTimeEvent);
      window.removeEventListener("payment_status_updated", handleRealTimeEvent);
    };
  }, []);

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await api.patch("/api/tutors/online-status", null, {
        params: { is_online: nextStatus }
      });
    } catch (err) {
      console.error("Failed to update live status", err);
      setIsOnline(!nextStatus);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await api.put(`/api/bookings/${id}/accept`);
      loadTutorData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Accept failed");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/api/bookings/${id}/reject`);
      loadTutorData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Reject failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <div className="h-28 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const pendingRequestsList = bookings.filter((b) => b.status === "Pending");
  const activeSchedules = bookings.filter((b) => b.status === "Accepted" || b.status === "Completed");

  return (
    <div className="space-y-8 text-left">
      
      {/* Welcome Banner with Real User Name & Online Availability Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">Welcome Back, {userName}!</h1>
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-600" /> Verified Approved Tutor
            </span>
          </div>
          <p className="text-xs text-slate-450 mt-1">Manage student session requests, schedule slots, and track earnings in ₹ INR.</p>
        </div>

        {/* Live Availability Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Live Availability</span>
            <span className={`text-xs font-bold ${isOnline ? "text-green-600" : "text-slate-400"}`}>
              {isOnline ? "● Accepting Bookings" : "○ Busy / Away"}
            </span>
          </div>
          <button onClick={handleToggleOnline} className="focus:outline-none">
            {isOnline ? (
              <ToggleRight className="h-8 w-8 text-green-600 transition" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-slate-400 transition" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards in ₹ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/45 text-green-600 dark:text-green-400 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold text-green-600 dark:text-green-400">₹{stats.totalEarnings.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Earnings (₹)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/45 text-amber-500 dark:text-amber-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{stats.pendingRequests}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Requests</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/45 text-primary-600 dark:text-primary-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{stats.totalSessions}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Lessons</span>
          </div>
        </div>
      </div>

      {/* Main Content split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Earnings graph */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="font-bold text-sm">Revenue Breakdown</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Earnings track for tutoring sessions in ₹ INR</p>
          </div>
          <div className="flex-1 flex gap-4 items-end justify-between h-44 border-b dark:border-slate-800 pb-3 pt-6 px-4">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, idx) => (
              <div key={month} className="flex flex-col items-center gap-2 w-full">
                <div 
                  className={`w-8 rounded-t-lg transition-all hover:bg-primary-500 ${
                    idx === 5 ? "bg-primary-600 h-32" : "bg-slate-200 dark:bg-slate-800 h-12"
                  }`}
                ></div>
                <span className="text-[10px] text-slate-400 font-semibold">{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Requests Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-sm">Pending Student Requests ({pendingRequestsList.length})</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Approve or decline incoming student bookings</p>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-64 pr-1">
            {pendingRequestsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl p-4 self-center w-full">
                No pending student requests.
              </div>
            ) : (
              pendingRequestsList.map((req) => (
                <div key={req.id} className="p-3.5 border dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs block">{req.student?.name || req.student_name || "Student"}</span>
                      <span className="text-[10px] font-semibold flex items-center gap-1 text-sky-600 dark:text-sky-400">
                        <MapPin className="h-3 w-3" />
                        In-Person
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">{req.booking_date} ({req.session_time})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="flex-1 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold flex justify-center items-center gap-1 shadow-sm transition"
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 py-1.5 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 text-[10px] font-bold flex justify-center items-center gap-1 transition"
                    >
                      <X className="h-3 w-3" />
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Scheduled Sessions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-bold text-sm">Scheduled Active Sessions</h2>
        </div>

        <div className="overflow-x-auto">
          {activeSchedules.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No active sessions accepted yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Student Name</th>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Time Slot</th>
                  <th className="px-6 py-3 text-left">Payment Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {activeSchedules.map((booking) => {
                  const statusInfo = getSessionStatusLabel(booking.booking_date, booking.session_time, booking.status);

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-semibold">{booking.student?.name || booking.student_name || "Student"}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                          <MapPin className="h-3.5 w-3.5" />
                          In-Person
                        </span>
                      </td>
                      <td className="px-6 py-4">{booking.booking_date}</td>
                      <td className="px-6 py-4">
                        <span className="block text-xs font-semibold">{booking.session_time}</span>
                        <span className={`text-[10px] font-bold block mt-0.5 ${
                          statusInfo.label === "Ready to Start" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                        }`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          booking.payment_status === "Paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {booking.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/tutor/session/${booking.id}`)}
                            className={`px-3 py-1.5 rounded-xl text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition ${
                              booking.status === "Completed"
                                ? "bg-slate-700 hover:bg-slate-800"
                                : "bg-sky-600 hover:bg-sky-700"
                            }`}
                          >
                            <Navigation className="h-3 w-3" />
                            {booking.status === "Completed"
                              ? "Session Completed"
                              : "Live Tracking & Session"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
