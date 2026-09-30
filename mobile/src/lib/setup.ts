import { router } from "expo-router"

import { useOnboarding } from "@/lib/onboarding"
import { SETUP, type SetupStep } from "@/lib/program"

type Patch = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

/** One step of the paid setup: where it sits in the count, and finishing
    it, which saves what it collected and opens the next step. The last
    step hands the plan to the doctor as a draft. */
export function useSetupStep(id: SetupStep) {
  const onboarding = useOnboarding()
  const index = SETUP.findIndex((s) => s.id === id)
  const next = SETUP[index + 1]

  async function finish(patch: Patch = {}) {
    const setupDone = [...new Set([...(onboarding.setupDone ?? []), id])]
    await onboarding.save({
      ...patch,
      setupDone,
      ...(next ? {} : { plan: { status: "review" as const, version: 1, versions: [] } }),
    })
    if (next) router.replace(next.href)
    else router.replace("/plan")
  }

  return { step: index + 1, steps: SETUP.length, finish }
}
