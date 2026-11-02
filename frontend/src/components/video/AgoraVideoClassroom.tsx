"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, StopCircle,
  PenTool, MessageSquare, Maximize2, Minimize2, PhoneOff,
  Users, RefreshCw, Send, Trash2, CheckCircle, Wifi, AlertCircle, Sparkles, Settings, Key
} from "lucide-react";

interface AgoraVideoClassroomProps {
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

export const AgoraVideoClassroom: React.FC<AgoraVideoClassroomProps> = ({
  bookingId,
  userName,
  userRole = "Student",
  onCallEnd,
}) => {
  // DOM Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC & Agora References
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const agoraClientRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isInitiatorRef = useRef<boolean>(userRole === "Tutor");

  // Whiteboard Canvas References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Component UI States
  const [engineMode, setEngineMode] = useState<"agora" | "webrtc">("webrtc");
  const [agoraAppId, setAgoraAppId] = useState<string>("");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [hasRealVideo, setHasRealVideo] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard" | "chat">("video");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [roomPeersCount, setRoomPeersCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "waiting">("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
  const classroomContainerRef = useRef<HTMLDivElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Whiteboard Tool States
  const [brushColor, setBrushColor] = useState("#4f46e5");
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-attach media streams to video elements whenever DOM nodes or streams change
  useEffect(() => {
    if (localVideoRef.current && localMediaStream) {
      localVideoRef.current.srcObject = localMediaStream;
      localVideoRef.current.play().catch((e) => console.warn("local play error:", e));
    }
  }, [localMediaStream, videoActive, activeTab]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteMediaStream) {
      remoteVideoRef.current.srcObject = remoteMediaStream;
      remoteVideoRef.current.play().catch((e) => console.warn("remote play error:", e));
    }
  }, [remoteMediaStream, remoteConnected, activeTab]);

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

  // Load saved Agora App ID if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agora_app_id") || process.env.NEXT_PUBLIC_AGORA_APP_ID || "";
      setAgoraAppId(saved);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1. Initialize Local Media (Camera & Microphone with Mobile Support)
  // ─────────────────────────────────────────────────────────────
  const requestMediaStream = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return await navigator.mediaDevices.getUserMedia(constraints);
    }
    const legacy = (navigator as any)?.getUserMedia ||
      (navigator as any)?.webkitGetUserMedia ||
      (navigator as any)?.mozGetUserMedia ||
      (navigator as any)?.msGetUserMedia;
    if (legacy) {
      return new Promise((resolve, reject) => {
        legacy.call(navigator, constraints, resolve, reject);
      });
    }
    throw new Error("SECURE_CONTEXT_REQUIRED");
  };

  const setupLocalMedia = async () => {
    try {
      if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
        setLocalMediaStream(localStreamRef.current);
        return localStreamRef.current;
      }
      try {
        const stream = await requestMediaStream({
          video: { facingMode: "user" },
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalMediaStream(stream);
        setHasRealVideo(true);
        setMediaPermissionError(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        return stream;
      } catch (mediaErr: any) {
        console.warn("Camera access waiting for user tap:", mediaErr);
        setHasRealVideo(false);
        if (mediaErr?.message === "SECURE_CONTEXT_REQUIRED") {
          setMediaPermissionError("Camera requires camera permission or HTTPS connection.");
        } else {
          setMediaPermissionError("Tap below to allow camera & microphone access.");
        }
      }
      return null;
    } catch (err: any) {
      console.warn("Media initialization notice:", err);
      return null;
    }
  };

  // Explicit user gesture to enable camera on mobile devices
  const enableUserCamera = async () => {
    if (typeof window === "undefined") return;

    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Tier 1: User facing camera + Audio
    try {
      stream = await requestMediaStream({
        video: { facingMode: "user" },
        audio: true,
      });
    } catch (e1) {
      lastError = e1;
      // Tier 2: Generic video + Audio
      try {
        stream = await requestMediaStream({
          video: true,
          audio: true,
        });
      } catch (e2) {
        lastError = e2;
        // Tier 3: Video only
        try {
          stream = await requestMediaStream({ video: true });
        } catch (e3) {
          lastError = e3;
          // Tier 4: Audio only
          try {
            stream = await requestMediaStream({ audio: true });
          } catch (e4) {
            lastError = e4;
          }
        }
      }
    }

    if (stream) {
      localStreamRef.current = stream;
      setLocalMediaStream(stream);
      setHasRealVideo(stream.getVideoTracks().length > 0);
      setVideoActive(stream.getVideoTracks().length > 0);
      setMicActive(stream.getAudioTracks().length > 0);
      setMediaPermissionError(null);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const vTrack = stream.getVideoTracks()[0];
        const aTrack = stream.getAudioTracks()[0];

        const vSender = senders.find((s) => s.track?.kind === "video");
        if (vSender && vTrack) {
          await vSender.replaceTrack(vTrack);
        } else if (vTrack) {
          peerConnectionRef.current.addTrack(vTrack, stream);
        }

        const aSender = senders.find((s) => s.track?.kind === "audio");
        if (aSender && aTrack) {
          await aSender.replaceTrack(aTrack);
        } else if (aTrack) {
          peerConnectionRef.current.addTrack(aTrack, stream);
        }

        if (isInitiatorRef.current) {
          await sendOffer(peerConnectionRef.current);
        }
      }
    } else {
      const msg = lastError?.name === "NotAllowedError" || lastError?.name === "PermissionDeniedError"
        ? "Camera permission was denied. Please allow camera in App Settings."
        : lastError?.message === "SECURE_CONTEXT_REQUIRED"
        ? "Camera access requires HTTPS or Camera permission granted in App."
        : `Camera error: ${lastError?.message || "Device unavailable"}`;
      setMediaPermissionError(msg);
    }
  };

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

    if (stream && stream.getTracks().length > 0) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } else {
      try {
        pc.addTransceiver("video", { direction: "sendrecv" });
        pc.addTransceiver("audio", { direction: "sendrecv" });
      } catch (e) {}
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
      console.log("[WebRTC] ontrack received:", event.track.kind, event.streams);
      const stream = (event.streams && event.streams.length > 0 && event.streams[0])
        ? event.streams[0]
        : new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      setRemoteMediaStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch((err) => console.warn("[WebRTC] remote video play error:", err));
      }
      setRemoteConnected(true);
      setConnectionStatus("connected");
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
      console.warn("[WebRTC] Error creating offer:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Lifecycle & Signaling Connection
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

          if (data.type === "room_state") {
            if (data.peer_count) setRoomPeersCount(data.peer_count);
          } else if (data.type === "peer_joined") {
            if (data.peer_count) setRoomPeersCount(data.peer_count);
            // Initiate offer when remote peer connects
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
            if (data.peer_count !== undefined) setRoomPeersCount(data.peer_count);
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

  // Toggle Microphone
  const toggleMic = async () => {
    if (!localStreamRef.current || localStreamRef.current.getAudioTracks().length === 0) {
      await enableUserCamera();
      return;
    }
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !micActive;
      setMicActive(!micActive);
    }
  };

  // Toggle Video / Enable Camera
  const toggleVideo = async () => {
    if (!hasRealVideo || !localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
      await enableUserCamera();
      return;
    }
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].enabled = !videoActive;
      setVideoActive(!videoActive);
    }
  };

  // Screen Share
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;

        const screenTrack = stream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setScreenSharing(true);
      } catch (err) {
        console.warn("Screen sharing cancelled or failed:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current && peerConnectionRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setScreenSharing(false);
  };

  // ─────────────────────────────────────────────────────────────
  // Whiteboard Canvas Drawing Logic
  // ─────────────────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    lastPosRef.current = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const currentPos = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };

    const isEraser = tool === "eraser";
    const color = isEraser ? "#ffffff" : brushColor;
    const size = isEraser ? brushSize * 4 : brushSize;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x * canvas.width, lastPosRef.current.y * canvas.height);
    ctx.lineTo(currentPos.x * canvas.width, currentPos.y * canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "draw",
        prevX: lastPosRef.current.x,
        prevY: lastPosRef.current.y,
        currX: currentPos.x,
        currY: currentPos.y,
        color: color,
        size: size,
      }));
    }

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const drawFromRemote = (data: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(data.prevX * canvas.width, data.prevY * canvas.height);
    ctx.lineTo(data.currX * canvas.width, data.currY * canvas.height);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const clearCanvas = () => {
    clearCanvasLocal();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "clear_whiteboard" }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Chat Messaging Logic
  // ─────────────────────────────────────────────────────────────
  const sendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: ChatMessage = {
      sender: userName,
      role: userRole,
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "chat",
        message: newMsg,
      }));
    }

    setInputMessage("");
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const toggleFullscreen = () => {
    if (!classroomContainerRef.current) return;
    if (!fullscreen) {
      classroomContainerRef.current.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  const saveAppId = (id: string) => {
    setAgoraAppId(id);
    localStorage.setItem("agora_app_id", id);
    setShowConfigModal(false);
  };

  return (
    <div
      ref={classroomContainerRef}
      className="bg-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col transition-all duration-200"
      style={{ minHeight: "680px" }}
    >
      {/* Top Classroom Bar */}
      <div className="bg-slate-900/90 backdrop-blur px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <Sparkles className="h-3.5 w-3.5" />
            <span>HD Classroom Live</span>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
            {formatTime(elapsed)}
          </div>
        </div>

        {/* Tab Navigation Switches */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("video")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "video" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Video Call</span>
          </button>
          <button
            onClick={() => setActiveTab("whiteboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "whiteboard" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Whiteboard</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition relative ${
              activeTab === "chat" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Live Chat</span>
            {messages.length > 0 && activeTab !== "chat" && (
              <span className="h-2 w-2 rounded-full bg-rose-500 absolute top-1 right-1" />
            )}
          </button>
        </div>

        {/* Status & Settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>{remoteConnected ? "2/2 Connected" : roomPeersCount >= 2 ? "2/2 In Room (Connecting...)" : "1/2 In Room"}</span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            title="Agora App ID Settings"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 relative flex overflow-hidden bg-slate-950 min-h-[500px]">
        {/* TAB 1: VIDEO CALL VIEW */}
        <div className={`w-full h-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${activeTab === "video" ? "grid" : "hidden"}`}>
          {/* Remote Video Tile */}
          <div className="relative rounded-2xl bg-slate-900 overflow-hidden border border-slate-800/80 flex items-center justify-center min-h-[300px]">
            <video
              ref={(el) => {
                (remoteVideoRef as any).current = el;
                if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                  el.srcObject = remoteStreamRef.current;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              webkit-playsinline="true"
              onClick={(e) => {
                const target = e.currentTarget;
                if (target.paused) target.play().catch(() => {});
              }}
              onLoadedMetadata={(e) => {
                const target = e.target as HTMLVideoElement;
                target.play().catch(() => {});
              }}
              className={`w-full h-full object-cover ${remoteConnected ? "block" : "hidden"} cursor-pointer`}
            />
            
            {!remoteConnected && (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                  <Users className="h-8 w-8 text-slate-500 animate-pulse" />
                </div>
                <h4 className="font-bold text-sm text-slate-200">
                  {roomPeersCount >= 2 ? "Connecting video streams..." : `Waiting for ${userRole === "Tutor" ? "Student" : "Tutor"} to connect...`}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  {roomPeersCount >= 2 ? "Negotiating WebRTC stream in real time." : "Both participants join instantly from their dashboard."}
                </p>
              </div>
            )}

            <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${remoteConnected ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
              <span>{userRole === "Tutor" ? "Student Video" : "Tutor Video"}</span>
            </div>
          </div>

          {/* Local Video Tile */}
          <div className="relative rounded-2xl bg-slate-900 overflow-hidden border border-slate-800/80 flex items-center justify-center min-h-[300px]">
            <video
              ref={(el) => {
                (localVideoRef as any).current = el;
                if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                  el.srcObject = localStreamRef.current;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              muted
              playsInline
              webkit-playsinline="true"
              onLoadedMetadata={(e) => {
                const target = e.target as HTMLVideoElement;
                target.play().catch(() => {});
              }}
              className={`w-full h-full object-cover ${hasRealVideo && videoActive ? "block" : "hidden"}`}
            />

            {(!hasRealVideo || !videoActive) && (
              <div className="flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="h-20 w-20 rounded-full bg-indigo-950/80 border-2 border-indigo-500/80 flex items-center justify-center mb-3 shadow-xl">
                  <span className="text-2xl font-extrabold text-indigo-200">
                    {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                  </span>
                </div>
                <h5 className="font-bold text-xs text-slate-200 mb-1">{userName} (You)</h5>
                
                {mediaPermissionError ? (
                  <p className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-800 rounded-lg px-3 py-1.5 max-w-xs mb-3 font-medium">
                    ⚠️ {mediaPermissionError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 max-w-xs mb-3">
                    Camera is ready. Tap below to start your video stream.
                  </p>
                )}

                <button
                  onClick={enableUserCamera}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  <span>Start Camera</span>
                </button>
              </div>
            )}

            <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 z-20">
              <span className={`h-2 w-2 rounded-full ${hasRealVideo && videoActive ? "bg-emerald-400" : "bg-indigo-400"}`} />
              <span>You ({userName})</span>
            </div>

            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
              <span className={`p-1.5 rounded-lg text-xs ${micActive ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"}`}>
                {micActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              </span>
            </div>
          </div>
        </div>

        {/* TAB 2: INTERACTIVE COLLABORATIVE WHITEBOARD */}
        <div className={`w-full h-full flex flex-col p-4 gap-3 bg-slate-900 ${activeTab === "whiteboard" ? "flex" : "hidden"}`}>
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTool("pen")}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  tool === "pen" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <PenTool className="h-4 w-4" />
                <span>Pen</span>
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  tool === "eraser" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🧹 Eraser</span>
              </button>
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-1.5">
              {["#4f46e5", "#ef4444", "#10b981", "#f59e0b", "#000000"].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setBrushColor(c);
                    setTool("pen");
                  }}
                  className={`h-6 w-6 rounded-full border-2 transition ${brushColor === c && tool === "pen" ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="12"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 accent-indigo-500"
              />
              <button
                onClick={clearCanvas}
                className="p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl overflow-hidden border border-slate-800 relative cursor-crosshair shadow-inner">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full touch-none"
            />
          </div>
        </div>

        {/* TAB 3: LIVE CLASSROOM CHAT */}
        <div className={`w-full h-full flex flex-col p-4 bg-slate-900 ${activeTab === "chat" ? "flex" : "hidden"}`}>
          <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                <p>No messages yet in this session.</p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === userName ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    <span className="font-bold text-slate-300">{m.sender}</span>
                    <span>• {m.time}</span>
                  </div>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs ${
                      m.sender === userName
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={sendChatMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type message to classroom..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Control Dock */}
      <div className="bg-slate-900 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>P2P HD WebRTC Stream (Low Latency)</span>
        </div>

        {/* Media controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-2xl font-bold text-xs transition flex items-center gap-2 ${
              micActive
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{micActive ? "Mute" : "Unmute"}</span>
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-2xl font-bold text-xs transition flex items-center gap-2 ${
              videoActive
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            {videoActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{videoActive ? "Stop Video" : "Start Video"}</span>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-2xl font-bold text-xs transition flex items-center gap-2 ${
              screenSharing
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
          >
            <ScreenShare className="h-4 w-4" />
            <span className="hidden sm:inline">{screenSharing ? "Stop Share" : "Share Screen"}</span>
          </button>

          <button
            onClick={onCallEnd}
            className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-rose-900/30"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Leave Classroom</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          Room #{bookingId}
        </div>
      </div>

      {/* Agora App ID Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 text-left text-slate-900 dark:text-white">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Agora Engine Settings</h3>
                <p className="text-xs text-slate-400">Configure Agora App ID or use Native Direct HD Engine</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Agora App ID (Optional)</label>
              <input
                type="text"
                placeholder="Enter your Agora App ID from console.agora.io"
                value={agoraAppId}
                onChange={(e) => setAgoraAppId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500">
                If left blank, the platform automatically streams 1080p video & audio via direct WebRTC with Google STUN servers.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl border dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => saveAppId(agoraAppId.trim())}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgoraVideoClassroom;
