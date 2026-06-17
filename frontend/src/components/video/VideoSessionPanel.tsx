import React from "react";
import { Video, Play, StopCircle, ExternalLink, HelpCircle, Shield, Copy, Check } from "lucide-react";
import { useState } from "react";

interface VideoSessionPanelProps {
  status: string; // Scheduled | Active | Ended
  meetingLink?: string;
  meetingId?: string;
  isTutor: boolean;
  onCreateRoom?: () => void;
  onStartSession?: () => void;
  onEndSession?: () => void;
  loading?: boolean;
}

export const VideoSessionPanel: React.FC<VideoSessionPanelProps> = ({
  status,
  meetingLink,
  meetingId,
  isTutor,
  onCreateRoom,
  onStartSession,
  onEndSession,
  loading = false,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (meetingLink) {
      navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "Ended":
        return "bg-slate-100 text-slate-850 dark:bg-slate-850 dark:text-slate-400 border-slate-200 dark:border-slate-800";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm text-left flex flex-col gap-6">
      <div className="flex items-center justify-between border-b dark:border-slate-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/35 text-primary-600 dark:text-primary-400 rounded-xl">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Online Video Classroom
            </h3>
            <p className="text-xs text-slate-450 mt-0.5">
              Secure virtual room powered by Jitsi Meet (no software install needed)
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border rounded-full ${getStatusColor()}`}>
          {status === "Active" ? "● Live Now" : status}
        </span>
      </div>

      {!meetingId ? (
        /* Video not created yet */
        <div className="py-6 flex flex-col items-center text-center gap-4 border border-dashed rounded-2xl p-6 bg-slate-50/55 dark:bg-slate-950/15">
          <Video className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-pulse" />
          <div>
            <h4 className="font-bold text-sm">Classroom Not Configured Yet</h4>
            <p className="text-xs text-slate-450 mt-1 max-w-sm">
              {isTutor
                ? "As the tutor, you must initialize the virtual classroom to generate the secure invite link."
                : "The tutor has not created the video conference room yet. Please check back shortly."}
            </p>
          </div>

          {isTutor && onCreateRoom && (
            <button
              onClick={onCreateRoom}
              disabled={loading}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
            >
              Generate Virtual Classroom
            </button>
          )}
        </div>
      ) : (
        /* Room details & call controls */
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col gap-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">
                Virtual Meeting ID
              </span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {meetingId}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col gap-1.5 relative">
              <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">
                Share Invite Link
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono font-semibold text-slate-700 dark:text-slate-300 max-w-[200px]">
                  {meetingLink}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1 hover:underline shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action console */}
          <div className="border-t dark:border-slate-850 pt-5 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">
              Classroom Controls
            </h4>

            <div className="flex flex-wrap gap-2.5">
              {isTutor && status === "Scheduled" && onStartSession && (
                <button
                  onClick={onStartSession}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Start Live Classroom Session
                </button>
              )}

              {isTutor && status === "Active" && onEndSession && (
                <button
                  onClick={onEndSession}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <StopCircle className="h-4 w-4" /> End & Close Classroom
                </button>
              )}

              {status === "Active" && meetingLink && (
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <ExternalLink className="h-4 w-4" /> Join Call in New Tab
                </a>
              )}

              {status === "Ended" && (
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-850 py-2.5 px-4 border rounded-xl text-slate-500">
                  This virtual session has ended.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security alert */}
      <div className="bg-sky-50/40 dark:bg-sky-950/10 border border-sky-150 dark:border-sky-900 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-sky-700 dark:text-sky-300">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Jitsi Meet call streams are secure and encrypted. Audio/Video devices are requested only when entering the classroom. Ensure your webcam and microphone permissions are enabled.
        </span>
      </div>
    </div>
  );
};
export default VideoSessionPanel;
