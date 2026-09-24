import { redirect } from "next/navigation"

/** The clinic manager's portal opens on users. */
export default function PracticeHome() {
  redirect("/screens/practice/users")
}
