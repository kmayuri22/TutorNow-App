"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Users, Award, Calendar, Check, X,
  Trash2, Loader2, AlertCircle, ShieldAlert, BarChart3, UserCheck,
  Clock, FileText, ExternalLink, Ban, RotateCcw, CreditCard, Shield,
  Search, Eye
} from "lucide-react";

interface TutorDocument {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  doc_label?: string;
  uploaded_at: string;
}

interface PendingTutor {
  id: number;
  user_id: number;
  name: string;
  email: string;
  mobile?: string;
  qualification: string;
  specialization?: string;
  subject: string;
  experience: number;
  hourly_rate: number;
  languages?: string;
  teaching_mode?: string;
  location_city?: string;
  bio?: string;
  status: string;
  registered_at: string;
  documents: TutorDocument[];
}

interface UserAccount {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  role: string;
  is_suspended: boolean;
  created_at: string;
  tutor_details?: {
    id: number;
    subject: string;
    qualification: string;
    hourly_rate: number;
    is_verified: boolean;
    status: string;
    rating: number;
    documents?: TutorDocument[];
  };
}

interface BookingRecord {
  id: number;
  student_name: string;
  tutor_name: string;
  booking_date?: string;
  session_time: string;
  session_type: string;
  status: string;
  payment_status: string;
  subject?: string;
  amount?: number;
  created_at?: string;
}

interface PaymentRecord {
  id: number;
  receipt_number?: string;
  booking_id: number;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: string;
  created_at?: string;
  student_name: string;
  tutor_name: string;
}

interface LoginAuditLog {
  id: number;
  user_id?: number;
  name: string;
  email: string;
  role?: string;
  ip_address?: string;
  device_info?: string;
  login_status: string;
  failure_reason?: string;
  login_time: string;
  logout_time?: string;
}

