import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";

export interface SupabaseAuthResult {
  access_token: string;
  role: string;
  name: string;
  email: string;
  mobile?: string;
  user_id: number;
  supabase_uid: string;
  tutor_status?: string | null;
}

/**
 * Unified Login via Supabase Auth.
 * Works identically across Web and Mobile.
 */
export async function supabaseLogin(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (authError || !authData.session || !authData.user) {
    throw new Error(authError?.message || "Invalid email or password");
  }

  const user = authData.user;
  const token = authData.session.access_token;
  const metadata = user.user_metadata || {};

  // Fetch or sync public.users record
  let publicUser: any = null;
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email!)
    .maybeSingle();

  if (userData) {
    publicUser = userData;
  } else {
    // If not yet in public.users, create it
    const { data: insertedUser } = await supabase
      .from("users")
      .insert({
        name: metadata.name || user.email?.split("@")[0] || "User",
        email: user.email!,
        role: metadata.role || "Student",
        mobile: metadata.mobile || "",
      })
      .select()
      .single();
    publicUser = insertedUser;
  }

  const numericId = publicUser?.id || 1;
  const role = publicUser?.role || metadata.role || "Student";
  const name = publicUser?.name || metadata.name || user.email?.split("@")[0] || "User";
  const mobile = publicUser?.mobile || metadata.mobile || "";

  let tutorStatus: string | null = null;
  if (role === "Tutor") {
    const { data: tutorData } = await supabase
      .from("tutors")
      .select("status, is_online")
      .eq("user_id", numericId)
      .maybeSingle();

    if (!tutorData) {
      await supabase.from("tutors").insert({
        user_id: numericId,
        subject: metadata.subject || "General",
        qualification: metadata.qualification || "Degree",
        experience: metadata.experience || 1,
        hourly_rate: metadata.hourly_rate || 300,
        bio: metadata.bio || "",
        teaching_mode: metadata.teaching_mode || "Offline",
        location_city: metadata.location_city || "Online",
        location_address: metadata.location_address || "",
        status: "Pending",
        is_verified: false,
      });
      tutorStatus = "Pending";
    } else {
      tutorStatus = tutorData.status || "Pending";
      if (tutorStatus === "Approved") {
        await supabase
          .from("tutors")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("user_id", numericId);
      }
    }
  }

  const result: SupabaseAuthResult = {
    access_token: token,
    role,
    name,
    email: user.email!,
    mobile,
    user_id: numericId,
    supabase_uid: user.id,
    tutor_status: tutorStatus,
  };

  // Sync with Zustand store
  useStore.getState().login(result);

  return result;
}

/**
 * Unified Registration via Supabase Auth.
 * Automatically provisions public user & tutor profile.
 */
export async function supabaseRegister(params: {
  email: string;
  password: string;
  name: string;
  role: "Student" | "Tutor" | "Admin";
  mobile?: string;
  subject?: string;
  qualification?: string;
  experience?: number;
  hourly_rate?: number;
  bio?: string;
  teaching_mode?: string;
  location_city?: string;
  location_address?: string;
}): Promise<SupabaseAuthResult> {
  const normalizedEmail = params.email.trim().toLowerCase();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: params.password,
    options: {
      data: {
        name: params.name,
        role: params.role,
        mobile: params.mobile || "",
        subject: params.subject || "General",
        qualification: params.qualification || "Degree",
        experience: params.experience || 1,
        hourly_rate: params.hourly_rate || 300,
        bio: params.bio || "",
        teaching_mode: params.teaching_mode || "Both",
        location_city: params.location_city || "Online",
        location_address: params.location_address || "",
      },
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Registration failed");
  }

  // Attempt immediate login to retrieve session token
  return await supabaseLogin(normalizedEmail, params.password);
}

/**
 * Fetch all verified tutors directly from Supabase.
 */
