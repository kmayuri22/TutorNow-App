"use client";

import React from "react";
import { AgoraVideoClassroom } from "./AgoraVideoClassroom";

interface LegacyRoomProps {
  roomId?: string;
  userName?: string;
  userRole?: "Tutor" | "Student";
  bookingId?: number | string;
  onCallEnd?: () => void;
}

export const LegacyRoomWrapper: React.FC<any> = ({
  roomId,
  userName,
  userRole = "Student",
  bookingId,
  onCallEnd,
}) => {
  let effectiveBookingId = bookingId;
  if (!effectiveBookingId && roomId) {
    const parts = roomId.split("-");
    if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
      effectiveBookingId = Number(parts[1]);
    }
  }

  return (
    <AgoraVideoClassroom
      bookingId={effectiveBookingId || 1}
      userName={userName || (userRole === "Tutor" ? "Tutor" : "Student")}
      userRole={userRole}
      onCallEnd={onCallEnd}
    />
  );
};

export default LegacyRoomWrapper;
