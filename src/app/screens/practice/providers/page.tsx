import { redirect } from "next/navigation"

/** Providers now live on the Users screen's first tab. */
export default function ProvidersRedirect() {
  redirect("/screens/practice/users")
}
