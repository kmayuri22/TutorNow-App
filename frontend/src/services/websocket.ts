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
      const wsUrl = `ws://localhost:8000/ws/${userId}`;
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
            
            // Dispatch a custom window event for in-app toast triggers
            const customEvent = new CustomEvent("tutor_notification", { detail: data });
            window.dispatchEvent(customEvent);
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

      ws.onerror = (error) => {
        console.error("WebSocket error observed:", error);
        ws.close();
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
