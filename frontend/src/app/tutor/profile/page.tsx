"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { 
  User, Mail, BookOpen, GraduationCap, Clock, 
  DollarSign, CheckCircle, AlertCircle, Loader2, Image
} from "lucide-react";

export default function TutorProfile() {
  const { name, email, login, token, role, userId } = useStore();

  const [tutorName, setTutorName] = useState(name || "");
  const [subject, setSubject] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(25.0);
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch detailed profile on load
    api.get("/api/auth/profile")
      .then((res) => {
        const data = res.data;
        setTutorName(data.name);
        
        if (data.tutor_details) {
          setSubject(data.tutor_details.subject);
          setQualification(data.tutor_details.qualification);
          setExperience(data.tutor_details.experience);
          setHourlyRate(data.tutor_details.hourly_rate);
          setBio(data.tutor_details.bio);
          setProfileImage(data.tutor_details.profile_image);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load detailed profile data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const updateData = {
        name: tutorName,
        subject,
        qualification,
        experience: Number(experience),
        hourly_rate: Number(hourlyRate),
        bio,
        profile_image: profileImage
      };

      const response = await api.put("/api/tutors/profile", updateData);
      
      // Update global Zustand store state name field
      if (token && role && userId) {
        login({
          access_token: token,
          role: role,
          name: response.data.user.name,
          email: email || "",
          user_id: userId
        });
      }

      setSuccess("Tutor profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to save tutor profile details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <div className="h-40 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
        <div className="h-64 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Tutor Profile Settings</h1>
        <p className="text-xs text-slate-455 mt-1">Manage your public teaching bio, academic credentials, and hourly rates.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs text-green-600 dark:text-green-400 flex items-start gap-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Profile Photo URL</label>
              <div className="relative">
                <Image className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Subject Expertise</label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Degrees & Qualifications</label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Experience (Years)</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="number" 
                  required
                  min="0"
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Hourly Charge Rate ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="number" 
                  required
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Bio & Teaching Style</label>
            <textarea 
              rows={6}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto self-start mt-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition flex justify-center items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
