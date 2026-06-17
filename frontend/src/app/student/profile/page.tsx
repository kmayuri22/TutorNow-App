"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { User, Mail, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function StudentProfile() {
  const { name, email, login, token, role, userId } = useStore();

  const [userName, setUserName] = useState(name || "");
  const [userEmail, setUserEmail] = useState(email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name) setUserName(name);
    if (email) setUserEmail(email);
  }, [name, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const updateData: any = {
        name: userName,
        email: userEmail
      };
      if (password) {
        updateData.password = password;
      }

      const response = await api.put("/api/auth/profile", updateData);
      
      // Update store state by feeding back updated credentials
      if (token && role && userId) {
        login({
          access_token: token,
          role: role,
          name: response.data.name,
          email: response.data.email,
          user_id: userId
        });
      }

      setSuccess("Profile settings updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-xs text-slate-455 mt-1">Manage your account information and password.</p>
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
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="email" 
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>

          <div className="border-t dark:border-slate-850 pt-5 mt-2 space-y-4">
            <h3 className="font-bold text-sm">Change Password</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto self-start mt-4 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition flex justify-center items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating Profile...
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
