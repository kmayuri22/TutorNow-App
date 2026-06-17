import React, { useEffect, useRef, useState } from "react";
import { Loader2, VideoOff, Wifi } from "lucide-react";

interface JitsiMeetRoomProps {
  roomId: string;
  userName: string;
  onCallEnd?: () => void;
}

export const JitsiMeetRoom: React.FC<JitsiMeetRoomProps> = ({
  roomId,
  userName,
  onCallEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let api: any = null;

    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Jitsi Meet script."));
        document.head.appendChild(script);
      });
    };

    loadJitsiScript()
      .then(() => {
        if (!containerRef.current) return;
        setLoading(false);

        // Options for Jitsi Meet iframe
        const options = {
          roomName: roomId,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          userInfo: {
            displayName: userName,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              "microphone", "camera", "closedcaptions", "desktop", "embedmeeting", "fullscreen",
              "fodeviceselection", "hangup", "profile", "chat", "recording",
              "livestreaming", "etherpad", "sharedvideo", "settings", "raisehand",
              "videoquality", "filmstrip", "invite", "feedback", "stats", "shortcuts",
              "tileview", "videobackgroundblur", "download", "help", "mute-everyone",
              "mute-video-everyone", "security"
            ],
          },
        };

        // Create the Jitsi API object
        api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", options);

        // Event listener for call hangs up
        api.addEventListener("videoConferenceLeft", () => {
          if (onCallEnd) onCallEnd();
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Could not initialize video classroom. Falling back to secure direct iframe...");
        setLoading(false);
      });

    return () => {
      if (api) {
        api.dispose();
      }
    };
  }, [roomId, userName, onCallEnd]);

  return (
    <div className="relative w-full h-[500px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-center items-center">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col justify-center items-center gap-3.5 bg-slate-950">
          <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
            Connecting Secure Video Server...
          </span>
        </div>
      )}

      {error ? (
        /* Direct secure iframe fallback in case Jitsi SDK blocked/fails */
        <iframe
          src={`https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(userName)}"`}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0 rounded-2xl"
          onLoad={() => setLoading(false)}
        />
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}

      {/* Floating status tag */}
      <div className="absolute bottom-4 right-4 z-10 bg-slate-950/80 backdrop-blur-sm border border-slate-800 py-1.5 px-3 rounded-lg flex items-center gap-2">
        <Wifi className="h-3.5 w-3.5 text-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          Secure Line Active
        </span>
      </div>
    </div>
  );
};
export default JitsiMeetRoom;
