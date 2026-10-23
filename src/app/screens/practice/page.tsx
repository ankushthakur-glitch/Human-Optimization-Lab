import { redirect } from "next/navigation"

/** The clinic manager's portal opens on the practice dashboard. */
export default function PracticeHome() {
  redirect("/screens/practice/dashboard")
}
