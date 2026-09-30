import { router } from "expo-router"

import { ConsentForm } from "@/app/onboarding/consent"
import { useOnboarding } from "@/lib/onboarding"

/** A patient who said "Not now" in setup connects from the dashboard: the
    same consent, then the record builds. */
export default function ConnectScreen() {
  const onboarding = useOnboarding()
  return (
    <ConsentForm
      onSigned={async (signedAs, consentMonths) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString(), consentMonths })
        router.replace("/building")
      }}
    />
  )
}
