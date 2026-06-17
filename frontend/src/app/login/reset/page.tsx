"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/services/api";
import { Lock, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate from URL if available
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const codeParam = searchParams.get("code");
    if (emailParam) setEmail(emailParam);
    if (codeParam) setTempCode(codeParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await api.post("/api/auth/reset-password", {
        email,
        temp_code: tempCode,
        new_password: newPassword
      });

      setSuccess("Password reset successfully! Redirecting to login page...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Invalid reset code or email address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex justify-center items-center px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-8 text-left">
        
        {/* Title */}
        <div className="text-center mb-8 flex flex-col gap-2">
          <Lock className="h-10 w-10 text-primary-500 mx-auto" />
          <h1 className="text-2xl font-extrabold mt-2">Reset Password</h1>
          <p className="text-xs text-slate-500">Provide recovery code and enter your new password.</p>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-650 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Registered Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-405" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>

          {/* Temp Code Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">6-Digit Recovery Code</label>
            <input 
              type="text"
              required
              value={tempCode}
              onChange={(e) => setTempCode(e.target.value)}
              placeholder="e.g. 123456"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          {/* New password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">New Password</label>
            <input 
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          {/* Confirm password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Confirm Password</label>
            <input 
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !newPassword || !tempCode}
            className="w-full mt-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-primary-500 text-white font-semibold text-sm shadow flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              "Save New Password"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading parameters...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
