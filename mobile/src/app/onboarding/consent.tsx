import { router } from "expo-router"

import { ConsentRecords } from "@/components/consent-steps"
import { useOnboarding } from "@/lib/onboarding"

/* Setup's step 2, the consent, over two pages (components/consent-steps):
   the records, the authorization and the privacy policy and terms here,
   then "Connect your health records", then texts ("Updates about your
   care"), where signing starts the record and moves on to the why.
   Nothing medical is read before it. */

export default function ConsentScreen() {
  const onboarding = useOnboarding()
  return (
    <ConsentRecords
      onNext={async (period) => {
        await onboarding.save({ step: "connect" })
        router.push({ pathname: "/onboarding/connect-records", params: { period } })
      }}
    />
  )
}
