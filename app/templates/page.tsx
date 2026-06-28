import { readCollection } from "@/lib/store";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage() {
  const templates = await readCollection("templates");
  return <TemplatesClient templates={templates} />;
}
