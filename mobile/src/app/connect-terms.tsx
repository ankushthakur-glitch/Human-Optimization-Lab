import { router, useLocalSearchParams } from "expo-router"

import { ConsentTerms } from "@/components/consent-steps"

/** Connecting later, page 2: the privacy policy and terms. */
export default function ConnectTermsScreen() {
  const { period } = useLocalSearchParams<{ period?: string }>()
  return <ConsentTerms onNext={() => router.push({ pathname: "/connect-texts", params: { period } })} />
}
