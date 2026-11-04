"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import {
  Upload, Trash2, BookOpen, Loader2, AlertCircle,
  CheckCircle, FileText, RefreshCw
} from "lucide-react";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "Java", "Python", "C Programming",
  "Data Structures", "English", "History", "Economics",
];

interface DocRecord {
  id: string;
  subject: string;
  document_name: string;
  chunk_count: number;
  uploaded_by: string;
}

interface RAGStatus {
  chromadb: boolean;
  embedder: boolean;
  ollama_running: boolean;
  ollama_model: string;
  document_count: number;
  ollama_url: string;
  chromadb_error?: string;
  embedder_error?: string;
}

export default function KnowledgeBasePage() {
  const [docs, setDocs]             = useState<DocRecord[]>([]);
  const [status, setStatus]         = useState<RAGStatus | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Upload form
  const [subject, setSubject]       = useState(SUBJECTS[0]);
  const [docName, setDocName]       = useState("");
  const [file, setFile]             = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoadingDocs(true);
    try {
      const [docsRes, statusRes] = await Promise.all([
        api.get("/api/rag/admin/documents"),
        api.get("/api/rag/status"),
      ]);
      setDocs(docsRes.data);
      setStatus(statusRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load knowledge base data.");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docName.trim()) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subject", subject);
      form.append("document_name", docName.trim());
      const res = await api.post("/api/rag/admin/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(res.data.message);
      setFile(null);
      setDocName("");
      if (fileRef.current) fileRef.current.value = "";
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its indexed chunks?`)) return;
    try {
      await api.delete(`/api/rag/admin/documents/${docId}`);
      setSuccess(`Deleted "${name}" successfully.`);
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Delete failed.");
    }
  };

  return (
    <div className="space-y-8 text-left">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold">Knowledge Library</h1>
        </div>
        <p className="text-sm text-indigo-100">
          Upload PDF study materials. Students can ask questions answered directly from these documents.
        </p>
      </div>

      {/* Status panel */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Vector DB",    ok: status.chromadb,       err: status.chromadb_error  },
            { label: "Embeddings",   ok: status.embedder,        err: status.embedder_error  },
            { label: "Ollama AI",    ok: status.ollama_running,  note: status.ollama_running ? status.ollama_model : "Offline — fallback mode active" },
            { label: "Indexed Chunks", val: status.document_count },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</p>
              {"val" in item ? (
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{item.val}</p>
              ) : (
                <div className="flex items-center gap-1.5">
                  {item.ok
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <AlertCircle className="h-4 w-4 text-amber-500" />}
                  <span className={`text-xs font-semibold ${item.ok ? "text-green-600" : "text-amber-600"}`}>
                    {item.ok ? "Ready" : "Unavailable"}
                  </span>
                </div>
              )}
              {("note" in item && item.note) && (
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.note}</p>
              )}
              {("err" in item && item.err) && (
                <p className="text-[10px] text-red-400 mt-0.5 truncate">{item.err}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">

        {/* Upload form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-500" />
            Upload Study Material (PDF)
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Document Name</label>
              <input value={docName} onChange={e => setDocName(e.target.value)}
                placeholder="e.g. NCERT Physics Class 12 Chapter 1"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">PDF File</label>
              <input ref={fileRef} type="file" accept=".pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                required />
            </div>
            <button type="submit" disabled={uploading || !file || !docName.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Indexing PDF...</> : <><Upload className="h-4 w-4" />Upload & Index</>}
            </button>
          </form>
        </div>

        {/* Documents list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Indexed Documents ({docs.length})
            </h2>
            <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {loadingDocs ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
              <p>No documents uploaded yet.</p>
              <p>Upload a PDF to get started.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800 max-h-96 overflow-y-auto">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{doc.document_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">{doc.subject}</span>
                      <span className="text-[10px] text-slate-400">{doc.chunk_count} chunks</span>
                      <span className="text-[10px] text-slate-400">by {doc.uploaded_by}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(doc.id, doc.document_name)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 text-slate-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ollama setup guide (shown when offline) */}
      {status && !status.ollama_running && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Ollama Not Running — Setup Guide
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Ollama provides free local AI. Without it, students get raw text excerpts instead of AI-generated answers.
          </p>
          <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
            <li>Download Ollama from <strong>https://ollama.com</strong></li>
            <li>Install and run: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">ollama serve</code></li>
            <li>Pull model: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">ollama pull {status.ollama_model}</code></li>
            <li>Restart the TutorNow backend server</li>
          </ol>
        </div>
      )}
    </div>
  );
}

// Missing import fix
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
