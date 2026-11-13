import { calendarApi, formatDate, todayIso, type CalendarEvent } from "@/lib/api";

// Agenda yang sedang atau akan berlangsung (selesai >= hari ini). Backend membatasi maksimal 100 data.
export const AGENDA_UPCOMING_LIMIT = 100;

export function fetchUpcomingEvents() {
  return calendarApi.list({ page: 1, limit: AGENDA_UPCOMING_LIMIT, from: todayIso() });
}

export function eventDateRange(event: CalendarEvent): string {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  return end && end !== start ? `${start} – ${end}` : start;
}
