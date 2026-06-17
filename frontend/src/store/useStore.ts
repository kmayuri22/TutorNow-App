import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Notification {
  id: number;
  message: string;
  status: string; // Unread, Read
  created_at: string;
}

interface AppState {
  // Auth Slice
  token: string | null;
  role: string | null;
  name: string | null;
  email: string | null;
  userId: number | null;
  isAuthenticated: boolean;
  login: (data: { access_token: string; role: string; name: string; email: string; user_id: number }) => void;
  logout: () => void;

  // Theme Slice
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;

  // Notifications Slice
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
}

// Helper to check localStorage safely in Next.js
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
};

export const useStore = create<AppState>((set) => {
  // Initial loading from localStorage
  const initialToken = getLocalStorageItem("token");
  const initialRole = getLocalStorageItem("role");
  const initialName = getLocalStorageItem("name");
  const initialEmail = getLocalStorageItem("email");
  const initialUserIdStr = getLocalStorageItem("userId");
  const initialUserId = initialUserIdStr ? parseInt(initialUserIdStr, 10) : null;
  const initialTheme = (getLocalStorageItem("theme") as "light" | "dark") || "light";

  return {
    // Auth initial state
    token: initialToken,
    role: initialRole,
    name: initialName,
    email: initialEmail,
    userId: initialUserId,
    isAuthenticated: !!initialToken,

    login: (data) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("name", data.name);
        localStorage.setItem("email", data.email);
        localStorage.setItem("userId", data.user_id.toString());
      }
      set({
        token: data.access_token,
        role: data.role,
        name: data.name,
        email: data.email,
        userId: data.user_id,
        isAuthenticated: true,
      });
    },

    logout: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("name");
        localStorage.removeItem("email");
        localStorage.removeItem("userId");
      }
      set({
        token: null,
        role: null,
        name: null,
        email: null,
        userId: null,
        isAuthenticated: false,
        notifications: [],
        unreadCount: 0,
      });
    },

    // Theme state
    theme: initialTheme,
    toggleTheme: () => {
      set((state) => {
        const nextTheme = state.theme === "light" ? "dark" : "light";
        if (typeof window !== "undefined") {
          localStorage.setItem("theme", nextTheme);
          document.documentElement.classList.toggle("dark", nextTheme === "dark");
        }
        return { theme: nextTheme };
      });
    },
    setTheme: (theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
      set({ theme });
    },

    // Notifications state
    notifications: [],
    unreadCount: 0,
    setNotifications: (notifications) => {
      const unread = notifications.filter((n) => n.status === "Unread").length;
      set({ notifications, unreadCount: unread });
    },
    addNotification: (notification) => {
      set((state) => {
        // Avoid adding duplicate IDs if already present
        if (state.notifications.some((n) => n.id === notification.id)) {
          return {};
        }
        const updated = [notification, ...state.notifications];
        return {
          notifications: updated,
          unreadCount: state.unreadCount + (notification.status === "Unread" ? 1 : 0),
        };
      });
    },
    markAsRead: (id) => {
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, status: "Read" } : n
        );
        const unread = updated.filter((n) => n.status === "Unread").length;
        return { notifications: updated, unreadCount: unread };
      });
    },
    markAllAsRead: () => {
      set((state) => {
        const updated = state.notifications.map((n) => ({ ...n, status: "Read" }));
        return { notifications: updated, unreadCount: 0 };
      });
    },
  };
});
