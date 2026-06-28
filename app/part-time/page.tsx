import { readCollection } from "@/lib/store";
import { PartTimeLog } from "./PartTimeLog";

export default async function PartTimePage() {
  const entries = await readCollection("part-time");
  return <PartTimeLog entries={entries} />;
}
