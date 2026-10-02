import { router } from "expo-router"

import { ConsentRecords } from "@/components/consent-steps"

/* Setup's step 2, the consent, over three pages (components/consent-steps):
   the records and the authorization here, then the privacy policy and
   terms, then texts, where signing starts the record and moves on to the
   why. Nothing medical is read before it. */

export default function ConsentScreen() {
  return <ConsentRecords onNext={(period) => router.push({ pathname: "/onboarding/consent-terms", params: { period } })} />
}
