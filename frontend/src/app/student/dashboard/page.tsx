"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { 
  Calendar, CreditCard, Star, X, Loader2, DollarSign, 
  MessageSquare, AlertCircle, Clock, CheckCircle, MapPin, Video
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  status: string;
}

export default function StudentDashboard() {
  const router = useRouter();
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
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [paying, setPaying] = useState(false);

  // Review Modal States
  const [activeTutorForReview, setActiveTutorForReview] = useState<{ id: number; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const bookingsRes = await api.get("/api/bookings");
      setBookings(bookingsRes.data);

      const paymentsRes = await api.get("/api/payments/history");
      setPayments(paymentsRes.data);

      // Aggregate statistics
      const totalLessons = bookingsRes.data.length;
      const pendingLessons = bookingsRes.data.filter((b: Booking) => b.status === "Pending").length;
      const totalSpent = paymentsRes.data
        .filter((p: Payment) => p.status === "Success")
        .reduce((sum: number, p: Payment) => sum + p.amount, 0);

      setStats({ totalLessons, pendingLessons, totalSpent });
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
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
    setPaying(true);
    try {
      await api.post("/api/payments", {
        booking_id: activeBookingForPay.id,
        payment_method: paymentMethod,
        amount: activeBookingForPay.tutor.hourly_rate
      });
      
      setActiveBookingForPay(null);
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Mock Payment Failed");
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
      alert("Thank you for your rating!");
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
      
      {/* Welcome Banner */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Welcome Back, Alex!</h1>
          <p className="text-xs text-slate-450 mt-1">Manage your tutor schedules, bookings, and invoices here.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{stats.totalLessons}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Bookings</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">{stats.pendingLessons}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Tutors</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-2xl font-extrabold">${stats.totalSpent.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Payments</span>
          </div>
        </div>
      </div>

      {/* Bookings Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-bold text-sm">Booking History & Schedules</h2>
        </div>

        <div className="overflow-x-auto">
          {bookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No sessions booked yet. Go to Find Tutors to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Tutor</th>
                  <th className="px-6 py-3 text-left">Subject</th>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Schedule</th>
                  <th className="px-6 py-3 text-left">Rate</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Payment</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t dark:border-slate-850">
                {bookings.map((booking) => {
                  const dateString = new Date(booking.booking_date).toLocaleDateString();
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-semibold">{booking.tutor.user.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                          {booking.tutor.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {booking.session_type === "IN_PERSON" ? (
                            <>
                              <MapPin className="h-3.5 w-3.5 text-sky-650" />
                              <span>In-Person</span>
                            </>
                          ) : (
                            <>
                              <Video className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Video Call</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-xs font-semibold">{dateString}</span>
                        <span className="text-[10px] text-slate-400">{booking.session_time}</span>
                      </td>
                      <td className="px-6 py-4 font-medium">${booking.tutor.hourly_rate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          booking.status === "Pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400" :
                          booking.status === "Accepted" ? "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400" :
                          booking.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400" :
                          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {booking.status}
                        </span>
                      </td>
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
                          {booking.payment_status === "Paid" && (
                            <button
                              onClick={() => router.push(`/student/session/${booking.id}`)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                            >
                              <Video className="h-3 w-3" />
                              Enter Classroom
                            </button>
                          )}

                          {booking.status === "Accepted" && booking.payment_status === "Unpaid" && (
                            <button
                              onClick={() => setActiveBookingForPay(booking)}
                              className="px-2.5 py-1 rounded bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                            >
                              <CreditCard className="h-3 w-3" />
                              Pay Invoice
                            </button>
                          )}
                          
                          {booking.payment_status === "Paid" && (
                            <button
                              onClick={() => setActiveTutorForReview({ id: booking.tutor.id, name: booking.tutor.user.name })}
                              className="px-2.5 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                              <Star className="h-3 w-3" />
                              Rate Tutor
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

      {/* Mock Payment Checkout Modal */}
      {activeBookingForPay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-850 p-6 rounded-2xl flex flex-col gap-5 text-left shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Invoice Payment</h3>
                <p className="text-xs text-slate-405">Complete the mock card checkout for this tutoring session.</p>
              </div>
              <button onClick={() => setActiveBookingForPay(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 border rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Tutor</span>
                <span className="font-semibold">{activeBookingForPay.tutor.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Subject</span>
                <span className="font-semibold">{activeBookingForPay.tutor.subject}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time</span>
                <span className="font-semibold">{activeBookingForPay.booking_date} ({activeBookingForPay.session_time})</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-850 pt-2 font-bold text-sm">
                <span>Due Amount</span>
                <span className="text-primary-600 dark:text-primary-400">${activeBookingForPay.tutor.hourly_rate}</span>
              </div>
            </div>

            {/* Payment inputs */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Payment Method</label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Debit Card">Debit Card</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Card Holder Name</label>
                <input 
                  type="text" 
                  defaultValue="Alex Smith"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Card Number</label>
                <input 
                  type="text" 
                  placeholder="4111 2222 3333 4444"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleProcessPayment}
              disabled={paying}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex justify-center items-center gap-1.5"
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Checkout...
                </>
              ) : (
                `Pay $${activeBookingForPay.tutor.hourly_rate.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Review & Rating submission modal */}
      {activeTutorForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-850 p-6 rounded-2xl flex flex-col gap-5 text-left shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Review Tutor</h3>
                <p className="text-xs text-slate-405">Submit ratings and comment feedback for {activeTutorForReview.name}</p>
              </div>
              <button onClick={() => setActiveTutorForReview(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5 text-slate-405" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Star selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Star Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition ${star <= rating ? "text-amber-500 hover:scale-105" : "text-slate-300 dark:text-slate-700"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Review Feedback</label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain how this session went. Was the tutor helpful, professional, and clear?"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={reviewing || !comment}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-xl shadow transition flex justify-center items-center gap-1.5"
            >
              {reviewing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Feedback...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