interface Analytics {
  total_students: number;
  total_tutors: number;
  pending_tutors: number;
  approved_tutors: number;
  total_bookings: number;
  total_payments: number;
  pending_bookings: number;
  completed_bookings: number;
  popular_subjects: { subject: string; count: number }[];
  recent_bookings: any[];
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pendingTutors, setPendingTutors] = useState<PendingTutor[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginAuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "analytics" | "pending" | "tutors" | "students" | "bookings" | "payments" | "audit"
  >("analytics");

  // Rejection modal
  const [rejectingTutorId, setRejectingTutorId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, pendingRes, usersRes, bookingsRes, paymentsRes, historyRes] =
        await Promise.all([
          api.get("/api/admin/analytics"),
          api.get("/api/admin/tutors/pending"),
          api.get("/api/admin/users"),
          api.get("/api/admin/bookings"),
          api.get("/api/admin/payments"),
          api.get("/api/admin/login-history"),
        ]);

      setAnalytics(analyticsRes.data);
      setPendingTutors(pendingRes.data);
      setUsers(usersRes.data);
      setBookings(bookingsRes.data);
      setPayments(paymentsRes.data);
      setLoginHistory(historyRes.data.records || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin metrics. Ensure API server is online.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleTutorAction = async (tutorId: number, action: "approve" | "reject" | "request_changes", reason?: string) => {
    try {
      setActionLoading(true);
      await api.put(`/api/admin/tutors/${tutorId}/action`, { action, reason });
      setRejectingTutorId(null);
      setRejectionReason("");
      await loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Tutor action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspend = async (userId: number, currentSuspended: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}/suspend`, null, {
        params: { suspend: !currentSuspended },
      });
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Suspension update failed.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to permanently delete this user account and all associated data?")) return;
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
        <button onClick={loadAdminData} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl font-semibold">
          Retry Load
        </button>
      </div>
    );
  }

  const tutorsList = users.filter((u) => u.role === "Tutor");
  const studentsList = users.filter((u) => u.role === "Student");

  return (
    <div className="space-y-8 text-left">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            Admin Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">Review tutor applications, verify qualifications, monitor revenue, and audit system security.</p>
        </div>
        {pendingTutors.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <Clock className="h-4 w-4 text-amber-500" />
            {pendingTutors.length} Tutor Application{pendingTutors.length > 1 ? "s" : ""} Pending Review
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">{analytics.total_students}</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Students</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">{analytics.total_tutors}</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Tutors</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 shadow-sm bg-amber-50/30 dark:bg-amber-950/10">
          <span className="block text-2xl font-extrabold text-amber-600 dark:text-amber-400">{analytics.pending_tutors}</span>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase">Pending Tutors</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900/40 rounded-2xl p-4 shadow-sm bg-green-50/30 dark:bg-green-950/10">
          <span className="block text-2xl font-extrabold text-green-600 dark:text-green-400">{analytics.approved_tutors}</span>
          <span className="text-[10px] text-green-700 dark:text-green-300 font-bold uppercase">Approved Tutors</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="block text-2xl font-extrabold text-sky-600 dark:text-sky-400">{analytics.total_bookings}</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Bookings</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="block text-2xl font-extrabold text-primary-600 dark:text-primary-400">₹{analytics.total_payments.toFixed(0)}</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Revenue</span>
        </div>
      </div>

      {/* Tabs Menu Controls */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${activeTab === "analytics" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Analytics & Overview
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === "pending" ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Pending Approvals ({pendingTutors.length})
        </button>

        <button
          onClick={() => setActiveTab("tutors")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${activeTab === "tutors" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Manage Tutors ({tutorsList.length})
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${activeTab === "students" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Manage Students ({studentsList.length})
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${activeTab === "bookings" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Bookings Ledger ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${activeTab === "payments" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Payments & Receipts ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-3 font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${activeTab === "audit" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-slate-400 hover:text-slate-900"}`}
        >
          Login Audit Log ({loginHistory.length})
        </button>
      </div>

      {/* TAB 1: Analytics Overview */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h2 className="font-bold text-sm">Popular Subject Demand</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Most requested subjects booked by students</p>
            </div>
            <div className="flex flex-col gap-4">
              {analytics.popular_subjects.map((sub, idx) => {
                const maxCount = Math.max(...analytics.popular_subjects.map(s => s.count), 1);
                const percent = Math.round((sub.count / maxCount) * 100);
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{sub.subject}</span>
                      <span className="text-slate-400">{sub.count} bookings</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                      <div className="bg-primary-600 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <h2 className="font-bold text-sm">Session Status Breakdown</h2>
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span>Pending Sessions</span>
                  <span className="font-bold">{analytics.pending_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accepted Sessions</span>
                  <span className="font-bold">{analytics.completed_bookings}</span>
                </div>
                <div className="flex justify-between border-t dark:border-slate-800 pt-2 font-bold text-sm">
                  <span>Total Platform Revenue</span>
                  <span className="text-primary-600">₹{analytics.total_payments.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Pending Tutor Approvals Flow */}
      {activeTab === "pending" && (
        <div className="space-y-6">
          {pendingTutors.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 border rounded-2xl p-8 space-y-3">
              <Check className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="font-bold text-base">All caught up!</h3>
              <p className="text-xs text-slate-400">There are no pending tutor applications awaiting approval right now.</p>
            </div>
          ) : (
            pendingTutors.map((tutor) => (
              <div key={tutor.id} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 shadow-sm space-y-4">
                
                {/* Tutor Info Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base">{tutor.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 text-[10px] font-bold">
                        Pending Review
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Email: {tutor.email} • Mobile: {tutor.mobile || "N/A"} • City: {tutor.location_city || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-extrabold text-primary-600">₹{tutor.hourly_rate} / hr</span>
                    <span className="text-[10px] text-slate-400">Teaching Mode: {tutor.teaching_mode || "Online"}</span>
                  </div>
                </div>

                {/* Tutor Profile Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Qualification</span>
                    <span className="font-semibold">{tutor.qualification || "Not specified"}</span>
                    {tutor.specialization && <span className="block text-slate-500">Spec: {tutor.specialization}</span>}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Subjects & Experience</span>
                    <span className="font-semibold">{tutor.subject || "General"}</span>
                    <span className="block text-slate-500">{tutor.experience} Years Experience</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Languages Spoken</span>
                    <span className="font-semibold">{tutor.languages || "English"}</span>
                  </div>
                </div>

                {/* Bio if available */}
                {tutor.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl">
                    "{tutor.bio}"
                  </p>
                )}

                {/* Uploaded Qualification Documents */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary-500" />
                    Uploaded Qualification Certificates ({tutor.documents.length})
                  </span>
                  {tutor.documents.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">No documents uploaded during registration.</span>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {tutor.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={`/api/uploads/${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 border transition"
                        >
                          <FileText className="h-4 w-4 text-primary-500" />
                          <span>{doc.doc_label || doc.file_name}</span>
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 border-t dark:border-slate-800 pt-4 justify-end">
                  <button
                    onClick={() => handleTutorAction(tutor.id, "approve")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Approve Tutor Account
                  </button>

                  <button
                    onClick={() => setRejectingTutorId(tutor.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Reject Application
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Manage Tutors */}
      {activeTab === "tutors" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email / Mobile</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Subject & Fee</th>
                  <th className="px-6 py-3 text-left">Account Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {tutorsList.map((user) => {
                  const tp = user.tutor_details;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-semibold">{user.name}</td>
                      <td className="px-6 py-4">
                        <span className="block text-xs">{user.email}</span>
                        <span className="text-[10px] text-slate-400">{user.mobile || "No mobile"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tp?.status === "Approved" ? "bg-green-100 text-green-800 dark:bg-green-950/20" :
                          tp?.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-950/20" :
                          "bg-amber-100 text-amber-800 dark:bg-amber-950/20"
                        }`}>
                          {tp?.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-xs font-semibold">{tp?.subject || "General"}</span>
                        <span className="text-[10px] text-primary-600 font-bold">₹{tp?.hourly_rate || 0}/hr</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.is_suspended ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}>
                          {user.is_suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleToggleSuspend(user.id, user.is_suspended)}
                            className="px-2 py-1 rounded text-[10px] font-bold border hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            {user.is_suspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 border rounded-lg text-slate-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Manage Students */}
      {activeTab === "students" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Student Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Mobile</th>
                  <th className="px-6 py-3 text-left">Registered Date</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {studentsList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-semibold">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.mobile || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.is_suspended ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      }`}>
                        {user.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleToggleSuspend(user.id, user.is_suspended)}
                          className="px-2 py-1 rounded text-[10px] font-bold border hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          {user.is_suspended ? "Unsuspend" : "Suspend"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1 border rounded-lg text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Bookings Ledger */}
      {activeTab === "bookings" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Booking ID</th>
                  <th className="px-6 py-3 text-left">Student</th>
                  <th className="px-6 py-3 text-left">Tutor</th>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Schedule</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-semibold">#{booking.id}</td>
                    <td className="px-6 py-4">{booking.student_name}</td>
                    <td className="px-6 py-4">{booking.tutor_name}</td>
                    <td className="px-6 py-4 text-xs font-semibold">{booking.session_type}</td>
                    <td className="px-6 py-4 text-xs">
                      {booking.booking_date} ({booking.session_time})
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        booking.status === "Accepted" ? "bg-green-100 text-green-800" :
                        booking.status === "Pending" ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        booking.payment_status === "Paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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

      {/* TAB 6: Payments & Receipts */}
      {activeTab === "payments" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Receipt No</th>
                  <th className="px-6 py-3 text-left">Transaction ID</th>
                  <th className="px-6 py-3 text-left">Student</th>
                  <th className="px-6 py-3 text-left">Tutor</th>
                  <th className="px-6 py-3 text-left">Method</th>
                  <th className="px-6 py-3 text-left">Amount (₹)</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {payments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-mono text-xs font-bold">{pmt.receipt_number || `RCP-${pmt.id}`}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{pmt.transaction_id}</td>
                    <td className="px-6 py-4">{pmt.student_name}</td>
                    <td className="px-6 py-4">{pmt.tutor_name}</td>
                    <td className="px-6 py-4 text-xs font-semibold">{pmt.payment_method}</td>
                    <td className="px-6 py-4 font-bold text-primary-600">₹{pmt.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
                        {pmt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: Login Audit Log */}
      {activeTab === "audit" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">User / Email</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Login Time</th>
                  <th className="px-6 py-3 text-left">Logout Time</th>
                  <th className="px-6 py-3 text-left">IP Address</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {loginHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs">
                    <td className="px-6 py-3 font-semibold">
                      <span>{log.name || log.email}</span>
                      <span className="block text-[10px] text-slate-400">{log.email}</span>
                    </td>
                    <td className="px-6 py-3 font-semibold">{log.role || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(log.login_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {log.logout_time ? new Date(log.logout_time).toLocaleString() : "Active / N/A"}
                    </td>
                    <td className="px-6 py-3 font-mono text-[11px] text-slate-400">{log.ip_address}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.login_status === "Success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {log.login_status}
                      </span>
                      {log.failure_reason && (
                        <span className="block text-[9px] text-red-500 mt-0.5">{log.failure_reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingTutorId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-2xl flex flex-col gap-4 text-left shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base">Reject Tutor Application</h3>
              <button onClick={() => setRejectingTutorId(null)} className="p-1 hover:bg-slate-100 rounded">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Reason for Rejection</label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this profile was rejected (e.g. invalid document, insufficient qualification)..."
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectingTutorId(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTutorAction(rejectingTutorId, "reject", rejectionReason)}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
