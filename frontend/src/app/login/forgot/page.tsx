"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Mail, HelpCircle, Loader2, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setCode(null);

    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      // In this sandbox, we display the generated mock code on screen for easier testing.
      setCode(response.data.temp_code);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Email address not registered on this system.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex justify-center items-center px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-8 text-left">
        
        {/* Title */}
        <div className="text-center mb-8 flex flex-col gap-2">
          <HelpCircle className="h-10 w-10 text-primary-500 mx-auto" />
          <h1 className="text-2xl font-extrabold mt-2">Forgot Password</h1>
          <p className="text-xs text-slate-500">Submit your email to retrieve a password recovery code.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-650 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {code ? (
          <div className="mb-6 p-5 rounded-2xl bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-left flex flex-col gap-3">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Mock Code Generated Successfully!
            </span>
            <div className="p-3 bg-white dark:bg-slate-950 border rounded-xl text-center">
              <span className="text-xl font-mono font-bold tracking-widest text-slate-800 dark:text-slate-200">
                {code}
              </span>
            </div>
            <p className="text-[10px] text-green-600 dark:text-green-500 leading-relaxed">
              We simulated an email dispatch. Please copy the 6-digit recovery code above and proceed to the reset form.
            </p>
            <Link 
              href={`/login/reset?email=${encodeURIComponent(email)}&code=${code}`}
              className="mt-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold text-center flex justify-center items-center gap-1.5 shadow-sm"
            >
              Proceed to Password Reset
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || !email}
              className="w-full mt-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-primary-500 text-white font-semibold text-sm shadow flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Code...
                </>
              ) : (
                "Get Recovery Code"
              )}
            </button>
          </form>
        )}

        <div className="text-center mt-6 text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-6">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-primary-500 hover:underline">
            Log In
          </Link>
        </div>

      </div>
    </div>
  );
}
