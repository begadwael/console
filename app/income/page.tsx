import { redirect } from "next/navigation";

// Income moved under Side work → Finance. Keep this route as a permanent redirect so
// old links and bookmarks still resolve.
export default function IncomeRedirect() {
  redirect("/sidework/finance");
}
