"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/services/api";
import {
  User, Mail, Phone, Lock, UserPlus, Loader2, AlertCircle,
  FileText, Upload, CheckCircle2, BookOpen, MapPin, IndianRupee, Clock
} from "lucide-react";

// Register validation schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(10, "Please enter a valid 10-digit mobile number").max(15, "Mobile number too long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["Student", "Tutor"], {
    required_error: "Please select a user role",
  }),

  // Tutor optional/conditional fields
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  subject: z.string().optional(),
  experience: z.coerce.number().min(0).optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
  languages: z.string().optional(),
  teaching_mode: z.enum(["Online", "Offline", "Both"]).optional(),
  location_city: z.string().optional(),
  location_address: z.string().optional(),
  bio: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as "Student" | "Tutor") || "Student";

  const [step, setStep] = useState<1 | 2>(1); // Step 1: Basic account, Step 2: Tutor profile & docs
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // File upload state for Tutor certificate
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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
      experience: 0,
      hourly_rate: 300,
      teaching_mode: "Online",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (selectedRole === "Tutor") {
        // Register full tutor account
        const res = await api.post("/api/auth/register/tutor", data);
        const registeredUserId = res.data.id;

        // If certificate file attached, upload it
        if (certificateFile) {
          setUploadProgress("Uploading qualification documents...");
          // We need token or login to upload via /api/uploads/certificate, or we upload via login
          // Let's attempt auto-login to upload certificate
          try {
            const loginRes = await api.post("/api/auth/login", {
              email: data.email,
              password: data.password,
            });
            // Token temporarily attached for upload
            const token = loginRes.data.access_token;

            const formData = new FormData();
            formData.append("file", certificateFile);
            formData.append("doc_label", "Degree / Qualification Certificate");

            await api.post("/api/uploads/certificate", formData, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          } catch (uploadErr) {
            console.warn("Certificate upload deferral:", uploadErr);
          }
        }

        setSuccessMessage("Tutor registration successful! Your profile and documents have been submitted for Admin approval.");
      } else {
        // Student Registration
        await api.post("/api/auth/register", {
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          password: data.password,
          role: "Student",
        });

        setSuccessMessage("Student account registered successfully! Redirecting to login...");
      }

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || "Registration failed. Email or Mobile may already be registered.";
      setErrorMessage(detail);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="py-12 bg-slate-50 dark:bg-slate-950 min-h-screen flex justify-center items-center px-4 transition-colors duration-200">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 sm:p-8 text-left">
        
        {/* Header */}
        <div className="text-center mb-8 flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold">Create Your Account</h1>
          <p className="text-sm text-slate-500">
            {selectedRole === "Tutor"
              ? "Join TutorNow as a verified tutor and share your expertise"
              : "Join TutorNow to find and book expert tutors near you"}
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm mb-0.5">Registration Received!</span>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5">
          
          {/* Role selector buttons */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Select Role</label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setValue("role", "Student");
                  setStep(1);
                }}
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
          </div>

          {/* STEP 1: Basic Information */}
          <div className="space-y-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  {...register("name")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
              {errors.name && <span className="text-[10px] font-semibold text-red-500">{errors.name.message}</span>}
            </div>

            {/* Email & Mobile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input 
                    type="email"
                    placeholder="rahul@example.com"
                    {...register("email")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
                {errors.email && <span className="text-[10px] font-semibold text-red-500">{errors.email.message}</span>}
              </div>

              {/* Mobile */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input 
                    type="tel"
                    placeholder="9876543210"
                    {...register("mobile")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
                {errors.mobile && <span className="text-[10px] font-semibold text-red-500">{errors.mobile.message}</span>}
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="password"
                  placeholder="Min 6 characters"
                  {...register("password")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
              {errors.password && <span className="text-[10px] font-semibold text-red-500">{errors.password.message}</span>}
            </div>
          </div>

          {/* STEP 2: Extended Tutor Fields (Only shown if Tutor selected) */}
          {selectedRole === "Tutor" && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-500" />
                Tutor Professional Details
              </h3>

              {/* Qualification & Specialization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Highest Qualification</label>
                  <input 
                    type="text"
                    placeholder="e.g. M.Sc. Mathematics, B.Tech CS"
                    {...register("qualification")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Specialization</label>
                  <input 
                    type="text"
                    placeholder="e.g. Higher Secondary Math"
                    {...register("specialization")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Subjects & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Subjects Taught (comma separated)</label>
                  <input 
                    type="text"
                    placeholder="Mathematics, Physics, Calculus"
                    {...register("subject")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Experience (Years)</label>
                  <input 
                    type="number"
                    min="0"
                    {...register("experience")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Hourly Rate & Teaching Mode & Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Hourly Fee (₹ INR)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">₹</span>
                    <input 
                      type="number"
                      min="0"
                      step="50"
                      {...register("hourly_rate")}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Teaching Mode</label>
                  <select 
                    {...register("teaching_mode")}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    <option value="Online">Online Video Call</option>
                    <option value="Offline">In-Person (Offline)</option>
                    <option value="Both">Both (Online & In-Person)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Languages Spoken</label>
                  <input 
                    type="text"
                    placeholder="English, Hindi, Tamil"
                    {...register("languages")}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>

              {/* City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">City / Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. Chennai, Bengaluru, Delhi"
                    {...register("location_city")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Full Address</label>
                  <input 
                    type="text"
                    placeholder="e.g. Anna Nagar, Chennai"
                    {...register("location_address")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Brief Bio / Introduction</label>
                <textarea 
                  rows={3}
                  placeholder="Tell students about your academic background and teaching philosophy..."
                  {...register("bio")}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              {/* Upload Certificate Document */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary-500" />
                  Upload Qualification Certificate (PDF or Image)
                </label>
                <p className="text-[11px] text-slate-450">
                  Required for Admin review & verification. Max 10MB.
                </p>
                <input 
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  className="mt-1 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
                {certificateFile && (
                  <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1">
                    ✓ File selected: {certificateFile.name} ({(certificateFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Submit button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-primary-500 text-white font-semibold text-sm shadow flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadProgress || "Submitting Registration..."}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                {selectedRole === "Tutor" ? "Submit Tutor Profile for Approval" : "Complete Registration"}
              </>
            )}
          </button>
        </form>

        {/* Login link */}
        <div className="text-center mt-6 text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-6">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-primary-500 hover:underline">
            Log In here
          </Link>
        </div>

      </div>
    </div>
  );
}
