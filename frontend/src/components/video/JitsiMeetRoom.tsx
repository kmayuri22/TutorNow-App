"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, Wifi, WifiOff, VideoOff, Mic, MicOff, Monitor, Phone,
  PhoneOff, Users, Settings, RefreshCw, ExternalLink, AlertCircle
} from "lucide-react";

interface JitsiMeetRoomProps {
  roomId: string;
  userName: string;
  userRole?: "Tutor" | "Student";
  bookingId?: number | string;
  onCallEnd?: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiMeetRoom: React.FC<JitsiMeetRoomProps> = ({
  roomId,
  userName,
  userRole = "Student",
  bookingId,
  onCallEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [useIframe, setUseIframe] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const directJitsiUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(userName)}`;

  // Timer for session duration
  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connected]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const initJitsi = useCallback(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

    // Clean up previous instance
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch (_) {}
      apiRef.current = null;
    }

    try {
      const isTutor = userRole === "Tutor";

      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: roomId,
        width: "100%",
        height: "100%",
        parentNode: containerRef.current,
        userInfo: {
          displayName: `${userName} (${userRole})`,
        },
        configOverwrite: {
          // Camera & audio defaults
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // Skip pre-join screen for instant join on desktop & mobile
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          // Disable moderator locks & lobby
          enableLobbyChat: false,
          lobby: { autoKnock: false, enableChat: false },
          // Allow screen share
          desktopSharingChromeExtId: null,
          hideConferenceSubject: false,
          subject: `TutorNow Classroom #${bookingId || roomId.slice(-6)}`,
          disableDeepLinking: true,
          defaultLanguage: "en",
          // Allow guest entry without account login
          enableUserRolesBasedOnToken: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",         // Screen Share
            "chat",            // In-call Chat
            "hangup",          // End Call
            "tileview",        // Grid view
            "raisehand",
            "participants-pane",
            "fullscreen",
            "settings",
            "filmstrip",
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: "#0f172a",
          TILE_VIEW_MAX_COLUMNS: 2,
          MOBILE_APP_PROMO: false,
          APP_NAME: "TutorNow Classroom",
          NATIVE_APP_NAME: "TutorNow",
          PROVIDER_NAME: "TutorNow",
        },
      });

      apiRef.current = api;

      // Events
      api.addEventListener("videoConferenceJoined", () => {
        setConnected(true);
        setLoading(false);
        setError(null);
      });

      api.addEventListener("videoConferenceLeft", () => {
        setConnected(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (onCallEnd) onCallEnd();
      });

      api.addEventListener("participantJoined", () => {
        setParticipantCount((c) => c + 1);
      });

      api.addEventListener("participantLeft", () => {
        setParticipantCount((c) => Math.max(0, c - 1));
      });

      // Timeout fallback if connection stalls
      setTimeout(() => {
        if (loading) setLoading(false);
      }, 12000);

    } catch (err: any) {
      console.error("Jitsi init error:", err);
      setError("Jitsi API failed. Switching to direct browser join.");
      setLoading(false);
      setUseIframe(true);
    }
  }, [roomId, userName, userRole, bookingId, onCallEnd]);

  useEffect(() => {
    const loadJitsiScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Script load failed"));
        document.head.appendChild(script);
      });

    loadJitsiScript()
      .then(() => initJitsi())
      .catch(() => {
        setError("Could not load Jitsi. Switching to browser mode.");
        setLoading(false);
        setUseIframe(true);
      });

    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initJitsi]);

  return (
    <div className="relative w-full flex flex-col gap-0 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950">

      {/* Top status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-xs font-bold text-slate-300">
            {connected ? "● Live Session" : loading ? "Connecting..." : "Offline"}
          </span>
          {connected && (
            <span className="text-xs text-slate-500 font-mono ml-1">
              {formatTime(elapsed)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <Users className="h-3.5 w-3.5" />
              <span>{participantCount + 1} in room</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${connected ? "bg-green-900/40 text-green-400" : "bg-amber-900/40 text-amber-400"}`}>
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? "Encrypted" : "Waiting"}
          </div>
          <a
            href={directJitsiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition"
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
            Pop-out
          </a>
        </div>
      </div>

      {/* Main video area */}
      <div className="relative w-full" style={{ height: "520px" }}>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col justify-center items-center gap-4 bg-slate-950">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-slate-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-300">Connecting to secure classroom...</p>
              <p className="text-xs text-slate-500 mt-1">Room: {roomId.slice(0, 30)}{roomId.length > 30 ? "..." : ""}</p>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="h-1.5 w-8 rounded-full bg-indigo-600 animate-pulse" />
              <span className="h-1.5 w-4 rounded-full bg-indigo-800 animate-pulse delay-100" />
              <span className="h-1.5 w-6 rounded-full bg-indigo-700 animate-pulse delay-200" />
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              Allow camera & microphone when prompted
            </p>
          </div>
        )}

        {/* Error overlay with iframe fallback */}
        {error && (
          <div className="absolute top-3 left-3 right-3 z-30 bg-amber-900/90 border border-amber-700 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => { setError(null); setLoading(true); setUseIframe(false); initJitsi(); }}
              className="ml-auto px-2 py-1 bg-amber-700 hover:bg-amber-600 rounded-lg font-bold flex items-center gap-1 transition"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* Jitsi container or iframe fallback */}
        {useIframe ? (
          <iframe
            src={directJitsiUrl}
            allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
            className="w-full h-full border-0"
            onLoad={() => { setLoading(false); setConnected(true); }}
            title={`TutorNow Classroom - ${roomId}`}
          />
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}
      </div>

      {/* Bottom info & action bar */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="font-bold text-slate-400">Room ID:</span>
          <span className="font-mono text-indigo-400 font-semibold">{roomId}</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={directJitsiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Video in New Window / App
          </a>
        </div>
      </div>
    </div>
  );
};

export default JitsiMeetRoom;
