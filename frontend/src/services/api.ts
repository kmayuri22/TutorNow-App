import axios from "axios";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "localhost";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${hostname}:8000`;
  }
  return "http://localhost:8000";
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically set dynamic baseURL and Authorization token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Use current window origin (same host & port 3000 as Next.js frontend)
      // Next.js rewrites will proxy all /api/* calls internally to FastAPI on http://127.0.0.1:8000
      config.baseURL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / unauthenticated states
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        try {
          // Dynamically require useStore to avoid module loading order issues
          const { useStore } = require("@/store/useStore");
          useStore.getState().logout();
        } catch (e) {
          console.warn("Failed to clear store session dynamically:", e);
        }
        
        // Avoid infinite redirect loops on public routes
        const path = window.location.pathname;
        if (path !== "/login" && path !== "/register" && path !== "/" && path !== "/tutors") {
          window.location.href = "/login?msg=session_expired";
        }
      }
    }
    return Promise.reject(error);
  }
);
export default api;
