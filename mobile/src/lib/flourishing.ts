import { router, type Href } from "expo-router"

import type { Hue } from "@/components/record-kit"
import { FLOURISH } from "@/lib/conversation"
import type { useOnboarding } from "@/lib/onboarding"
import { STOP } from "@/lib/sleep-screen"

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

type Answers = Pick<ReturnType<typeof useOnboarding>, "why" | "sleepScreen">

/** What is left of the questions every free patient answers in To do (5
    Nov 2026 call): the flourishing questions and the four sleep questions.
    Both feed her optimization opportunities, so the plan's "See what we
    found" waits for them. */
export function questionsLeft(s: Answers) {
  const flourish = s.why?.flourish ?? []
  const given = FLOURISH.filter((_, i) => typeof flourish[i] === "number").length
  const sleepGiven = STOP.filter((q) => typeof s.sleepScreen?.[q.id] === "boolean").length
  return {
    flourishing: given < FLOURISH.length,
    flourishingGiven: given,
    sleep: sleepGiven < STOP.length,
    sleepGiven,
  }
}

/** Where the questions go after one part is done: on to the sleep
    questions while they are open, else where she started from (the plan's
    gate opens what we found; otherwise To do). */
export async function afterQuestions(onboarding: ReturnType<typeof useOnboarding>, part: "flourishing" | "sleep") {
  const left = questionsLeft(onboarding)
  if (part === "flourishing" && left.sleep) return router.push("/sleep-questions")
  const then = (onboarding.questionsThen ?? "/gaps") as Href
  if (onboarding.questionsThen) await onboarding.save({ questionsThen: undefined })
  router.replace(then)
}
