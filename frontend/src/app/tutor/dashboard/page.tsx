"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { 
  Calendar, Clock, DollarSign, Check, X, 
  Loader2, AlertCircle, TrendingUp, Users, Star, MapPin, Video
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  student: Student;
}

interface Payment {
  id: number;
  amount: number;
  status: string;
}

export default function TutorDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalEarnings: 0.0,
    pendingRequests: 0,
    totalSessions: 0
  });

  const loadTutorData = async () => {
    try {
      const bookingsRes = await api.get("/api/bookings");
      setBookings(bookingsRes.data);

      const paymentsRes = await api.get("/api/payments/history");
      setPayments(paymentsRes.data);

      // Calculates stats
      const totalSessions = bookingsRes.data.filter((b: Booking) => b.status === "Accepted").length;
      const pendingRequests = bookingsRes.data.filter((b: Booking) => b.status === "Pending").length;
      const totalEarnings = paymentsRes.data
        .filter((p: Payment) => p.status === "Success")
        .reduce((sum: number, p: Payment) => sum + p.amount, 0);

      setStats({ totalEarnings, pendingRequests, totalSessions });
    } catch (err) {
      console.error(err);
      setError("Failed to load tutor statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutorData();
  }, []);

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

  // Filter incoming bookings vs completed bookings
  const pendingRequests = bookings.filter((b) => b.status === "Pending");
  const activeSchedules = bookings.filter((b) => b.status === "Accepted");

  return (
    <div className="space-y-8 text-left">
      
      {/* Welcome details */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Welcome Back, Dr. Jenkins!</h1>
          <p className="text-xs text-slate-450 mt-1">Manage availability slots, incoming booking approvals, and earnings statistics.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/45 text-green-600 dark:text-green-400 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">${stats.totalEarnings.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Earnings</span>
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

      {/* Interactive Charts & Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Earnings graph - CSS-driven Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="font-bold text-sm">Monthly Earnings Overview</h2>
            <p className="text-[10px] text-slate-400 mt-1">Platform statistics tracking monthly tutor revenues</p>
          </div>
          <div className="flex-1 flex gap-4 items-end justify-between h-48 border-b dark:border-slate-800 pb-3 pt-6 px-4">
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-10 transition-all hover:bg-primary-500"></div>
              <span className="text-[10px] text-slate-405 font-semibold">Jan</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-16 transition-all hover:bg-primary-500"></div>
              <span className="text-[10px] text-slate-405 font-semibold">Feb</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-12 transition-all hover:bg-primary-500"></div>
              <span className="text-[10px] text-slate-405 font-semibold">Mar</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-24 transition-all hover:bg-primary-500"></div>
              <span className="text-[10px] text-slate-405 font-semibold">Apr</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-28 transition-all hover:bg-primary-500"></div>
              <span className="text-[10px] text-slate-405 font-semibold">May</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full">
              {/* Highlight active month */}
              <div className="w-8 bg-primary-600 rounded-t-lg h-36 transition-all hover:bg-primary-700 relative">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-750 px-1 py-0.5 rounded shadow">
                  ${stats.totalEarnings}
                </span>
              </div>
              <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold">Jun</span>
            </div>
          </div>
        </div>

        {/* Pending Approval Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-sm">Incoming Requests ({pendingRequests.length})</h2>
            <p className="text-[10px] text-slate-400 mt-1">Approve or reject booking requests below</p>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-60 pr-1">
            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-450 border border-dashed rounded-xl p-4 self-center w-full">
                No pending requests currently.
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="p-3 border dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20 flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs block">{req.student.name}</span>
                      <span className="text-[10px] font-semibold flex items-center gap-1 text-slate-500">
                        {req.session_type === "IN_PERSON" ? (
                          <MapPin className="h-3 w-3 text-sky-600" />
                        ) : (
                          <Video className="h-3 w-3 text-indigo-600" />
                        )}
                        {req.session_type === "IN_PERSON" ? "In-Person" : "Video"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">{req.booking_date} ({req.session_time})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold flex justify-center items-center gap-1 shadow-sm transition"
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 text-[10px] font-bold flex justify-center items-center gap-1 transition"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bookings table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-bold text-sm">Scheduled Sessions & Logs</h2>
        </div>

        <div className="overflow-x-auto">
          {activeSchedules.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No sessions active currently.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Student</th>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Schedule Date</th>
                  <th className="px-6 py-3 text-left">Session Period</th>
                  <th className="px-6 py-3 text-left">Payment Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-850">
                {activeSchedules.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-semibold">{booking.student.name}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-350">
                        {booking.session_type === "IN_PERSON" ? (
                          <MapPin className="h-3.5 w-3.5 text-sky-600" />
                        ) : (
                          <Video className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        )}
                        {booking.session_type === "IN_PERSON" ? "In-Person" : "Video Call"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{booking.booking_date}</td>
                    <td className="px-6 py-4">{booking.session_time}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        booking.payment_status === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400" :
                        "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                      }`}>
                        {booking.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => router.push(`/tutor/session/${booking.id}`)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition animate-pulse-subtle"
                        >
                          <Video className="h-3 w-3" />
                          Start Classroom
                        </button>
                        
                        <button
                          onClick={() => handleReject(booking.id)}
                          className="px-2.5 py-1 rounded border border-red-200 dark:border-red-850 hover:bg-red-50 text-[10px] font-bold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
