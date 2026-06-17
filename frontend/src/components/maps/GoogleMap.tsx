import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Car, AlertCircle, Compass } from "lucide-react";

interface GoogleMapProps {
  studentLat: number;
  studentLng: number;
  tutorLat: number;
  tutorLng: number;
  liveTutorLat?: number | null;
  liveTutorLng?: number | null;
  studentAddress?: string;
  tutorAddress?: string;
  trackingStatus?: string;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  studentLat,
  studentLng,
  tutorLat,
  tutorLng,
  liveTutorLat,
  liveTutorLng,
  studentAddress = "Student Location",
  tutorAddress = "Tutor Location",
  trackingStatus = "Pending",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fallback distance and ETA calculation (Haversine formula)
  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    // Estimate ETA based on average speed of 30 km/h in traffic
    const etaMin = Math.round((distance / 30) * 60);
    return {
      distance: parseFloat(distance.toFixed(1)),
      eta: etaMin < 2 ? 2 : etaMin,
    };
  };

  const currentTutorLat = liveTutorLat ?? tutorLat;
  const currentTutorLng = liveTutorLng ?? tutorLng;
  const calc = calculateHaversine(studentLat, studentLng, currentTutorLat, currentTutorLng);

  // Check if Google Maps script is loaded on window
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).google && (window as any).google.maps) {
        setGoogleLoaded(true);
      } else {
        // Try to load script dynamically if API key exists
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const scriptId = "google-maps-script";
          let script = document.getElementById(scriptId) as HTMLScriptElement;
          if (!script) {
            script = document.createElement("script");
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => setGoogleLoaded(true);
            script.onerror = () => setMapError("Failed to load Google Maps SDK.");
            document.head.appendChild(script);
          }
        }
      }
    }
  }, []);

  // Initialize real Google Map if loaded
  useEffect(() => {
    if (googleLoaded && mapRef.current && typeof window !== "undefined") {
      try {
        const google = (window as any).google;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: (studentLat + currentTutorLat) / 2, lng: (studentLng + currentTutorLng) / 2 },
          zoom: 12,
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#202c3d" }],
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#8ec3b9" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#090d16" }],
            },
          ],
        });

        // Student marker
        new google.maps.Marker({
          position: { lat: studentLat, lng: studentLng },
          map,
          title: studentAddress,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#0284c7",
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
        });

        // Tutor marker (live or starting position)
        new google.maps.Marker({
          position: { lat: currentTutorLat, lng: currentTutorLng },
          map,
          title: tutorAddress,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#e11d48",
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
        });

        // Draw direct line or route if geometry is loaded
        const flightPath = new google.maps.Polyline({
          path: [
            { lat: studentLat, lng: studentLng },
            { lat: currentTutorLat, lng: currentTutorLng },
          ],
          geodesic: true,
          strokeColor: "#38bdf8",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        });

        flightPath.setMap(map);
      } catch (err) {
        console.error("Error drawing Google Map:", err);
      }
    }
  }, [googleLoaded, studentLat, studentLng, currentTutorLat, currentTutorLng, studentAddress, tutorAddress]);

  // Handle vector Canvas fallback drawing (Animated, elegant custom route rendering)
  useEffect(() => {
    if (!googleLoaded && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let animationFrameId: number;
      let step = 0;

      const drawMap = () => {
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw background theme
        const isDark = document.documentElement.classList.contains("dark");
        ctx.fillStyle = isDark ? "#0f172a" : "#f1f5f9";
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Vector coordinates on canvas
        const pad = 60;
        const tutorX = pad;
        const tutorY = pad + 40;
        const studentX = width - pad;
        const studentY = height - pad - 40;

        // Current simulated intermediate position if live tracking is active
        let currentX = tutorX;
        let currentY = tutorY;

        // Interpolate live tutor position along route based on status
        if (trackingStatus === "Tutor Nearby") {
          currentX = tutorX + (studentX - tutorX) * 0.8;
          currentY = tutorY + (studentY - tutorY) * 0.8;
        } else if (trackingStatus === "Tutor Arrived" || trackingStatus === "Session Started" || trackingStatus === "Session Completed") {
          currentX = studentX;
          currentY = studentY;
        } else if (trackingStatus === "Journey Started") {
          currentX = tutorX + (studentX - tutorX) * 0.35;
          currentY = tutorY + (studentY - tutorY) * 0.35;
        }

        // Draw main route path line
        ctx.strokeStyle = isDark ? "#1e293b" : "#cbd5e1";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(tutorX, tutorY);
        // Add a curved node in the middle to make it look like a street route
        const midX = (tutorX + studentX) / 2 + 30;
        const midY = (tutorY + studentY) / 2 - 35;
        ctx.quadraticCurveTo(midX, midY, studentX, studentY);
        ctx.stroke();

        // Draw active tracking route path
        ctx.strokeStyle = "#0284c7"; // Blue primary active line
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tutorX, tutorY);
        // Interpolate curve
        const t = (currentX - tutorX) / (studentX - tutorX || 1);
        const getPointOnCurve = (percent: number) => {
          const x = (1 - percent) * (1 - percent) * tutorX + 2 * (1 - percent) * percent * midX + percent * percent * studentX;
          const y = (1 - percent) * (1 - percent) * tutorY + 2 * (1 - percent) * percent * midY + percent * percent * studentY;
          return { x, y };
        };
        const pt = getPointOnCurve(t);
        ctx.quadraticCurveTo(midX, midY, pt.x, pt.y);
        ctx.stroke();

        // Pulse effect around Student
        const pulseRadius = 12 + Math.sin(step * 0.05) * 6;
        ctx.fillStyle = "rgba(14, 165, 233, 0.18)";
        ctx.beginPath();
        ctx.arc(studentX, studentY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw Student pin
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(studentX, studentY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Student label flag
        ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 6;
        ctx.fillRect(studentX - 55, studentY - 45, 110, 26);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 1;
        ctx.strokeRect(studentX - 55, studentY - 45, 110, 26);
        
        ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("STUDENT (" + studentAddress.split(",")[0] + ")", studentX, studentY - 28);

        // Pulse effect around live Tutor marker
        const tutorPulse = 14 + Math.sin(step * 0.06) * 5;
        ctx.fillStyle = "rgba(225, 29, 72, 0.15)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, tutorPulse, 0, Math.PI * 2);
        ctx.fill();

        // Draw Tutor marker (Car / Red Node)
        ctx.fillStyle = "#e11d48"; // Red Accent
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tutor Label flag
        ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 6;
        ctx.fillRect(pt.x - 55, pt.y - 45, 110, 26);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 1;
        ctx.strokeRect(pt.x - 55, pt.y - 45, 110, 26);

        ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TUTOR (" + tutorAddress.split(",")[0] + ")", pt.x, pt.y - 28);

        // Compass / Map elements simulation
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
        ctx.lineWidth = 1;
        // Mock highway curves
        ctx.beginPath();
        ctx.moveTo(0, 80);
        ctx.bezierCurveTo(100, 20, 200, 150, width, 100);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(50, height);
        ctx.bezierCurveTo(120, height - 120, 250, height - 200, width - 20, 0);
        ctx.stroke();

        step += 1;
        animationFrameId = requestAnimationFrame(drawMap);
      };

      drawMap();

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [googleLoaded, studentLat, studentLng, currentTutorLat, currentTutorLng, trackingStatus, studentAddress, tutorAddress]);

  return (
    <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner h-80 sm:h-96 w-full flex flex-col">
      {/* Real Google Map Div */}
      {googleLoaded ? (
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      ) : (
        /* Vector Map Fallback */
        <canvas
          ref={canvasRef}
          width={600}
          height={380}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Map Control overlay */}
      <div className="absolute top-4 left-4 z-10 glass border border-slate-250 dark:border-slate-800 p-3 rounded-xl flex flex-col gap-1 text-left max-w-xs shadow-md">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-850 dark:text-slate-100">
          <Compass className="h-4 w-4 text-primary-500 animate-spin-slow" />
          <span>Live Session Tracking Room</span>
        </div>
        <span className="text-[10px] font-medium text-slate-450 dark:text-slate-400">
          Active Status: <strong className="text-primary-600 dark:text-primary-400">{trackingStatus}</strong>
        </span>
      </div>

      {/* Info Stats Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 glass border border-slate-250 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-lg max-w-lg mx-auto gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary-600 text-white shadow-sm flex items-center justify-center">
            <Car className="h-4 w-4 animate-bounce" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Estimated Distance
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
              {calc.distance} KM
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-250 dark:bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-sm flex items-center justify-center">
            <Navigation className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Estimated Duration
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 animate-pulse">
              {trackingStatus === "Tutor Arrived" || trackingStatus === "Session Started" || trackingStatus === "Session Completed" ? "0 Mins" : calc.eta + " Minutes"}
            </span>
          </div>
        </div>
      </div>

      {/* Google Maps SDK Notice */}
      {!googleLoaded && (
        <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-sm text-[9px] text-slate-450 px-2 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 max-w-[150px]">
          <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
          <span>Interactive Vector Map Active (API key pending)</span>
        </div>
      )}
    </div>
  );
};
export default GoogleMap;
