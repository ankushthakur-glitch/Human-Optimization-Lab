import * as React from "react"

import { ArrowRight } from "@/components/ph"
import { PlanMatchSection } from "@/components/plan-match"
import { Button } from "@/components/ui"
import { logEvent, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"

/* The plan showroom (FINAL-SPEC C.14.3, D.4), cut back on 16 Oct 2026 to
   what the upgrade screen needs: the AI plan match (components/plan-match.tsx),
   "Welcome, Liv" and the plans her record supports,
   then "Start my optimization plan" (ShowroomActions) pinned below it. What
   a member gets, the prices, what stays free and what is charged apart are
   gone from this screen. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

/** "Start my optimization plan", or "Start again" for someone who had a
    plan before. */
function startLabelOf(s: Snapshot) {
  return s.membership?.cancelledAt || s.planHistory?.length ? "Start again" : "Start my optimization plan"
}

export function PlanShowroom({ onSeeAll }: { onSeeAll: () => void }) {
  const onboarding = useOnboarding()
  const offer = useOffer("plan-tab", { key: "tab" })
  useShown(offer)
  // The plan seen, and from where (D.7), once each time the showroom opens.
  const viewed = React.useRef(false)
  React.useEffect(() => {
    if (viewed.current || !onboarding.loaded) return
    viewed.current = true
    logEvent(onboarding, "plan_viewed", { from: "tab" })
  }, [onboarding])

  return (
    <PlanMatchSection onSeeAll={onSeeAll} />
  )
}

/** The showroom's one action (C.14.3 h): "Start my optimization plan" (the
    "Ask to Health Agent" button is gone, 8 Oct 2026), closing the
    showroom. Logged on the same offer as the showroom's view. */
export function ShowroomActions({
  onStart,
}: {
  /** Opens the goals step, which leads on to the checkout. */
  onStart: () => void
}) {
  const onboarding = useOnboarding()
  const offer = useOffer("plan-tab", { key: "tab" })
  return (
    <Button
      trailing={({ color: c }) => <ArrowRight size={18} weight="bold" color={c} />}
      onPress={() => {
        offer.markOpened()
        logEvent(onboarding, "checkout_started", { from: "tab" })
        onStart()
      }}
    >
      {startLabelOf(onboarding)}
    </Button>
  )
}
