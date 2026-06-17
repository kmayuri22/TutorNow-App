"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { Mail, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";

// Schema for form validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const loginUser = useStore((state) => state.login);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      const detail = error.response?.data?.detail || "Invalid email or password. Please try again.";
      setErrorMessage(detail);
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
          <p className="text-sm text-slate-500">Access your student, tutor, or admin panel</p>
        </div>

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
