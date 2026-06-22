import axios from "axios";

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
  ? "https://tame-pillows-punch.loca.lt"
  : "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically add Authorization token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
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
