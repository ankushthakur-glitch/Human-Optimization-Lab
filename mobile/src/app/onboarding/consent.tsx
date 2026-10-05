import { router } from "expo-router"

import { ConsentRecords } from "@/components/consent-steps"

/* Setup's step 2, the consent, over two pages (components/consent-steps):
   the records, the authorization and the privacy policy and terms here,
   then texts, where signing starts the record and moves on to the why.
   Nothing medical is read before it. */

export default function ConsentScreen() {
  return <ConsentRecords onNext={(period) => router.push({ pathname: "/onboarding/consent-texts", params: { period } })} />
}
