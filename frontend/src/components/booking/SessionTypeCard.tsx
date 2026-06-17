import React from "react";
import { Video, MapPin, Check, Navigation, Shield } from "lucide-react";

interface SessionTypeCardProps {
  type: "IN_PERSON" | "VIDEO_CALL";
  selected: boolean;
  onClick: () => void;
  locationDetails?: {
    detecting: boolean;
    detected: boolean;
    address: string;
    error: string | null;
  };
  onDetectLocation?: () => void;
  onAddressChange?: (addr: string) => void;
}

export const SessionTypeCard: React.FC<SessionTypeCardProps> = ({
  type,
  selected,
  onClick,
  locationDetails,
  onDetectLocation,
  onAddressChange,
}) => {
  const isInPerson = type === "IN_PERSON";

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 flex flex-col gap-4 text-left ${
        selected
          ? "border-primary-500 bg-sky-50/20 dark:bg-sky-950/10 shadow-md ring-1 ring-primary-500"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      {selected && (
        <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 dark:bg-primary-500 text-white shadow-sm">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="flex items-center gap-3.5">
        <div
          className={`p-3 rounded-xl transition-colors duration-300 ${
            selected
              ? "bg-primary-600 dark:bg-primary-500 text-white"
              : "bg-slate-100 dark:bg-slate-850 text-slate-550 dark:text-slate-400"
          }`}
        >
          {isInPerson ? <MapPin className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {isInPerson ? "In-Person Tutoring" : "Online Video Session"}
          </h4>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {isInPerson
              ? "Tutor travels to your physical location"
              : "HD Video meeting room powered by Jitsi"}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-150 dark:border-slate-850 pt-3">
        <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {isInPerson ? (
            <>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                Live GPS route & ETA tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                Physical interactive mapping
              </li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                No travel required, join instantly
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                Interactive screenshare & text chat
              </li>
            </>
          )}
        </ul>
      </div>

      {isInPerson && selected && locationDetails && (
        <div
          onClick={(e) => e.stopPropagation()} // Prevent card deselection
          className="mt-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col gap-2.5 cursor-default"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-650 dark:text-slate-350">
              Your Geolocation
            </span>
            {onDetectLocation && (
              <button
                type="button"
                onClick={onDetectLocation}
                disabled={locationDetails.detecting}
                className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
              >
                <Navigation className={`h-3 w-3 ${locationDetails.detecting ? "animate-spin" : ""}`} />
                {locationDetails.detecting ? "Detecting..." : "Detect Location"}
              </button>
            )}
          </div>

          {locationDetails.error && (
            <div className="text-[11px] text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-150 dark:border-red-900 flex gap-1 items-center">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>{locationDetails.error}</span>
            </div>
          )}

          {locationDetails.detected && (
            <span className="text-[10px] bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 py-1 px-2 rounded-lg font-bold self-start flex items-center gap-1 animate-fade-in">
              <Check className="h-3 w-3" /> GPS Coordinates Lock Successful
            </span>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Verification Address
            </label>
            <input
              type="text"
              placeholder="e.g. Velachery, Chennai"
              value={locationDetails.address}
              onChange={(e) => onAddressChange?.(e.target.value)}
              className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default SessionTypeCard;
