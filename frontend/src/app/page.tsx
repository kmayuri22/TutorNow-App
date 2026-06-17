"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, BookOpen, Star, Shield, Clock, Award, Users, 
  ArrowRight, Check, MessageSquare, Compass
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery || selectedSubject) {
      router.push(`/tutors?subject=${encodeURIComponent(searchQuery || selectedSubject)}`);
    } else {
      router.push("/tutors");
    }
  };

  const popularSubjects = [
    { name: "Mathematics & Calculus", count: "120+ Tutors", icon: "📐" },
    { name: "Computer Science & Python", count: "90+ Tutors", icon: "💻" },
    { name: "Physics & Chemistry", count: "75+ Tutors", icon: "🧪" },
    { name: "English & Literature", count: "110+ Tutors", icon: "📚" },
    { name: "Biology & Genetics", count: "55+ Tutors", icon: "🧬" },
    { name: "Economics & Finance", count: "40+ Tutors", icon: "📊" },
  ];

  const stats = [
    { label: "Active Students", value: "12,000+", icon: <Users className="h-6 w-6 text-primary-500" /> },
    { label: "Verified Tutors", value: "850+", icon: <Award className="h-6 w-6 text-primary-500" /> },
    { label: "Sessions Booked", value: "45,000+", icon: <Star className="h-6 w-6 text-primary-500" /> },
    { label: "Satisfaction Rate", value: "99.4%", icon: <Check className="h-6 w-6 text-primary-500" /> },
  ];

  const tutorCards = [
    {
      name: "Dr. Sarah Jenkins",
      subject: "Mathematics & Calculus",
      qualification: "Ph.D. Applied Math, MIT",
      experience: "8 years",
      hourly_rate: 45.0,
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    },
    {
      name: "James Miller",
      subject: "Computer Science & Python",
      qualification: "B.S. Computer Science, Stanford",
      experience: "3 years",
      hourly_rate: 35.0,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    },
    {
      name: "Sophia Rodriguez",
      subject: "Chemistry & Biochemistry",
      qualification: "M.S. Chemistry, UC Berkeley",
      experience: "5 years",
      hourly_rate: 40.0,
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-sky-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-20 md:py-28 overflow-hidden transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column Content */}
            <div className="flex flex-col gap-6 text-left">
              <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-300">
                <Shield className="h-3.5 w-3.5" />
                100% Verified Academic Tutors
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
                Learn from the <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-sky-500 dark:from-primary-400 dark:to-sky-400">Best Minds</span>, On Demand.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                TutorNow connects you instantly with Ivy League and top-university graduates for math, programming, sciences, and languages. Schedule a custom session in seconds.
              </p>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="mt-2 max-w-lg w-full flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search subjects (e.g. Calculus, Python)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>
                <button type="submit" className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md flex items-center justify-center gap-2 transition">
                  Search Tutors
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Right Column Graphic */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-primary-500 rounded-3xl filter blur-3xl opacity-10 dark:opacity-20 animate-pulse-subtle"></div>
              <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="font-semibold text-sm">Next Available Tutors</span>
                  <Link href="/tutors" className="text-xs text-primary-500 hover:underline">View All</Link>
                </div>
                <div className="flex flex-col gap-4">
                  {tutorCards.map((t, idx) => (
                    <div key={idx} className="flex gap-4 items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <img src={t.image} alt={t.name} className="h-12 w-12 rounded-full object-cover border" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate block">{t.name}</span>
                        <span className="text-xs text-slate-400 truncate block">{t.subject}</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold text-sm text-primary-600 dark:text-primary-400">${t.hourly_rate}/hr</span>
                        <div className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{t.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="py-12 border-y bg-white dark:bg-slate-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 justify-center text-center sm:text-left">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">{s.icon}</div>
                <div>
                  <span className="block text-2xl font-extrabold">{s.value}</span>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Subjects */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-3">
            <h2 className="text-3xl font-bold">Popular Subjects to Learn</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Start your journey by picking a popular topic and viewing our available expert tutors.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularSubjects.map((subject, idx) => (
              <div 
                key={idx}
                onClick={() => router.push(`/tutors?subject=${encodeURIComponent(subject.name)}`)}
                className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 shadow-sm hover:shadow-md cursor-pointer transition flex items-center gap-4 group"
              >
                <div className="text-3xl p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-primary-50 dark:group-hover:bg-primary-950/20 transition">{subject.icon}</div>
                <div>
                  <h3 className="font-semibold text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">{subject.name}</h3>
                  <span className="text-xs text-slate-400 block mt-0.5">{subject.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-slate-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
            <h2 className="text-3xl font-bold">How TutorNow Works</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              We make scheduling lessons with expert educators simple, straightforward, and secure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xl border-2 border-primary-500">
                1
              </div>
              <h3 className="font-bold text-lg">Find Your Tutor</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Browse our registry using search. Filter by subject expertise, hourly rate, reviews, and teaching experience.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xl border-2 border-primary-500">
                2
              </div>
              <h3 className="font-bold text-lg">Book a Schedule</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Choose an open date and time slot from the tutor's calendar schedule, submit booking requests, and execute payments.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xl border-2 border-primary-500">
                3
              </div>
              <h3 className="font-bold text-lg">Start Learning</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Log in at class time to join your interactive lesson. Review past sessions and rate your tutor's lesson performance.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-3">
            <h2 className="text-3xl font-bold">What Our Students Say</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Read reviews from student accounts who improved their grades using TutorNow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-sm italic text-slate-600 dark:text-slate-300">
                "Dr. Sarah was phenomenal! I was struggling to understand Calculus II series expansions. She explained it in an hour with clear drawings. I passed my exam with an A!"
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-slate-200 font-bold flex items-center justify-center text-sm">M</div>
                <div>
                  <span className="font-bold text-sm block">Michael Chen</span>
                  <span className="text-[10px] text-slate-400">Engineering Student</span>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-sm italic text-slate-600 dark:text-slate-300">
                "Finding computer science tutors used to take forever. Here, I found James Miller, booked him, paid, and started debugging Python code within 15 minutes. Highly recommended!"
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-slate-200 font-bold flex items-center justify-center text-sm">E</div>
                <div>
                  <span className="font-bold text-sm block">Emily Taylor</span>
                  <span className="text-[10px] text-slate-400">High School Student</span>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-sm italic text-slate-600 dark:text-slate-300">
                "As a parent, I love the verification checks on TutorNow. I booked physics lessons for my daughter, and the tutor was extremely professional, patient, and knowledgeable."
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-slate-200 font-bold flex items-center justify-center text-sm">R</div>
                <div>
                  <span className="font-bold text-sm block">Robert Davis</span>
                  <span className="text-[10px] text-slate-400">Parent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-700 to-sky-600 py-16 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 flex flex-col gap-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to Boost Your Academic Performance?</h2>
          <p className="text-slate-100 text-base sm:text-lg max-w-2xl mx-auto">
            Create a student account today and get matched with certified tutors. Tutors can also register to open calendars and monetize their academic skills.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            <Link href="/register" className="px-6 py-3 rounded-xl bg-white text-primary-700 font-semibold text-sm hover:bg-slate-50 shadow transition">
              Find a Tutor Now
            </Link>
            <Link href="/register?role=Tutor" className="px-6 py-3 rounded-xl border border-white hover:bg-white/10 font-semibold text-sm transition">
              Apply as a Tutor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
