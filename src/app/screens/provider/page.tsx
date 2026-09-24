import { redirect } from "next/navigation"

/** The provider's portal opens on patients. */
export default function ProviderHome() {
  redirect("/screens/provider/patients")
}
