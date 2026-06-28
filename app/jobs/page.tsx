import { readCollection } from "@/lib/store";
import { JobsBoard } from "./JobsBoard";

export default async function JobsPage() {
  const jobs = await readCollection("jobs");
  return <JobsBoard jobs={jobs} />;
}
