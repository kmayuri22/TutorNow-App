"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Search, Filter, Star, Clock, MapPin, Video, CheckCircle2,
  Calendar, IndianRupee, Loader2, Award, User, ShieldCheck, X, Sparkles
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
  const [sessionType, setSessionType] = useState<"VIDEO_CALL" | "IN_PERSON">("VIDEO_CALL");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00 - 11:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

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

  // Filtered & Sorted Tutors
  const filteredTutors = tutors
    .filter((t) => {
      const matchSearch =
        t.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.qualification && t.qualification.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.location_city && t.location_city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject = !selectedSubject || t.subject.toLowerCase().includes(selectedSubject.toLowerCase());
      const matchMode = !selectedMode || t.teaching_mode === selectedMode || t.teaching_mode === "Both";
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
            Connect with background-checked, Admin-approved tutors for online video sessions or in-person tutoring across India.
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

          {/* Mode Selector */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none dark:text-white"
          >
            <option value="">All Modes</option>
            <option value="Online">Online Video Call</option>
            <option value="Offline">In-Person (Offline)</option>
          </select>

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

                {/* Subject & Teaching Mode Pills */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold">
                    {tutor.subject}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                    {tutor.teaching_mode === "Offline" ? <MapPin className="h-3 w-3 text-sky-600" /> : <Video className="h-3 w-3 text-indigo-600" />}
                    {tutor.teaching_mode || "Online"}
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
                    setSessionType(tutor.teaching_mode === "Offline" ? "IN_PERSON" : "VIDEO_CALL");
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl flex flex-col gap-5 text-left shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-lg">Book Tutoring Session</h3>
                <p className="text-xs text-slate-400">Schedule session with {bookingTutor.user.name}</p>
              </div>
              <button onClick={() => setBookingTutor(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Session Type Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Select Session Mode</label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSessionType("VIDEO_CALL")}
                  className={`py-2.5 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition ${sessionType === "VIDEO_CALL" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500"}`}
                >
                  <Video className="h-4 w-4" />
                  Video Call Session
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType("IN_PERSON")}
                  className={`py-2.5 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition ${sessionType === "IN_PERSON" ? "bg-white dark:bg-slate-800 text-sky-600 shadow-sm" : "text-slate-500"}`}
                >
                  <MapPin className="h-4 w-4" />
                  In-Person (Offline)
                </button>
              </div>
            </div>

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
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                >
                  <option value="09:00 - 10:00">09:00 AM - 10:00 AM</option>
                  <option value="10:00 - 11:00">10:00 AM - 11:00 AM</option>
                  <option value="11:00 - 12:00">11:00 AM - 12:00 PM</option>
                  <option value="14:00 - 15:00">02:00 PM - 03:00 PM</option>
                  <option value="16:00 - 17:00">04:00 PM - 05:00 PM</option>
                  <option value="18:00 - 19:00">06:00 PM - 07:00 PM</option>
                </select>
              </div>
            </div>

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
              disabled={bookingLoading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-bold text-xs rounded-2xl shadow transition flex justify-center items-center gap-2"
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                `Confirm Booking (₹${bookingTutor.hourly_rate})`
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
