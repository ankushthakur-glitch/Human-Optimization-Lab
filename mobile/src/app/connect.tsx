import { router } from "expo-router"

import { ConsentRecords } from "@/components/consent-steps"

/** A patient who said "Not now" in setup connects from the dashboard: the
    same three consent pages, then the record builds. */
export default function ConnectScreen() {
  return <ConsentRecords onNext={(period) => router.push({ pathname: "/connect-texts", params: { period } })} />
}
