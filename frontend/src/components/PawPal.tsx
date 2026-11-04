"use client";

/**
 * PawPal – Cute AI Pet Companion for the AI Learning Assistant.
 * Self-contained. Only used inside ai-assistant/page.tsx.
 * Zero new dependencies.
 */

import { useState } from "react";

export type PetType = "dog" | "cat";
export type PetMood = "welcome" | "thinking" | "answered" | "correct" | "bye";

const PET = {
  dog: {
    emoji: "🐶",
    name: "Buddy",
    captions: {
      welcome:   "Woof! Ready to learn something new?",
      thinking:  "Sniffing out the answer... 🐾",
      answered:  "Let's learn together! 🦴",
      correct:   "Woof! You nailed it! 🎉",
      bye:       "See you in the next lesson! 👋",
    },
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  cat: {
    emoji: "🐱",
    name: "Luna",
    captions: {
      welcome:   "Meow! What shall we learn today? 🌙",
      thinking:  "Thinking... meow! 🐾",
      answered:  "That was interesting! 😸",
      correct:   "Purr-fect work! 🌟",
      bye:       "Bye! Keep learning! 🐾",
    },
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  },
};

interface PawPalProps {
  mood: PetMood;
  pet: PetType;
  onChangePet: (p: PetType) => void;
}

export default function PawPal({ mood, pet, onChangePet }: PawPalProps) {
  const p = PET[pet];

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${p.bg} ${p.border} transition-colors duration-300`}>
      {/* Avatar */}
      <div className="relative shrink-0">
        <span className="text-3xl leading-none select-none">{p.emoji}</span>
        {/* Thinking pulse */}
        {mood === "thinking" && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        )}
        {/* Correct celebration */}
        {mood === "correct" && (
          <span className="absolute -top-1 -right-1 text-sm animate-bounce">⭐</span>
        )}
      </div>

      {/* Caption */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">{p.name}</p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
          {p.captions[mood]}
        </p>
      </div>

      {/* Switch pet */}
      <button
        onClick={() => onChangePet(pet === "dog" ? "cat" : "dog")}
        title={`Switch to ${pet === "dog" ? "Luna 🐱" : "Buddy 🐶"}`}
        className={`shrink-0 px-2 py-1 rounded-xl text-[10px] font-bold border ${p.badge} transition hover:opacity-80`}
      >
        {pet === "dog" ? "🐱 Luna" : "🐶 Buddy"}
      </button>
    </div>
  );
}
