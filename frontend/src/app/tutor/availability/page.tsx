"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Calendar, Clock, Plus, Trash2, Loader2, CheckCircle,
  AlertCircle, ChevronLeft, ChevronRight, Edit2, X, Save,
  RefreshCw, CalendarDays, Repeat, Info
} from "lucide-react";

interface AvailabilitySlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  for (const m of ["00", "30"]) {
    const hour = h < 10 ? `0${h}` : `${h}`;
    TIME_OPTIONS.push(`${hour}:${m}`);
  }
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function toISO(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function TutorSchedulePage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calendar view state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toISO(today));

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [form, setForm] = useState({
    date: toISO(today),
    startTime: "09:00",
    endTime: "10:00",
    repeat: "none" as "none" | "weekly" | "daily",
    repeatWeeks: 4,
  });

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/availability");
      setSlots(res.data);
    } catch (e: any) {
      setError("Failed to load schedule. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSlots(); }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
  }, [error]);

  // Calendar helpers
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const openAddModal = (date?: string) => {
    const d = date || selectedDate;
    setEditingSlot(null);
    setForm({ date: d, startTime: "09:00", endTime: "10:00", repeat: "none", repeatWeeks: 4 });
    setShowModal(true);
    setError(null);
  };

  const openEditModal = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setForm({
      date: slot.date,
      startTime: slot.start_time.slice(0, 5),
      endTime: slot.end_time.slice(0, 5),
      repeat: "none",
      repeatWeeks: 4,
    });
    setShowModal(true);
    setError(null);
  };

  const handleSave = async () => {
    if (form.startTime >= form.endTime) {
      setError("Start time must be before end time.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (editingSlot) {
        // Edit: delete old, create new
        await api.delete(`/api/availability/${editingSlot.id}`);
        await api.post("/api/availability", {
          date: form.date,
          start_time: `${form.startTime}:00`,
          end_time: `${form.endTime}:00`,
        });
        setSuccess("✅ Slot updated successfully!");
      } else {
        // Add (with optional repeat)
        const datesToAdd: string[] = [];
        if (form.repeat === "none") {
          datesToAdd.push(form.date);
        } else if (form.repeat === "weekly") {
          const base = new Date(form.date);
          for (let i = 0; i < form.repeatWeeks; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i * 7);
            datesToAdd.push(toISO(d));
          }
        } else if (form.repeat === "daily") {
          const base = new Date(form.date);
          for (let i = 0; i < 7; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            datesToAdd.push(toISO(d));
          }
        }

        let added = 0;
        for (const date of datesToAdd) {
          try {
            await api.post("/api/availability", {
              date,
              start_time: `${form.startTime}:00`,
              end_time: `${form.endTime}:00`,
            });
            added++;
          } catch { /* skip duplicates */ }
        }
        setSuccess(`✅ Added ${added} slot${added !== 1 ? "s" : ""} successfully!`);
      }
      setShowModal(false);
      await loadSlots();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save slot. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slotId: number) => {
    setDeletingId(slotId);
    try {
      await api.delete(`/api/availability/${slotId}`);
      setSuccess("Slot deleted.");
      await loadSlots();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Could not delete slot.");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedDaySlots = slotsByDate[selectedDate] || [];

  return (
    <div className="py-8 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Schedule</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-11">
            Manage your availability slots — students can only book within your open slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSlots}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Calendar ── */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">

            {/* Month Navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="font-bold text-base text-slate-800 dark:text-white">
                {MONTHS[viewMonth]} {viewYear}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
              {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 p-3">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daySlots = slotsByDate[dateStr] || [];
                const isToday = dateStr === toISO(today);
                const isSelected = dateStr === selectedDate;
                const hasSlots = daySlots.length > 0;
                const hasBooked = daySlots.some(s => s.status === "Booked");
                const isPast = new Date(dateStr) < new Date(toISO(today));

                return (
                  <button
                    key={day}
                    onClick={() => { setSelectedDate(dateStr); }}
                    onDoubleClick={() => !isPast && openAddModal(dateStr)}
                    title={hasSlots ? `${daySlots.length} slot(s)` : isPast ? "Past date" : "Double-click to add slot"}
                    className={`
                      relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all
                      ${isSelected
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                        : isToday
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300 dark:ring-indigo-700"
                          : isPast
                            ? "text-slate-300 dark:text-slate-700 cursor-default"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      }
                    `}
                  >
                    {day}
                    {hasSlots && (
                      <span className={`absolute bottom-1 flex gap-0.5`}>
                        {daySlots.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "Booked"
                                ? (isSelected ? "bg-yellow-300" : "bg-yellow-500")
                                : (isSelected ? "bg-green-300" : "bg-green-500")
                            }`}
                          />
                        ))}
                        {daySlots.length > 3 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/50" : "bg-slate-400"}`} />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-6 pb-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />Booked</span>
              <span className="ml-auto text-[10px]">Double-click a date to add a slot</span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: "Total Slots", value: slots.length, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
              { label: "Available", value: slots.filter(s => s.status === "Available").length, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Booked", value: slots.filter(s => s.status === "Booked").length, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 text-center`}>
                <div className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Day Slots Panel ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedDaySlots.length === 0 ? "No slots" : `${selectedDaySlots.length} slot(s)`}
                </p>
              </div>
              <button
                onClick={() => openAddModal(selectedDate)}
                disabled={new Date(selectedDate) < new Date(toISO(today))}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow"
                title="Add slot to this day"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                </div>
              ) : selectedDaySlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Calendar className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No slots on this day.<br/>Click + to add one.</p>
                </div>
              ) : (
                selectedDaySlots
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(slot => (
                    <div key={slot.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full shrink-0 ${slot.status === "Booked" ? "bg-yellow-400" : "bg-green-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {formatTime(slot.start_time.slice(0, 5))} – {formatTime(slot.end_time.slice(0, 5))}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 block ${
                          slot.status === "Booked" ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"
                        }`}>
                          {slot.status}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {slot.status === "Available" && (
                          <button
                            onClick={() => openEditModal(slot)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-500 transition"
                            title="Edit slot"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={deletingId === slot.id || slot.status === "Booked"}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          title={slot.status === "Booked" ? "Cannot delete booked slot" : "Delete slot"}
                        >
                          {deletingId === slot.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Upcoming slots list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Upcoming (Next 7 Days)</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {slots
                .filter(s => {
                  const d = new Date(s.date + "T12:00:00");
                  const now = new Date(toISO(today) + "T00:00:00");
                  const next7 = new Date(now); next7.setDate(now.getDate() + 7);
                  return d >= now && d <= next7;
                })
                .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
                .slice(0, 8)
                .map(slot => (
                  <div key={slot.id} className="px-5 py-2.5 flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${slot.status === "Booked" ? "bg-yellow-500" : "bg-green-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {new Date(slot.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatTime(slot.start_time.slice(0, 5))} – {formatTime(slot.end_time.slice(0, 5))}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      slot.status === "Booked"
                        ? "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400"
                        : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                ))}
              {slots.filter(s => {
                const d = new Date(s.date + "T12:00:00");
                const now = new Date(toISO(today) + "T00:00:00");
                const next7 = new Date(now); next7.setDate(now.getDate() + 7);
                return d >= now && d <= next7;
              }).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No upcoming slots in next 7 days.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600">
                  {editingSlot ? <Edit2 className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                  {editingSlot ? "Edit Slot" : "Add Availability Slot"}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  min={toISO(today)}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <select
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <select
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TIME_OPTIONS.filter(t => t > form.startTime).map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </div>
              </div>

              {/* Duration badge */}
              {form.startTime && form.endTime && form.startTime < form.endTime && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5" />
                  Duration: {(() => {
                    const [sh, sm] = form.startTime.split(":").map(Number);
                    const [eh, em] = form.endTime.split(":").map(Number);
                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}` : `${mins}m`;
                  })()}
                </div>
              )}

              {/* Repeat (only for new slots) */}
              {!editingSlot && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> Repeat</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["none", "weekly", "daily"] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, repeat: r }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          form.repeat === r
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
                        }`}
                      >
                        {r === "none" ? "One-time" : r === "weekly" ? "Weekly" : "Daily (7 days)"}
                      </button>
                    ))}
                  </div>

                  {form.repeat === "weekly" && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Repeat for how many weeks?</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={2} max={12}
                          value={form.repeatWeeks}
                          onChange={e => setForm(f => ({ ...f, repeatWeeks: parseInt(e.target.value) }))}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="text-sm font-bold text-indigo-600 w-16 text-center">{form.repeatWeeks} weeks</span>
                      </div>
                    </div>
                  )}

                  {form.repeat !== "none" && (
                    <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-400" />
                      {form.repeat === "weekly"
                        ? `Will create ${form.repeatWeeks} slots every week on the same day.`
                        : "Will create 7 slots for each day starting from selected date."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : (editingSlot ? "Save Changes" : "Add Slot")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
