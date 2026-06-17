import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

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
        // Clear local storage and redirect if unauthorized
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("name");
        localStorage.removeItem("email");
        localStorage.removeItem("userId");
        
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
