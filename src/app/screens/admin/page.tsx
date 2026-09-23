import { redirect } from "next/navigation"

/** The console opens on practices until it has a dashboard. */
export default function AdminHome() {
  redirect("/screens/admin/practices")
}
