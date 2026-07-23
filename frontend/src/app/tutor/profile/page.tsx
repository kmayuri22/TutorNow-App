"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { 
  User, Mail, BookOpen, GraduationCap, Clock, 
  CheckCircle, AlertCircle, Loader2, Image, FileText, Upload,
  Trash2, ExternalLink, MapPin, IndianRupee
} from "lucide-react";

interface DocumentItem {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  doc_label?: string;
  uploaded_at: string;
}

export default function TutorProfile() {
  const { name, email, login, token, role, userId } = useStore();

  const [tutorName, setTutorName] = useState(name || "");
  const [subject, setSubject] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(500.0);
  const [languages, setLanguages] = useState("");
  const [teachingMode, setTeachingMode] = useState("Online");
  const [locationCity, setLocationCity] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [docLabel, setDocLabel] = useState("Degree Certificate");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/auth/profile");
      const data = res.data;
      setTutorName(data.name);
      
      if (data.tutor_details) {
        setSubject(data.tutor_details.subject || "");
        setQualification(data.tutor_details.qualification || "");
        setSpecialization(data.tutor_details.specialization || "");
        setExperience(data.tutor_details.experience || 0);
        setHourlyRate(data.tutor_details.hourly_rate || 0);
        setLanguages(data.tutor_details.languages || "");
        setTeachingMode(data.tutor_details.teaching_mode || "Online");
        setLocationCity(data.tutor_details.location_city || "");
        setLocationAddress(data.tutor_details.location_address || "");
        setBio(data.tutor_details.bio || "");
        setProfileImage(data.tutor_details.profile_image || "");
        setDocuments(data.tutor_details.documents || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load tutor profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
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
        specialization,
        experience: Number(experience),
        hourly_rate: Number(hourlyRate),
        languages,
        teaching_mode: teachingMode,
        location_city: locationCity,
        location_address: locationAddress,
        bio,
        profile_image: profileImage
      };

      const response = await api.put("/api/tutors/profile", updateData);
      
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

  const handleUploadCertificate = async () => {
    if (!newDocFile) return;
    setUploadingDoc(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", newDocFile);
      formData.append("doc_label", docLabel);

      await api.post("/api/uploads/certificate", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setNewDocFile(null);
      alert("Certificate uploaded successfully!");
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Document upload failed");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.delete(`/api/uploads/certificate/${docId}`);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Delete document failed");
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
    <div className="space-y-8 text-left max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Tutor Profile & Qualification Documents</h1>
        <p className="text-xs text-slate-455 mt-1">Manage your public teaching bio, academic credentials, teaching location, and qualification certificates.</p>
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

      {/* Main Profile Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
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
              <label className="text-xs font-semibold text-slate-400 uppercase">Profile Photo Image URL</label>
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
              <label className="text-xs font-semibold text-slate-400 uppercase">Subject Expertise (comma separated)</label>
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
              <label className="text-xs font-semibold text-slate-400 uppercase">Qualification</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Specialization</label>
              <input 
                type="text" 
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Calculus, IIT-JEE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Experience (Years)</label>
              <input 
                type="number" 
                required
                min="0"
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Hourly Fee (₹ INR)</label>
              <input 
                type="number" 
                required
                min="0"
                step="50"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Teaching Mode</label>
              <select
                value={teachingMode}
                onChange={(e) => setTeachingMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white font-semibold"
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
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="English, Hindi, Tamil"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">City / Location</label>
              <input 
                type="text" 
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g. Chennai, Bengaluru"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Full Address (for In-Person sessions)</label>
            <input 
              type="text" 
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g. Anna Nagar, Chennai, Tamil Nadu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Bio & Teaching Style</label>
            <textarea 
              rows={4}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto self-start px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition flex justify-center items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Profile Changes"
            )}
          </button>
        </form>

        {/* Qualification Documents Upload Section */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500" />
              Qualification Certificates & Documents ({documents.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Upload degree certificates, ID proofs, or teaching credentials for Admin verification.</p>
          </div>

          {/* List of current documents */}
          {documents.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center gap-3 text-xs">
                  <FileText className="h-4 w-4 text-primary-500" />
                  <div className="flex flex-col">
                    <span className="font-semibold">{doc.doc_label || doc.file_name}</span>
                    <span className="text-[10px] text-slate-400">{doc.file_type.toUpperCase()}</span>
                  </div>
                  <a
                    href={`/api/uploads/${doc.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="View Document"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1 hover:bg-red-100 text-red-500 rounded"
                    title="Delete Document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload new doc widget */}
          <div className="p-4 border border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Document Title (e.g. Master's Degree)"
                value={docLabel}
                onChange={(e) => setDocLabel(e.target.value)}
                className="px-3.5 py-2 border rounded-xl bg-white dark:bg-slate-900 text-xs focus:outline-none dark:text-white"
              />
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/jpg"
                onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
            </div>
            <button
              onClick={handleUploadCertificate}
              disabled={uploadingDoc || !newDocFile}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload Document
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