export async function supabaseGetTutors(searchQuery?: string, subject?: string) {
  let query = supabase
    .from("tutors")
    .select(`
      id,
      user_id,
      subject,
      qualification,
      specialization,
      experience,
      hourly_rate,
      bio,
      profile_image,
      rating,
      languages,
      teaching_mode,
      location_city,
      location_address,
      latitude,
      longitude,
      is_online,
      status,
      is_verified,
      users:user_id ( id, name, email, mobile )
    `)
    .eq("status", "Approved");

  if (subject && subject !== "All") {
    query = query.ilike("subject", `%${subject}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching tutors from Supabase:", error);
    return [];
  }

  // Flatten tutor records for frontend UI
  return (data || []).map((t: any) => ({
    ...t,
    name: t.users?.name || "Verified Tutor",
    email: t.users?.email || "",
    mobile: t.users?.mobile || "",
  }));
}

/**
 * Fetch bookings for student or tutor.
 */
export async function supabaseGetBookings(userId: number, role: string) {
  let query = supabase.from("bookings").select(`
    *,
    student:student_id ( id, name, email, mobile ),
    tutor:tutor_id (
      id,
      subject,
      hourly_rate,
      users:user_id ( id, name, email, mobile )
    )
  `);

  if (role === "Student") {
    query = query.eq("student_id", userId);
  } else if (role === "Tutor") {
    // Look up tutor id for user
    const { data: tutor } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (tutor) {
      query = query.eq("tutor_id", tutor.id);
    }
  }

  const { data, error } = await query.order("booking_date", { ascending: false });
  if (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  return (data || []).map((b: any) => ({
    ...b,
    student_name: b.student?.name || "Student",
    student_email: b.student?.email || "",
    student_mobile: b.student?.mobile || "",
    tutor_name: b.tutor?.users?.name || "Tutor",
    tutor_email: b.tutor?.users?.email || "",
  }));
}

/**
 * Create a new Booking in Supabase.
 */
export async function supabaseCreateBooking(payload: {
  student_id: number;
  tutor_id: number;
  subject: string;
  booking_date: string;
  session_time: string;
  session_type?: string;
  notes?: string;
  duration?: number;
}) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      student_id: payload.student_id,
      tutor_id: payload.tutor_id,
      subject: payload.subject,
      booking_date: payload.booking_date,
      session_time: payload.session_time,
      session_type: payload.session_type || "IN_PERSON",
      status: "Pending",
      payment_status: "Unpaid",
      duration: payload.duration || 60,
      notes: payload.notes || "",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Also create a notification for the tutor
  const { data: tutorRow } = await supabase
    .from("tutors")
    .select("user_id")
    .eq("id", payload.tutor_id)
    .single();

  if (tutorRow?.user_id) {
    await supabase.from("notifications").insert({
      user_id: tutorRow.user_id,
      message: `New booking request for ${payload.subject} on ${payload.booking_date} at ${payload.session_time}.`,
      status: "Unread",
    });
  }

  return data;
}

/**
 * Update Booking Status (e.g. Accept, Reject, Complete).
 */
export async function supabaseUpdateBookingStatus(
  bookingId: number,
  status: "Accepted" | "Rejected" | "Completed" | "Cancelled"
) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Notify student
  if (data?.student_id) {
    await supabase.from("notifications").insert({
      user_id: data.student_id,
      message: `Your booking for ${data.subject || "tutoring session"} has been ${status.toLowerCase()}.`,
      status: "Unread",
    });
  }

  return data;
}

/**
 * Subscribe to Real-Time Booking Updates via Supabase Realtime Channels.
 */
export function supabaseSubscribeToBookings(
  onUpdate: (payload: any) => void
) {
  const channel = supabase
    .channel("public:bookings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      (payload) => {
        console.log("[Supabase Realtime Booking Update]:", payload);
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to Real-Time Notifications.
 */
export function supabaseSubscribeToNotifications(
  userId: number,
  onNotification: (notification: any) => void
) {
  const channel = supabase
    .channel(`public:notifications:user_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[Supabase Realtime Notification]:", payload);
        onNotification(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
