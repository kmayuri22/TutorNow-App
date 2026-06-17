"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/services/api";
import { User, Mail, Lock, UserPlus, Loader2, AlertCircle } from "lucide-react";

// Schema for registration validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["Student", "Tutor"], {
    required_error: "Please select a user role",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as "Student" | "Tutor") || "Student";
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: defaultRole,
    }
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.post("/api/auth/register", data);
      setSuccessMessage("Account registered successfully! Redirecting to login...");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || "Registration failed. Email may already be registered.";
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
          <h1 className="text-2xl sm:text-3xl font-extrabold">Create Your Account</h1>
          <p className="text-sm text-slate-500">Join TutorNow to browse or schedule tutoring</p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs text-green-600 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5">
          
          {/* Role selector buttons */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Select Role</label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
              <button
                type="button"
                onClick={() => setValue("role", "Student")}
                className={`py-2 rounded-lg text-xs font-bold transition ${selectedRole === "Student" ? "bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400" : "text-slate-500 hover:text-slate-900"}`}
              >
                I am a Student
              </button>
              <button
                type="button"
                onClick={() => setValue("role", "Tutor")}
                className={`py-2 rounded-lg text-xs font-bold transition ${selectedRole === "Tutor" ? "bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400" : "text-slate-500 hover:text-slate-900"}`}
              >
                I am a Tutor
              </button>
            </div>
            {errors.role && (
              <span className="text-[10px] font-semibold text-red-500 mt-1">{errors.role.message}</span>
            )}
          </div>

          {/* Full Name Input */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Alex Smith"
                {...register("name")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white"
              />
            </div>
            {errors.name && (
              <span className="text-[10px] font-semibold text-red-500 mt-1">{errors.name.message}</span>
            )}
          </div>

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="email"
                placeholder="alex@example.com"
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
            <label className="text-xs font-semibold text-slate-400 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="password"
                placeholder="Min 6 characters"
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
            className="w-full mt-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-primary-500 text-white font-semibold text-sm shadow flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Sign Up
              </>
            )}
          </button>
        </form>

        {/* Login link */}
        <div className="text-center mt-6 text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary-500 hover:underline">
            Log In
          </Link>
        </div>

      </div>
    </div>
  );
}
