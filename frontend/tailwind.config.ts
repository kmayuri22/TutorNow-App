import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        "pop-in": {
          "0%":   { opacity: "0", transform: "scale(0.7) translateY(8px)" },
          "70%":  { transform: "scale(1.06) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        wave: {
          "0%,100%": { transform: "rotate(0deg)"   },
          "25%":     { transform: "rotate(-20deg)"  },
          "75%":     { transform: "rotate(20deg)"   },
        },
        burst: {
          "0%":   { opacity: "1", transform: "rotate(var(--tw-rotate,0deg)) translateY(-32px) scale(1)"   },
          "80%":  { opacity: "0.6" },
          "100%": { opacity: "0",  transform: "rotate(var(--tw-rotate,0deg)) translateY(-56px) scale(0)" },
        },
        "ping-slow": {
          "0%,100%": { transform: "scale(1)",   opacity: "1" },
          "50%":     { transform: "scale(1.5)", opacity: "0.5" },
        },
      },
      animation: {
        "pop-in":    "pop-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "wave":      "wave 0.6s ease-in-out infinite",
        "burst":     "burst 0.6s ease-out forwards",
        "ping-slow": "ping-slow 1.4s ease-in-out infinite",
      },
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
      },
    },
  },
  plugins: [],
};
export default config;
