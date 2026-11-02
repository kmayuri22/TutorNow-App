"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, StopCircle,
  PenTool, MessageSquare, Maximize2, Minimize2, PhoneOff,
  Users, RefreshCw, Send, Trash2, CheckCircle, Wifi, AlertCircle
} from "lucide-react";

interface NativeVideoClassroomProps {
  bookingId: number | string;
  userName: string;
  userRole?: "Tutor" | "Student";
  onCallEnd?: () => void;
}

interface ChatMessage {
  sender: string;
  role: string;
  text: string;
  time: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const NativeVideoClassroom: React.FC<NativeVideoClassroomProps> = ({
  bookingId,
  userName,
  userRole = "Student",
  onCallEnd,
}) => {
  // Video DOM element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC & WebSocket refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isInitiatorRef = useRef<boolean>(userRole === "Tutor");

  // Whiteboard refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Component UI States
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard" | "chat">("video");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "waiting">("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const classroomContainerRef = useRef<HTMLDivElement>(null);

  // Whiteboard Tool States
  const [brushColor, setBrushColor] = useState("#4f46e5");
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Initialize Local Media (Camera & Microphone)
  // ─────────────────────────────────────────────────────────────
  const setupLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn("Camera/Mic access not granted or not available:", err);
      // Fallback: create empty dummy stream so UI loads without crash
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. WebRTC PeerConnection Setup
  // ─────────────────────────────────────────────────────────────
  // 2. WebRTC PeerConnection Setup (Direct HD Engine)
  // ─────────────────────────────────────────────────────────────
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const drainIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidateQueue.current.length > 0) {
      const cand = iceCandidateQueue.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("[WebRTC] Error draining ICE candidate:", e);
        }
      }
    }
  };

  const createPeerConnection = (stream: MediaStream | null) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    iceCandidateQueue.current = [];

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteConnected(true);
        setConnectionStatus("connected");
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setRemoteConnected(true);
        setConnectionStatus("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setRemoteConnected(false);
        setConnectionStatus("waiting");
      }
    };

    return pc;
  };

  // Send Offer (Tutor / Initiator)
  const sendOffer = async (pc: RTCPeerConnection) => {
    try {
      if (pc.signalingState !== "stable") {
        console.log("[WebRTC] Skipping sendOffer because signalingState is:", pc.signalingState);
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "offer",
          offer: offer,
        }));
      }
    } catch (e) {
      console.warn("[WebRTC] Error creating WebRTC offer:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. WebSocket Signaling & Lifecycle
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let isMounted = true;

    const initCall = async () => {
      localStream = await setupLocalMedia();
      if (!isMounted) return;

      const pc = createPeerConnection(localStream);

      // Connect Signaling WebSocket
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${hostname}:8000/ws/video/${bookingId}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connecting");
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "peer_joined") {
            if (isInitiatorRef.current) {
              await sendOffer(pc);
            }
          } else if (data.type === "offer") {
            if (pc.signalingState !== "stable") {
              try {
                await Promise.all([
                  pc.setLocalDescription({ type: "rollback" }),
                  pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                ]);
              } catch (rollbackErr) {
                console.warn("[WebRTC] Rollback error:", rollbackErr);
              }
            } else {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            }
            await drainIceCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "answer", answer: answer }));
            }
          } else if (data.type === "answer") {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              await drainIceCandidates(pc);
            } else {
              console.log("[WebRTC] Ignored answer because signalingState is:", pc.signalingState);
            }
          } else if (data.type === "candidate" && data.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (candErr) {
                console.warn("[WebRTC] Error adding ICE candidate:", candErr);
              }
            } else {
              iceCandidateQueue.current.push(data.candidate);
            }
          } else if (data.type === "chat") {
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === "draw") {
            drawFromRemote(data);
          } else if (data.type === "clear_whiteboard") {
            clearCanvasLocal();
          } else if (data.type === "peer_left") {
            setRemoteConnected(false);
            setConnectionStatus("waiting");
          }
        } catch (msgErr) {
          console.warn("[WebRTC] Signaling message handling error:", msgErr);
        }
      };

      ws.onclose = () => {
        setConnectionStatus("waiting");
      };
    };

    initCall();

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [bookingId]);

  // ─────────────────────────────────────────────────────────────
  // 4. In-Call Controls (Mic, Video, Screen Share, Fullscreen)
  // ─────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMicActive((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoActive((prev) => !prev);
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop sharing screen, switch back to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localStreamRef.current && peerConnectionRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };
        setScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled or not allowed:", err);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!classroomContainerRef.current) return;
    if (!document.fullscreenElement) {
      classroomContainerRef.current.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Collaborative Whiteboard Engine
  // ─────────────────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const currentPos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = tool === "eraser" ? "#0f172a" : brushColor;
    ctx.lineWidth = tool === "eraser" ? brushSize * 4 : brushSize;
    ctx.lineCap = "round";
    ctx.stroke();

    // Broadcast stroke to remote participant
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "draw",
        fromX: lastPosRef.current.x,
        fromY: lastPosRef.current.y,
        toX: currentPos.x,
        toY: currentPos.y,
        color: tool === "eraser" ? "#0f172a" : brushColor,
        size: tool === "eraser" ? brushSize * 4 : brushSize,
      }));
    }

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const drawFromRemote = (data: any) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(data.fromX, data.fromY);
    ctx.lineTo(data.toX, data.toY);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const clearCanvasLocal = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleClearWhiteboard = () => {
    clearCanvasLocal();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "clear_whiteboard" }));
    }
  };

  // Initialize canvas background
  useEffect(() => {
    if (activeTab === "whiteboard" && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 1200;
      canvas.height = 700;
      clearCanvasLocal();
    }
  }, [activeTab]);

  // ─────────────────────────────────────────────────────────────
  // 6. Realtime In-Class Chat
  // ─────────────────────────────────────────────────────────────
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg: ChatMessage = {
      sender: userName,
      role: userRole,
      text: inputMessage.trim(),
      time: timeStr,
    };

    setMessages((prev) => [...prev, newMsg]);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "chat",
        message: newMsg,
      }));
    }
    setInputMessage("");
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div
      ref={classroomContainerRef}
      className="relative w-full flex flex-col rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 font-sans select-none text-left"
    >
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>HD Classroom Live</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* View Switcher Tabs (Video / Whiteboard / Chat) */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("video")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "video" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Video Call</span>
          </button>
          <button
            onClick={() => setActiveTab("whiteboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "whiteboard" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Whiteboard</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "chat" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Live Chat</span>
            {messages.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-500 text-[10px] text-white">
                {messages.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>{remoteConnected ? "2/2 in Call" : "1/2 Waiting"}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ─── Main Workspace Area ────────────────────────────────────────── */}
      <div className="relative w-full bg-slate-950" style={{ height: "540px" }}>

        {/* TAB 1: VIDEO CALL (Side-by-Side or PiP) */}
        {activeTab === "video" && (
          <div className="relative w-full h-full p-4 flex gap-4 bg-slate-950">
            
            {/* Primary / Remote Participant Video */}
            <div className="relative flex-1 h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${remoteConnected ? "block" : "hidden"}`}
              />

              {!remoteConnected && (
                <div className="flex flex-col items-center gap-3 text-center p-6 max-w-sm">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                      <Users className="h-8 w-8" />
                    </div>
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-slate-900 animate-ping" />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-bold text-base">
                      Waiting for {userRole === "Tutor" ? "Student" : "Tutor"} to connect...
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Both participants can join instantly from their dashboard. Audio and video will start automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Remote Name Badge */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-xl border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${remoteConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span>{userRole === "Tutor" ? "Student Video" : "Tutor Video"}</span>
              </div>
            </div>

            {/* Local Video Stream (Self Preview) */}
            <div className="relative w-72 h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover mirror ${videoActive ? "block" : "hidden"}`}
                style={{ transform: "scaleX(-1)" }}
              />

              {!videoActive && (
                <div className="flex flex-col items-center gap-2 text-center p-4">
                  <VideoOff className="h-10 w-10 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-500">Camera Turned Off</span>
                </div>
              )}

              {/* Local Name & Mic Status Badge */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-slate-950/80 backdrop-blur px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-200">
                <span className="truncate max-w-[120px]">{userName} (You)</span>
                <span className={`p-1 rounded-lg ${micActive ? "text-emerald-400" : "bg-red-950 text-red-400"}`}>
                  {micActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE COLLABORATIVE WHITEBOARD */}
        {activeTab === "whiteboard" && (
          <div className="relative w-full h-full flex flex-col bg-slate-900">
            {/* Whiteboard Controls Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTool("pen")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      tool === "pen" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>Pen</span>
                  </button>
                  <button
                    onClick={() => setTool("eraser")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      tool === "eraser" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eraser</span>
                  </button>
                </div>

                {/* Color Palette */}
                {tool === "pen" && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                    {["#4f46e5", "#ef4444", "#10b981", "#f59e0b", "#38bdf8", "#ffffff"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setBrushColor(color)}
                        style={{ backgroundColor: color }}
                        className={`h-5 w-5 rounded-full transition transform ${brushColor === color ? "scale-125 ring-2 ring-white" : "opacity-80 hover:opacity-100"}`}
                      />
                    ))}
                  </div>
                )}

                {/* Brush Size Slider */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
                  <span>Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleClearWhiteboard}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Board</span>
              </button>
            </div>

            {/* Canvas Surface */}
            <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full rounded-2xl cursor-crosshair shadow-2xl border border-slate-800"
              />
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME IN-CLASS CHAT */}
        {activeTab === "chat" && (
          <div className="relative w-full h-full flex flex-col bg-slate-900 p-4">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
                  <p className="font-bold text-slate-400">In-Class Live Chat</p>
                  <p className="text-[11px] mt-0.5">Send messages, formula links, or code snippets in real-time.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSelf = msg.sender === userName;
                  return (
                    <div key={idx} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                        <span className="font-bold text-slate-300">{msg.sender}</span>
                        <span className="text-slate-500">({msg.role})</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-md ${isSelf ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Box */}
            <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Type a message to your classroom..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

      </div>

      {/* ─── Bottom Floating Controls Toolbar ──────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Wifi className="h-4 w-4 text-emerald-400" />
            <span>P2P WebRTC Direct HD Stream</span>
          </div>
        </div>

        {/* Core Audio / Video / Screen Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl font-bold transition flex items-center justify-center shadow-md ${
              micActive ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-600/30"
            }`}
            title={micActive ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl font-bold transition flex items-center justify-center shadow-md ${
              videoActive ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-600/30"
            }`}
            title={videoActive ? "Turn Off Camera" : "Turn On Camera"}
          >
            {videoActive ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl font-bold transition flex items-center justify-center shadow-md ${
              screenSharing ? "bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-600/30" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title={screenSharing ? "Stop Screen Sharing" : "Share Your Screen"}
          >
            {screenSharing ? <StopCircle className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              if (onCallEnd) onCallEnd();
            }}
            className="px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-red-600/30 ml-2"
          >
            <PhoneOff className="h-5 w-5" />
            <span>Leave Classroom</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Room #{bookingId}</span>
        </div>
      </div>
    </div>
  );
};

export default NativeVideoClassroom;
