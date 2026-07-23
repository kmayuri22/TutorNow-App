"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import { useStore } from "@/store/useStore";
import api from "@/services/api";
import { GoogleMap } from "@/components/maps/GoogleMap";
import { LiveTrackingPanel } from "@/components/maps/LiveTrackingPanel";
import { VideoSessionPanel } from "@/components/video/VideoSessionPanel";
import { JitsiMeetRoom } from "@/components/video/JitsiMeetRoom";
import { ArrowLeft, Loader2, AlertCircle, MapPin, Video, Calendar, Clock, Navigation } from "lucide-react";


interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface TutorResponse {
  id: number;
  subject: string;
  qualification: string;
  hourly_rate: number;
  profile_image: string;
}

interface Booking {
  id: number;
  student_id: number;
  tutor_id: number;
  booking_date: string;
  session_time: string;
  status: string;
  payment_status: string;
  session_type: "IN_PERSON" | "VIDEO_CALL";
  tracking_status?: string;
  student_lat?: number;
  student_lng?: number;
  tutor_lat?: number;
  tutor_lng?: number;
  student_address?: string;
  tutor_address?: string;
  tutor: TutorResponse;
  student: UserResponse;
}

interface VideoSession {
  id: number;
  booking_id: number;
  meeting_id: string;
  meeting_link: string;
  status: string; // Scheduled | Active | Ended
}

