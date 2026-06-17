import Link from "next/link";
import { Shield, Clock, BookOpen, UserCheck, Heart, Sparkles } from "lucide-react";

export default function About() {
  const values = [
    {
      title: "Academic Excellence",
      desc: "We screen and select tutors from elite educational institutions to deliver premium learning quality.",
      icon: <Sparkles className="h-6 w-6 text-primary-600 dark:text-primary-400" />
    },
    {
      title: "Trust & Safety",
      desc: "Background verification checks and credentials checks are performed on all tutor registrations.",
      icon: <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
    },
    {
      title: "Flexibility & Access",
      desc: "Book session hours that fit your personal schedule. Learn from anywhere in the world.",
      icon: <Clock className="h-6 w-6 text-primary-600 dark:text-primary-400" />
    }
  ];

  return (
    <div className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">About TutorNow</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Our mission is to democratize education by connecting students with expert, verified tutors for instant, on-demand learning sessions.
          </p>
        </div>

        {/* Vision & Mission */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Our Vision</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              We envision a world where high-quality academic support is accessible to any student, anytime, anywhere. By eliminating physical location constraints and scheduling complexities, we empower students to get specific answers when they need them most.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Our Commitment</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              We commit to fostering an inclusive, productive, and safe educational environment. We provide robust tools to handle availabilities, scheduling, bookings, reviews, and transaction auditing, allowing tutors and students to focus purely on education.
            </p>
          </div>
        </div>

        {/* Core Values Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-10">Our Core Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 text-center items-center shadow-sm">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/35 rounded-xl">{v.icon}</div>
                <h3 className="font-bold text-lg">{v.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary-600 to-sky-600 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Start Improving Your Grades Today</h2>
          <p className="text-slate-100 text-sm max-w-xl mx-auto mb-6">
            Join thousands of active students who trust TutorNow. Register your student account or start tutoring with us.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="px-6 py-3 bg-white text-primary-700 hover:bg-slate-50 rounded-xl font-semibold text-sm shadow transition">
              Find Tutors
            </Link>
            <Link href="/register?role=Tutor" className="px-6 py-3 border border-white hover:bg-white/10 rounded-xl font-semibold text-sm transition">
              Apply as Tutor
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
