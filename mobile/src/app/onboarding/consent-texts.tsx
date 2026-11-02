import { router } from "expo-router"

import { ConsentTexts } from "@/components/consent-steps"
import { useOnboarding } from "@/lib/onboarding"

/** Setup's consent, last page ("Updates about your care"), after "Connect
    your health records". Signing starts the record and opens "Your why"
    and then the eight life questions (app/onboarding/life.tsx) while it arrives. The
    longer health questions (the why) no longer sit here: they wait on the
    home as "Complete your profile" (14 Oct 2026). */
export default function ConsentTextsScreen() {
  const onboarding = useOnboarding()
  return (
    <ConsentTexts
      onSigned={async (signedAs) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString(), step: "yourWhy" })
        // Back returns here, and signing again moves on again.
        router.push("/onboarding/your-why")
      }}
    />
  )
}
