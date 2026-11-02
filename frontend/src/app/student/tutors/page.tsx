"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Search, Filter, Star, Clock, MapPin, Video, CheckCircle2,
  Calendar, IndianRupee, Loader2, Award, User, ShieldCheck, X, Sparkles, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Tutor {
  id: number;
  user_id: number;
  subject: string;
  qualification: string;
  specialization?: string;
  experience: number;
  hourly_rate: number;
  bio?: string;
  profile_image?: string;
  rating: number;
  languages?: string;
  teaching_mode?: string;
  location_city?: string;
  location_address?: string;
  is_online?: boolean;
  user: {
    name: string;
    email: string;
  };
}

interface AvailabilitySlot {
  id: number;
  tutor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

function formatSlotTime(timeStr: string) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const hr = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  const period = hr >= 12 ? "PM" : "AM";
  const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${displayHr}:${m} ${period}`;
}

export default function FindTutors() {
  const router = useRouter();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [sortBy, setSortBy] = useState<"rating" | "price_low" | "experience">("rating");

  // Booking Modal State
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [sessionType, setSessionType] = useState<"IN_PERSON">("IN_PERSON");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [tutorSlots, setTutorSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadTutors = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/tutors");
      setTutors(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load approved tutors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutors();
  }, []);

  // Auto-open booking modal if tutorId parameter is provided in URL
  useEffect(() => {
    if (typeof window !== "undefined" && tutors.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("tutorId");
      if (targetId) {
        const found = tutors.find((t) => t.id === Number(targetId));
        if (found) {
          setBookingTutor(found);
        }
      }
    }
  }, [tutors]);

  // Fetch tutor's real availability slots when booking modal opens
  useEffect(() => {
    if (!bookingTutor) {
      setTutorSlots([]);
      setBookingDate("");
      setBookingTime("");
      return;
    }

    const fetchTutorSlots = async () => {
      try {
        setLoadingSlots(true);
        const res = await api.get(`/api/availability/tutor/${bookingTutor.id}`);
        const slots: AvailabilitySlot[] = res.data || [];
        setTutorSlots(slots);

        // Extract available dates
        const availableDates = Array.from(new Set(slots.map((s) => s.date))).sort();
        if (availableDates.length > 0) {
          const initialDate = availableDates[0];
          setBookingDate(initialDate);
          const daySlots = slots.filter((s) => s.date === initialDate);
          if (daySlots.length > 0) {
            const first = daySlots[0];
            setBookingTime(`${first.start_time.slice(0, 5)} - ${first.end_time.slice(0, 5)}`);
          } else {
            setBookingTime("");
          }
        } else {
          // Default to today if no slots found
          setBookingDate(new Date().toISOString().split("T")[0]);
          setBookingTime("");
        }
      } catch (err) {
        console.error("Failed to load tutor availability:", err);
        setTutorSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchTutorSlots();
  }, [bookingTutor]);

  // Update selected time slot whenever bookingDate changes
  useEffect(() => {
    if (!bookingDate || tutorSlots.length === 0) return;
    const daySlots = tutorSlots.filter((s) => s.date === bookingDate);
    if (daySlots.length > 0) {
      const formattedTimes = daySlots.map(
        (s) => `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`
      );
      if (!formattedTimes.includes(bookingTime)) {
        setBookingTime(formattedTimes[0]);
      }
    } else {
      setBookingTime("");
    }
  }, [bookingDate, tutorSlots]);

  // Filtered & Sorted Tutors
  const filteredTutors = tutors
    .filter((t) => {
      const matchSearch =
        t.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.qualification && t.qualification.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.location_city && t.location_city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject = !selectedSubject || t.subject.toLowerCase().includes(selectedSubject.toLowerCase());
      
      // Offline In-Person Tutors: All approved tutors are available for booking
      const matchMode = !selectedMode || selectedMode === "Offline";

      const matchPrice = t.hourly_rate <= maxPrice;

      return matchSearch && matchSubject && matchMode && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price_low") return a.hourly_rate - b.hourly_rate;
      if (sortBy === "experience") return b.experience - a.experience;
      return 0;
    });

  const handleCreateBooking = async () => {
    if (!bookingTutor) return;
    if (!bookingDate) {
      alert("Please select a session date.");
      return;
    }

    try {
      setBookingLoading(true);
      await api.post("/api/bookings", {
        tutor_id: bookingTutor.id,
        booking_date: bookingDate,
        session_time: bookingTime,
        session_type: sessionType,
        subject: bookingTutor.subject,
        notes: bookingNotes,
      });

      alert("Booking request submitted successfully! Redirecting to student dashboard...");
      setBookingTutor(null);
      router.push("/student/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg space-y-4">
        <div className="max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> Verified Tutor Marketplace
          </span>
          <h1 className="text-3xl font-extrabold">Find & Book Expert Tutors</h1>
          <p className="text-sm text-primary-100">
            Connect with background-checked, Admin-approved tutors for in-person home tutoring with live GPS tracking across India.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject, tutor name, qualification, or city..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-slate-900 bg-white text-sm focus:outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Selector */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none dark:text-white"
          >
            <option value="">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="English">English</option>
          </select>

          {/* Mode Selector (Offline In-Person Platform) */}
          <div className="flex items-center gap-1.5 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <MapPin className="h-3.5 w-3.5" />
            <span>In-Person (Offline)</span>
          </div>

          {/* Price Range Slider */}
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-950">
            <span>Max Fee:</span>
            <span className="text-primary-600 font-bold">₹{maxPrice}/hr</span>
            <input
              type="range"
              min="200"
              max="3000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-24 accent-primary-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none dark:text-white"
          >
            <option value="rating">Highest Rating</option>
            <option value="price_low">Price: Low to High</option>
            <option value="experience">Experience</option>
          </select>
        </div>
      </div>

      {/* Tutors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-72 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTutors.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border rounded-2xl p-8 space-y-3">
          <User className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base">No Tutors Match Your Criteria</h3>
          <p className="text-xs text-slate-400">Try adjusting your search query, price slider, or subject filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutors.map((tutor) => (
            <div
              key={tutor.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-4">
                {/* Tutor Photo & Header */}
                <div className="flex items-start gap-4">
                  <img
                    src={tutor.profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"}
                    alt={tutor.user.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base truncate group-hover:text-primary-600 transition">
                        {tutor.user.name}
                      </h3>
                      <span title="Admin Approved & Verified">
                        <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{tutor.qualification}</p>
                    
                    {/* Rating & Experience */}
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        <span>{tutor.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-medium">{tutor.experience} Yrs Exp</span>
                    </div>
                  </div>
                </div>

                {/* Subject, Teaching Mode & Online Status Pills */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold">
                    {tutor.subject}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-sky-600" />
                    In-Person (Offline)
                  </span>
                  {tutor.location_city && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      📍 {tutor.location_city}
                    </span>
                  )}
                </div>

                {/* Bio Snippet */}
                {tutor.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tutor.bio}
                  </p>
                )}
              </div>

              {/* Fee & Book Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Hourly Rate</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">₹{tutor.hourly_rate}</span>
                </div>

                <button
                  onClick={() => {
                    setBookingTutor(tutor);
                    setSessionType("IN_PERSON");
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Book Tutor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingTutor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full max-h-[90vh] bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl flex flex-col text-left shadow-2xl animate-fade-in my-auto overflow-hidden">
            <div className="flex justify-between items-center border-b dark:border-slate-800 p-5 shrink-0 bg-white dark:bg-slate-900">
              <div>
                <h3 className="font-bold text-lg">Book Tutoring Session</h3>
                <p className="text-xs text-slate-400">Schedule session with {bookingTutor.user.name}</p>
              </div>
              <button onClick={() => setBookingTutor(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">

            {/* Session Delivery Mode (In-Person Offline) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Session Delivery Mode</label>
              <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">In-Person (Offline) Tutoring</span>
                  <span className="text-[10px] text-slate-400">Tutor travels to your physical location with live GPS route tracking</span>
                </div>
              </div>
            </div>


            {/* Availability Slots Loader / Notice */}
            {loadingSlots ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                <span>Loading tutor's available schedule...</span>
              </div>
            ) : tutorSlots.length === 0 ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No Availability Slots Available</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">This tutor has not published any schedule slots yet. Please check back later or choose another tutor.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Date Selector Chips */}
                {Array.from(new Set(tutorSlots.map((s) => s.date))).length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Available Dates</label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(tutorSlots.map((s) => s.date))).sort().map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBookingDate(d)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                            bookingDate === d
                              ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-400"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${bookingDate === d ? "bg-white" : "bg-emerald-500"}`} />
                          {new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Session Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Time Slot</label>
                    {tutorSlots.filter((s) => s.date === bookingDate).length > 0 ? (
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white font-medium"
                      >
                        {tutorSlots
                          .filter((s) => s.date === bookingDate)
                          .map((slot) => {
                            const val = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
                            const display = `${formatSlotTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`;
                            return (
                              <option key={slot.id} value={val}>
                                {display} (Available)
                              </option>
                            );
                          })}
                      </select>
                    ) : (
                      <div className="px-3 py-2.5 border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-medium">
                        No slots for this date
                      </div>
                    )}
                  </div>
                </div>

                {/* Slot Quick Selection Pills */}
                {tutorSlots.filter((s) => s.date === bookingDate).length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Available Slots on Selected Date</label>
                    <div className="flex flex-wrap gap-2">
                      {tutorSlots
                        .filter((s) => s.date === bookingDate)
                        .map((slot) => {
                          const val = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
                          const isSelected = bookingTime === val;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setBookingTime(val)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {formatSlotTime(slot.start_time)} - {formatSlotTime(slot.end_time)}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Topic / Special Requests</label>
              <textarea
                rows={3}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Mention specific topics or chapters you want help with..."
                className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
              />
            </div>

            {/* Pricing Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2 text-xs border">
              <div className="flex justify-between">
                <span>Hourly Fee</span>
                <span className="font-semibold">₹{bookingTutor.hourly_rate}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Convenience Fee</span>
                <span className="font-semibold">₹0 (Free)</span>
              </div>
              <div className="flex justify-between border-t dark:border-slate-800 pt-2 font-bold text-sm">
                <span>Total Amount Due</span>
                <span className="text-primary-600">₹{bookingTutor.hourly_rate}</span>
              </div>
            </div>

              {/* Submit */}
              <button
                onClick={handleCreateBooking}
                disabled={
                  bookingLoading ||
                  !bookingTime ||
                  tutorSlots.filter((s) => s.date === bookingDate).length === 0
                }
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-2xl shadow transition flex justify-center items-center gap-2 disabled:cursor-not-allowed mb-2 shrink-0"
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : !bookingTime || tutorSlots.filter((s) => s.date === bookingDate).length === 0 ? (
                  "Select an Available Time Slot"
                ) : (
                  `Confirm In-Person Booking (₹${bookingTutor.hourly_rate})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
