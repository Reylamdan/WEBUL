import { agendaApi, formatDate, todayIso, type AgendaEvent } from "@/lib/api";

// Acara yang sedang atau akan berlangsung (selesai >= hari ini). Backend membatasi maksimal 100 data.
export const AGENDA_UPCOMING_LIMIT = 100;

export function fetchUpcomingEvents() {
  return agendaApi.list({ page: 1, limit: AGENDA_UPCOMING_LIMIT, from: todayIso() });
}

export function eventDateRange(event: AgendaEvent): string {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  return end && end !== start ? `${start} – ${end}` : start;
}

// "09:00 – 11:30 WIB", "09:00 WIB", atau "" bila jam tidak diisi.
export function eventTimeRange(event: AgendaEvent): string {
  if (!event.startTime) return "";
  return event.endTime ? `${event.startTime} – ${event.endTime} WIB` : `${event.startTime} WIB`;
}

// Keterangan singkat: tanggal · jam · lokasi (bagian yang kosong dilewati).
export function eventMeta(event: AgendaEvent): string {
  return [eventDateRange(event), eventTimeRange(event), event.location ?? ""].filter(Boolean).join(" · ");
}