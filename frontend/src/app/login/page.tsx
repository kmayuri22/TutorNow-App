"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { Mail, Lock, LogIn, Loader2, AlertCircle, Clock, XCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const loginUser = useStore((state) => state.login);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<boolean>(false);
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setErrorMessage(null);
    setPendingNotice(false);
    setRejectionNotice(null);

    try {
      const response = await api.post("/api/auth/login", data);
      
      // Save credentials in Zustand store and localStorage
      loginUser(response.data);

      // Redirect depending on user role
      const userRole = response.data.role;
      if (userRole === "Student") {
        router.push("/student/dashboard");
      } else if (userRole === "Tutor") {
        router.push("/tutor/dashboard");
      } else if (userRole === "Admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail;

      if (detail === "PENDING_APPROVAL") {
        setPendingNotice(true);
      } else if (typeof detail === "string" && detail.startsWith("REJECTED:")) {
        const reason = detail.replace("REJECTED:", "");
        setRejectionNotice(reason || "Application did not meet criteria.");
      } else {
        setErrorMessage(detail || "Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950 min-h-screen flex justify-center items-center px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-8 text-left">
        
        {/* Title */}
        <div className="text-center mb-8 flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold">Log In to TutorNow</h1>
          <p className="text-sm text-slate-500">Access your student, tutor, or admin portal</p>
        </div>

        {/* Pending Approval Notice */}
        {pendingNotice && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <Clock className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-bold block text-sm mb-0.5">Account Pending Approval</span>
              <span>Your tutor profile & qualification documents are currently being reviewed by the Admin. You will receive access as soon as your account is approved.</span>
            </div>
          </div>
        )}

        {/* Rejection Notice */}
        {rejectionNotice && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
            <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
            <div>
              <span className="font-bold block text-sm mb-0.5">Registration Rejected</span>
              <span>Reason: {rejectionNotice}</span>
            </div>
          </div>
        )}

        {/* Global Error message */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
              />
            </div>
            {errors.email && (
              <span className="text-[10px] font-semibold text-red-500 mt-1">{errors.email.message}</span>
            )}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase">Password</label>
              <Link href="/login/forgot" className="text-xs text-primary-500 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
              />
            </div>
            {errors.password && (
              <span className="text-[10px] font-semibold text-red-500 mt-1">{errors.password.message}</span>
            )}
          </div>

          {/* Submit button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-primary-500 text-white font-semibold text-sm shadow flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging In...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Log In
              </>
            )}
          </button>
        </form>

        {/* Register link */}
        <div className="text-center mt-6 text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-6">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-primary-500 hover:underline">
            Register here
          </Link>
        </div>

      </div>
    </div>
  );
}
