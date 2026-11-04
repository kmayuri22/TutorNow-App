"use client";

/**
 * AIMascot – Interactive cartoon AI robot mascot for TutorNow.
 *
 * Self-contained component. Zero external dependencies beyond what the
 * project already uses (React, Tailwind, lucide-react, next/navigation).
 *
 * Drop it anywhere with:
 *   <AIMascot studentName="Mayuri" totalSessions={8} />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, BrainCircuit, Sparkles, ChevronRight } from "lucide-react";

// ── Study tips / motivational messages ────────────────────────────────────

const MESSAGES = [
  { emoji: "📚", text: "Start with the hardest topic first — your brain is freshest now!" },
  { emoji: "⏱️", text: "Try the Pomodoro technique: 25 min study, 5 min break. It works!" },
  { emoji: "🎯", text: "Set one clear goal per study session to stay focused." },
  { emoji: "💡", text: "Teaching a concept to someone else is the best way to master it." },
  { emoji: "🔁", text: "Review yesterday's notes before starting today's new topic." },
  { emoji: "🧠", text: "Sleep solidifies memory. Don't skip sleep before an exam!" },
  { emoji: "✍️", text: "Handwriting notes improves retention compared to typing." },
  { emoji: "🤔", text: "Stuck? Ask the AI Learning Assistant — it's here to help!" },
  { emoji: "🌟", text: "Progress, not perfection. Every small step counts." },
  { emoji: "📝", text: "Practice problems beat re-reading notes every time." },
];

// ── Robot SVG (pure inline, no external assets) ───────────────────────────

function RobotSVG({ mood }: { mood: "idle" | "happy" | "waving" | "thinking" }) {
  // Eye animation: blink every few seconds
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  const eyeH = blink ? 1 : 8;
  const eyeY = blink ? 19 : 15;

  return (
    <svg
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-lg"
      aria-label="AI Robot Mascot"
    >
      {/* ── Antenna ── */}
      <line x1="40" y1="4" x2="40" y2="14" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <circle
        cx="40" cy="4" r="3.5"
        fill={mood === "happy" || mood === "waving" ? "#f59e0b" : "#6366f1"}
        className={mood === "happy" ? "animate-ping-slow" : ""}
      />
      {/* Antenna glow ring */}
      {(mood === "happy" || mood === "waving") && (
        <circle cx="40" cy="4" r="6" fill="#f59e0b" opacity="0.25" />
      )}

      {/* ── Head ── */}
      <rect x="14" y="14" width="52" height="42" rx="14" fill="url(#headGrad)" />
      {/* Head highlight */}
      <rect x="18" y="17" width="22" height="8" rx="4" fill="white" opacity="0.18" />
      {/* Head border */}
      <rect x="14" y="14" width="52" height="42" rx="14" stroke="#6366f1" strokeWidth="1.5" fill="none" />

      {/* ── Eyes ── */}
      {/* Left eye */}
      <rect
        x="22" y={eyeY} width="12" height={eyeH} rx="4"
        fill={mood === "thinking" ? "#a78bfa" : "#fff"}
        className="transition-all duration-100"
      />
      {/* Right eye */}
      <rect
        x="46" y={eyeY} width="12" height={eyeH} rx="4"
        fill={mood === "thinking" ? "#a78bfa" : "#fff"}
        className="transition-all duration-100"
      />
      {/* Eye pupils (only when not blinking) */}
      {!blink && (
        <>
          <circle cx="28" cy="19" r="3" fill={mood === "happy" ? "#f59e0b" : "#6366f1"} />
          <circle cx="52" cy="19" r="3" fill={mood === "happy" ? "#f59e0b" : "#6366f1"} />
          {/* Pupil shine */}
          <circle cx="29.5" cy="17.5" r="1" fill="white" opacity="0.7" />
          <circle cx="53.5" cy="17.5" r="1" fill="white" opacity="0.7" />
        </>
      )}

      {/* ── Mouth ── */}
      {mood === "happy" || mood === "waving" ? (
        // Big smile
        <path d="M26 36 Q40 46 54 36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : mood === "thinking" ? (
        // Thinking face (slight curve)
        <path d="M28 37 Q40 34 52 37" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        // Neutral smile
        <path d="M28 36 Q40 42 52 36" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}

      {/* ── Neck ── */}
      <rect x="34" y="56" width="12" height="7" rx="3" fill="#818cf8" />

      {/* ── Body ── */}
      <rect x="10" y="63" width="60" height="34" rx="12" fill="url(#bodyGrad)" />
      <rect x="10" y="63" width="60" height="34" rx="12" stroke="#6366f1" strokeWidth="1.5" fill="none" />
      {/* Body highlight */}
      <rect x="14" y="66" width="24" height="6" rx="3" fill="white" opacity="0.12" />

      {/* Chest panel */}
      <rect x="24" y="71" width="32" height="18" rx="6" fill="#312e81" opacity="0.5" />
      {/* Panel lights */}
      <circle cx="33" cy="78" r="3" fill={mood === "happy" ? "#34d399" : "#6366f1"} opacity="0.9" />
      <circle cx="40" cy="78" r="3" fill={mood === "thinking" ? "#f59e0b" : "#818cf8"} opacity="0.9" />
      <circle cx="47" cy="78" r="3" fill={mood === "waving" ? "#f472b6" : "#a5b4fc"} opacity="0.9" />
      {/* Heart on chest */}
      <text x="38" y="87" fontSize="6" fill="#f472b6" opacity="0.7">♥</text>

      {/* ── Arms ── */}
      {/* Left arm */}
      <rect
        x="0" y="65" width="11" height="22" rx="5.5"
        fill="#818cf8"
        className={mood === "waving" ? "origin-top-right animate-wave" : ""}
        style={mood === "waving" ? { transformOrigin: "10px 65px" } : {}}
      />
      {/* Left hand */}
      <circle cx="5.5" cy="89" r="5" fill="#6366f1" />

      {/* Right arm */}
      <rect x="69" y="65" width="11" height="22" rx="5.5" fill="#818cf8" />
      {/* Right hand */}
      <circle cx="74.5" cy="89" r="5" fill="#6366f1" />

      {/* ── Gradient defs ── */}
      <defs>
        <linearGradient id="headGrad" x1="14" y1="14" x2="66" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="bodyGrad" x1="10" y1="63" x2="70" y2="97" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Celebration burst (confetti-like sparkles) ────────────────────────────

function CelebrationBurst() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * 360,
    color: ["#f59e0b", "#f472b6", "#34d399", "#60a5fa", "#a78bfa"][i % 5],
    size: 4 + (i % 3) * 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute animate-burst"
          style={{
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            borderRadius: i % 2 === 0 ? "50%" : "2px",
            backgroundColor: p.color,
            transform: `rotate(${p.angle}deg) translateY(-32px)`,
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Speech bubble ─────────────────────────────────────────────────────────

function SpeechBubble({
  message,
  onClose,
  onAI,
}: {
  message: { emoji: string; text: string };
  onClose: () => void;
  onAI: () => void;
}) {
  return (
    <div className="absolute bottom-full mb-3 right-0 w-64 sm:w-72 z-50 animate-pop-in">
      {/* Bubble */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-br-sm shadow-xl p-4 text-left">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {/* Message */}
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 pr-5 leading-relaxed">
          <span className="mr-1.5">{message.emoji}</span>
          {message.text}
        </p>

        {/* CTA */}
        <button
          onClick={onAI}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition shadow-sm"
        >
          <BrainCircuit className="h-3.5 w-3.5" />
          Open AI Learning Assistant
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      {/* Tail */}
      <div className="absolute bottom-0 right-6 translate-y-full w-0 h-0 border-l-8 border-r-0 border-t-8 border-l-transparent border-t-white dark:border-t-slate-800" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface AIMascotProps {
  studentName?: string;
  totalSessions?: number;
  /** Fire this to trigger the celebration animation from outside */
  celebrate?: boolean;
}

export default function AIMascot({ studentName, totalSessions = 0, celebrate = false }: AIMascotProps) {
  const router = useRouter();

  const [mood, setMood] = useState<"idle" | "happy" | "waving" | "thinking">("waving");
  const [showBubble, setShowBubble] = useState(true);
  const [messageIdx, setMessageIdx] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [floatUp, setFloatUp] = useState(false);

  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick a greeting on mount
  const greeting = studentName
    ? { emoji: "👋", text: `Hey ${studentName}! Ready to learn something amazing today?` }
    : { emoji: "👋", text: "Welcome to TutorNow! I'm Robo — your AI study buddy!" };

  const [currentMessage, setCurrentMessage] = useState(greeting);

  // Float animation loop
  useEffect(() => {
    const t = setInterval(() => setFloatUp((v) => !v), 1800);
    return () => clearInterval(t);
  }, []);

  // Wave → idle after 2s
  useEffect(() => {
    const t = setTimeout(() => setMood("idle"), 2000);
    return () => clearTimeout(t);
  }, []);

  // Auto-cycle tips every 12s when bubble is hidden
  useEffect(() => {
    if (showBubble) return;
    cycleRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * MESSAGES.length);
      setMessageIdx(idx);
      setCurrentMessage(MESSAGES[idx]);
      setMood("thinking");
      setShowBubble(true);
      setTimeout(() => setMood("idle"), 1500);
    }, 12000);
    return () => { if (cycleRef.current) clearInterval(cycleRef.current); };
  }, [showBubble]);

  // External celebrate trigger
  useEffect(() => {
    if (!celebrate) return;
    triggerCelebration();
  }, [celebrate]);

  const triggerCelebration = useCallback(() => {
    setCelebrating(true);
    setMood("happy");
    setCurrentMessage({ emoji: "🎉", text: "Amazing work! You're on fire! Keep it up!" });
    setShowBubble(true);
    setTimeout(() => {
      setCelebrating(false);
      setMood("idle");
    }, 2500);
  }, []);

  const handleClick = () => {
    if (showBubble) {
      // Cycle to next tip
      const next = (messageIdx + 1) % MESSAGES.length;
      setMessageIdx(next);
      setCurrentMessage(MESSAGES[next]);
      setMood("thinking");
      setTimeout(() => setMood("idle"), 800);
    } else {
      setMood("happy");
      setCurrentMessage(greeting);
      setShowBubble(true);
      setTimeout(() => setMood("idle"), 1000);
    }
  };

  const handleGoToAI = () => {
    setShowBubble(false);
    router.push("/student/ai-assistant");
  };

  return (
    <div
      className="relative select-none"
      style={{ width: 72, height: 90 }}
      aria-label="AI Mascot – click for study tips"
    >
      {/* Speech bubble */}
      {showBubble && (
        <SpeechBubble
          message={currentMessage}
          onClose={() => setShowBubble(false)}
          onAI={handleGoToAI}
        />
      )}

      {/* Celebration burst */}
      {celebrating && <CelebrationBurst />}

      {/* Robot body — clickable */}
      <button
        onClick={handleClick}
        className={`w-full h-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-transform active:scale-95
          ${floatUp ? "-translate-y-1.5" : "translate-y-0"}
        `}
        style={{ transition: "transform 0.9s ease-in-out" }}
        title="Click for a study tip!"
        aria-expanded={showBubble}
      >
        <RobotSVG mood={mood} />
      </button>

      {/* Sparkle badge */}
      <div className="absolute -top-1 -right-1 pointer-events-none">
        <Sparkles className="h-4 w-4 text-amber-400 drop-shadow" />
      </div>

      {/* Session streak badge */}
      {totalSessions > 0 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-600 text-white shadow whitespace-nowrap">
            {totalSessions} sessions 🔥
          </span>
        </div>
      )}
    </div>
  );
}
