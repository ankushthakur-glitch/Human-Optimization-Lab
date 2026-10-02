import { router, useLocalSearchParams } from "expo-router"

import { ConsentTerms } from "@/components/consent-steps"

/** Setup's consent, page 2: the privacy policy and terms. */
export default function ConsentTermsScreen() {
  const { period } = useLocalSearchParams<{ period?: string }>()
  return <ConsentTerms onNext={() => router.push({ pathname: "/onboarding/consent-texts", params: { period } })} />
}
