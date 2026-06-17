"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { 
  Calendar, Clock, CheckCircle, AlertCircle, Trash2, 
  Loader2, Plus, ArrowRight
} from "lucide-react";

interface AvailabilitySlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string; // Available, Booked
}

export default function TutorAvailability() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New slot states
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [adding, setAdding] = useState(false);

  const loadSlots = async () => {
    try {
      const response = await api.get("/api/availability");
      setSlots(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load availability slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setSuccess(null);

    // Validate times
    if (startTime >= endTime) {
      setError("Start time must be before end time");
      setAdding(false);
      return;
    }

    try {
      // API expects start_time/end_time in HH:MM:SS format
      const formattedStart = `${startTime}:00`;
      const formattedEnd = `${endTime}:00`;

      await api.post("/api/availability", {
        date,
        start_time: formattedStart,
        end_time: formattedEnd
      });

      setSuccess("Availability slot added successfully!");
      // Reset inputs
      setDate("");
      setStartTime("09:00");
      setEndTime("10:00");
      
      // Refresh list
      loadSlots();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to add slot. Check for duplicates.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm("Are you sure you want to delete this availability slot?")) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/api/availability/${id}`);
      setSuccess("Availability slot deleted successfully.");
      loadSlots();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Cannot delete slot. It may already be booked.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <div className="h-40 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
        <div className="h-64 bg-white dark:bg-slate-900 border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="text-2xl font-bold">Manage Availability Schedule</h1>
        <p className="text-xs text-slate-455 mt-1">Open calendar dates and hours so students can book you.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs text-green-600 dark:text-green-400 flex items-start gap-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Slot Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="font-bold text-sm mb-5 flex gap-2 items-center">
            <Plus className="h-4 w-4 text-primary-500" />
            Add Time Slot
          </h2>
          
          <form onSubmit={handleAddSlot} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Select Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adding || !date}
              className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-xl transition flex justify-center items-center gap-1.5 shadow-sm"
            >
              {adding ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Adding Slot...
                </>
              ) : (
                "Add Availability"
              )}
            </button>
          </form>
        </div>

        {/* Existing Slots Ledger */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-sm mb-5">Current Active Slots ({slots.length})</h2>

          <div className="overflow-x-auto">
            {slots.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No availability slots added yet. Use the sidebar form to add your first calendar slot.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Time Period</th>
                    <th className="px-6 py-3 text-left">Booking Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t dark:border-slate-850">
                  {slots.map((slot) => {
                    const dateFormatted = new Date(slot.date).toLocaleDateString("en-US", {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    });
                    
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="px-6 py-4 font-semibold">{dateFormatted}</td>
                        <td className="px-6 py-4">{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            slot.status === "Available" ? "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400" :
                            "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            {slot.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            disabled={slot.status === "Booked"}
                            className="p-1.5 border rounded-lg text-slate-450 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
