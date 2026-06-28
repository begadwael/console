import { readCollection } from "@/lib/store";
import { PersonalView } from "./PersonalView";

export default async function PersonalPage() {
  const items = await readCollection("personal");
  return <PersonalView items={items} />;
}
