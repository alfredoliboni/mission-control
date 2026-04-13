"use client";

import { useState, useMemo } from "react";
import { useParsedAlerts, useParsedPathway, useParsedProfile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { ChevronLeft, ChevronRight } from "lucide-react";

// -- Types -------------------------------------------------------------------

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  category: "deadline" | "milestone" | "appointment" | "alert";
  severity?: "HIGH" | "MEDIUM" | "INFO";
  description?: string;
  action?: string;
}

// -- Helpers -----------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATEGORY_COLORS: Record<string, string> = {
  deadline: "bg-status-blocked",
  milestone: "bg-status-success",
  appointment: "bg-status-current",
  alert: "bg-status-caution",
};

const CATEGORY_LABELS: Record<string, string> = {
  deadline: "Deadline",
  milestone: "Milestone",
  appointment: "Appointment",
  alert: "Alert",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function extractDateFromText(text: string): string | null {
  // Match YYYY-MM-DD
  const match = text.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// -- Component ---------------------------------------------------------------

export default function CalendarPage() {
  const { data: alerts } = useParsedAlerts();
  const { data: pathway } = useParsedPathway();
  const { data: profile } = useParsedProfile();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Extract calendar events from workspace data
  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];

    // From alerts
    if (alerts) {
      for (const alert of alerts) {
        if (alert.date) {
          const severity = alert.severity === "HIGH" ? "deadline" : "alert";
          result.push({
            date: alert.date,
            title: alert.title,
            category: severity === "deadline" ? "deadline" : "alert",
            severity: alert.severity,
            description: alert.description,
            action: alert.action,
          });
        }
      }
    }

    // From pathway items with dates
    if (pathway) {
      for (const stage of pathway.stages) {
        for (const item of stage.items) {
          if (item.date) {
            result.push({
              date: item.date,
              title: item.text,
              category: item.completed ? "milestone" : "milestone",
              description: `Stage: ${stage.title}`,
            });
          }
        }
      }
    }

    // From profile appointments
    if (profile?.medical?.appointments) {
      for (const appt of profile.medical.appointments) {
        if (appt.date) {
          result.push({
            date: appt.date,
            title: appt.description,
            category: "appointment",
          });
        }
      }
    }

    // Extract dates from alert text (e.g., "April 15 appointment")
    if (alerts) {
      for (const alert of alerts) {
        const dateInDesc = extractDateFromText(alert.description || "");
        if (dateInDesc && !result.some((e) => e.date === dateInDesc && e.title === alert.title)) {
          result.push({
            date: dateInDesc,
            title: alert.title,
            category: "appointment",
            severity: alert.severity,
            description: alert.description,
          });
        }
      }
    }

    return result;
  }, [alerts, pathway, profile]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);
    }
    return map;
  }, [events]);

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  // Count events this month
  const monthEventCount = Array.from(eventsByDate.entries()).filter(
    ([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)
  ).reduce((sum, [, evts]) => sum + evts.length, 0);

  const childName = profile?.basicInfo?.name || "your child";

  return (
    <WorkspaceSection title="Calendar" icon="📅" isLoading={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">
              {monthEventCount} event{monthEventCount !== 1 ? "s" : ""} this month for {childName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="text-[12px] font-medium text-primary hover:text-primary/80 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-colors"
            >
              Today
            </button>
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[15px] font-semibold text-foreground min-w-[140px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[11px]">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[key]}`} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-muted/20" />
            ))}

            {/* Date cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(year, month, day);
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = (firstDay + i) % 7 === 0 || (firstDay + i) % 7 === 6;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[80px] p-1.5 border-b border-r border-border text-left transition-colors
                    ${isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""}
                    ${isToday && !isSelected ? "bg-primary/[0.03]" : ""}
                    ${isWeekend && !isSelected ? "bg-muted/10" : ""}
                    hover:bg-primary/5
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[13px] font-medium ${
                        isToday
                          ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-[12px]"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_COLORS[evt.category]}`} />
                          <span className="text-[9px] text-foreground/70 truncate leading-tight">
                            {evt.title.slice(0, 20)}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date detail */}
        {selectedDate && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-[14px] font-semibold text-foreground">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>

            {selectedEvents.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No events on this date.</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((evt, i) => (
                  <div
                    key={i}
                    className={`border-l-[3px] ${
                      evt.category === "deadline" ? "border-l-status-blocked" :
                      evt.category === "milestone" ? "border-l-status-success" :
                      evt.category === "appointment" ? "border-l-status-current" :
                      "border-l-status-caution"
                    } pl-3 py-1`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {CATEGORY_LABELS[evt.category]}
                      </span>
                      {evt.severity && (
                        <span className={`text-[10px] font-bold ${
                          evt.severity === "HIGH" ? "text-status-blocked" :
                          evt.severity === "MEDIUM" ? "text-status-caution" :
                          "text-status-current"
                        }`}>
                          {evt.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-foreground">{evt.title}</p>
                    {evt.description && (
                      <p className="text-[12px] text-muted-foreground mt-0.5">{evt.description}</p>
                    )}
                    {evt.action && (
                      <p className="text-[12px] text-primary mt-1">{evt.action}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events list */}
        {events.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-[14px] font-semibold text-foreground">
              Upcoming Events
            </h3>
            <div className="space-y-2">
              {events
                .filter((e) => e.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 8)
                .map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="shrink-0 text-center min-w-[40px]">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {new Date(evt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-[18px] font-bold text-foreground leading-tight">
                        {new Date(evt.date + "T12:00:00").getDate()}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[evt.category]}`} />
                        <span className="text-[13px] font-medium text-foreground truncate">
                          {evt.title}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{evt.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              {events.filter((e) => e.date >= todayStr).length === 0 && (
                <p className="text-[13px] text-muted-foreground">No upcoming events.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceSection>
  );
}
