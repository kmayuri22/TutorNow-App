"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Car, Compass, AlertCircle, RefreshCw } from "lucide-react";

interface GoogleMapProps {
  studentLat: number;
  studentLng: number;
  tutorLat: number;
  tutorLng: number;
  liveTutorLat?: number | null;
  liveTutorLng?: number | null;
  liveStudentLat?: number | null;
  liveStudentLng?: number | null;
  studentAddress?: string;
  tutorAddress?: string;
  trackingStatus?: string;
  onSyncGps?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  studentLat,
  studentLng,
  tutorLat,
  tutorLng,
  liveTutorLat,
  liveTutorLng,
  liveStudentLat,
  liveStudentLng,
  studentAddress = "Student Location",
  tutorAddress = "Tutor Location",
  trackingStatus = "Pending",
  onSyncGps,
  onMapClick,
}) => {


  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ student?: any; tutor?: any; routeLayer?: any }>({});

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const [roadEta, setRoadEta] = useState<number | null>(null);

  // Effective coordinates — prefer live GPS from devices
  const effectiveStudentLat = liveStudentLat ?? studentLat;
  const effectiveStudentLng = liveStudentLng ?? studentLng;
  const currentTutorLat = liveTutorLat ?? tutorLat;
  const currentTutorLng = liveTutorLng ?? tutorLng;

  // Haversine fallback
  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { distance: parseFloat((R * c).toFixed(2)), eta: Math.max(1, Math.round(((R * c) / 30) * 60)) };
  };

  const haversine = calculateHaversine(effectiveStudentLat, effectiveStudentLng, currentTutorLat, currentTutorLng);
  const displayDistance = roadDistance !== null ? roadDistance : haversine.distance;
  const displayEta = roadEta !== null ? roadEta : haversine.eta;

  // Fetch REAL road distance via OSRM (free, no API key, works globally)
  useEffect(() => {
    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentTutorLng},${currentTutorLat};${effectiveStudentLng},${effectiveStudentLat}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distKm = parseFloat((route.distance / 1000).toFixed(2));
          const etaMins = Math.max(1, Math.round(route.duration / 60));
          setRoadDistance(distKm);
          setRoadEta(etaMins);
        }
      } catch (err) {
        // Falls back to Haversine estimate
        console.warn("OSRM route fetch failed, using Haversine estimate.");
      }
    };

    if (currentTutorLat && currentTutorLng && effectiveStudentLat && effectiveStudentLng) {
      fetchRoadRoute();
    }
  }, [currentTutorLat, currentTutorLng, effectiveStudentLat, effectiveStudentLng]);

  // Load Leaflet.js CSS & JS dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      script.onerror = () => setMapError("Failed to load map engine.");
      document.head.appendChild(script);
    }
  }, []);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !window.L) return;

    const L = window.L;

    // Initialize map if not created yet
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      // Add OpenStreetMap dark/light street tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Add custom zoom control
      L.control.zoom({ position: "topright" }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Custom Icon Creators
    const createStudentIcon = () =>
      L.divIcon({
        className: "custom-student-pin",
        html: `
          <div style="
            background: #0284c7;
            width: 32px; height: 32px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: bold; font-size: 14px;
          ">📍</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

    const createTutorIcon = () =>
      L.divIcon({
        className: "custom-tutor-pin",
        html: `
          <div style="
            background: #e11d48;
            width: 36px; height: 36px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(225, 29, 72, 0.6);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 18px;
          ">🚗</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

    const safeStudentAddr = (studentAddress || "Student Location").split(",")[0];
    const safeTutorAddr = (tutorAddress || "Tutor Location").split(",")[0];

    // Remove existing markers & route layer
    if (markersRef.current.student) map.removeLayer(markersRef.current.student);
    if (markersRef.current.tutor) map.removeLayer(markersRef.current.tutor);
    if (markersRef.current.routeLayer) map.removeLayer(markersRef.current.routeLayer);

    // Add Student Marker using effective (live GPS) student coords
    const studentMarker = L.marker([effectiveStudentLat, effectiveStudentLng], { icon: createStudentIcon() })
      .addTo(map)
      .bindPopup(`<b>📍 Student Location</b><br>${safeStudentAddr}`);

    // Add Tutor Marker using live tutor GPS
    const tutorMarker = L.marker([currentTutorLat, currentTutorLng], { icon: createTutorIcon() })
      .addTo(map)
      .bindPopup(`<b>🚗 Tutor Location</b><br>${safeTutorAddr}`);

    // Draw dashed route line between real coordinates
    const routeLayer = L.polyline(
      [
        [currentTutorLat, currentTutorLng],
        [effectiveStudentLat, effectiveStudentLng],
      ],
      {
        color: "#0284c7",
        weight: 5,
        opacity: 0.85,
        dashArray: trackingStatus === "Journey Started" ? "12, 8" : undefined,
      }
    ).addTo(map);

    markersRef.current = { student: studentMarker, tutor: tutorMarker, routeLayer };

    // Attach click listener for interactive map movement
    if (onMapClick) {
      map.off("click");
      map.on("click", (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Fit map bounds to show both real-GPS student and tutor
    const bounds = L.latLngBounds([
      [effectiveStudentLat, effectiveStudentLng],
      [currentTutorLat, currentTutorLng],
    ]);
    map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });

  }, [leafletLoaded, effectiveStudentLat, effectiveStudentLng, currentTutorLat, currentTutorLng, studentAddress, tutorAddress, trackingStatus, onMapClick]);


  return (
    <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-xl h-80 sm:h-96 w-full flex flex-col">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {!leafletLoaded && !mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 gap-3">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading Real-Time GPS Map...</span>
        </div>
      )}

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-3 rounded-xl flex flex-col gap-1 text-left shadow-lg">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
          <Compass className="h-4 w-4 text-sky-400 animate-pulse" />
          <span>Live GPS Navigation</span>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">
          Status: <strong className="text-sky-400">{trackingStatus}</strong>
        </span>
      </div>

      {/* Sync GPS Button */}
      {onSyncGps && (
        <button
          onClick={onSyncGps}
          className="absolute top-4 right-14 z-10 bg-slate-950/85 hover:bg-sky-900/80 backdrop-blur-md border border-slate-700 text-sky-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1.5"
          title="Detect and broadcast current device GPS coordinates"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Sync My GPS</span>
        </button>
      )}


      {/* Stats Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-2xl max-w-lg mx-auto gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-600 text-white shadow-sm flex items-center justify-center">
            <Car className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              {roadDistance !== null ? "🛣️ Road Distance" : "📐 Est. Distance"}
            </span>
            <span className="text-sm font-extrabold text-white block mt-0.5">
              {displayDistance} KM
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-sm flex items-center justify-center">
            <Navigation className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              {roadEta !== null ? "🚗 Drive Time" : "⏱️ Est. Time"}
            </span>
            <span className="text-sm font-extrabold text-white block mt-0.5 animate-pulse">
              {["Tutor Arrived", "Session Started", "Session Completed"].includes(trackingStatus)
                ? "0 Mins (Arrived)"
                : `${displayEta} Mins`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;
