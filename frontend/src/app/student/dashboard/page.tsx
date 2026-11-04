"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { useStore } from "@/store/useStore";
import { supabaseSubscribeToBookings } from "@/services/supabaseService";
import { 
  Calendar, CreditCard, Star, X, Loader2, DollarSign, 
  MessageSquare, AlertCircle, Clock, CheckCircle, MapPin, Video,
  Download, FileText, Smartphone, Building2
} from "lucide-react";
import { useRouter } from "next/navigation";

import { getSessionStatusLabel } from "@/lib/dateTime";
import AIMascot from "@/components/AIMascot";

interface User {
  name: string;
  email: string;
}


interface Tutor {
  id: number;
  subject: string;
  hourly_rate: number;
  user: User;
}

interface Booking {
  id: number;
  booking_date: string;
  session_time: string;
  status: string;
  payment_status: string;
  session_type: "IN_PERSON" | "VIDEO_CALL";
  tutor: Tutor;
}

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: string;
  transaction_id: string;
  receipt_number?: string;
  status: string;
  created_at?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const userName = useStore((state) => state.name) || "Student";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalLessons: 0,
    pendingLessons: 0,
    totalSpent: 0.0
  });

  // Pay Invoice Modal States
  const [activeBookingForPay, setActiveBookingForPay] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Paytm" | "Credit Card" | "Debit Card" | "Net Banking">("UPI");
  const [upiId, setUpiId] = useState("student@okaxis");
  const [paytmMobile, setPaytmMobile] = useState("9876543210");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [paying, setPaying] = useState(false);

  // Receipt Modal State
  const [viewReceipt, setViewReceipt] = useState<Payment | null>(null);

  // Review Modal States
  const [activeTutorForReview, setActiveTutorForReview] = useState<{ id: number; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const loadDashboardData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      let bookingsList = [];
      let paymentsList = [];
      try {
        const [bookingsRes, paymentsRes] = await Promise.all([
          api.get("/api/bookings"),
          api.get("/api/payments/history")
        ]);
        bookingsList = bookingsRes.data || [];
        paymentsList = paymentsRes.data || [];
      } catch (apiErr) {
        console.warn("API fetch fallback to Supabase cloud:", apiErr);
        const userId = useStore.getState().userId;
        if (userId) {
          const { supabaseGetBookings } = await import("@/services/supabaseService");
          bookingsList = await supabaseGetBookings(userId, "Student");
        }
      }

      setBookings(bookingsList);
      setPayments(paymentsList);

      // Aggregate statistics
      const totalLessons = bookingsList.length;
      const pendingLessons = bookingsList.filter((b: any) => b.status === "Pending").length;
      const totalSpent = paymentsList
        .filter((p: any) => p.status === "Success")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      setStats({ totalLessons, pendingLessons, totalSpent });
      setError(null);
    } catch (err) {
      console.error("Dashboard data load notice:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial fetch shows skeleton once
    loadDashboardData(true);

    // Supabase Realtime Direct Channel Subscription - updates in-place with NO flicker
    const unsubscribeSupabase = supabaseSubscribeToBookings((payload) => {
      console.log("[Student Realtime Update]:", payload);
      loadDashboardData(false);
    });

    const handleRealTimeEvent = () => {
      loadDashboardData(false);
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

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.put(`/api/bookings/${bookingId}/cancel`);
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cancellation failed");
    }
  };

  const handleProcessPayment = async () => {
    if (!activeBookingForPay) return;

    const finalUpi = upiId.trim() || "student@okaxis";
    const finalPaytm = paytmMobile.trim() || "9876543210";

    const effectiveAmount =
      activeBookingForPay.tutor?.hourly_rate && activeBookingForPay.tutor.hourly_rate > 0
        ? Number(activeBookingForPay.tutor.hourly_rate)
        : 500.0;

    setPaying(true);
    try {
      const res = await api.post("/api/payments", {
        booking_id: activeBookingForPay.id,
        payment_method: paymentMethod,
        amount: effectiveAmount,
        upi_id: finalUpi,
        paytm_mobile: finalPaytm
      });
      
      const createdPayment = res.data;

      // Update state immediately in UI without manual refresh
      setBookings((prev) =>
        prev.map((b) => (b.id === activeBookingForPay.id ? { ...b, payment_status: "Paid", status: b.status === "Pending" ? "Accepted" : b.status } : b))
      );

      setActiveBookingForPay(null);
      setViewReceipt(createdPayment);
      loadDashboardData();
    } catch (err: any) {
      const errorMsg =
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err.response?.data?.message || err.message || "Payment processing failed";
      alert(errorMsg);
    } finally {
      setPaying(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeTutorForReview) return;
    setReviewing(true);
    try {
      await api.post("/api/reviews", {
        tutor_id: activeTutorForReview.id,
        rating: rating,
        comment: comment
      });
      
      setActiveTutorForReview(null);
      setComment("");
      setRating(5);
      alert("Thank you for rating your tutor!");
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Review submission failed");
    } finally {
      setReviewing(false);
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

  return (
    <div className="space-y-8 text-left">
      
      {/* Welcome Banner with Real User Name */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold">Welcome Back, {userName}!</h1>
          <p className="text-xs text-slate-450 mt-1">Manage your active tutoring sessions, Indian payment receipts, and tutor bookings.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {/* AI Mascot — click for tips or to open AI Assistant */}
          <div className="hidden sm:block">
            <AIMascot studentName={userName} totalSessions={stats.totalLessons} />
          </div>
          <button
            onClick={() => router.push("/student/tutors")}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            + Book New Tutor
          </button>
        </div>
      </div>

      {/* Mobile mascot row — shown only on small screens */}
      <div className="flex justify-center sm:hidden">
        <AIMascot studentName={userName} totalSessions={stats.totalLessons} />
      </div>

      {/* Stats Cards in ₹ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{stats.totalLessons}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Sessions</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{stats.pendingLessons}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Requests</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">₹{stats.totalSpent.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Paid (₹)</span>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-bold text-sm">My Scheduled Sessions & Invoices</h2>
        </div>

        <div className="overflow-x-auto">
          {bookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No sessions booked yet. Click "+ Book New Tutor" to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Tutor</th>
                  <th className="px-6 py-3 text-left">Subject</th>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Schedule</th>
                  <th className="px-6 py-3 text-left">Fee (₹)</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Payment</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-800">
                {bookings.map((booking) => {
                  const matchingPayment = payments.find((p) => p.booking_id === booking.id && p.status === "Success");
                  const statusInfo = getSessionStatusLabel(booking.booking_date, booking.session_time, booking.status);

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-semibold">{booking.tutor.user.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                          {booking.tutor.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>In-Person</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-xs font-semibold">{booking.booking_date}</span>
                        <span className="text-[10px] text-slate-400">{booking.session_time}</span>
                      </td>
                      <td className="px-6 py-4 font-bold">₹{booking.tutor.hourly_rate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          booking.status === "Pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20" :
                          statusInfo.label === "Ready to Start" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20" :
                          booking.status === "Accepted" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/20" :
                          booking.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-950/20" :
                          "bg-slate-100 text-slate-800"
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
                          {booking.payment_status === "Paid" && (
                            <button
                              onClick={() => router.push(`/student/session/${booking.id}`)}
                              className={`px-2.5 py-1.5 rounded-xl text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition ${
                                booking.status === "Completed"
                                  ? "bg-slate-700 hover:bg-slate-800"
                                  : "bg-indigo-600 hover:bg-indigo-700"
                              }`}
                            >
                              <MapPin className="h-3 w-3" />
                              {booking.status === "Completed"
                                ? "Session Completed"
                                : "Track Tutor & Session"}
                            </button>
                          )}


                          {booking.status === "Accepted" && booking.payment_status === "Unpaid" && (
                            <button
                              onClick={() => setActiveBookingForPay(booking)}
                              className="px-2.5 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                            >
                              <CreditCard className="h-3 w-3" />
                              Pay Invoice (₹{booking.tutor.hourly_rate})
                            </button>
                          )}

                          {matchingPayment && (
                            <button
                              onClick={() => setViewReceipt(matchingPayment)}
                              className="px-2.5 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                              <FileText className="h-3 w-3 text-primary-600" />
                              Receipt
                            </button>
                          )}

                          {booking.payment_status === "Paid" && (
                            <button
                              onClick={() => setActiveTutorForReview({ id: booking.tutor.id, name: booking.tutor.user.name })}
                              className="px-2.5 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                              <Star className="h-3 w-3 text-amber-500" />
                              Rate
                            </button>
                          )}

                          {["Pending", "Accepted"].includes(booking.status) && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="px-2.5 py-1 rounded border border-red-200 dark:border-red-800 hover:bg-red-50 hover:text-red-600 text-[10px] font-bold transition"
                            >
                              Cancel
                            </button>
                          )}
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

      {/* Indian Payment Checkout Modal */}
      {activeBookingForPay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-5 text-left shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg">Indian Payment Gateway</h3>
                <p className="text-xs text-slate-400">Complete payment in Indian Rupees (₹ INR)</p>
              </div>
              <button onClick={() => setActiveBookingForPay(null)} className="p-1 hover:bg-slate-100 rounded-xl">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Session details */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Tutor</span>
                <span className="font-semibold">{activeBookingForPay.tutor.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Subject</span>
                <span className="font-semibold">{activeBookingForPay.tutor.subject}</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-800 pt-2 font-bold text-sm">
                <span>Total Amount Due</span>
                <span className="text-primary-600">₹{(activeBookingForPay.tutor?.hourly_rate && activeBookingForPay.tutor.hourly_rate > 0 ? activeBookingForPay.tutor.hourly_rate : 500).toFixed(2)}</span>
              </div>
            </div>

            {/* Indian Payment Method Tabs */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(["UPI", "Paytm", "Net Banking", "Credit Card", "Debit Card"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition ${paymentMethod === method ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600"}`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Conditional Payment Inputs */}
              {paymentMethod === "UPI" && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-semibold text-slate-400">Enter VPA / UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. mobile@upi, username@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                  />
                </div>
              )}

              {paymentMethod === "Paytm" && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-semibold text-slate-400">Enter Registered Paytm Mobile</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={paytmMobile}
                    onChange={(e) => setPaytmMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                  />
                </div>
              )}

              {paymentMethod === "Net Banking" && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-semibold text-slate-400">Select Indian Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                  </select>
                </div>
              )}

              {["Credit Card", "Debit Card"].includes(paymentMethod) && (
                <div className="flex flex-col gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Card Number (4111 2222 3333 4444)"
                    className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="MM / YY"
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      maxLength={4}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleProcessPayment}
              disabled={paying}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-2xl shadow transition flex justify-center items-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                `Pay ₹${(activeBookingForPay.tutor?.hourly_rate && activeBookingForPay.tutor.hourly_rate > 0 ? activeBookingForPay.tutor.hourly_rate : 500).toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-5 text-left shadow-2xl">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h3 className="font-bold text-lg">Payment Receipt</h3>
              </div>
              <button onClick={() => setViewReceipt(null)} className="p-1 hover:bg-slate-100 rounded-xl">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-400">Receipt No</span>
                <span className="font-bold">{viewReceipt.receipt_number || `RCP-${viewReceipt.id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID</span>
                <span className="font-semibold">{viewReceipt.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method</span>
                <span className="font-semibold">{viewReceipt.payment_method}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-sm text-green-600">
                <span>Amount Paid</span>
                <span>₹{viewReceipt.amount.toFixed(2)} INR</span>
              </div>
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Print / Save Invoice
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {activeTutorForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-5 text-left shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Rate Your Tutor</h3>
                <p className="text-xs text-slate-400">Submit feedback for {activeTutorForReview.name}</p>
              </div>
              <button onClick={() => setActiveTutorForReview(null)} className="p-1 hover:bg-slate-100 rounded-xl">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Star Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition ${star <= rating ? "text-amber-500 hover:scale-105" : "text-slate-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Review Feedback</label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was your learning experience?"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={reviewing || !comment}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-2xl shadow transition flex justify-center items-center gap-1.5"
            >
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Review"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
