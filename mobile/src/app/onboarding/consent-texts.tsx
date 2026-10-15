import { router, useLocalSearchParams } from "expo-router"

import { ConsentTexts, periodParam } from "@/components/consent-steps"
import { useOnboarding } from "@/lib/onboarding"

/** Setup's consent, page 2: texts. Signing starts the record and opens the
    eight life questions (app/onboarding/life.tsx) while it arrives. The
    longer health questions (the why) no longer sit here: they wait on the
    home as "Complete your profile" (14 Oct 2026). */
export default function ConsentTextsScreen() {
  const onboarding = useOnboarding()
  const { period } = useLocalSearchParams<{ period?: string }>()
  return (
    <ConsentTexts
      period={periodParam(period)}
      onSigned={async (signedAs, consentPeriod) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString(), consentPeriod, step: "life" })
        // Back returns here, and signing again moves on again.
        router.push("/onboarding/life")
      }}
    />
  )
}
