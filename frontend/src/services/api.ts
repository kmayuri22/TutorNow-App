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
      config.baseURL = process.env.NEXT_PUBLIC_API_URL || "https://tutornow-backend-z3mh.onrender.com";

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

// Response interceptor to handle token expiry gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log warning for debugging without killing session on background polling
    if (error.response?.status === 401) {
      console.warn("[API Notice] 401 Unauthorized for request:", error.config?.url);
    }
    return Promise.reject(error);
  }
);
export default api;
