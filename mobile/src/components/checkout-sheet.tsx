import { router, useNavigation } from "expo-router"
import * as React from "react"
import { showToast } from "@/components/toast"
import { chosenTests } from "@/lib/baseline-tests"
import { useMarkers } from "@/lib/experience"
import { logEvent, planFocus } from "@/lib/offers"
import { inPlan } from "@/lib/upgrade"
import { useOnboarding } from "@/lib/onboarding"
import { firstPlan, type Cadence, type ProgramId } from "@/lib/plans"
import type { FocusArea } from "@/lib/record"

/** The payment button's pending state (C.0.8). */
const PAYING_MS = 1000

/** What each focus area is called among the plan's programs. */
const PROGRAM_OF: Record<FocusArea, ProgramId> = {
  "blood sugar": "metabolic",
  weight: "weight",
  heart: "heart",
  bone: "bone",
}

/** Starts the membership, from the checkout sheet or the plan set-up's
    last step (/enrollment): after the payment's pending second the
    membership is saved, every earlier plan version kept, her plan goes to
    Dr. Patel as a draft, and she lands on the Plan tab, or, from the
    set-up, on the enrolled page over home (/enrolled). */
export function useStartMembership() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const navigation = useNavigation()
  const [pending, setPending] = React.useState(false)

  /** Starts the membership. With `hold`, the enrolled page waits: `start`
      hands back the step that opens it, for after the payment popup. */
  async function start({ card, billing, agreedAt, enrolled, hold }: { card: string; billing: Cadence; agreedAt: string; enrolled?: boolean; hold?: boolean }): Promise<(() => void) | void> {
    setPending(true)
    await new Promise((done) => setTimeout(done, PAYING_MS))
    const now = new Date()
    // Every version she ever had stays hers (A-45).
    const kept = [...(onboarding.planHistory ?? []), ...(onboarding.plan?.versions ?? [])]
      .filter((v, i, all) => all.findIndex((w) => w.version === v.version) === i)
      .sort((a, b) => b.version - a.version)
    const programs = [...new Set(planFocus(onboarding, markers, 3).areas.map((a) => PROGRAM_OF[a]))]
    await onboarding.save({
      membership: { tier: "optimization", programs, startedAt: now.toISOString(), approvedAt: now.toISOString(), card, billing, renewalConsentAt: agreedAt },
      // Live at once: nothing goes to her physician for review (27 Oct
      // 2026). After a cancel and a rejoin it takes the next number after
      // every version she kept, so none is reused.
      plan: firstPlan(Math.max(0, ...kept.map((v) => v.version)) + 1),
      planReadySeen: true,
      planHistory: kept.length ? kept : undefined,
      // The set-up's baseline tests, paid with the membership, to schedule
      // from the enrolled page: DEXA and RMR come with body composition.
      ...(enrolled
        ? {
            startingTests: {
              ids: inPlan(onboarding.removedOpps).some((o) => o.id === "body") ? chosenTests(onboarding.baselinePicks).map((t) => t.id) : [],
              at: now.toISOString(),
            },
          }
        : {}),
    })
    logEvent(onboarding, "checkout_completed")
    setPending(false)
    if (enrolled) {
      // The set-up's steps close; the page says what comes next itself.
      // One reset, home with the enrolled page over it: a dismissTo then a
      // push raced, as the Plan tab holds a pop for two frames (drag-back)
      // and the held pop then took the enrolled page off again.
      const open = () => navigation.dispatch({ type: "RESET", payload: { index: 1, routes: [{ name: "index" }, { name: "enrolled" }] } })
      if (hold) return open
      open()
      return
    }
    showToast("Welcome in. Your plan is ready.")
    router.dismissTo("/plan")
  }

  return { start, pending }
}

