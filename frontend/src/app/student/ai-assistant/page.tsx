"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { useStore } from "@/store/useStore";
import {
  BrainCircuit, Send, Loader2, AlertCircle, ChevronDown,
  MessageSquare, Trash2, Plus, BookOpen, Clock, X
} from "lucide-react";

// ── Types ────────────────────────────────────

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface SessionSummary {
  session_id: string;
  subject: string | null;
  first_message: string;
  created_at: string;
  message_count: number;
}

// ── Constants ────────────────────────────────

const SUBJECTS = [
  "General",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "English",
  "History",
  "Geography",
  "Economics",
];

// ── Component ────────────────────────────────

export default function AILearningAssistant() {
  const { name } = useStore();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("General");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History panel state
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history list when panel opens
  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/api/ai/history");
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to load AI chat history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSession = async (sid: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/ai/history/${sid}`);
      setMessages(res.data);
      setSessionId(sid);
      setShowHistory(false);
      // Set subject from first message
      if (res.data.length > 0 && res.data[0].subject) {
        setSubject(res.data[0].subject);
      }
    } catch (err) {
      setError("Failed to load conversation.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/ai/history/${sid}`);
      setSessions((prev) => prev.filter((s) => s.session_id !== sid));
      // If currently viewing this session, clear it
      if (sessionId === sid) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setInput("");
    setError(null);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);

    // Optimistically show student message
    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setLoading(true);
    try {
      const res = await api.post("/api/ai/chat", {
        message: trimmed,
        subject,
        session_id: sessionId,
      });

      const { reply, session_id: newSessionId } = res.data;

      // Update session ID if this was a new conversation
      if (!sessionId) {
        setSessionId(newSessionId);
      }

      // Add AI response
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        "Failed to get a response. Please check your internet connection and try again.";
      setError(detail);
      // Remove the optimistically added user message on failure
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed); // Restore input so user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────

  return (
    <div className="space-y-6 text-left">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-6 w-6" />
              <h1 className="text-2xl font-extrabold">AI Learning Assistant</h1>
            </div>
            <p className="text-sm text-purple-100">
              Ask any academic question and get clear, step-by-step explanations.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition backdrop-blur-sm"
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition backdrop-blur-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Previous Conversations
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No previous conversations found.
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800 max-h-64 overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {s.subject && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                          {s.subject}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        · {s.message_count} msg{s.message_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-350 truncate">
                      {s.first_message}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(s.session_id, e)}
                    className="ml-3 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 text-slate-400 transition shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Window */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden"
        style={{ minHeight: "520px" }}
      >

        {/* Subject Selector Bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 shrink-0">Subject:</span>
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white appearance-none cursor-pointer"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
          {sessionId && (
            <span className="ml-auto text-[10px] text-slate-400 font-medium">
              Session active
            </span>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Welcome message when no chat yet */}
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30">
                <BrainCircuit className="h-10 w-10 text-purple-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Hi {name}, I&apos;m your AI Learning Assistant!
                </h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Ask me any academic question — I&apos;ll provide clear, step-by-step explanations with examples.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {[
                  "Explain Newton's laws of motion",
                  "How do I solve quadratic equations?",
                  "What is photosynthesis?",
                  "Explain recursion in programming",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300"
                }`}
              >
                {msg.role === "user" ? (name?.[0]?.toUpperCase() || "S") : <BrainCircuit className="h-4 w-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary-600 text-white rounded-tr-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 flex-row">
              <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                <BrainCircuit className="h-4 w-4 text-purple-500" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t dark:border-slate-800 p-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a ${subject === "General" ? "" : subject + " "}question... (Enter to send, Shift+Enter for new line)`}
              rows={2}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white placeholder:text-slate-400 transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition shadow-sm shrink-0"
              title="Send message"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            AI responses are for educational purposes. Always verify important information with your tutor.
          </p>
        </div>
      </div>
    </div>
  );
}
