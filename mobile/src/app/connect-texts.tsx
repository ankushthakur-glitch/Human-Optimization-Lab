import { router, useLocalSearchParams } from "expo-router"

import { ConsentTexts, periodParam } from "@/components/consent-steps"
import { useOnboarding } from "@/lib/onboarding"

/** Connecting later, page 3: texts. Signing builds the record. */
export default function ConnectTextsScreen() {
  const onboarding = useOnboarding()
  const { period } = useLocalSearchParams<{ period?: string }>()
  return (
    <ConsentTexts
      period={periodParam(period)}
      onSigned={async (signedAs, consentPeriod) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString(), consentPeriod })
        router.push("/building")
      }}
    />
  )
}
