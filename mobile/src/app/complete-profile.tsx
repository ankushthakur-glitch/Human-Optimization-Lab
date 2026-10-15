import WhyScreen from "@/app/onboarding/why"

/** "Complete your profile" (15 Oct 2026): the health questions, opened by
    "Confirm schedule" on /schedule-tests, never before it; the last answer
    walks on to her plan (/plan?walk=1). The same conversation as setup's why
    (app/onboarding/why.tsx), which saves after every answer, so leaving
    and coming back picks up on the question she stopped at. */
export default function CompleteProfileScreen() {
  return <WhyScreen />
}
