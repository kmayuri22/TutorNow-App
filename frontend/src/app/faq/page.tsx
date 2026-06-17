"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: "How do I book a lesson with a tutor?",
      a: "Browse tutors on our 'Find Tutors' page, select a tutor, review their availability schedule, select a date and open time slot, click 'Book Slot', and then process the mock checkout payment after the tutor accepts.",
      category: "Bookings"
    },
    {
      q: "Can I cancel a scheduled booking?",
      a: "Yes, both students and tutors can cancel bookings. Go to your Dashboard's Booking list and click 'Cancel Booking'. Cancelling automatically releases the tutor's availability slot back to the platform.",
      category: "Bookings"
    },
    {
      q: "Is the tutor verification rigorous?",
      a: "Absolutely. All registering tutors must specify qualifications, experiences, and subject expertises. Administrators manually review and toggle their verification status before their profile carries a 'Verified' badge.",
      category: "Tutors"
    },
    {
      q: "How do payments work on TutorNow?",
      a: "Payments are processed securely via our mock payment portal (which generates real transaction receipts). Tutors can track their total accumulated earnings directly in their tutor dashboard interface.",
      category: "Payments"
    },
    {
      q: "Can I change my profile role after signup?",
      a: "No, roles (Student, Tutor, Admin) are fixed at signup to structure user data correctly. If you wish to switch roles, you must register a separate email account.",
      category: "Accounts"
    },
    {
      q: "How do real-time notifications work?",
      a: "TutorNow uses WebSocket servers to broadcast state changes instantly. When a student books a slot, the tutor gets a live notification banner. When the tutor accepts or cancels, the student is instantly notified.",
      category: "Technical"
    }
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12 flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Frequently Asked Questions</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Quick answers to help you navigate bookings, tutor profiles, payments, and notifications.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-lg mx-auto mb-12">
          <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
          />
        </div>

        {/* FAQ list */}
        <div className="flex flex-col gap-4">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              No matching FAQs found. Please contact support.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div 
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <span className="font-bold text-sm sm:text-base flex gap-2 items-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-300 font-semibold uppercase">
                        {faq.category}
                      </span>
                      {faq.q}
                    </span>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-850 leading-relaxed text-left">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
