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
import { ArrowLeft, Calendar, Clock, DollarSign, User, ShieldCheck, Loader2, Video, MapPin, ExternalLink, HelpCircle, AlertCircle } from "lucide-react";

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
  user: UserResponse;
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
  status: string;
}

export default function StudentSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, name } = useStore();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [videoSession, setVideoSession] = useState<VideoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live coordinate states
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [liveStudentLat, setLiveStudentLat] = useState<number | null>(null);
  const [liveStudentLng, setLiveStudentLng] = useState<number | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string>("Accepted");

  // Continuously watch student's own real device GPS position
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveStudentLat(pos.coords.latitude);
        setLiveStudentLng(pos.coords.longitude);
      },
      (err) => console.warn("Student GPS watch failed:", err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Poll backend every 5s for tutor's latest GPS position (fallback for WebSocket)
  useEffect(() => {
    if (!bookingId) return;

    const pollTutorLocation = async () => {
      try {
        const res = await api.get(`/api/tracking/${bookingId}/location`);
        if (res.data && res.data.latitude && res.data.longitude) {
          setLiveLat(res.data.latitude);
          setLiveLng(res.data.longitude);
          if (res.data.status) setTrackingStatus(res.data.status);
        }
      } catch (err) {
        // Not yet available, ignore
      }
    };

    pollTutorLocation(); // Run immediately
    const interval = setInterval(pollTutorLocation, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  // Force sync student's device GPS and fetch latest tutor position
  const handleSyncGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveStudentLat(pos.coords.latitude);
          setLiveStudentLng(pos.coords.longitude);
        },
        (err) => console.warn("Student GPS sync error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    if (bookingId) {
      api.get(`/api/tracking/${bookingId}/location`)
        .then((res: any) => {
          if (res.data && res.data.latitude && res.data.longitude) {
            setLiveLat(res.data.latitude);
            setLiveLng(res.data.longitude);
            if (res.data.status) setTrackingStatus(res.data.status);
          }
        })
        .catch(() => {});
    }
  };



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
          // Video call not generated yet, which is expected before tutor joins
          console.log("Video session has not been generated yet.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load booking classroom details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchDetails();
    }
  }, [bookingId]);

  // Auto-poll every 5s for video session creation (student side)
  useEffect(() => {
    if (!booking || booking.session_type !== "VIDEO_CALL" || videoSession) return;
    const interval = setInterval(() => {
      api.get(`/api/video/${bookingId}`)
        .then((res: any) => {
          setVideoSession(res.data);
          clearInterval(interval);
        })
        .catch(() => {/* not created yet, keep polling */});
    }, 5000);
    return () => clearInterval(interval);
  }, [booking, videoSession, bookingId]);


  useEffect(() => {
    if (!bookingId || !booking || booking.session_type !== "IN_PERSON") return;

    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${hostname}:8000/ws/tracking/${bookingId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to live tracking socket for booking: ${bookingId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "tracking_update" && Number(data.booking_id) === Number(bookingId)) {
          if (data.latitude) setLiveLat(data.latitude);
          if (data.longitude) setLiveLng(data.longitude);
          if (data.status) setTrackingStatus(data.status);
          
          // Re-fetch booking status to check if marked Completed
          if (data.status === "Session Completed") {
            fetchDetails();
          }
        }
      } catch (err) {
        console.error("Error parsing live tracking message:", err);
      }
    };

    ws.onclose = () => {
      console.log("Live tracking socket closed.");
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [bookingId, booking]);

  // Handle in-app toast notifications from global WebSocket to check video/tracking triggers
  useEffect(() => {
    const handleNotification = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data.booking_id && Number(data.booking_id) === Number(bookingId)) {
        if (data.type === "video_session_created" || data.type === "video_session_started" || data.type === "video_session_ended") {
          fetchDetails();
        }
      }
    };

    window.addEventListener("tutor_notification", handleNotification);
    return () => {
      window.removeEventListener("tutor_notification", handleNotification);
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center flex flex-col justify-center items-center gap-4">
        <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
        <h3 className="text-slate-500 font-medium">Entering secure student classroom...</h3>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg">{error || "Booking not found"}</h3>
        <button onClick={() => router.push("/student/dashboard")} className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-semibold text-xs">
          Go to Dashboard
        </button>
      </div>
    );
  }

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
          onClick={() => router.push("/student/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-950 dark:hover:text-white text-sm font-semibold mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Classroom Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-880 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-left">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl text-white shadow-md ${booking.session_type === "IN_PERSON" ? "bg-sky-600 dark:bg-sky-500" : "bg-indigo-600 dark:bg-indigo-500"}`}>
              {booking.session_type === "IN_PERSON" ? <MapPin className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </div>
            <div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider py-1 px-2.5 rounded-full">
                {booking.session_type === "IN_PERSON" ? "In-Person Class" : "Online Class"}
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

        {/* Split details row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace section */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {booking.session_type === "IN_PERSON" ? (
              /* Geolocation Route displays */
              <div className="flex flex-col gap-6">
                <GoogleMap
                  studentLat={liveStudentLat ?? booking.student_lat ?? 13.0282}
                  studentLng={liveStudentLng ?? booking.student_lng ?? 80.0169}
                  tutorLat={liveLat ?? booking.tutor_lat ?? 13.0282}
                  tutorLng={liveLng ?? booking.tutor_lng ?? 80.0169}

                  liveTutorLat={liveLat}
                  liveTutorLng={liveLng}
                  liveStudentLat={liveStudentLat}
                  liveStudentLng={liveStudentLng}
                  studentAddress={booking.student_address || "Saveetha Engineering College, Thandalam, Chennai"}
                  tutorAddress={booking.tutor_address}
                  trackingStatus={trackingStatus}
                  onSyncGps={handleSyncGPS}
                />


              </div>
            ) : (
              /* Virtual room displays */
              <div className="flex flex-col gap-6">
                {videoSession && videoSession.meeting_id ? (
                  <JitsiMeetRoom
                    roomId={videoSession.meeting_id}
                    userName={name || "Student"}
                    userRole="Student"
                    bookingId={booking.id}
                    onCallEnd={() => router.push("/student/dashboard")}
                  />
                ) : (
                  <div className="h-[400px] bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-center items-center gap-4 text-center p-6 shadow-inner">
                    <div className="relative">
                      <Video className="h-14 w-14 text-slate-700" />
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full animate-ping" />
                    </div>
                    <div>
                      <h3 className="text-slate-200 font-bold text-base">Waiting for Tutor to Start</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Your tutor needs to click &ldquo;Generate Classroom&rdquo; from their session page. This page auto-refreshes every 5 seconds.
                      </p>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[0,1,2].map(i => (
                        <span key={i} className="h-1.5 w-4 rounded-full bg-indigo-700 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar controls / status widgets */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Tutor card summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-left flex items-center gap-4">
              {booking.tutor.profile_image && (
                <img src={booking.tutor.profile_image} alt={booking.tutor.user.name} className="h-12 w-12 rounded-full object-cover border" />
              )}
              <div className="flex-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Your Instructor</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{booking.tutor.user.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{booking.tutor.subject}</p>
              </div>
            </div>

            {/* In-Person timeline status flow OR Online call options panel */}
            {booking.session_type === "IN_PERSON" ? (
              <LiveTrackingPanel
                status={trackingStatus}
                isTutor={false}
              />
            ) : (
              <VideoSessionPanel
                status={videoSession?.status || "Scheduled"}
                meetingId={videoSession?.meeting_id}
                meetingLink={videoSession?.meeting_link}
                isTutor={false}
              />
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
