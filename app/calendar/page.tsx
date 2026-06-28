import { readCollection } from "@/lib/store";
import { buildAgenda } from "@/lib/calendar";
import { todayISO } from "@/lib/utils";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const [jobs, sidework, partTime, projects, invoices] = await Promise.all([
    readCollection("jobs"),
    readCollection("sidework"),
    readCollection("part-time"),
    readCollection("projects"),
    readCollection("invoices"),
  ]);
  const events = buildAgenda({ jobs, sidework, partTime, projects, invoices });
  return <CalendarView events={events} today={todayISO()} />;
}
