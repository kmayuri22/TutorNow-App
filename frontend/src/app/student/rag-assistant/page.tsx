"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { useStore } from "@/store/useStore";
import {
  BookOpen, Send, Loader2, AlertCircle, Trash2,
  ChevronDown, FileText, BrainCircuit, X
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { document_name: string; subject: string }[];
  from_kb?: boolean;
}

interface RAGStatus {
  chromadb: boolean;
  embedder: boolean;
  ollama_running: boolean;
  ollama_model: string;
  document_count: number;
  ollama_url: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics:       "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  Physics:           "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  Chemistry:         "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  "Computer Science":"bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  Java:              "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  Python:            "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
  "C Programming":   "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  "Data Structures": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
};

export default function RAGAssistantPage() {
  const { name } = useStore();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [subject, setSubject]     = useState("");
  const [subjects, setSubjects]   = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [status, setStatus]       = useState<RAGStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    api.get("/api/rag/status").then(r => setStatus(r.data)).catch(() => {});
    api.get("/api/rag/subjects").then(r => setSubjects(r.data.subjects || [])).catch(() => {});
  }, []);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setError(null);
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/api/rag/ask", { question: q, subject: subject || undefined });
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
          from_kb: res.data.from_kb,
        },
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to get answer. Please try again.");
      setMessages(prev => prev.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="space-y-6 text-left">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold">Knowledge Library Assistant</h1>
        </div>
        <p className="text-sm text-indigo-100">
          Ask questions about uploaded study materials. Answers are sourced directly from your textbooks.
        </p>
        {/* Status pills */}
        {status && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.chromadb ? "bg-green-500/30 text-green-100" : "bg-red-500/30 text-red-100"}`}>
              📚 Vector DB {status.chromadb ? "Ready" : "Unavailable"}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.embedder ? "bg-green-500/30 text-green-100" : "bg-red-500/30 text-red-100"}`}>
              🔢 Embeddings {status.embedder ? "Ready" : "Unavailable"}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.ollama_running ? "bg-green-500/30 text-green-100" : "bg-amber-500/30 text-amber-100"}`}>
              🤖 Ollama {status.ollama_running ? "Running" : "Offline (fallback mode)"}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
              📄 {status.document_count} chunks indexed
            </span>
          </div>
        )}
      </div>

      {/* Chat window */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col" style={{ minHeight: 520 }}>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 shrink-0">Subject:</span>
          <div className="relative">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none cursor-pointer"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30">
                <BookOpen className="h-10 w-10 text-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Hi {name}! Ask from your textbooks
                </h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Questions are answered using uploaded study materials — no hallucination, real sources only.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {[
                  "What is Newton's second law?",
                  "Explain binary search trees",
                  "What is photosynthesis?",
                  "How does Python handle memory?",
                ].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 border border-slate-200 dark:border-slate-700 transition">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600"
              }`}>
                {msg.role === "user" ? (name?.[0]?.toUpperCase() || "S") : <BookOpen className="h-4 w-4" />}
              </div>

              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>

                {/* Sources */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, si) => (
                      <span key={si} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${SUBJECT_COLORS[src.subject] || "bg-slate-100 text-slate-600"}`}>
                        <FileText className="h-2.5 w-2.5" />
                        {src.document_name} · {src.subject}
                      </span>
                    ))}
                  </div>
                )}

                {/* Not from KB notice */}
                {msg.role === "assistant" && msg.from_kb === false && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not found in study materials
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-xs text-slate-500">Searching knowledge base...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t dark:border-slate-800 p-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question from your study materials..."
              rows={2}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder:text-slate-400 transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition shrink-0"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Answers are sourced from uploaded study materials only.
          </p>
        </div>
      </div>
    </div>
  );
}
