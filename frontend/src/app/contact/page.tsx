"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
      // Simulate submission
      setTimeout(() => {
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }, 1000);
    }
  };

  return (
    <div className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Contact Our Team</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Have questions about bookings, payments, or tutor registrations? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Info Block */}
          <div className="lg:col-span-1 flex flex-col gap-6 text-left">
            <h2 className="text-2xl font-bold mb-2">Get in Touch</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Feel free to reach out to us. Our customer support team is active 24/7 to resolve booking disputes, technical glitches, or general inquiries.
            </p>
            
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Us</span>
                <span className="text-sm font-semibold">support@tutornow.com</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="p-3 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Call Us</span>
                <span className="text-sm font-semibold">+1 (800) 555-TUTOR</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="p-3 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Office Location</span>
                <span className="text-sm font-semibold">100 Education Way, Boston, MA</span>
              </div>
            </div>
          </div>

          {/* Form Block */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            {submitted ? (
              <div className="py-12 text-center flex flex-col items-center gap-4">
                <CheckCircle className="h-16 w-16 text-green-500 animate-pulse" />
                <h3 className="text-xl font-bold">Message Sent Successfully!</h3>
                <p className="text-sm text-slate-500 max-w-md">
                  Thank you for reaching out. We have received your inquiry and our support team will respond to you within 24 hours.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-sm font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Your Name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Your Email</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Booking dispute / Account support..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Message</label>
                  <textarea 
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full sm:w-auto self-start px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow flex items-center justify-center gap-2 transition"
                >
                  <Send className="h-4 w-4" />
                  Submit Message
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
