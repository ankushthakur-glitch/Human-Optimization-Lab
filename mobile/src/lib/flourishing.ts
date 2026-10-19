import { router } from "expo-router"

import type { Hue } from "@/components/record-kit"
import { FLOURISH } from "@/lib/conversation"
import type { useOnboarding } from "@/lib/onboarding"

/* The eight parts of life the flourishing questions cover, in the order of
   DOMAINS (lib/conversation.ts): a short name for chips, headers and the
   result, and one colour each, shared by the intro (/flourishing), the
   questions and the result. */

export const AREAS: { name: string; hue: Hue }[] = [
  { name: "Physical health", hue: "red" },
  { name: "Emotions", hue: "violet" },
  { name: "Relationships", hue: "blue" },
  { name: "Purpose", hue: "amber" },
  { name: "Learning", hue: "teal" },
  { name: "Life balance", hue: "green" },
  { name: "Finances", hue: "amber" },
  { name: "Health confidence", hue: "teal" },
]

/** A believable spread of answers for the demo: strong relationships,
    room to grow in finances and life balance. */
const DEMO_BY_AREA = [6, 5, 8, 7, 7, 5, 4, 6]

/** Demo only: tapping "Flourishing" in the header jumps to the result,
    filling sample answers first when she has none, so the result has
    something to show. */
export async function demoToResult(onboarding: ReturnType<typeof useOnboarding>) {
  const given = (onboarding.why?.flourish ?? []).filter((n) => typeof n === "number").length
  if (given < FLOURISH.length) {
    const flourish = FLOURISH.map((item, i) => Math.max(1, Math.min(10, DEMO_BY_AREA[item.domain] + ((i % 3) - 1))))
    await onboarding.save({ why: { ...onboarding.why, flourish } })
  }
  router.push("/flourishing-result")
}
