"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { 
  Users, Award, Calendar, DollarSign, Check, X, 
  Trash2, Loader2, AlertCircle, ShieldAlert, BarChart3, UserCheck
} from "lucide-react";

interface TutorDetails {
  id: number;
  subject: string;
  hourly_rate: number;
  is_verified: boolean;
  rating: number;
}

interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  tutor_details?: TutorDetails;
}

interface Booking {
  id: number;
  booking_date: string;
  session_time: string;
  status: string;
  payment_status: string;
  student: { name: string };
  tutor: { user: { name: string } };
}

interface Analytics {
  total_students: number;
  total_tutors: number;
  total_bookings: number;
  total_payments: number;
  pending_bookings: number;
  completed_bookings: number;
  popular_subjects: { subject: string; count: number }[];
  recent_bookings: Booking[];
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "bookings">("users");

  const loadAdminData = async () => {
    try {
      const analyticsRes = await api.get("/api/admin/analytics");
      setAnalytics(analyticsRes.data);

      const usersRes = await api.get("/api/admin/users");
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load administration reports. Ensure API is online.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleVerify = async (tutorId: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await api.put(`/api/admin/tutors/${tutorId}/verify`, null, {
        params: { is_verified: nextStatus }
      });
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Verification status update failed.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to permanently delete this user account? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Delete user failed.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <div className="h-28 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg">{error}</h3>
        <button onClick={loadAdminData} className="mt-4 px-6 py-2 bg-slate-200 rounded-xl font-semibold">
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Platform Analytics Dashboard</h1>
        <p className="text-xs text-slate-455 mt-1">Review system metrics, audit logs, verify tutor profiles, and manage accounts.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{analytics.total_students}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Students</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-xl">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{analytics.total_tutors}</span>
            <span className="text-[10px] text-slate-405 font-semibold uppercase">Registered Tutors</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-450 rounded-xl">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{analytics.total_bookings}</span>
            <span className="text-[10px] text-slate-405 font-semibold uppercase">Total Bookings</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">${analytics.total_payments.toFixed(2)}</span>
            <span className="text-[10px] text-slate-405 font-semibold uppercase">Total Revenue</span>
          </div>
        </div>
      </div>

      {/* Analytics Visual split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Popular Subjects Chart (CSS progress bars) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div>
            <h2 className="font-bold text-sm">Popular Subjects Breakdown</h2>
            <p className="text-[10px] text-slate-405 mt-1">Booked subjects distribution on platform</p>
          </div>
          <div className="flex flex-col gap-4">
            {analytics.popular_subjects.map((sub, idx) => {
              // Calculate percent dynamically
              const maxCount = Math.max(...analytics.popular_subjects.map(s => s.count), 1);
              const percent = Math.round((sub.count / maxCount) * 100);
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{sub.subject}</span>
                    <span className="text-slate-450">{sub.count} bookings</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System info / Stats summary */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-bold text-sm">Booking Success Funnel</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Pending Bookings</span>
                <span className="font-bold">{analytics.pending_bookings} sessions</span>
              </div>
              <div className="flex justify-between">
                <span>Accepted Sessions</span>
                <span className="font-bold">{analytics.completed_bookings} sessions</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-450 leading-relaxed">
              Tutors verify availability schedule slots. When student registers bookings, slots status transforms to Booked and transaction records are archived.
            </p>
          </div>
        </div>

      </div>

      {/* Tabs Menu Controls */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === "users" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Manage Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === "bookings" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Recent Bookings Ledger
        </button>
      </div>

      {/* Conditional Panels */}
      {activeTab === "users" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Verified Status</th>
                  <th className="px-6 py-3 text-left">Subject/Expertise</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-850">
                {users.map((user) => {
                  const isTutor = user.role === "Tutor";
                  const verified = user.tutor_details?.is_verified;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-semibold">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.role === "Admin" ? "bg-red-100 text-red-805 dark:bg-red-950/25" :
                          user.role === "Tutor" ? "bg-amber-100 text-amber-805 dark:bg-amber-950/25" :
                          "bg-primary-100 text-primary-805 dark:bg-primary-950/25"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isTutor && user.tutor_details ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            verified ? "bg-green-100 text-green-800 dark:bg-green-950/20" : "bg-red-100 text-red-800 dark:bg-red-950/20"
                          }`}>
                            {verified ? "Verified" : "Pending Approval"}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isTutor && user.tutor_details ? (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full">
                            {user.tutor_details.subject}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isTutor && user.tutor_details && (
                            <button
                              onClick={() => handleToggleVerify(user.tutor_details!.id, verified || false)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold shadow-sm transition ${
                                verified 
                                  ? "border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300" 
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                            >
                              {verified ? "Suspend Profile" : "Verify/Approve"}
                            </button>
                          )}
                          
                          {user.role !== "Admin" && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1 border rounded-lg text-slate-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Booking ID</th>
                  <th className="px-6 py-3 text-left">Student</th>
                  <th className="px-6 py-3 text-left">Tutor</th>
                  <th className="px-6 py-3 text-left">Schedule</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-850">
                {analytics.recent_bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-semibold">#{booking.id}</td>
                    <td className="px-6 py-4">{booking.student.name}</td>
                    <td className="px-6 py-4">{booking.tutor.user.name}</td>
                    <td className="px-6 py-4">
                      <span className="block text-xs font-semibold">{booking.booking_date}</span>
                      <span className="text-[10px] text-slate-400">{booking.session_time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        booking.status === "Pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20" :
                        booking.status === "Accepted" ? "bg-green-100 text-green-800 dark:bg-green-950/20" :
                        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        booking.payment_status === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-950/20" : "bg-red-100 text-red-800 dark:bg-red-950/20"
                      }`}>
                        {booking.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
