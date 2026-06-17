import React from "react";
import { Check, Clock, MapPin, Play, Award, Compass, AlertCircle } from "lucide-react";

interface TrackingLog {
  id: number;
  status: string;
  timestamp: string;
}

interface LiveTrackingPanelProps {
  status: string;
  isTutor: boolean;
  onStatusChange?: (newStatus: string) => void;
  logs?: TrackingLog[];
  loading?: boolean;
}

export const LiveTrackingPanel: React.FC<LiveTrackingPanelProps> = ({
  status,
  isTutor,
  onStatusChange,
  logs = [],
  loading = false,
}) => {
  // Ordered checklist of tracking statuses
  const statusFlow = [
    { label: "Booking Accepted", key: "Accepted", desc: "Tutor approved the slot" },
    { label: "Journey Started", key: "Journey Started", desc: "Tutor is heading to your place" },
    { label: "Tutor Nearby", key: "Tutor Nearby", desc: "Tutor is within 500 meters" },
    { label: "Tutor Arrived", key: "Tutor Arrived", desc: "Tutor reached the venue" },
    { label: "Session Started", key: "Session Started", desc: "Tutoring class is in progress" },
    { label: "Session Completed", key: "Session Completed", desc: "Session successfully ended" },
  ];

  // Calculate current active index
  const activeIndex = statusFlow.findIndex((item) => item.key === status);

  const getStatusStyle = (index: number) => {
    if (index < activeIndex) {
      return {
        dotClass: "bg-green-600 border-green-600 text-white",
        lineClass: "bg-green-600",
        labelClass: "text-slate-900 dark:text-white font-semibold",
      };
    } else if (index === activeIndex) {
      return {
        dotClass: "bg-primary-600 border-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-950/40 animate-pulse-subtle",
        lineClass: "bg-slate-200 dark:bg-slate-800",
        labelClass: "text-primary-600 dark:text-primary-400 font-bold",
      };
    } else {
      return {
        dotClass: "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-300 dark:text-slate-700",
        lineClass: "bg-slate-200 dark:bg-slate-800",
        labelClass: "text-slate-400 dark:text-slate-500",
      };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-6 text-left">
      <div className="flex items-center justify-between border-b dark:border-slate-850 pb-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary-500" />
            Session Status Workflow
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            {isTutor ? "Advance the journey status as you move" : "Follow your tutor's live travel logs"}
          </p>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="relative flex flex-col gap-5 pl-2">
        {statusFlow.map((item, index) => {
          const styles = getStatusStyle(index);
          const isLast = index === statusFlow.length - 1;

          return (
            <div key={item.key} className="flex gap-4 relative">
              {/* Connector line */}
              {!isLast && (
                <div className={`absolute left-4 top-8 w-0.5 h-7 z-0 transition-colors duration-300 ${styles.lineClass}`} />
              )}

              {/* Status Circle Dot */}
              <div className={`w-8.5 h-8.5 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 shrink-0 transition-all duration-300 ${styles.dotClass}`}>
                {index < activeIndex ? (
                  <Check className="h-4.5 w-4.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Status Info */}
              <div className="flex flex-col justify-center">
                <span className={`text-xs block leading-none ${styles.labelClass}`}>
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {item.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tutor Action Console */}
      {isTutor && (
        <div className="mt-2 border-t dark:border-slate-850 pt-5 flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">
            Tutor Control Panel
          </h4>
          
          <div className="flex flex-wrap gap-2.5">
            {activeIndex === 0 && (
              <button
                onClick={() => onStatusChange?.("Journey Started")}
                disabled={loading}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" /> Start Journey
              </button>
            )}

            {activeIndex === 1 && (
              <>
                <button
                  onClick={() => onStatusChange?.("Tutor Nearby")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <MapPin className="h-3.5 w-3.5 animate-pulse" /> I am Nearby (500m)
                </button>
                <button
                  onClick={() => onStatusChange?.("Tutor Arrived")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Mark as Arrived
                </button>
              </>
            )}

            {activeIndex === 2 && (
              <button
                onClick={() => onStatusChange?.("Tutor Arrived")}
                disabled={loading}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> I Have Arrived
              </button>
            )}

            {activeIndex === 3 && (
              <button
                onClick={() => onStatusChange?.("Session Started")}
                disabled={loading}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Clock className="h-3.5 w-3.5" /> Start Tutoring Session
              </button>
            )}

            {activeIndex === 4 && (
              <button
                onClick={() => onStatusChange?.("Session Completed")}
                disabled={loading}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Award className="h-3.5 w-3.5" /> End & Complete Session
              </button>
            )}

            {activeIndex === 5 && (
              <span className="text-xs text-green-600 dark:text-green-500 font-bold bg-green-50 dark:bg-green-950/20 py-2.5 px-4 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                <Check className="h-4 w-4" /> Journey and Session Completed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Student Informative Alert */}
      {!isTutor && activeIndex < 4 && (
        <div className="bg-sky-50/40 dark:bg-sky-950/10 border border-sky-150 dark:border-sky-900 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-sky-750 dark:text-sky-350">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Keep this page open to watch real-time coordinates tracking on the map. Your browser will notify you as soon as the tutor updates their status.
          </span>
        </div>
      )}
    </div>
  );
};
export default LiveTrackingPanel;