export default function TutorSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, name } = useStore();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [videoSession, setVideoSession] = useState<VideoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live coordinates tracking for tutor updates
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string>("Accepted");

  const socketRef = useRef<WebSocket | null>(null);

  // Fetch initial details
  const fetchDetails = async () => {
    try {
      const res = await api.get(`/api/bookings/${bookingId}`);
      setBooking(res.data);
      setTrackingStatus(res.data.tracking_status || "Accepted");

      if (res.data.session_type === "VIDEO_CALL") {
        try {
          const videoRes = await api.get(`/api/video/${bookingId}`);
          setVideoSession(videoRes.data);
        } catch (vErr) {
          console.log("Video session has not been generated yet.");
          setVideoSession(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load booking session details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchDetails();
    }
  }, [bookingId]);

  // Auto-push GPS immediately on mount (not waiting for Start Journey)
  useEffect(() => {
    if (!bookingId || typeof window === "undefined" || !navigator.geolocation) return;

    // Immediately get and push current GPS position to backend
    const pushCurrentGPS = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLiveLat(lat);
          setLiveLng(lng);
          // Push to backend so student map shows correct position immediately
          api.post(`/api/tracking/${bookingId}/update-location`, {
            latitude: lat,
            longitude: lng,
            status: trackingStatus || "Booking Accepted",
          }).catch(() => {});
        },
        (err) => console.warn("GPS auto-push failed:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Push once immediately, then every 10 seconds regardless of journey status
    pushCurrentGPS();
    const gpsInterval = setInterval(pushCurrentGPS, 10000);

    return () => clearInterval(gpsInterval);
  }, [bookingId]);

  // Set up tracking WebSocket for active tracking room
  useEffect(() => {
    if (!bookingId || !booking || booking.session_type !== "IN_PERSON") return;

    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${hostname}:8000/ws/tracking/${bookingId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "tracking_update" && Number(data.booking_id) === Number(bookingId)) {
          if (data.latitude) setLiveLat(data.latitude);
          if (data.longitude) setLiveLng(data.longitude);
          if (data.status) setTrackingStatus(data.status);
          
          if (data.status === "Session Completed") {
            fetchDetails();
          }
        }
      } catch (err) {
        console.error("Error parsing live tracking message:", err);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [bookingId, booking]);

  // Get current physical coordinates of the tutor using browser high-accuracy geolocation
  const getTutorCoordinates = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  };

  // Continuous high-accuracy GPS watch — active from page load (not just Journey Started)
  useEffect(() => {
    if (!bookingId || !booking || booking.session_type !== "IN_PERSON") return;
    if (!navigator.geolocation) return;

    let lastPushTime = 0;

    const pushLocation = (lat: number, lng: number, status: string) => {
      const now = Date.now();
      // Throttle: push at most every 5 seconds
      if (now - lastPushTime < 5000) return;
      lastPushTime = now;

      api.post(`/api/tracking/${bookingId}/update-location`, {
        latitude: lat,
        longitude: lng,
        status: status,
      }).catch((err) => console.warn("Live GPS sync issue:", err));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLiveLat(lat);
        setLiveLng(lng);
        // Push live coordinates to backend immediately and every ~5s
        pushLocation(lat, lng, trackingStatus || "Booking Accepted");
      },
      (err) => console.warn("Watch position error:", err),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 2000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };

  }, [bookingId, booking, trackingStatus]);

  // Interactive map tap handler (works on any mobile browser / HTTP IP)
  const handleMapClick = async (lat: number, lng: number) => {
    setLiveLat(lat);
    setLiveLng(lng);
    try {
      await api.post(`/api/tracking/${bookingId}/update-location`, {
        latitude: lat,
        longitude: lng,
        status: trackingStatus || "Journey Started",
      });
    } catch (e) {
      console.warn("Location update push error:", e);
    }
  };

  // Quick movement simulator (e.g. Move 2 KM away, 1 KM away, 500m away, Arrived at Venue)
  const handleSimulateMove = async (distanceKm: number) => {
    const sLat = booking?.student_lat ?? 13.0282;
    const sLng = booking?.student_lng ?? 80.0169;
    // 1 KM offset ~ 0.009 deg lat, 0.005 deg lng
    const targetLat = sLat + (distanceKm * 0.009);
    const targetLng = sLng + (distanceKm * 0.005);

    setLiveLat(targetLat);
    setLiveLng(targetLng);
    try {
      await api.post(`/api/tracking/${bookingId}/update-location`, {
        latitude: targetLat,
        longitude: targetLng,
        status: distanceKm === 0 ? "Tutor Arrived" : distanceKm <= 0.5 ? "Tutor Nearby" : "Journey Started",
      });
      if (distanceKm === 0) setTrackingStatus("Tutor Arrived");
      else if (distanceKm <= 0.5) setTrackingStatus("Tutor Nearby");
    } catch (e) {
      console.warn("Simulated movement update error:", e);
    }
  };



  // Handler for advancing live tracking status (In-Person workflow)
  const handleTrackingStatusChange = async (newStatus: string) => {
    if (!booking) return;
    setActionLoading(true);
    setError(null);

    try {
      let lat = liveLat ?? 13.0282; // Use live coordinates if available, fallback Saveetha Engineering College
      let lng = liveLng ?? 80.0169;


      // Request live location if starting journey or nearby
      if (newStatus === "Journey Started" || newStatus === "Tutor Nearby") {
        try {
          const pos = await getTutorCoordinates();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setLiveLat(lat);
          setLiveLng(lng);
        } catch (gErr) {
          console.warn("Could not get current coordinates. Using current live position.", gErr);
        }
      }


      if (newStatus === "Journey Started") {
        await api.post(`/api/tracking/${bookingId}/start-journey`, {
          latitude: lat,
          longitude: lng,
          status: "Journey Started"
        });
      } else if (newStatus === "Tutor Nearby") {
        await api.post(`/api/tracking/${bookingId}/update-location`, {
          latitude: lat,
          longitude: lng,
          status: "Tutor Nearby"
        });
      } else if (newStatus === "Tutor Arrived") {
        await api.post(`/api/tracking/${bookingId}/mark-arrived`);
      } else if (newStatus === "Session Started") {
        await api.post(`/api/tracking/${bookingId}/start-session`);
      } else if (newStatus === "Session Completed") {
        await api.post(`/api/tracking/${bookingId}/end-session`);
      }

      await fetchDetails();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to update tracking status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Jitsi virtual classroom (Online Video workflow)
  const handleCreateRoom = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/video/${bookingId}/create`);
      await fetchDetails();
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate virtual video room.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartVideoSession = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/video/${bookingId}/start`);
      await fetchDetails();
    } catch (err: any) {
      console.error(err);
      setError("Failed to start video session.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndVideoSession = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/video/${bookingId}/end`);
      await fetchDetails();
    } catch (err: any) {
      console.error(err);
      setError("Failed to close video session.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center flex flex-col justify-center items-center gap-4">
        <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
        <h3 className="text-slate-500 font-medium">Entering secure tutor classroom portal...</h3>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg">{error}</h3>
        <button onClick={() => router.push("/tutor/dashboard")} className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-semibold text-xs">
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!booking) return null;

  const dateFormatted = new Date(booking.booking_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="py-12 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back navigation */}
        <button 
          onClick={() => router.push("/tutor/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-950 dark:hover:text-white text-sm font-semibold mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800 text-xs text-red-650 dark:text-red-400 flex items-start gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Classroom Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-left">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl text-white shadow-md ${booking.session_type === "IN_PERSON" ? "bg-sky-600 dark:bg-sky-500" : "bg-indigo-600 dark:bg-indigo-500"}`}>
              {booking.session_type === "IN_PERSON" ? <MapPin className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </div>
            <div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider py-1 px-2.5 rounded-full">
                {booking.session_type === "IN_PERSON" ? "In-Person (Tutor Portal)" : "Online Call (Tutor Portal)"}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                Classroom Room: #{booking.id}
                {booking.status === "Completed" && (
                  <span className="text-[10px] bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 font-bold border border-green-200 dark:border-green-900 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex flex-col text-left md:text-right">
              <span className="text-slate-400">Date</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">{dateFormatted}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col text-left md:text-right">
              <span className="text-slate-400">Time Slot</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">{booking.session_time}</span>
            </div>
          </div>
        </div>

        {/* Split workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Workspace Area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {booking.session_type === "IN_PERSON" ? (
              <div className="flex flex-col gap-6">
                <GoogleMap
                  studentLat={booking.student_lat ?? 13.0282}
                  studentLng={booking.student_lng ?? 80.0169}
                  tutorLat={liveLat ?? booking.tutor_lat ?? 13.0282}
                  tutorLng={liveLng ?? booking.tutor_lng ?? 80.0169}
                  liveTutorLat={liveLat}
                  liveTutorLng={liveLng}
                  studentAddress={booking.student_address || "Saveetha Engineering College, Thandalam, Chennai"}
                  tutorAddress={booking.tutor_address}
                  trackingStatus={trackingStatus}
                  onMapClick={handleMapClick}
                />

                {/* Live Distance Movement Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Navigation className="h-4 w-4 text-sky-400" />
                      <span>Live Movement Simulator (Tap Map or Click Distance)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Tap anywhere on map to move pin</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleSimulateMove(2.0)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <span>🚗 2.0 KM Away</span>
                    </button>
                    <button
                      onClick={() => handleSimulateMove(1.0)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <span>🚗 1.0 KM Away</span>
                    </button>
                    <button
                      onClick={() => handleSimulateMove(0.4)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <span>⚡ 500m Nearby</span>
                    </button>
                    <button
                      onClick={() => handleSimulateMove(0.0)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <span>🏁 Arrived (0 KM)</span>
                    </button>
                  </div>
                </div>



              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {videoSession && videoSession.meeting_id ? (
                  <JitsiMeetRoom
                    roomId={videoSession.meeting_id}
                    userName={name || "Tutor"}
                    userRole="Tutor"
                    bookingId={booking.id}
                    onCallEnd={() => fetchDetails()}
                  />
                ) : (
                  <div className="h-[400px] bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-center items-center gap-4 text-center p-6 shadow-inner">
                    <Video className="h-14 w-14 text-slate-700 animate-pulse" />
                    <div>
                      <h3 className="text-slate-200 font-bold text-base">Virtual Classroom not started</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Click &ldquo;Generate Virtual Classroom&rdquo; in the panel on the right to create your session room and let your student join.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Student info card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-left flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-950/45 text-primary-700 dark:text-primary-400 flex items-center justify-center font-bold text-base">
                {booking.student.name.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Student Assigned</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{booking.student.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{booking.student.email}</p>
              </div>
            </div>

            {/* Workflow state controllers */}
            {booking.session_type === "IN_PERSON" ? (
              <LiveTrackingPanel
                status={trackingStatus}
                isTutor={true}
                onStatusChange={handleTrackingStatusChange}
                loading={actionLoading}
              />
            ) : (
              <VideoSessionPanel
                status={videoSession?.status || "Scheduled"}
                meetingId={videoSession?.meeting_id}
                meetingLink={videoSession?.meeting_link}
                isTutor={true}
                onCreateRoom={handleCreateRoom}
                onStartSession={handleStartVideoSession}
                onEndSession={handleEndVideoSession}
                loading={actionLoading}
              />
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
