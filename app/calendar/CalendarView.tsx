"use client";

import Link from "next/link";
import { useState } from "react";
import {
  groupByDate,
  monthGrid,
  MONTH_NAMES,
  WEEKDAYS,
  type AgendaEvent,
} from "@/lib/calendar";
import { parseISO, formatDate, daysUntil, cn } from "@/lib/utils";
import { PageHeader } from "@/components/widgets/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/widgets/EmptyState";
import { Icons } from "@/components/ui/icons";

export function CalendarView({
  events,
  today,
}: {
  events: AgendaEvent[];
  today: string;
}) {
  const todayDate = parseISO(today);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [selected, setSelected] = useState(today);

  const byDate = groupByDate(events);
  const weeks = monthGrid(year, month);

  function shift(delta: number) {
    const m = month + delta;
    const d = new Date(year, m, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function goToday() {
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth());
    setSelected(today);
  }

  const selectedEvents = (byDate[selected] ?? [])
    .slice()
    .sort((a, b) => Number(a.done) - Number(b.done));
  const overdue = events
    .filter((e) => !e.done && daysUntil(e.date) < 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader
        title="Calendar"
        eyebrow="Everything, dated"
        subtitle="Follow-ups, deadlines, milestones, shifts, and invoices in one place."
        accent="var(--accent)"
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="rounded-lg border border-border-strong bg-surface p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Icons.chevronLeft size={16} />
            </button>
            <button
              onClick={goToday}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
            >
              Today
            </button>
            <button
              onClick={() => shift(1)}
              aria-label="Next month"
              className="rounded-lg border border-border-strong bg-surface p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Icons.chevronRight size={16} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Month grid */}
        <Card>
          <CardBody className="pt-4">
            <h2 className="font-display mb-3 text-lg font-semibold tracking-tight text-text">
              {MONTH_NAMES[month]}{" "}
              <span className="tnum text-text-faint">{year}</span>
            </h2>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="eyebrow pb-1 text-center"
                >
                  {d}
                </div>
              ))}
              {weeks.flat().map((iso) => {
                const inMonth = parseISO(iso).getMonth() === month;
                const isToday = iso === today;
                const isSelected = iso === selected;
                const dayEvents = byDate[iso] ?? [];
                const dayNum = parseISO(iso).getDate();
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border p-1 transition-colors sm:aspect-auto sm:min-h-[64px] sm:items-start sm:p-1.5",
                      isSelected
                        ? "border-accent/60 bg-accent/10"
                        : "border-transparent hover:bg-surface-hover",
                      !inMonth && "opacity-35",
                    )}
                  >
                    <span
                      className={cn(
                        "tnum flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        isToday
                          ? "bg-accent-fill font-semibold text-[#04122e]"
                          : "text-text-muted",
                      )}
                    >
                      {dayNum}
                    </span>
                    {/* dots (mobile) / chips (desktop) */}
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className="h-1 w-1 rounded-full"
                          style={{ backgroundColor: e.color }}
                        />
                      ))}
                    </div>
                    <div className="hidden w-full flex-col gap-0.5 sm:flex">
                      {dayEvents.slice(0, 2).map((e) => (
                        <span
                          key={e.id}
                          className="truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight"
                          style={{
                            backgroundColor: `${e.color}22`,
                            color: e.color,
                            textDecoration: e.done ? "line-through" : undefined,
                          }}
                        >
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 ? (
                        <span className="px-1 text-[10px] text-text-faint">
                          +{dayEvents.length - 2} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Side panel: selected day + overdue */}
        <div className="flex flex-col gap-4">
          <Card accent="var(--accent)">
            <CardHeader
              title={
                selected === today ? "Today" : (formatDate(selected) ?? "Day")
              }
              subtitle={
                parseISO(selected).toLocaleDateString(undefined, {
                  weekday: "long",
                }) +
                (selectedEvents.length
                  ? ` · ${selectedEvents.length}`
                  : "")
              }
              icon={<Icons.calendar size={15} />}
              accent="var(--accent)"
            />
            <CardBody>
              {selectedEvents.length === 0 ? (
                <EmptyState icon={Icons.calendar2} message="Nothing scheduled." />
              ) : (
                <ul className="flex flex-col gap-1">
                  {selectedEvents.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {overdue.length > 0 ? (
            <Card accent="var(--danger)">
              <CardHeader
                title="Overdue"
                subtitle={`${overdue.length} need attention`}
                icon={<Icons.calendar size={15} />}
                accent="var(--danger)"
              />
              <CardBody>
                <ul className="flex flex-col gap-1">
                  {overdue.slice(0, 8).map((e) => (
                    <EventRow key={e.id} event={e} overdue />
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function EventRow({
  event,
  overdue,
}: {
  event: AgendaEvent;
  overdue?: boolean;
}) {
  return (
    <li>
      <Link
        href={event.href}
        className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm text-text",
              event.done && "text-text-muted line-through",
            )}
          >
            {event.title}
          </p>
          <p className="truncate text-xs text-text-faint">{event.sub}</p>
        </div>
        {overdue ? (
          <span className="tnum shrink-0 text-[11px] text-danger">
            {formatDate(event.date)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
