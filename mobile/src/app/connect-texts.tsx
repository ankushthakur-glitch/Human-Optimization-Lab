import { router } from "expo-router"

import { ConsentTexts } from "@/components/consent-steps"
import { useOnboarding } from "@/lib/onboarding"

/** Connecting later, page 2: texts. Signing builds the record. */
export default function ConnectTextsScreen() {
  const onboarding = useOnboarding()
  return (
    <ConsentTexts
      onSigned={async (signedAs) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString() })
        router.push("/building")
      }}
    />
  )
}
