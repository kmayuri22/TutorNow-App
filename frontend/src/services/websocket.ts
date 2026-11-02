import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";

export const useWebSocket = (userId: number | null) => {
  const socketRef = useRef<WebSocket | null>(null);
  const addNotification = useStore((state) => state.addNotification);
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;
    const connect = () => {
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${hostname}:8000/ws/${userId}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket connected for user: ${userId}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "notification") {
            // Add notification to Zustand global store
            addNotification({
              id: data.id,
              message: data.message,
              status: data.status,
              created_at: data.created_at,
            });
            
            // Dispatch custom window events for in-app toast triggers and dashboard real-time updates
            window.dispatchEvent(new CustomEvent("tutor_notification", { detail: data }));

            if (data.event_type === "BOOKING_ACCEPTED" || data.event_type === "BOOKING_REJECTED" || data.event_type === "BOOKING_UPDATED") {
              window.dispatchEvent(new CustomEvent("booking_status_updated", { detail: data }));
            }
            if (data.event_type === "PAYMENT_SUCCESS") {
              window.dispatchEvent(new CustomEvent("payment_status_updated", { detail: data }));
            }
          } else if (data.event_type === "BOOKING_ACCEPTED" || data.event_type === "BOOKING_REJECTED") {
            window.dispatchEvent(new CustomEvent("booking_status_updated", { detail: data }));
          } else if (data.event_type === "PAYMENT_SUCCESS") {
            window.dispatchEvent(new CustomEvent("payment_status_updated", { detail: data }));
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed. Retrying in 5s...", event.reason);
        reconnectTimeout = setTimeout(() => {
          if (isAuthenticated) {
            connect();
          }
        }, 5000);
      };

      ws.onerror = () => {
        // Silently close on error; onclose will handle reconnect
        try {
          ws.close();
        } catch (_) {}
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userId, isAuthenticated, addNotification]);

  // Function to send messaging if needed
  const sendMessage = (msg: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  };

  return { sendMessage };
};
export default useWebSocket;
