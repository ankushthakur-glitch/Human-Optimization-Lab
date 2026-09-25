import { redirect } from "next/navigation"

/** The patient app prototype starts at consent. */
export default function PatientAppPage() {
  redirect("/screens/app/consent")
}
