"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { 
  Search, SlidersHorizontal, Star, ShieldCheck, GraduationCap, 
  Clock, DollarSign, ArrowRight, X, User
} from "lucide-react";

interface Tutor {
  id: number;
  subject: string;
  qualification: string;
  experience: number;
  hourly_rate: number;
  bio: string;
  profile_image: string;
  rating: number;
  is_verified: boolean;
  user: {
    name: string;
    email: string;
  };
}

function TutorsSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load initial filters from URL query parameters
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Filter states
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [qualification, setQualification] = useState(searchParams.get("qualification") || "");
  const [minExp, setMinExp] = useState(searchParams.get("min_experience") || "");
  const [minRating, setMinRating] = useState(searchParams.get("min_rating") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (subject) params.subject = subject;
      if (qualification) params.qualification = qualification;
      if (minExp) params.min_experience = parseInt(minExp, 10);
      if (minRating) params.min_rating = parseFloat(minRating);
      if (maxPrice) params.max_price = parseFloat(maxPrice);

      const response = await api.get("/api/tutors", { params });
      setTutors(response.data);
    } catch (err) {
      console.error("Error loading tutors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, [searchParams]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParts: string[] = [];
    if (subject) queryParts.push(`subject=${encodeURIComponent(subject)}`);
    if (qualification) queryParts.push(`qualification=${encodeURIComponent(qualification)}`);
    if (minExp) queryParts.push(`min_experience=${minExp}`);
    if (minRating) queryParts.push(`min_rating=${minRating}`);
    if (maxPrice) queryParts.push(`max_price=${maxPrice}`);

    setShowFiltersMobile(false);
    router.push(`/tutors?${queryParts.join("&")}`);
  };

  const handleClearFilters = () => {
    setSubject("");
    setQualification("");
    setMinExp("");
    setMinRating("");
    setMaxPrice("");
    router.push("/tutors");
  };

  return (
    <div className="py-12 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="text-left mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Available Expert Tutors</h1>
          <p className="text-sm text-slate-500">Find the perfect tutor matching your learning speed and budget</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit text-left">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-850 mb-6">
              <span className="font-bold text-sm flex gap-2 items-center">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                Filters
              </span>
              <button 
                onClick={handleClearFilters}
                className="text-xs text-primary-500 hover:underline"
              >
                Clear All
              </button>
            </div>
            
            <form onSubmit={handleApplyFilters} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Subject Expertise</label>
                <input 
                  type="text"
                  placeholder="e.g. Calculus, Python"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Qualification</label>
                <input 
                  type="text"
                  placeholder="e.g. Ph.D., MIT, Stanford"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Min Experience (Years)</label>
                <input 
                  type="number"
                  placeholder="e.g. 3"
                  min="0"
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                >
                  <option value="">Any Rating</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.8">4.8+ Stars</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Max Hourly Rate ($)</label>
                <input 
                  type="number"
                  placeholder="e.g. 50"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
              >
                Apply Filters
              </button>
            </form>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex gap-4 w-full justify-between items-center mb-6 col-span-1">
            <button
              onClick={() => setShowFiltersMobile(true)}
              className="flex items-center gap-2 px-4 py-2 border rounded-xl bg-white dark:bg-slate-900 text-sm font-semibold"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter Tutors
            </button>
            {searchParams.toString() !== "" && (
              <button onClick={handleClearFilters} className="text-xs text-red-500 font-semibold hover:underline">
                Reset Filters
              </button>
            )}
          </div>

          {/* Tutors Listing Panel */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {loading ? (
              // Skeletal load grids
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border rounded-2xl p-6 flex flex-col sm:flex-row gap-6 animate-pulse">
                  <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-800 self-center sm:self-start"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-12 w-full bg-slate-100 dark:bg-slate-850 rounded"></div>
                  </div>
                  <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded self-end"></div>
                </div>
              ))
            ) : tutors.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-slate-900 border rounded-2xl p-8 flex flex-col items-center gap-4">
                <span className="text-4xl text-slate-350">🕵️‍♀️</span>
                <h3 className="font-bold text-lg">No Tutors Match Your Filters</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Try clearing your search query or loosening criteria (such as minimum ratings or qualification fields).
                </p>
                <button onClick={handleClearFilters} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-sm font-semibold">
                  View All Tutors
                </button>
              </div>
            ) : (
              tutors.map((tutor) => (
                <div 
                  key={tutor.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm hover:shadow-md rounded-2xl p-6 transition-all-300 flex flex-col sm:flex-row gap-6 text-left relative overflow-hidden"
                >
                  {/* Verified Strip tag */}
                  {tutor.is_verified && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-green-500 text-white rounded-bl-xl text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </div>
                  )}

                  {/* Left: profile image */}
                  <div className="flex-shrink-0 self-center sm:self-start">
                    {tutor.profile_image ? (
                      <img src={tutor.profile_image} alt={tutor.user.name} className="h-24 w-24 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800" />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <User className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  {/* Mid: Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {tutor.user.name}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/45 text-primary-700 dark:text-primary-400 font-bold mt-1.5 inline-block">
                        {tutor.subject}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4" />
                        {tutor.qualification}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {tutor.experience} years exp
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {tutor.bio}
                    </p>

                    <div className="flex items-center gap-4 mt-2 border-t dark:border-slate-850 pt-3">
                      <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{tutor.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center text-sm font-extrabold text-slate-900 dark:text-white">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span>{tutor.hourly_rate}/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: CTA button */}
                  <div className="sm:self-end mt-4 sm:mt-0">
                    <Link 
                      href={`/tutors/${tutor.id}`}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      Book Session
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Mobile Filters Modal Drawer */}
      {showFiltersMobile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-80 h-full bg-white dark:bg-slate-900 p-6 flex flex-col text-left shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <span className="font-bold text-base">Filters</span>
              <button onClick={() => setShowFiltersMobile(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyFilters} className="flex flex-col gap-5 flex-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Subject</label>
                <input 
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Qualification</label>
                <input 
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Min Experience</label>
                <input 
                  type="number"
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                >
                  <option value="">Any</option>
                  <option value="4.0">4.0+</option>
                  <option value="4.5">4.5+</option>
                  <option value="4.8">4.8+</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Max Hourly Rate</label>
                <input 
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition"
              >
                Apply Filters
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TutorsSearch() {
  return (
    <Suspense fallback={<div>Loading filters...</div>}>
      <TutorsSearchContent />
    </Suspense>
  );
}
