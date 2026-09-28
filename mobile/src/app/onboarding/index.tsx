import { Redirect } from "expo-router"

import { STEP_ROUTE, useOnboarding } from "@/lib/onboarding"

/** Where a signed-in patient lands until setup is done: the step they left off on. */
export default function OnboardingIndex() {
  const { step } = useOnboarding()
  return <Redirect href={step === "done" ? "/" : STEP_ROUTE[step]} />
}
