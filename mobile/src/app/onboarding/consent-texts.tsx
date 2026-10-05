import { router, useLocalSearchParams } from "expo-router"

import { ConsentTexts, periodParam } from "@/components/consent-steps"
import { useOnboarding } from "@/lib/onboarding"

/** Setup's consent, page 2: texts. Signing starts the record and moves on
    to the why. */
export default function ConsentTextsScreen() {
  const onboarding = useOnboarding()
  const { period } = useLocalSearchParams<{ period?: string }>()
  return (
    <ConsentTexts
      period={periodParam(period)}
      onSigned={async (signedAs, consentPeriod) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString(), consentPeriod, step: "why" })
        // The record starts building while the patient talks through their
        // why; Back returns here, and signing again moves on again.
        router.push("/onboarding/why")
      }}
    />
  )
}
