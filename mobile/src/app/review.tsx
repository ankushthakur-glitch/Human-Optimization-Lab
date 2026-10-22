import { Redirect } from "expo-router"

/* The daily review is the Plan tab's Review now (22 Oct 2026); an old link
   to /review lands there. */

export default function ReviewScreen() {
  return <Redirect href="/plan" />
}
